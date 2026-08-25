const path = require('path');
const PDFDocument = require('pdfkit');
const { DeliveryListDraftError } = require('./deliveryListDraftService');

const vazirmatnRoot = path.dirname(require.resolve('vazirmatn/package.json'));
const regularFont = path.join(vazirmatnRoot, 'fonts', 'ttf', 'Vazirmatn-Regular.ttf');
const boldFont = path.join(vazirmatnRoot, 'fonts', 'ttf', 'Vazirmatn-Bold.ttf');
const PAGE = { width: 595.28, height: 841.89, margin: 36 };
const contentWidth = PAGE.width - (PAGE.margin * 2);

function toPersianNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatCurrency(value) {
  return toPersianNumber(value);
}

function formatPersianDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Tehran'
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}/${part('month')}/${part('day')} - ${part('hour')}:${part('minute')}`;
}

function settlementLabel(status) {
  return ({ UNPAID: 'تسویه نشده', PARTIAL: 'تسویه جزئی', PAID: 'تسویه کامل' })[status] || status;
}

function invoiceTypeLabel(type) {
  return type === 'SUPPLEMENT' ? 'فاکتور تکمیلی' : 'فاکتور اصلی';
}

function adjustmentLabel(type) {
  return ({
    DAMAGE: 'خسارت', LOSS: 'مفقودی', TRANSPORT: 'حمل و نقل', OTHER: 'سایر',
    DISCOUNT_PERCENT: 'تخفیف درصدی', DISCOUNT_AMOUNT: 'تخفیف مبلغی', ROUNDING: 'رند مبلغ'
  })[type] || type;
}

function getInvoicePdfData(db, listId, invoiceId) {
  const invoice = db.prepare(`
    SELECT invoices.*, delivery_lists.list_number, delivery_lists.status AS list_status,
           delivery_lists.settlement_status AS list_settlement_status,
           delivery_lists.delivered_at, delivery_lists.completed_at,
           COALESCE(customers.name, delivery_lists.customer_name_snapshot) AS customer_name,
           customers.phone AS customer_phone,
           COALESCE(issuer.display_name, issuer.username) AS issued_by_name,
           COALESCE(app_settings.collection_name, 'مجموعه من') AS collection_name
    FROM invoices
    JOIN delivery_lists ON delivery_lists.id = invoices.delivery_list_id
    LEFT JOIN customers ON customers.id = delivery_lists.customer_id
    LEFT JOIN users issuer ON issuer.id = invoices.issued_by_user_id
    LEFT JOIN app_settings ON app_settings.id = 1
    WHERE invoices.id = ? AND invoices.delivery_list_id = ?
      AND invoices.status = 'ISSUED' AND invoices.deleted_at IS NULL
      AND delivery_lists.archived_at IS NULL
  `).get(invoiceId, listId);
  if (!invoice) throw new DeliveryListDraftError('فاکتور صادرشده پیدا نشد', 404);

  const lines = db.prepare(`
    SELECT id, description, quantity, billing_from_at, billing_to_at,
           charged_days, unit_price_toman, line_total_toman
    FROM invoice_lines
    WHERE invoice_id = ? AND line_type = 'RENTAL' AND deleted_at IS NULL
    ORDER BY sort_order, id
  `).all(invoice.id);
  const adjustments = db.prepare(`
    SELECT adjustment_type, description, percent_basis_points, amount_toman
    FROM invoice_adjustments
    WHERE invoice_id = ? AND deleted_at IS NULL
    ORDER BY sort_order, id
  `).all(invoice.id);
  const listFinancials = db.prepare(`
    SELECT
      (SELECT COALESCE(SUM(final_amount_toman), 0) FROM invoices
        WHERE delivery_list_id = ? AND status = 'ISSUED' AND deleted_at IS NULL) AS invoiced,
      (SELECT COALESCE(SUM(amount_toman), 0) FROM payments
        WHERE delivery_list_id = ? AND voided_at IS NULL) AS paid
  `).get(listId, listId);
  return {
    invoice,
    lines,
    adjustments,
    list_financials: {
      invoiced_toman: Number(listFinancials.invoiced) || 0,
      paid_toman: Number(listFinancials.paid) || 0,
      balance_toman: Math.max(0, Number(listFinancials.invoiced) - Number(listFinancials.paid))
    }
  };
}

function drawText(doc, text, x, y, width, options = {}) {
  doc.font(options.bold ? 'Vazirmatn-Bold' : 'Vazirmatn')
    .fontSize(options.size || 9)
    .fillColor(options.color || '#172033')
    .text(String(text ?? ''), x, y, {
      width,
      height: options.height,
      align: options.align || 'right',
      lineBreak: options.lineBreak !== false,
      features: ['rlig', 'calt']
    });
}

function drawCell(doc, x, y, width, height, text, options = {}) {
  doc.save();
  doc.rect(x, y, width, height).fillAndStroke(options.fill || '#ffffff', options.stroke || '#cbd5e1');
  doc.restore();
  const fontSize = options.size || 8.5;
  const textY = y + Math.max(5, (height - (fontSize * 1.55)) / 2);
  drawText(doc, text, x + 5, textY, width - 10, {
    size: fontSize,
    bold: options.bold,
    color: options.color,
    align: options.align || 'center',
    height: height - 8
  });
}

function drawKeyValueRow(doc, y, cells) {
  const widths = [84, 178, 84, 177];
  let x = PAGE.margin;
  cells.forEach((cell, index) => {
    drawCell(doc, x, y, widths[index], 28, cell.text, {
      fill: cell.label ? '#f1f5f9' : '#ffffff',
      bold: cell.label,
      align: cell.label ? 'right' : 'right',
      size: 8.5
    });
    x += widths[index];
  });
}

function drawLineTableHeader(doc, y) {
  const columns = [
    { label: 'مبلغ کل به تومان', width: 103 },
    { label: 'تاریخ برگشت', width: 88 },
    { label: 'روز', width: 46 },
    { label: 'تعداد', width: 46 },
    { label: 'قیمت واحد به تومان', width: 92 },
    { label: 'نام محصول', width: 148 }
  ];
  let x = PAGE.margin;
  columns.forEach((column) => {
    drawCell(doc, x, y, column.width, 30, column.label, { fill: '#e0e7ff', bold: true, color: '#3730a3' });
    x += column.width;
  });
  return columns;
}

function addPageWithTableHeader(doc) {
  doc.addPage();
  drawText(doc, 'ادامه اقلام فاکتور', PAGE.margin, 24, contentWidth, { bold: true, size: 11, color: '#3730a3' });
  return { y: 48, columns: drawLineTableHeader(doc, 48) };
}

function renderInvoicePdf(data) {
  const { invoice, lines, adjustments, list_financials: financials } = data;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.margin, right: PAGE.margin, bottom: 46, left: PAGE.margin },
    bufferPages: true,
    info: {
      Title: `Invoice ${invoice.invoice_number}`,
      Author: invoice.collection_name,
      Subject: `Delivery list ${invoice.list_number}`
    }
  });
  doc.registerFont('Vazirmatn', regularFont);
  doc.registerFont('Vazirmatn-Bold', boldFont);

  const chunks = [];
  const promise = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.roundedRect(PAGE.margin, PAGE.margin, contentWidth, 72, 8).fill('#312e81');
  drawText(doc, invoice.collection_name, PAGE.margin + 18, PAGE.margin + 13, contentWidth - 36, { align: 'center', bold: true, size: 17, color: '#ffffff' });
  drawText(doc, invoiceTypeLabel(invoice.invoice_type), PAGE.margin + 18, PAGE.margin + 43, contentWidth - 36, { align: 'center', size: 10, color: '#e0e7ff' });

  let y = PAGE.margin + 88;
  drawKeyValueRow(doc, y, [
    { text: 'شماره فاکتور', label: true }, { text: invoice.invoice_number },
    { text: 'شماره لیست', label: true }, { text: invoice.list_number }
  ]);
  y += 28;
  drawKeyValueRow(doc, y, [
    { text: 'نام مشتری', label: true }, { text: invoice.customer_name || '-' },
    { text: 'تلفن مشتری', label: true }, { text: invoice.customer_phone || '-' }
  ]);
  y += 28;
  drawKeyValueRow(doc, y, [
    { text: 'تاریخ صدور', label: true }, { text: formatPersianDateTime(invoice.issued_at) },
    { text: 'صادرکننده', label: true }, { text: invoice.issued_by_name || '-' }
  ]);
  y += 28;
  drawKeyValueRow(doc, y, [
    { text: 'زمان تحویل', label: true }, { text: formatPersianDateTime(invoice.delivered_at) },
    { text: 'وضعیت تسویه لیست', label: true }, { text: settlementLabel(invoice.list_settlement_status) }
  ]);

  y += 58;
  drawText(doc, 'اقلام فاکتور', PAGE.margin, y - 22, contentWidth, { bold: true, size: 11, color: '#312e81' });
  let columns = drawLineTableHeader(doc, y);
  y += 30;
  lines.forEach((line) => {
    const rowHeight = 38;
    if (y + rowHeight > PAGE.height - 100) {
      const pageState = addPageWithTableHeader(doc);
      y = pageState.y + 30;
      columns = pageState.columns;
    }
    const values = [
      formatCurrency(line.line_total_toman),
      formatPersianDateTime(line.billing_to_at),
      toPersianNumber(line.charged_days),
      toPersianNumber(line.quantity),
      formatCurrency(line.unit_price_toman),
      line.description
    ];
    let x = PAGE.margin;
    values.forEach((value, index) => {
      drawCell(doc, x, y, columns[index].width, rowHeight, value, {
        align: index === 5 ? 'right' : 'center',
        bold: index === 0,
        size: index === 1 ? 7.5 : 8
      });
      x += columns[index].width;
    });
    y += rowHeight;
  });

  const extraAdjustments = adjustments.filter((item) => ['DAMAGE', 'LOSS', 'TRANSPORT', 'OTHER'].includes(item.adjustment_type));
  if (extraAdjustments.length) {
    if (y + 55 + (extraAdjustments.length * 28) > PAGE.height - 100) {
      doc.addPage();
      y = PAGE.margin;
    } else y += 18;
    drawText(doc, 'هزینه های اضافی', PAGE.margin, y, contentWidth, { bold: true, size: 10, color: '#312e81' });
    y += 22;
    extraAdjustments.forEach((item) => {
      drawCell(doc, PAGE.margin, y, 130, 28, formatCurrency(item.amount_toman), { bold: true });
      drawCell(doc, PAGE.margin + 130, y, 105, 28, adjustmentLabel(item.adjustment_type), { fill: '#f8fafc', bold: true });
      drawCell(doc, PAGE.margin + 235, y, contentWidth - 235, 28, item.description, { align: 'right' });
      y += 28;
    });
  }

  if (y + 300 > PAGE.height - 60) {
    doc.addPage();
    y = PAGE.margin;
  } else y += 18;
  drawText(doc, 'جمع بندی مالی این فاکتور', PAGE.margin, y, contentWidth, { bold: true, size: 10, color: '#312e81' });
  y += 24;
  const summaryRows = [
    ['جمع اجاره اقلام به تومان', invoice.subtotal_toman],
    ['هزینه های اضافی به تومان', invoice.extra_charges_toman],
    ['مجموع تخفیف به تومان', -Number(invoice.discount_amount_toman || 0)],
    ['رند مبلغ به تومان', Number(invoice.rounding_adjustment_toman || 0)],
    ['مبلغ نهایی فاکتور به تومان', invoice.final_amount_toman]
  ];
  summaryRows.forEach(([label, amount], index) => {
    const isFinal = index === summaryRows.length - 1;
    drawCell(doc, PAGE.margin, y, 190, 30, formatCurrency(amount), { bold: true, fill: isFinal ? '#dcfce7' : '#ffffff', color: isFinal ? '#166534' : '#172033' });
    drawCell(doc, PAGE.margin + 190, y, contentWidth - 190, 30, label, { align: 'right', bold: isFinal, fill: isFinal ? '#dcfce7' : '#f8fafc', color: isFinal ? '#166534' : '#172033' });
    y += 30;
  });

  y += 18;
  drawText(doc, 'وضعیت مالی کل لیست', PAGE.margin, y, contentWidth, { bold: true, size: 10, color: '#312e81' });
  y += 24;
  const financialCells = [
    ['جمع کل فاکتورها به تومان', financials.invoiced_toman],
    ['جمع پرداخت معتبر به تومان', financials.paid_toman],
    ['مانده کل لیست به تومان', financials.balance_toman]
  ];
  const financialWidth = contentWidth / 3;
  financialCells.forEach(([label, amount], index) => {
    const x = PAGE.margin + (index * financialWidth);
    drawCell(doc, x, y, financialWidth, 25, label, { fill: '#e0e7ff', bold: true, color: '#3730a3' });
    drawCell(doc, x, y + 25, financialWidth, 31, formatCurrency(amount), { bold: true });
  });
  y += 72;

  if (invoice.notes) {
    drawCell(doc, PAGE.margin, y, contentWidth, 48, `توضیحات: ${invoice.notes}`, { align: 'right', fill: '#fffbeb', size: 8.5 });
  }

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.moveTo(PAGE.margin, PAGE.height - 75).lineTo(PAGE.width - PAGE.margin, PAGE.height - 75).strokeColor('#cbd5e1').stroke();
    drawText(doc, `${toPersianNumber(index + 1)} / ${toPersianNumber(range.count)}`, PAGE.margin, PAGE.height - 68, contentWidth, { align: 'center', size: 7.5, color: '#64748b', lineBreak: false, height: 10 });
  }

  doc.end();
  return promise;
}

function createInvoicePdfService(db) {
  async function generate(listId, invoiceId) {
    const data = getInvoicePdfData(db, listId, invoiceId);
    const buffer = await renderInvoicePdf(data);
    return { buffer, filename: `invoice-${data.invoice.invoice_number}.pdf`, data };
  }
  return { generate, getInvoicePdfData: (listId, invoiceId) => getInvoicePdfData(db, listId, invoiceId) };
}

module.exports = { createInvoicePdfService, renderInvoicePdf, getInvoicePdfData };
