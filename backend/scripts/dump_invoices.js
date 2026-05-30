const db = require('../src/db/database');

const rows = db.prepare('SELECT id, customer_id, date, price, description, created_at FROM invoices ORDER BY id DESC LIMIT 200').all();
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
