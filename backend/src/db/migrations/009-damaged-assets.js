module.exports = {
  id: '20261121_009_damaged_assets',
  up(db) {
    db.exec(`
      CREATE TABLE repairers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE damaged_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name_snapshot TEXT NOT NULL,
        asset_number TEXT NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        related_invoice_id INTEGER REFERENCES invoices(id),
        delivery_list_id INTEGER REFERENCES delivery_lists(id),
        return_event_item_id INTEGER REFERENCES return_event_items(id),
        issue_description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'NEEDS_FOLLOW_UP'
          CHECK (status IN ('NEEDS_FOLLOW_UP', 'REPAIR', 'RETURNED', 'DAMAGE_ASSESSED', 'INVOICED', 'COMPLETED')),
        repairer_id INTEGER REFERENCES repairers(id),
        sent_at TEXT,
        returned_at TEXT,
        repair_cost_toman INTEGER NOT NULL DEFAULT 0 CHECK (repair_cost_toman >= 0),
        damage_amount_toman INTEGER CHECK (damage_amount_toman IS NULL OR damage_amount_toman > 0),
        invoice_id INTEGER REFERENCES invoices(id),
        created_by_user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (returned_at IS NULL OR sent_at IS NOT NULL),
        CHECK (invoice_id IS NULL OR damage_amount_toman IS NOT NULL)
      );
      CREATE INDEX ix_damaged_assets_repairer ON damaged_assets(repairer_id, sent_at, id);
      CREATE INDEX ix_damaged_assets_return_item ON damaged_assets(return_event_item_id);
      CREATE TABLE repairer_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repairer_id INTEGER NOT NULL REFERENCES repairers(id),
        amount_toman INTEGER NOT NULL CHECK (amount_toman > 0),
        paid_at TEXT NOT NULL,
        notes TEXT,
        created_by_user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX ix_repairer_payments_repairer ON repairer_payments(repairer_id, paid_at, id);
    `);
  }
};
