const db = require('../src/db/database');
const PersianDate = require('persian-date');

const rows = db.prepare('SELECT id, customer_id, date, price, description, created_at FROM invoices ORDER BY id DESC LIMIT 200').all();

const out = rows.map(r => {
  const m = String(r.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let persian = null;
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    const pd = new PersianDate(d);
    persian = `${pd.year()}/${String(pd.month()).padStart(2,'0')}/${String(pd.date()).padStart(2,'0')}`;
  }
  return { ...r, persian };
});

console.log(JSON.stringify(out, null, 2));
process.exit(0);
