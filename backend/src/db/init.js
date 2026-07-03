const db = require('./database');
const bcrypt = require('bcryptjs');

function hasColumn(tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

function rebuildInventoryCategoriesIfNeeded() {
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'inventory_categories'").get();
  if (!tableExists) {
    return;
  }

  if (hasColumn('inventory_categories', 'parent_id') && hasColumn('inventory_categories', 'slug')) {
    return;
  }

  db.exec(`
    ALTER TABLE inventory_categories RENAME TO inventory_categories_legacy;

    CREATE TABLE inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES inventory_categories(id) ON DELETE CASCADE,
      UNIQUE(parent_id, slug)
    )
  `);

  const legacyCategories = db.prepare('SELECT id, name, created_at FROM inventory_categories_legacy ORDER BY id ASC').all();
  const insertCategory = db.prepare(`
    INSERT INTO inventory_categories (name, slug, parent_id, created_at, updated_at)
    VALUES (?, ?, NULL, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
  `);
  const legacyIdToNewId = new Map();

  legacyCategories.forEach((category) => {
    const slug = String(category.name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    const result = insertCategory.run(category.name, slug || `legacy-${category.id}`, category.created_at);
    legacyIdToNewId.set(category.id, result.lastInsertRowid);
  });

  if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'inventory_products'").get()
    && hasColumn('inventory_products', 'category_id')) {
    const products = db.prepare('SELECT id, category_id FROM inventory_products WHERE category_id IS NOT NULL').all();
    const updateProductCategory = db.prepare('UPDATE inventory_products SET category_id = ? WHERE id = ?');
    products.forEach((product) => {
      const mappedCategoryId = legacyIdToNewId.get(product.category_id);
      if (mappedCategoryId) {
        updateProductCategory.run(mappedCategoryId, product.id);
      }
    });
  }

  db.exec('DROP TABLE inventory_categories_legacy');
}

function slugifyCategoryName(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized
    .replace(/[\u200c\u200f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function ensureLegacyCategoryMirrorTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_categories_legacy (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function syncLegacyCategoryMirror(categoryId, categoryName, createdAt = null) {
  ensureLegacyCategoryMirrorTable();
  const syntheticName = `${String(categoryName || 'category').trim()}__${categoryId}`;
  const existing = db.prepare('SELECT id FROM inventory_categories_legacy WHERE id = ?').get(categoryId);

  if (existing) {
    db.prepare('UPDATE inventory_categories_legacy SET name = ? WHERE id = ?').run(syntheticName, categoryId);
    return;
  }

  db.prepare(`
    INSERT INTO inventory_categories_legacy (id, name, created_at)
    VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))
  `).run(categoryId, syntheticName, createdAt);
}

function ensureCategoryPath(pathSegments) {
  let parentId = null;
  let currentCategory = null;

  pathSegments.forEach((segment) => {
    const name = String(segment || '').trim();
    if (!name) return;

    const slug = slugifyCategoryName(name) || `cat-${Date.now()}`;
    currentCategory = db.prepare(`
      SELECT id, name, slug, parent_id
      FROM inventory_categories
      WHERE slug = ? AND ${parentId === null ? 'parent_id IS NULL' : 'parent_id = ?'}
    `).get(...(parentId === null ? [slug] : [slug, parentId]));

    if (!currentCategory) {
      const result = db.prepare(`
        INSERT INTO inventory_categories (name, slug, parent_id, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(name, slug, parentId);
      currentCategory = db.prepare('SELECT id, name, slug, parent_id FROM inventory_categories WHERE id = ?').get(result.lastInsertRowid);
      syncLegacyCategoryMirror(currentCategory.id, currentCategory.name);
    }

    parentId = currentCategory.id;
  });

  return currentCategory;
}

function seedInventoryTree() {
  const seedDefinitions = [
    { path: ['دوربین', 'سونی'], products: [['A7 III', 6], ['A7 IV', 4], ['FX3', 3]] },
    { path: ['دوربین', 'کنون'], products: [['5D IV', 3], ['5D III', 3], ['80D', 3]] },
    { path: ['لنز', 'سونی'], products: [['70.200', 5], ['24.70', 5]] },
    { path: ['لنز', 'کنون'], products: [['70.200', 4], ['24.70', 2]] },
    { path: ['پایه', 'دوربین'], products: [['ساچلر FSB4', 10], ['بنرو', 3]] },
    { path: ['پایه', 'نور'], products: [['پایه نور 800', 30], ['پایه آرک', 4]] },
    { path: ['نور', 'نورپردازی'], products: [['Forza 300B', 8], ['Forza 300C', 3]] },
    { path: ['نور', 'سافت'], products: [['سافت باکس 300', 7], ['اکتاباکس 60', 8]] }
  ];

  seedDefinitions.forEach((entry) => {
    const category = ensureCategoryPath(entry.path);
    if (!category) return;

    entry.products.forEach(([name, quantity]) => {
      const existing = db.prepare(`
        SELECT id
        FROM inventory_products
        WHERE category_id = ? AND LOWER(TRIM(name)) = LOWER(?)
      `).get(category.id, name);

      if (!existing) {
        const result = db.prepare(`
          INSERT INTO inventory_products (name, category_id, total_quantity, notes, created_at, updated_at)
          VALUES (?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(name, category.id, quantity);

        const insertUnit = db.prepare('INSERT INTO inventory_units (product_id, unit_number, is_active) VALUES (?, ?, 1)');
        for (let unitNumber = 1; unitNumber <= quantity; unitNumber += 1) {
          insertUnit.run(result.lastInsertRowid, unitNumber);
        }
      }
    });
  });
}

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
      notes TEXT,
      is_shipped INTEGER DEFAULT 0,
      is_settled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  const invoiceColumns = db.prepare('PRAGMA table_info(invoices)').all().map((c) => c.name);
  if (!invoiceColumns.includes('notes')) {
    db.exec('ALTER TABLE invoices ADD COLUMN notes TEXT');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES inventory_categories(id) ON DELETE CASCADE,
      UNIQUE(parent_id, slug)
    )
  `);

  rebuildInventoryCategoriesIfNeeded();
  ensureLegacyCategoryMirrorTable();

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      unit_number INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
      UNIQUE(product_id, unit_number)
    )
  `);

  const inventoryUnitColumns = db.prepare('PRAGMA table_info(inventory_units)').all().map((c) => c.name);
  if (!inventoryUnitColumns.includes('is_active')) {
    db.exec('ALTER TABLE inventory_units ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_reservation_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      customer_name TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  if (!hasColumn('inventory_reservation_orders', 'customer_name')) {
    db.exec('ALTER TABLE inventory_reservation_orders ADD COLUMN customer_name TEXT');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_reservation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_order_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      released_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reservation_order_id) REFERENCES inventory_reservation_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES inventory_units(id) ON DELETE CASCADE,
      UNIQUE(reservation_order_id, unit_id)
    )
  `);

  if (!hasColumn('inventory_reservation_items', 'released_at')) {
    db.exec('ALTER TABLE inventory_reservation_items ADD COLUMN released_at DATETIME');
  }

  const inventoryProducts = db.prepare('SELECT id, total_quantity FROM inventory_products ORDER BY id ASC').all();
  const countUnitsByProduct = db.prepare('SELECT COUNT(*) AS count FROM inventory_units WHERE product_id = ?');
  const maxUnitNumberByProduct = db.prepare('SELECT COALESCE(MAX(unit_number), 0) AS max_number FROM inventory_units WHERE product_id = ?');
  const insertUnit = db.prepare('INSERT INTO inventory_units (product_id, unit_number, is_active) VALUES (?, ?, 1)');
  const activateUnits = db.prepare('UPDATE inventory_units SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?');

  inventoryProducts.forEach((product) => {
    activateUnits.run(product.id);
    const currentCount = Number(countUnitsByProduct.get(product.id)?.count) || 0;
    const targetCount = Number(product.total_quantity) || 0;

    if (currentCount >= targetCount) {
      return;
    }

    let nextUnitNumber = Number(maxUnitNumberByProduct.get(product.id)?.max_number) || 0;
    for (let index = currentCount; index < targetCount; index += 1) {
      nextUnitNumber += 1;
      insertUnit.run(product.id, nextUnitNumber);
    }
  });

  db.prepare('SELECT id, name, created_at FROM inventory_categories ORDER BY id ASC').all().forEach((category) => {
    syncLegacyCategoryMirror(category.id, category.name, category.created_at);
  });

  seedInventoryTree();

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
