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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
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
