const path = require('path');
const PDFDocument = require('pdfkit');
const { DeliveryListDraftError, calculateChargedDays } = require('./deliveryListDraftService');

const vazirmatnRoot = path.dirname(require.resolve('vazirmatn/package.json'));
const regularFont = path.join(vazirmatnRoot, 'fonts', 'ttf', 'Vazirmatn-Regular.ttf');
const boldFont = path.join(vazirmatnRoot, 'fonts', 'ttf', 'Vazirmatn-Bold.ttf');
const PAGE = { width: 595.28, height: 841.89, margin: 32 };
const contentWidth = PAGE.width - (PAGE.margin * 2);
const TABLE_HEADER_HEIGHT = 29;
const TABLE_BOTTOM = PAGE.height - 68;
const lineColumns = [
  { label: 'مبلغ کل', width: 105 },
  { label: 'مبلغ واحد', width: 88 },
  { label: 'روز', width: 50 },
  { label: 'تعداد', width: 50 },
  { label: 'شرح کالا یا خدمات', width: 190.28 },
  { label: 'ردیف', width: 48 }
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function toPersianDigits(value) {
  return String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
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

function adjustmentLabel(type) {
  return ({
    DAMAGE: 'خسارت', LOSS: 'مفقودی', TRANSPORT: 'حمل و نقل', OTHER: 'سایر'
  })[type] || type;
}

function getInvoicePdfData(db, listId, invoiceId) {
  const invoice = db.prepare(`
    SELECT invoices.*, delivery_lists.list_number, delivery_lists.status AS list_status,
           delivery_lists.settlement_status AS list_settlement_status,
           delivery_lists.delivered_at, delivery_lists.completed_at,
           COALESCE(customers.name, delivery_lists.customer_name_snapshot) AS customer_name,
           customers.phone AS customer_phone,
           parent_invoice.invoice_number AS parent_invoice_number,
           COALESCE(issuer.display_name, issuer.username) AS issued_by_name,
           COALESCE(app_settings.collection_name, 'مجموعه من') AS collection_name
    FROM invoices
    JOIN delivery_lists ON delivery_lists.id = invoices.delivery_list_id
    LEFT JOIN customers ON customers.id = delivery_lists.customer_id
    LEFT JOIN invoices parent_invoice ON parent_invoice.id = invoices.parent_invoice_id
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

function getProformaPdfData(db, listId) {
  const invoice = db.prepare(`
    SELECT invoices.*, delivery_lists.list_number, delivery_lists.status AS list_status,
           delivery_lists.delivered_at, delivery_lists.expected_return_at,
           delivery_lists.billing_cutoff_minutes_snapshot, delivery_lists.night_before,
           delivery_lists.notes AS list_notes,
           COALESCE(customers.name, delivery_lists.customer_name_snapshot) AS customer_name,
           customers.phone AS customer_phone,
           COALESCE(app_settings.collection_name, 'مجموعه من') AS collection_name
    FROM invoices
    JOIN delivery_lists ON delivery_lists.id = invoices.delivery_list_id
    LEFT JOIN customers ON customers.id = delivery_lists.customer_id
    LEFT JOIN app_settings ON app_settings.id = 1
    WHERE invoices.delivery_list_id = ? AND invoices.status = 'PROFORMA'
      AND invoices.deleted_at IS NULL AND delivery_lists.archived_at IS NULL
    ORDER BY invoices.id DESC LIMIT 1
  `).get(listId);
  if (!invoice) throw new DeliveryListDraftError('پیش‌فاکتور این لیست پیدا نشد', 404);
  if (!invoice.delivered_at || !invoice.expected_return_at) {
    throw new DeliveryListDraftError('برای ساخت پیش‌فاکتور، تاریخ تحویل و برگشت را کامل کنید', 409);
  }

  const chargedDays = calculateChargedDays({
    deliveredAt: invoice.delivered_at,
    returnedAt: invoice.expected_return_at,
    cutoffMinutes: Number(invoice.billing_cutoff_minutes_snapshot),
    nightBefore: Boolean(invoice.night_before)
  });
  const items = db.prepare(`
    SELECT id, product_name_snapshot, delivered_quantity, daily_price_toman
    FROM delivery_list_items
    WHERE delivery_list_id = ? AND deleted_at IS NULL
    ORDER BY id
  `).all(listId);
  if (!items.length) throw new DeliveryListDraftError('پیش‌فاکتور هیچ محصولی ندارد', 409);

  const lines = items.map((item) => ({
    id: item.id,
    description: item.product_name_snapshot,
    quantity: Number(item.delivered_quantity),
    billing_from_at: invoice.delivered_at,
    billing_to_at: invoice.expected_return_at,
    charged_days: chargedDays,
    unit_price_toman: Number(item.daily_price_toman),
    line_total_toman: Number(item.delivered_quantity) * chargedDays * Number(item.daily_price_toman)
  }));
  const total = lines.reduce((sum, line) => sum + line.line_total_toman, 0);
  return {
    invoice: {
      ...invoice,
      _document_type: 'PROFORMA',
      invoice_number: invoice.list_number,
      parent_invoice_number: null,
      notes: invoice.list_notes,
      subtotal_toman: total,
      extra_charges_toman: 0,
      discount_amount_toman: 0,
      final_amount_toman: total
    },
    lines,
    adjustments: [],
    list_financials: { invoiced_toman: 0, paid_toman: 0, balance_toman: 0 }
  };
}

function drawText(doc, text, x, y, width, options = {}) {
  doc.font(options.bold ? 'Vazirmatn-Bold' : 'Vazirmatn')
    .fontSize(options.size || 9)
    .fillColor(options.color || '#111827')
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
  doc.lineWidth(options.lineWidth || 0.75)
    .rect(x, y, width, height)
    .fillAndStroke(options.fill || '#ffffff', options.stroke || '#111827');
  doc.restore();
  if (text === '') return;
  const fontSize = options.size || 8.3;
  const textY = y + Math.max(4, (height - (fontSize * 1.55)) / 2);
  drawText(doc, text, x + 5, textY, width - 10, {
    size: fontSize,
    bold: options.bold,
    color: options.color,
    align: options.align || 'center',
    height: height - 7,
    lineBreak: options.lineBreak
  });
}

function fitTextToWidth(doc, text, width, initialSize, minimumSize) {
  let output = String(text || '');
  let size = initialSize;
  doc.font('Vazirmatn');
  while (size > minimumSize) {
    doc.fontSize(size);
    if (doc.widthOfString(output) <= width) break;
    size -= 0.25;
  }
  size = Math.max(minimumSize, size);
  doc.fontSize(size);
  while (output.length > 4 && doc.widthOfString(output) > width) {
    output = `${output.slice(0, -4).trim()}...`;
  }
  return { text: output, size };
}

function drawMetaLine(doc, x, y, width, label, value, options = {}) {
  const labelWidth = options.labelWidth || 74;
  const valueGap = Object.hasOwn(options, 'valueGap') ? options.valueGap : 4;
  drawText(doc, `${label}:`, x + width - labelWidth, y, labelWidth, { bold: true, size: 8.5 });
  const emptyValue = Object.hasOwn(options, 'emptyValue') ? options.emptyValue : '-';
  drawText(doc, value || emptyValue, x, y, width - labelWidth - valueGap, { size: 8.5 });
}

function drawInvoiceTableHeader(doc, y) {
  let x = PAGE.margin;
  lineColumns.forEach((column) => {
    drawCell(doc, x, y, column.width, TABLE_HEADER_HEIGHT, column.label, {
      fill: '#1f2937', color: '#ffffff', bold: true, size: 8.2, lineWidth: 0.8
    });
    x += column.width;
  });
}

function drawInvoiceRow(doc, y, values, height = 31, options = {}) {
  let x = PAGE.margin;
  values.forEach((value, index) => {
    const isDescription = index === 4;
    const fitted = isDescription
      ? fitTextToWidth(doc, value, lineColumns[index].width - 12, 8.4, 6)
      : { text: value, size: 8.1 };
    drawCell(doc, x, y, lineColumns[index].width, height, fitted.text, {
      align: isDescription ? 'right' : 'center',
      bold: options.boldAmount && index === 0,
      fill: options.fill || '#ffffff',
      size: fitted.size,
      lineBreak: !isDescription
    });
    x += lineColumns[index].width;
  });
  return y + height;
}

function drawSummaryRow(doc, y, label, amount, options = {}) {
  const amountWidth = lineColumns[0].width;
  drawCell(doc, PAGE.margin, y, amountWidth, 28, formatNumber(amount), {
    bold: true,
    fill: options.fill || '#ffffff',
    color: options.color || '#111827'
  });
  drawCell(doc, PAGE.margin + amountWidth, y, contentWidth - amountWidth, 28, label, {
    align: 'right',
    bold: true,
    fill: options.fill || '#f3f4f6',
    color: options.color || '#111827'
  });
  return y + 28;
}

function drawContinuationHeader(doc, invoice) {
  drawText(doc, invoice.collection_name, PAGE.margin, 25, contentWidth, {
    align: 'center', bold: true, size: 13
  });
  drawText(doc, invoice._document_type === 'PROFORMA' ? 'ادامه پیش‌فاکتور' : 'ادامه فاکتور',
    PAGE.margin, 47, contentWidth, { align: 'center', size: 8.5, color: '#4b5563' });
  drawText(doc, invoice.invoice_number, PAGE.margin, 63, contentWidth, {
    align: 'center', bold: true, size: 8.5, color: '#4b5563'
  });
  const y = 84;
  drawInvoiceTableHeader(doc, y);
  return y + TABLE_HEADER_HEIGHT;
}

function addTablePage(doc, invoice) {
  doc.addPage();
  return drawContinuationHeader(doc, invoice);
}

function latestReturnAt(lines) {
  return lines.reduce((latest, line) => {
    const time = new Date(line.billing_to_at).getTime();
    return Number.isNaN(time) || time <= latest.time ? latest : { time, value: line.billing_to_at };
  }, { time: -Infinity, value: null }).value;
}

function splitNotes(doc, text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  doc.font('Vazirmatn').fontSize(8.2);
  const chunks = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    const height = doc.heightOfString(candidate, { width: contentWidth - 16, align: 'right' });
    if (height > 34 && current) {
      chunks.push(current);
      current = word;
    } else current = candidate;
  });
  if (current) chunks.push(current);
  return chunks;
}

function drawPageFrame(doc, pageNumber) {
  doc.save();
  doc.lineWidth(0.8).rect(19, 18, PAGE.width - 38, PAGE.height - 38).strokeColor('#111827').stroke();
  doc.restore();
  drawText(doc, formatNumber(pageNumber), PAGE.margin, PAGE.height - 64, contentWidth, {
    align: 'center', size: 7.5, color: '#6b7280', lineBreak: false, height: 10
  });
}

function renderInvoicePdf(data) {
  const { invoice, lines, adjustments } = data;
  const isProforma = invoice._document_type === 'PROFORMA';
  const documentTitle = isProforma ? 'پیش‌فاکتور' : 'صورتحساب اجاره تجهیزات';
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.margin, right: PAGE.margin, bottom: 52, left: PAGE.margin },
    info: {
      Title: `${isProforma ? 'Proforma' : 'Invoice'} ${invoice.invoice_number}`,
      Author: invoice.collection_name,
      Subject: `Delivery list ${invoice.list_number}`
    }
  });
  doc.registerFont('Vazirmatn', regularFont);
  doc.registerFont('Vazirmatn-Bold', boldFont);
  let pageNumber = 1;
  doc.on('pageAdded', () => {
    pageNumber += 1;
    drawPageFrame(doc, pageNumber);
  });
  drawPageFrame(doc, pageNumber);

  const chunks = [];
  const promise = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const titleX = PAGE.margin;
  const titleWidth = contentWidth;
  const title = fitTextToWidth(doc, invoice.collection_name, titleWidth - 8, 17, 12);
  drawText(doc, title.text, titleX, 31, titleWidth, {
    align: 'center', bold: true, size: title.size, lineBreak: false
  });
  drawText(doc, documentTitle, titleX, 60, titleWidth, {
    align: 'center', bold: true, size: 10.5, color: '#374151'
  });
  const headerMetaOptions = { labelWidth: 52, valueGap: 0 };
  const topInfoGap = 12;
  const topCustomerWidth = 220;
  const topInvoiceWidth = 165;
  const topAttachmentWidth = contentWidth - topCustomerWidth - topInvoiceWidth - (topInfoGap * 2);
  const topInvoiceX = PAGE.margin + topAttachmentWidth + topInfoGap;
  const topCustomerX = topInvoiceX + topInvoiceWidth + topInfoGap;
  drawMetaLine(doc, topCustomerX, 98, topCustomerWidth,
    'نام مشتری', invoice.customer_name);
  drawMetaLine(doc, topInvoiceX, 98, topInvoiceWidth,
    isProforma ? 'شماره لیست' : 'شماره فاکتور', invoice.invoice_number, headerMetaOptions);
  drawMetaLine(doc, PAGE.margin, 98, topAttachmentWidth,
    'پیوست', invoice.parent_invoice_number, { ...headerMetaOptions, emptyValue: '' });

  const infoGap = 22;
  const infoWidth = (contentWidth - infoGap) / 2;
  const rightInfoX = PAGE.width - PAGE.margin - infoWidth;

  let y = 128;
  drawInvoiceTableHeader(doc, y);
  y += TABLE_HEADER_HEIGHT;

  const extraAdjustments = adjustments.filter((item) => (
    ['DAMAGE', 'LOSS', 'TRANSPORT', 'OTHER'].includes(item.adjustment_type)
  ));
  const invoiceRows = [
    ...lines.map((line) => ({
      description: toPersianDigits(line.description),
      quantity: line.quantity,
      days: line.charged_days,
      unitPrice: line.unit_price_toman,
      total: line.line_total_toman
    })),
    ...extraAdjustments.map((item) => ({
      description: toPersianDigits(`${adjustmentLabel(item.adjustment_type)} - ${item.description}`),
      quantity: 1,
      days: '-',
      unitPrice: item.amount_toman,
      total: item.amount_toman
    }))
  ];

  invoiceRows.forEach((row, index) => {
    if (y + 31 > TABLE_BOTTOM) y = addTablePage(doc, invoice);
    y = drawInvoiceRow(doc, y, [
      formatNumber(row.total),
      formatNumber(row.unitPrice),
      row.days === '-' ? '-' : formatNumber(row.days),
      formatNumber(row.quantity),
      row.description,
      formatNumber(index + 1)
    ], 31, { boldAmount: true });
  });

  const blankRows = Math.max(0, 7 - invoiceRows.length);
  for (let index = 0; index < blankRows; index += 1) {
    if (y + 31 > TABLE_BOTTOM) y = addTablePage(doc, invoice);
    y = drawInvoiceRow(doc, y, ['', '', '', '', '', formatNumber(invoiceRows.length + index + 1)], 31);
  }

  const noteChunks = splitNotes(doc, invoice.notes);
  noteChunks.forEach((note, index) => {
    if (y + 44 > TABLE_BOTTOM) y = addTablePage(doc, invoice);
    drawCell(doc, PAGE.margin, y, contentWidth, 44,
      `${index === 0 ? 'توضیحات: ' : ''}${note}`,
      { align: 'right', fill: '#fffbeb', size: 8.2 });
    y += 44;
  });

  const summaryRows = [
    ['جمع اجاره اقلام به تومان', invoice.subtotal_toman],
    ['هزینه های اضافی به تومان', invoice.extra_charges_toman],
    ['تخفیف به تومان', -Number(invoice.discount_amount_toman || 0)],
    [isProforma ? 'جمع برآوردی پیش‌فاکتور به تومان' : 'جمع کل این فاکتور به تومان', invoice.final_amount_toman]
  ];
  if (y + (summaryRows.length * 28) > TABLE_BOTTOM) y = addTablePage(doc, invoice);
  summaryRows.forEach(([label, amount], index) => {
    const isInvoiceTotal = index === summaryRows.length - 1;
    y = drawSummaryRow(doc, y, label, amount, {
      fill: isInvoiceTotal ? '#e5e7eb' : undefined,
      color: '#111827'
    });
  });

  if (y + 42 > TABLE_BOTTOM) {
    doc.addPage();
    y = 72;
  } else y += 12;
  drawMetaLine(doc, rightInfoX, y, infoWidth,
    'تاریخ تحویل', formatPersianDateTime(invoice.delivered_at));
  drawMetaLine(doc, PAGE.margin, y, infoWidth,
    'تاریخ برگشت', formatPersianDateTime(latestReturnAt(lines)));
  y += 30;

  if (isProforma) {
    if (y + 48 > TABLE_BOTTOM) {
      doc.addPage();
      y = 72;
    }
    drawCell(doc, PAGE.margin, y, contentWidth, 42,
      'این پیش‌فاکتور صرفاً برآورد اولیه است و سند مالی قطعی محسوب نمی‌شود. مبلغ نهایی بر اساس زمان واقعی برگشت، خسارت، کسری و هزینه‌های نهایی محاسبه خواهد شد.',
      { align: 'right', fill: '#fffbeb', stroke: '#d97706', color: '#92400e', bold: true, size: 8.2 });
    y += 48;
  }

  if (y + 96 > PAGE.height - 30) {
    doc.addPage();
    y = 72;
  } else y += 14;
  const signatureWidth = 194;
  const signatureX = PAGE.width - PAGE.margin - signatureWidth;
  drawText(doc, 'مهر و امضای مجموعه', signatureX + 8, y + 8, signatureWidth - 16, {
    bold: true, align: 'center', size: 8.5
  });
  doc.end();
  return promise;
}

function createInvoicePdfService(db) {
  async function generate(listId, invoiceId) {
    const data = getInvoicePdfData(db, listId, invoiceId);
    const buffer = await renderInvoicePdf(data);
    return { buffer, filename: `invoice-${data.invoice.invoice_number}.pdf`, data };
  }
  async function generateProforma(listId) {
    const data = getProformaPdfData(db, listId);
    const buffer = await renderInvoicePdf(data);
    return { buffer, filename: `proforma-${data.invoice.list_number}.pdf`, data };
  }
  return {
    generate,
    generateProforma,
    getInvoicePdfData: (listId, invoiceId) => getInvoicePdfData(db, listId, invoiceId),
    getProformaPdfData: (listId) => getProformaPdfData(db, listId)
  };
}

module.exports = {
  createInvoicePdfService,
  renderInvoicePdf,
  getInvoicePdfData,
  getProformaPdfData
};
