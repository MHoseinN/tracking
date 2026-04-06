const PersianDate = require('persian-date');

function getRange(y, m) {
  const startPd = new PersianDate([y, m, 1]);
  const startGreg = startPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');

  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const nextStartPd = new PersianDate([nextYear, nextMonth, 1]);
  const nextStartGregStr = nextStartPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');

  const mMatch = String(nextStartGregStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!mMatch) return { startGreg, endGreg: startGreg };
  const ny = Number(mMatch[1]), nm = Number(mMatch[2]), nd = Number(mMatch[3]);
  const nextDateObj = new Date(ny, nm - 1, nd);
  nextDateObj.setDate(nextDateObj.getDate() - 1);
  const ey = nextDateObj.getFullYear();
  const em = String(nextDateObj.getMonth() + 1).padStart(2, '0');
  const ed = String(nextDateObj.getDate()).padStart(2, '0');
  const endGreg = `${ey}-${em}-${ed}`;

  return { startGreg, endGreg };
}

const months = [ [1405,2], [1405,3], [1405,1] ];
for (const [y,m] of months) {
  const { startGreg, endGreg } = getRange(y,m);
  console.log(`Persian ${y}/${String(m).padStart(2,'0')} => ${startGreg} .. ${endGreg}`);
}

// Show conversion examples for specific Persian dates
const examples = ['1405/02/02', '1405/02/15', '1405/03/02'];
for (const ex of examples) {
  const parts = ex.split('/').map(Number);
  const pd = new PersianDate([parts[0], parts[1], parts[2]]);
  const g = pd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');
  console.log(`${ex} => ${g}`);
}
