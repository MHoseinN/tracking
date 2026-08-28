const path = require('path');
const PDFDocument = require('pdfkit');

const vazirmatnRoot = path.dirname(require.resolve('vazirmatn/package.json'));
const regularFont = path.join(vazirmatnRoot, 'fonts', 'ttf', 'Vazirmatn-Regular.ttf');
const boldFont = path.join(vazirmatnRoot, 'fonts', 'ttf', 'Vazirmatn-Bold.ttf');
const PAGE = { width: 595.28, height: 841.89, margin: 32 };
const CONTENT_WIDTH = PAGE.width - (PAGE.margin * 2);
const TABLE_TOP = 132;
const TABLE_BOTTOM = PAGE.height - 58;
const ROW_HEIGHT = 28;
const columns = [
  { key: 'new_price_toman', label: 'قیمت جدید', width: 95 },
  { key: 'previous_price_toman', label: 'قیمت قبلی', width: 95 },
  { key: 'category_name_snapshot', label: 'دسته بندی', width: 110 },
  { key: 'product_name_snapshot', label: 'نام محصول', width: 186.28 },
  { key: 'row', label: 'ردیف', width: 45 }
];

function toPersianDigits(value) {
  return String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function formatMoney(value) {
  return toPersianDigits(Number(value || 0).toLocaleString('en-US'));
}

function formatPersianDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return toPersianDigits(value || '-');
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Tehran'
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return toPersianDigits(`${part('year')}/${part('month')}/${part('day')} - ${part('hour')}:${part('minute')}`);
}

function drawText(doc, text, x, y, width, options = {}) {
  doc.font(options.bold ? 'Vazirmatn-Bold' : 'Vazirmatn')
    .fontSize(options.size || 8.5)
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
  doc.save().lineWidth(0.65).rect(x, y, width, height)
    .fillAndStroke(options.fill || '#ffffff', '#334155').restore();
  drawText(doc, text, x + 4, y + 7, width - 8, {
    size: options.size || 8,
    bold: options.bold,
    color: options.color,
    align: options.align || 'center',
    height: height - 8,
    lineBreak: false
  });
}

function drawHeader(doc, version, collectionName, pageNumber) {
  doc.save().lineWidth(0.8).rect(20, 20, PAGE.width - 40, PAGE.height - 40).stroke('#64748b').restore();
  drawText(doc, collectionName, PAGE.margin, 34, CONTENT_WIDTH, {
    align: 'center', bold: true, size: 15, lineBreak: false
  });
  drawText(doc, version.name, PAGE.margin, 61, CONTENT_WIDTH, {
    align: 'center', bold: true, size: 11, color: '#334155', lineBreak: false
  });
  drawText(doc, `نسخه: ${toPersianDigits(version.version_number)}`, PAGE.width - PAGE.margin - 170, 94, 170, {
    bold: true, size: 8.5, lineBreak: false
  });
  drawText(doc, `تاریخ ثبت: ${formatPersianDate(version.effective_from)}`, PAGE.margin, 94, 235, {
    size: 8.5, lineBreak: false
  });
  drawText(doc, `صفحه ${toPersianDigits(pageNumber)}`, PAGE.margin, PAGE.height - 47, CONTENT_WIDTH, {
    align: 'center', size: 7.5, color: '#64748b', lineBreak: false
  });
}

function drawTableHeader(doc, y) {
  let x = PAGE.margin;
  columns.forEach((column) => {
    drawCell(doc, x, y, column.width, ROW_HEIGHT, column.label, {
      fill: '#1e293b', color: '#ffffff', bold: true, size: 8
    });
    x += column.width;
  });
}

function drawRow(doc, item, rowNumber, y) {
  const values = {
    ...item,
    row: toPersianDigits(rowNumber),
    previous_price_toman: formatMoney(item.previous_price_toman),
    new_price_toman: formatMoney(item.new_price_toman),
    category_name_snapshot: item.category_name_snapshot || '-'
  };
  let x = PAGE.margin;
  columns.forEach((column) => {
    const changed = item.price_changed && ['previous_price_toman', 'new_price_toman'].includes(column.key);
    drawCell(doc, x, y, column.width, ROW_HEIGHT, values[column.key], {
      fill: changed ? '#ecfdf5' : '#ffffff',
      bold: column.key === 'new_price_toman' || column.key === 'product_name_snapshot',
      align: column.key === 'product_name_snapshot' ? 'right' : 'center'
    });
    x += column.width;
  });
}

function renderPriceVersionPdf(version, collectionName = 'مجموعه من') {
  const doc = new PDFDocument({
    size: 'A4', margins: { top: PAGE.margin, right: PAGE.margin, bottom: 48, left: PAGE.margin },
    info: { Title: version.name, Author: collectionName, Subject: `Price version ${version.version_number}` }
  });
  doc.registerFont('Vazirmatn', regularFont);
  doc.registerFont('Vazirmatn-Bold', boldFont);
  const chunks = [];
  const promise = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  let pageNumber = 1;
  let y = TABLE_TOP;
  drawHeader(doc, version, collectionName, pageNumber);
  drawTableHeader(doc, y);
  y += ROW_HEIGHT;

  version.items.forEach((item, index) => {
    if (y + ROW_HEIGHT > TABLE_BOTTOM) {
      doc.addPage();
      pageNumber += 1;
      drawHeader(doc, version, collectionName, pageNumber);
      y = TABLE_TOP;
      drawTableHeader(doc, y);
      y += ROW_HEIGHT;
    }
    drawRow(doc, item, index + 1, y);
    y += ROW_HEIGHT;
  });

  doc.end();
  return promise;
}

function createProductPriceVersionPdfService(db, catalogService) {
  return {
    async generate(versionId) {
      const version = catalogService.getPriceVersion(versionId);
      const settings = db.prepare('SELECT collection_name FROM app_settings WHERE id = 1').get();
      const buffer = await renderPriceVersionPdf(version, settings?.collection_name || 'مجموعه من');
      return { buffer, filename: `price-version-${version.version_number}.pdf` };
    }
  };
}

module.exports = { createProductPriceVersionPdfService, renderPriceVersionPdf };
