const assert = require('node:assert/strict');
const test = require('node:test');
const Database = require('better-sqlite3');
const { runMigrations } = require('../src/db/migrations');

function createLegacyDatabase({ includeLegacyInvoice = true } = {}) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      notes TEXT,
      is_shipped INTEGER DEFAULT 0,
      is_settled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE inventory_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE inventory_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE inventory_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      unit_number INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE
    );

    CREATE TABLE inventory_reservation_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE inventory_reservation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_order_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      FOREIGN KEY (reservation_order_id) REFERENCES inventory_reservation_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES inventory_units(id) ON DELETE CASCADE
    );

    INSERT INTO users (username, password) VALUES ('manager', 'hash');
    INSERT INTO customers (name) VALUES ('مشتری قدیمی');
    INSERT INTO inventory_categories (name, slug) VALUES ('دوربین', 'camera');
    INSERT INTO inventory_categories (name, slug, parent_id) VALUES ('لنز', 'lens', 1);
    INSERT INTO inventory_categories (name, slug, parent_id) VALUES ('لنز دوم', 'lens', 1);
    INSERT INTO inventory_products (name, category_id, total_quantity)
      VALUES ('Sony Alpha 7 IV', 1, 3);
    INSERT INTO inventory_units (product_id, unit_number) VALUES (1, 1);
    INSERT INTO inventory_reservations (
      product_id, customer_id, quantity, start_date, end_date
    ) VALUES (1, 1, 1, '2026-08-20', '2026-08-22');
    INSERT INTO inventory_reservation_orders (
      customer_id, start_date, end_date
    ) VALUES (1, '2026-08-20', '2026-08-22');
    INSERT INTO inventory_reservation_items (
      reservation_order_id, unit_id
    ) VALUES (1, 1);
  `);
  if (includeLegacyInvoice) {
    db.prepare(`
      INSERT INTO invoices (
        customer_id, date, price, description, is_shipped, is_settled
      ) VALUES (1, '2026-08-01', 1250000.4, 'فاکتور قدیمی', 1, 1)
    `).run();
  }
  return db;
}

test('migrates legacy data and is idempotent', () => {
  const db = createLegacyDatabase();
  try {
    runMigrations(db);
    runMigrations(db);

    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count,
      4
    );
    assert.equal(db.prepare('SELECT role FROM users WHERE id = 1').get().role, 'MANAGER');
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM pragma_table_info('users') WHERE name = 'phone'").get().count, 1);
    assert.equal(
      db.prepare('SELECT billing_cutoff_minutes FROM app_settings WHERE id = 1').get()
        .billing_cutoff_minutes,
      660
    );

    const product = db.prepare('SELECT * FROM products WHERE id = 1').get();
    assert.equal(product.name, 'Sony Alpha 7 IV');
    assert.equal(product.daily_price_toman, 0);
    assert.equal(
      db.prepare('SELECT parent_id FROM product_categories WHERE id = 2').get().parent_id,
      1
    );

    const removedLegacyTables = [
      'inventory_categories',
      'inventory_products',
      'inventory_reservations',
      'inventory_units',
      'inventory_reservation_orders',
      'inventory_reservation_items'
    ];
    removedLegacyTables.forEach((tableName) => {
      assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(tableName).count,
        0,
        `${tableName} should be removed`
      );
    });

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = 1').get();
    assert.equal(invoice.invoice_type, 'PRIMARY');
    assert.equal(invoice.status, 'ISSUED');
    assert.equal(invoice.settlement_status, 'PAID');
    assert.equal(invoice.send_status, 'SENT');
    assert.equal(invoice.final_amount_toman, 1250000);
    assert.match(invoice.invoice_number, /^405\d{4}$/);

    const convertedList = db.prepare('SELECT * FROM delivery_lists WHERE legacy_invoice_id = 1').get();
    assert.ok(convertedList);
    assert.match(convertedList.list_number, /^05\d{4}$/);
    assert.equal(convertedList.status, 'COMPLETED');
    assert.equal(convertedList.invoice_status, 'ISSUED');
    assert.equal(convertedList.invoice_send_status, 'SENT');
    assert.equal(convertedList.settlement_status, 'PAID');
    assert.equal(db.prepare('SELECT COUNT(*) count FROM delivery_list_items WHERE delivery_list_id = ?').get(convertedList.id).count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM invoice_lines WHERE invoice_id = 1').get().count, 1);
    assert.equal(db.prepare('SELECT amount_toman FROM payments WHERE invoice_id = 1').get().amount_toman, 1250000);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM invoice_send_logs WHERE invoice_id = 1').get().count, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});

test('enforces delivery and return invariants', () => {
  const db = createLegacyDatabase({ includeLegacyInvoice: false });
  try {
    runMigrations(db);
    db.prepare(`
      INSERT INTO delivery_lists (
        list_number, customer_id, customer_name_snapshot, status,
        delivered_at, expected_return_at, created_by_user_id, delivered_by_user_id
      ) VALUES (?, ?, ?, 'DELIVERED', ?, ?, ?, ?)
    `).run(
      'LST-0001',
      1,
      'مشتری قدیمی',
      '2026-08-20T16:00:00+03:30',
      '2026-08-22T11:00:00+03:30',
      1,
      1
    );
    db.prepare(`
      INSERT INTO delivery_list_items (
        delivery_list_id, product_id, product_name_snapshot,
        daily_price_toman, delivered_quantity
      ) VALUES (1, 1, 'Sony Alpha 7 IV', 500000, 2)
    `).run();

    const list = db.prepare('SELECT * FROM delivery_lists WHERE id = 1').get();
    assert.equal(list.invoice_status, 'NONE');
    assert.equal(list.invoice_send_status, 'NOT_SENT');
    assert.equal(list.settlement_status, 'UNPAID');
    db.prepare(`
      INSERT INTO return_events (
        delivery_list_id, returned_at, received_by_user_id
      ) VALUES (1, '2026-08-22T11:00:00+03:30', 1)
    `).run();
    db.prepare(`
      INSERT INTO return_event_items (
        return_event_id, delivery_list_item_id, healthy_quantity,
        system_calculated_days, final_charged_days
      ) VALUES (1, 1, 1, 1, 1)
    `).run();

    assert.throws(() => {
      db.prepare(`
        INSERT INTO return_events (
          delivery_list_id, returned_at, received_by_user_id
        ) VALUES (1, '2026-08-23T11:01:00+03:30', 1)
      `).run();
      db.prepare(`
        INSERT INTO return_event_items (
          return_event_id, delivery_list_item_id, healthy_quantity,
          system_calculated_days, final_charged_days
        ) VALUES (2, 1, 2, 2, 2)
      `).run();
    }, /returned quantity exceeds delivered quantity/);

    assert.throws(() => {
      db.prepare(`
        INSERT INTO delivery_list_items (
          delivery_list_id, product_id, product_name_snapshot,
          daily_price_toman, delivered_quantity
        ) VALUES (1, NULL, 'نامعتبر', 1000, 0)
      `).run();
    }, /CHECK constraint failed/);

    assert.throws(
      () => db.prepare('DELETE FROM delivery_lists WHERE id = 1').run(),
      /finalized delivery lists must be archived/
    );
  } finally {
    db.close();
  }
});
