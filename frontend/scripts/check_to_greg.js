const PersianDate = require('persian-date');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node check_to_greg.js YYYY MM DD');
  process.exit(1);
}
const [y,m,d] = args.map(Number);
const pd = new PersianDate([y,m,d]);
const g = pd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');
console.log(`${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')} -> ${g}`);
