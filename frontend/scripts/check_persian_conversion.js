const PersianDate = require('persian-date');

const dates = process.argv.slice(2);
if (dates.length === 0) {
  console.log('Usage: node check_persian_conversion.js YYYY-MM-DD [YYYY-MM-DD ...]');
  process.exit(1);
}

for (const d of dates) {
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    console.log(d, ' -> invalid format');
    continue;
  }
  const gd = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  const pd = new PersianDate(gd);
  const p = `${pd.year()}/${String(pd.month()).padStart(2,'0')}/${String(pd.date()).padStart(2,'0')}`;
  console.log(d, '->', p);
}
