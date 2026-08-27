const persianDateFormatter = new Intl.DateTimeFormat('en-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  timeZone: 'Asia/Tehran'
});

function persianPeriod(value) {
  if (!value) return null;
  const text = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T12:00:00+03:30`
    : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const parts = persianDateFormatter.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value;
  const year = Number(getPart('year'));
  const month = Number(getPart('month'));
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  return { year, month, yearKey: String(year), monthKey: `${year}-${String(month).padStart(2, '0')}` };
}

function countBy(rows, field, initialKeys = []) {
  const result = Object.fromEntries(initialKeys.map((key) => [key, 0]));
  rows.forEach((row) => {
    const key = String(row[field] || 'UNKNOWN');
    result[key] = (result[key] || 0) + 1;
  });
  return result;
}

function createReportService(db) {
  function getOverview(options = {}) {
    const requestedYear = options.persianYear === null || options.persianYear === undefined
      ? null
      : Number(options.persianYear);
    if (requestedYear !== null && (!Number.isInteger(requestedYear) || requestedYear < 1300 || requestedYear > 1600)) {
      throw new Error('سال شمسی گزارش نامعتبر است');
    }

    const invoiceRows = db.prepare(`
      SELECT invoices.id, invoices.delivery_list_id, invoices.customer_id,
             COALESCE(customers.name, delivery_lists.customer_name_snapshot, 'بدون نام') AS customer_name,
             invoices.final_amount_toman, invoices.send_status,
             invoices.settlement_status,
             COALESCE(invoices.issued_at, invoices.date) AS report_at
      FROM invoices
      JOIN delivery_lists ON delivery_lists.id = invoices.delivery_list_id
      LEFT JOIN customers ON customers.id = invoices.customer_id
      WHERE invoices.status = 'ISSUED'
        AND invoices.deleted_at IS NULL
        AND delivery_lists.archived_at IS NULL
      ORDER BY report_at, invoices.id
    `).all().map((invoice) => ({ ...invoice, period: persianPeriod(invoice.report_at) }))
      .filter((invoice) => invoice.period);

    const availableYears = [...new Set(invoiceRows.map((invoice) => invoice.period.year))]
      .sort((left, right) => right - left);
    const scopedInvoices = requestedYear === null
      ? invoiceRows
      : invoiceRows.filter((invoice) => invoice.period.year === requestedYear);
    const scopedInvoiceIds = new Set(scopedInvoices.map((invoice) => Number(invoice.id)));
    const scopedInvoiceListIds = new Set(scopedInvoices.map((invoice) => Number(invoice.delivery_list_id)));

    const listRows = db.prepare(`
      SELECT id, status, invoice_status, invoice_send_status, settlement_status,
             COALESCE(delivered_at, created_at) AS report_at
      FROM delivery_lists
      WHERE archived_at IS NULL
    `).all().map((list) => ({ ...list, period: persianPeriod(list.report_at) }))
      .filter((list) => list.period);
    const scopedLists = requestedYear === null
      ? listRows
      : listRows.filter((list) => list.period.year === requestedYear);

    const payments = db.prepare(`
      SELECT payments.delivery_list_id, payments.invoice_id, payments.amount_toman
      FROM payments
      JOIN delivery_lists ON delivery_lists.id = payments.delivery_list_id
      WHERE payments.voided_at IS NULL
        AND delivery_lists.archived_at IS NULL
    `).all();
    const scopedPayments = payments.filter((payment) => {
      if (requestedYear === null) return true;
      if (payment.invoice_id !== null && payment.invoice_id !== undefined) {
        return scopedInvoiceIds.has(Number(payment.invoice_id));
      }
      return scopedInvoiceListIds.has(Number(payment.delivery_list_id));
    });

    const totalInvoiced = scopedInvoices.reduce(
      (sum, invoice) => sum + (Number(invoice.final_amount_toman) || 0),
      0
    );
    const totalPaid = scopedPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount_toman) || 0),
      0
    );
    const groupedPeriods = new Map();
    scopedInvoices.forEach((invoice) => {
      const key = requestedYear === null ? invoice.period.yearKey : invoice.period.monthKey;
      const current = groupedPeriods.get(key) || {
        period: key,
        invoice_count: 0,
        total_invoiced_toman: 0
      };
      current.invoice_count += 1;
      current.total_invoiced_toman += Number(invoice.final_amount_toman) || 0;
      groupedPeriods.set(key, current);
    });

    const customerMap = new Map();
    scopedInvoices.forEach((invoice) => {
      const key = Number(invoice.customer_id) || invoice.customer_name;
      const current = customerMap.get(key) || {
        customer_id: Number(invoice.customer_id) || null,
        customer_name: invoice.customer_name,
        invoice_count: 0,
        total_invoiced_toman: 0
      };
      current.invoice_count += 1;
      current.total_invoiced_toman += Number(invoice.final_amount_toman) || 0;
      customerMap.set(key, current);
    });

    const sendCounts = countBy(scopedInvoices, 'send_status', ['NOT_SENT', 'SENT']);
    const settlementCounts = countBy(scopedLists, 'settlement_status', ['UNPAID', 'PARTIAL', 'PAID']);
    const listStatusCounts = countBy(
      scopedLists,
      'status',
      ['DRAFT', 'DELIVERED', 'REMAINING', 'NEEDS_FOLLOW_UP', 'COMPLETED']
    );

    return {
      scope: { persian_year: requestedYear },
      available_years: availableYears,
      summary: {
        total_invoiced_toman: totalInvoiced,
        total_paid_toman: totalPaid,
        outstanding_toman: Math.max(0, totalInvoiced - totalPaid),
        credit_toman: Math.max(0, totalPaid - totalInvoiced),
        invoice_count: scopedInvoices.length,
        list_count: scopedLists.length,
        average_invoice_toman: scopedInvoices.length ? Math.round(totalInvoiced / scopedInvoices.length) : 0
      },
      period_rows: [...groupedPeriods.values()].sort((left, right) => left.period.localeCompare(right.period)),
      operational: {
        invoice_send: sendCounts,
        settlement: settlementCounts,
        list_status: listStatusCounts
      },
      top_customers: [...customerMap.values()]
        .sort((left, right) => right.total_invoiced_toman - left.total_invoiced_toman)
        .slice(0, 5)
    };
  }

  return { getOverview };
}

module.exports = { createReportService, persianPeriod };
