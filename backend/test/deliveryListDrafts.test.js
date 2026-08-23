const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  DeliveryListDraftError,
  createDeliveryListDraftService
} = require('../src/services/deliveryListDraftService');

function createDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT
    );
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE app_settings (
      id INTEGER PRIMARY KEY,
      billing_cutoff_minutes INTEGER NOT NULL
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      daily_price_toman INTEGER NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE delivery_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_number TEXT,
      customer_id INTEGER,
      customer_name_snapshot TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      invoice_status TEXT NOT NULL DEFAULT 'NONE',
      invoice_send_status TEXT NOT NULL DEFAULT 'NOT_SENT',
      settlement_status TEXT NOT NULL DEFAULT 'UNPAID',
      delivered_at TEXT,
      expected_return_at TEXT,
      night_before INTEGER NOT NULL DEFAULT 0,
      billing_cutoff_minutes_snapshot INTEGER NOT NULL DEFAULT 660,
      completed_at TEXT,
      notes TEXT,
      created_by_user_id INTEGER NOT NULL,
      delivered_by_user_id INTEGER,
      last_autosaved_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
    CREATE TABLE delivery_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_list_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name_snapshot TEXT NOT NULL,
      daily_price_toman INTEGER NOT NULL,
      delivered_quantity INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    INSERT INTO users (id, username, display_name) VALUES (1, 'manager', 'مدیر');
    INSERT INTO customers (id, name) VALUES (1, 'علی حیدری');
    INSERT INTO app_settings (id, billing_cutoff_minutes) VALUES (1, 660);
    INSERT INTO products (id, name, daily_price_toman) VALUES (1, 'Sony A7 IV', 1500000);
    INSERT INTO products (id, name, daily_price_toman) VALUES (2, 'لنز 24-70', 800000);
  `);
  return db;
}

test('creates multiple drafts and autosaves customer, dates and items', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const first = service.createDraft(1);
    const second = service.createDraft(1);
    assert.equal(first.version, 1);
    assert.equal(service.listDrafts().length, 2);

    const saved = service.saveDraft(first.id, {
      version: first.version,
      customer_id: 1,
      customer_name_snapshot: 'نامی که نباید جایگزین مشتری شود',
      delivered_at: '2026-08-23T20:00:00+03:30',
      expected_return_at: '2026-08-25T11:00:00+03:30',
      night_before: true,
      notes: 'پیش‌نویس آزمایشی',
      items: [
        { product_id: 1, daily_price_toman: 1500000, delivered_quantity: 25 },
        { product_id: 2, daily_price_toman: 750000, delivered_quantity: 2, notes: 'قیمت توافقی' }
      ]
    });

    assert.equal(saved.version, 2);
    assert.equal(saved.customer_name, 'علی حیدری');
    assert.equal(saved.night_before, true);
    assert.equal(saved.items.length, 2);
    assert.equal(saved.items[0].delivered_quantity, 25);
    assert.equal(saved.items[1].daily_price_toman, 750000);
    assert.equal(service.listDrafts().find((draft) => draft.id === first.id).item_count, 2);

    service.deleteDraft(first.id);
    assert.equal(service.listDrafts().length, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM delivery_list_items').get().count, 0);
    assert.equal(service.getDraft(second.id).id, second.id);
  } finally {
    db.close();
  }
});

test('rejects stale autosaves and duplicate products', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const draft = service.createDraft(1);
    service.saveDraft(draft.id, { version: 1, items: [] });

    assert.throws(
      () => service.saveDraft(draft.id, { version: 1, items: [] }),
      (error) => error instanceof DeliveryListDraftError && error.statusCode === 409
    );

    assert.throws(
      () => service.saveDraft(draft.id, {
        version: 2,
        items: [
          { product_id: 1, daily_price_toman: 1, delivered_quantity: 1 },
          { product_id: 1, daily_price_toman: 1, delivered_quantity: 2 }
        ]
      }),
      /هر محصول فقط یک بار/
    );
  } finally {
    db.close();
  }
});
