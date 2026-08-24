const persianYearFormatter = new Intl.DateTimeFormat('en-u-ca-persian', {
  year: 'numeric',
  timeZone: 'Asia/Tehran'
});

function getPersianYear(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) throw new Error('تاریخ شماره‌گذاری نامعتبر است');
  const yearPart = persianYearFormatter.formatToParts(date).find((part) => part.type === 'year');
  const year = Number(yearPart?.value);
  if (!Number.isInteger(year)) throw new Error('سال شمسی تاریخ قابل محاسبه نیست');
  return year;
}

function nextNumber(db, table, column, prefixLength, dateValue) {
  const year = String(getPersianYear(dateValue));
  const prefix = year.slice(-prefixLength);
  const activeCondition = table === 'delivery_lists' ? 'archived_at IS NULL' : 'deleted_at IS NULL';
  const rows = db.prepare(`
    SELECT ${column} AS number
    FROM ${table}
    WHERE ${column} IS NOT NULL AND ${activeCondition}
  `).all();
  const lastSequence = rows.reduce((maximum, row) => {
    const value = String(row.number || '');
    if (!value.startsWith(prefix)) return maximum;
    const suffix = value.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return maximum;
    const sequence = Number(suffix);
    return sequence >= 1000 ? Math.max(maximum, sequence) : maximum;
  }, 999);
  return `${prefix}${lastSequence + 1}`;
}

function nextDeliveryListNumber(db, deliveredAt) {
  return nextNumber(db, 'delivery_lists', 'list_number', 2, deliveredAt);
}

function nextInvoiceNumber(db, issuedAt) {
  return nextNumber(db, 'invoices', 'invoice_number', 3, issuedAt);
}

module.exports = { getPersianYear, nextDeliveryListNumber, nextInvoiceNumber };
