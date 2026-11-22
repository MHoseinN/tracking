module.exports = {
  id: '20261122_013_return_item_invoice_exclusion',
  up(db) {
    db.exec(`
      ALTER TABLE return_event_items ADD COLUMN invoice_excluded_at TEXT;
      ALTER TABLE return_event_items ADD COLUMN invoice_excluded_by_user_id INTEGER REFERENCES users(id);
      CREATE INDEX ix_return_event_items_invoice_exclusion
        ON return_event_items(invoice_excluded_at, return_event_id, id);
    `);
  }
};
