module.exports = {
  id: '20261122_010_sync_damaged_assets',
  foreignKeysOff: true,
  up(db) {
    db.exec(`
      CREATE TABLE damaged_assets_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id),
        product_name_snapshot TEXT NOT NULL,
        asset_number TEXT,
        case_type TEXT NOT NULL DEFAULT 'DAMAGE' CHECK (case_type IN ('DAMAGE', 'SERVICE')),
        incident_at TEXT NOT NULL,
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
      INSERT INTO damaged_assets_new (
        id, product_id, product_name_snapshot, asset_number, case_type, incident_at,
        customer_id, related_invoice_id, delivery_list_id, return_event_item_id,
        issue_description, status, repairer_id, sent_at, returned_at, repair_cost_toman,
        damage_amount_toman, invoice_id, created_by_user_id, created_at, updated_at
      )
      SELECT a.id, a.product_id, a.product_name_snapshot, NULLIF(a.asset_number, ''),
        CASE WHEN a.return_event_item_id IS NOT NULL THEN 'DAMAGE' ELSE 'SERVICE' END,
        COALESCE(re.returned_at, a.created_at), a.customer_id, a.related_invoice_id,
        a.delivery_list_id, a.return_event_item_id, a.issue_description, a.status,
        a.repairer_id, a.sent_at, a.returned_at, a.repair_cost_toman,
        a.damage_amount_toman, a.invoice_id, a.created_by_user_id, a.created_at, a.updated_at
      FROM damaged_assets a
      LEFT JOIN return_event_items rei ON rei.id = a.return_event_item_id
      LEFT JOIN return_events re ON re.id = rei.return_event_id;
      DROP TABLE damaged_assets;
      ALTER TABLE damaged_assets_new RENAME TO damaged_assets;
      CREATE INDEX ix_damaged_assets_repairer ON damaged_assets(repairer_id, sent_at, id);
      CREATE INDEX ix_damaged_assets_return_item ON damaged_assets(return_event_item_id);
      CREATE INDEX ix_damaged_assets_type_date ON damaged_assets(case_type, incident_at DESC, id DESC);
    `);
    const damagedReturns = db.prepare(`SELECT rei.id, rei.damaged_quantity, rei.damage_notes,
      rei.issue_resolved_at, re.returned_at, re.received_by_user_id,
      re.delivery_list_id, dl.customer_id, dli.product_id, dli.product_name_snapshot,
      (SELECT COUNT(*) FROM damaged_assets a WHERE a.return_event_item_id = rei.id) AS registered
      FROM return_event_items rei
      JOIN return_events re ON re.id = rei.return_event_id
      JOIN delivery_lists dl ON dl.id = re.delivery_list_id
      JOIN delivery_list_items dli ON dli.id = rei.delivery_list_item_id
      WHERE rei.damaged_quantity > 0 AND rei.deleted_at IS NULL AND re.deleted_at IS NULL`).all();
    const insert = db.prepare(`INSERT INTO damaged_assets (product_id, product_name_snapshot, case_type,
      incident_at, customer_id, delivery_list_id, return_event_item_id, issue_description,
      status, created_by_user_id) VALUES (?, ?, 'DAMAGE', ?, ?, ?, ?, ?, ?, ?)`);
    for (const row of damagedReturns) {
      for (let remaining = Number(row.damaged_quantity) - Number(row.registered); remaining > 0; remaining -= 1) {
        insert.run(row.product_id, row.product_name_snapshot, row.returned_at, row.customer_id,
          row.delivery_list_id, row.id, row.damage_notes || 'خسارت ثبت‌شده در لیست',
          row.issue_resolved_at ? 'COMPLETED' : 'NEEDS_FOLLOW_UP', row.received_by_user_id);
      }
    }
  }
};
