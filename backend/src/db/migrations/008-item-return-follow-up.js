const { ensureColumn } = require('./helpers');

module.exports = {
  id: '20260902_008_item_return_follow_up',
  up(db) {
    ensureColumn(db, 'delivery_list_items', 'remaining_expected_return_at', 'TEXT');
    db.exec(`
      CREATE INDEX IF NOT EXISTS ix_delivery_list_items_remaining_expected_return
        ON delivery_list_items(remaining_expected_return_at, delivery_list_id)
        WHERE remaining_expected_return_at IS NOT NULL AND deleted_at IS NULL;
    `);
  }
};
