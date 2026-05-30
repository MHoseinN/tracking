const db = require('../db/database');

// GET /api/invoices/stats/persian?groupBy=year|month&persianYear=1405
// Aggregates invoices by Persian year or Persian month (safer for boundary cases)
function getInvoiceStatsPersian(req, res) {
  const groupBy = req.query.groupBy === 'year' ? 'year' : 'month';
  const persianYear = req.query.persianYear ? Number(String(req.query.persianYear)) : null;
  const PersianDate = require('persian-date');

  try {
    const rows = db.prepare('SELECT date, price FROM invoices').all();

    const agg = new Map();

    for (const r of rows) {
      const m = String(r.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) continue;
      const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
      const pd = new PersianDate(d);
      const py = pd.year();
      const pm = pd.month();

      if (groupBy === 'year') {
        const key = String(py);
        const curr = agg.get(key) || { invoice_count: 0, total_income: 0 };
        curr.invoice_count += 1;
        curr.total_income += Number(r.price) || 0;
        agg.set(key, curr);
      } else {
        if (persianYear && Number(py) !== persianYear) continue;
        const monthKey = `${py}-${String(pm).padStart(2, '0')}`;
        const curr = agg.get(monthKey) || { invoice_count: 0, total_income: 0 };
        curr.invoice_count += 1;
        curr.total_income += Number(r.price) || 0;
        agg.set(monthKey, curr);
      }
    }

    const rowsOut = Array.from(agg.entries())
      .map(([period, data]) => ({ period, invoice_count: data.invoice_count, total_income: data.total_income }))
      .sort((a, b) => String(a.period).localeCompare(String(b.period)));

    res.json({ groupBy, rows: rowsOut });
  } catch (err) {
    console.error('Get invoice persian stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getInvoiceStatsPersian };
