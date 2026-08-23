const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  ProductCatalogError,
  createProductCatalogService
} = require('../src/services/productCatalogService');

function createDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      display_name TEXT
    );
    INSERT INTO users (id, display_name) VALUES (1, 'مدیر');

    CREATE TABLE product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (parent_id) REFERENCES product_categories(id)
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      daily_price_toman INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    );

    CREATE TABLE product_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      daily_price_toman INTEGER NOT NULL,
      effective_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      changed_by_user_id INTEGER,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
    );
  `);
  return db;
}

test('products have a daily price but no inventory quantity and price changes are tracked', () => {
  const db = createDatabase();
  try {
    const service = createProductCatalogService(db);
    const category = service.createCategory({ name: 'دوربین', parent_id: null });
    const product = service.createProduct({
      name: 'Sony A7 IV',
      category_id: category.id,
      daily_price_toman: 1500000,
      notes: null
    }, 1);

    assert.equal(product.daily_price_toman, 1500000);
    assert.equal(Object.hasOwn(product, 'total_quantity'), false);
    assert.equal(service.getPriceHistory(product.id).length, 1);

    service.updateProduct(product.id, {
      daily_price_toman: 1800000,
      price_change_reason: 'قیمت جدید سال'
    }, 1);
    const history = service.getPriceHistory(product.id);
    assert.equal(history.length, 2);
    assert.equal(history[0].daily_price_toman, 1800000);
    assert.equal(history[0].reason, 'قیمت جدید سال');

    service.updateProduct(product.id, { name: 'Sony Alpha 7 IV' }, 1);
    assert.equal(service.getPriceHistory(product.id).length, 2);
  } finally {
    db.close();
  }
});

test('product and category deletion are soft and protected by catalog relations', () => {
  const db = createDatabase();
  try {
    const service = createProductCatalogService(db);
    const category = service.createCategory({ name: 'نور', parent_id: null });
    const product = service.createProduct({
      name: 'Aputure 300D',
      category_id: category.id,
      daily_price_toman: 900000
    }, 1);

    assert.throws(
      () => service.deleteCategory(category.id),
      (error) => error instanceof ProductCatalogError && error.statusCode === 409
    );

    service.deleteProduct(product.id);
    assert.equal(service.listProducts().length, 0);
    service.deleteCategory(category.id);
    assert.equal(service.listCategories().length, 0);
  } finally {
    db.close();
  }
});

test('category hierarchy rejects cycles and returns a tree', () => {
  const db = createDatabase();
  try {
    const service = createProductCatalogService(db);
    const root = service.createCategory({ name: 'تجهیزات', parent_id: null });
    const child = service.createCategory({ name: 'صدا', parent_id: root.id });

    assert.equal(service.getCatalog().category_tree[0].children[0].id, child.id);
    assert.throws(
      () => service.updateCategory(root.id, { parent_id: child.id }),
      (error) => error instanceof ProductCatalogError
    );
  } finally {
    db.close();
  }
});
