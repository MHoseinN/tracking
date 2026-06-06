const db = require('./database');
const bcrypt = require('bcryptjs');

function initDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      referrer TEXT,
      account_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Safe migration for existing databases created before profile columns were added.
  const customerColumns = db.prepare('PRAGMA table_info(customers)').all().map((c) => c.name);
  if (!customerColumns.includes('first_name')) {
    db.exec('ALTER TABLE customers ADD COLUMN first_name TEXT');
  }
  if (!customerColumns.includes('last_name')) {
    db.exec('ALTER TABLE customers ADD COLUMN last_name TEXT');
  }
  if (!customerColumns.includes('phone')) {
    db.exec('ALTER TABLE customers ADD COLUMN phone TEXT');
  }
  if (!customerColumns.includes('referrer')) {
    db.exec('ALTER TABLE customers ADD COLUMN referrer TEXT');
  }
  if (!customerColumns.includes('account_status')) {
    db.exec('ALTER TABLE customers ADD COLUMN account_status TEXT');
  }
  if (!customerColumns.includes('notes')) {
    db.exec('ALTER TABLE customers ADD COLUMN notes TEXT');
  }

  db.exec(`
    UPDATE customers
    SET
      first_name = COALESCE(NULLIF(first_name, ''), TRIM(CASE WHEN INSTR(name, ' ') > 0 THEN SUBSTR(name, 1, INSTR(name, ' ') - 1) ELSE name END)),
      last_name = COALESCE(NULLIF(last_name, ''), TRIM(CASE WHEN INSTR(name, ' ') > 0 THEN SUBSTR(name, INSTR(name, ' ') + 1) ELSE '' END))
    WHERE first_name IS NULL OR first_name = '' OR last_name IS NULL
  `);

  // Create invoices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      is_shipped INTEGER DEFAULT 0,
      is_settled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // Create default admin user if not exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('1010');
  if (!existingUser) {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('1010', hashedPassword);
    console.log('Default admin user created: username=1010, password=123456');
  }

  console.log('Database initialized successfully');
}

module.exports = { initDatabase };
