function columnExists(db, tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all()
    .some((column) => column.name === columnName);
}

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_price_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_number INTEGER NOT NULL UNIQUE CHECK (version_number > 0),
      name TEXT NOT NULL,
      effective_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS product_price_version_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      price_version_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      category_name_snapshot TEXT,
      previous_price_toman INTEGER NOT NULL CHECK (previous_price_toman >= 0),
      new_price_toman INTEGER NOT NULL CHECK (new_price_toman >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (price_version_id) REFERENCES product_price_versions(id) ON DELETE RESTRICT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      UNIQUE (price_version_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS ix_product_price_versions_effective
      ON product_price_versions(effective_from DESC, version_number DESC);

    CREATE INDEX IF NOT EXISTS ix_product_price_version_items_version
      ON product_price_version_items(price_version_id, product_name_snapshot, id);
  `);

  if (!columnExists(db, 'product_price_history', 'price_version_id')) {
    db.exec(`
      ALTER TABLE product_price_history
      ADD COLUMN price_version_id INTEGER REFERENCES product_price_versions(id) ON DELETE SET NULL;
    `);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS ix_product_price_history_version
      ON product_price_history(price_version_id, product_id);
  `);
}

module.exports = {
  id: '006-product-price-versions',
  up
};
