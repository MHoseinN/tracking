const Database = require('better-sqlite3');
const path = require('path');
const PersianDate = require('persian-date');

const dbPath = path.join(__dirname, '../data/tracking.db');
const db = new Database(dbPath, { readonly: true });

function showRange(y, m) {
  const startPd = new PersianDate([y, m, 1]);
  const startGreg = startPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const nextStartPd = new PersianDate([nextYear, nextMonth, 1]);
  const nextStartGregStr = nextStartPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');
  const mMatch = String(nextStartGregStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const ny = Number(mMatch[1]), nm = Number(mMatch[2]), nd = Number(mMatch[3]);
  const nextDateObj = new Date(ny, nm - 1, nd);
  nextDateObj.setDate(nextDateObj.getDate() - 1);
  const ey = nextDateObj.getFullYear();
  const em = String(nextDateObj.getMonth() + 1).padStart(2, '0');
  const ed = String(nextDateObj.getDate()).padStart(2, '0');
  const endGreg = `${ey}-${em}-${ed}`;
  return { start: startGreg, end: endGreg };
}

const checks = [ [1405,2], [1405,3] ];

for (const [y,m] of checks) {
  const { start, end } = showRange(y,m);
  console.log(`\nChecking Persian ${y}/${String(m).padStart(2,'0')} => ${start} .. ${end}`);
  const rows = db.prepare('SELECT id, customer_id, date, price, description FROM invoices WHERE date >= ? AND date <= ? ORDER BY date ASC').all(start, end);
  if (!rows.length) console.log('  No invoices in this range');
  for (const r of rows) {
    const pd = new PersianDate(new Date(r.date));
    const pstr = `${pd.year()}/${String(pd.month()).padStart(2,'0')}/${String(pd.date()).padStart(2,'0')}`;
    console.log(`  id=${r.id} date=${r.date} persian=${pstr} customer=${r.customer_id} price=${r.price}`);
  }
}

db.close();
