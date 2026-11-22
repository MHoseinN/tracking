function syncDamagedReturnItem(db, returnEventItemId) {
  // Older isolated workflow tests use a schema without the damage module.
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'damaged_assets'").get()) return;
  const row = db.prepare(`SELECT rei.id, rei.damaged_quantity, rei.damage_notes, rei.issue_resolved_at,
    re.returned_at, re.received_by_user_id, re.delivery_list_id, dl.customer_id,
    dli.product_id, dli.product_name_snapshot
    FROM return_event_items rei JOIN return_events re ON re.id = rei.return_event_id
    JOIN delivery_lists dl ON dl.id = re.delivery_list_id
    JOIN delivery_list_items dli ON dli.id = rei.delivery_list_item_id
    WHERE rei.id = ? AND rei.deleted_at IS NULL AND re.deleted_at IS NULL`).get(returnEventItemId);
  if (!row) return;
  const existing = db.prepare(`SELECT id, asset_number, status, invoice_id, repairer_id, deleted_at
    FROM damaged_assets WHERE return_event_item_id = ? ORDER BY id DESC`).all(row.id);
  const difference = Number(row.damaged_quantity) - existing.length;
  if (difference < 0) {
    const removable = existing.filter((asset) => !asset.deleted_at && asset.status === 'NEEDS_FOLLOW_UP'
      && !asset.invoice_id && !asset.repairer_id).slice(0, -difference);
    if (removable.length + existing.filter((asset) => asset.deleted_at).length < -difference) {
      const { DeliveryListDraftError } = require('./deliveryListDraftService');
      throw new DeliveryListDraftError('ابتدا پرونده‌های خسارتی مرتبط را تعیین تکلیف کنید؛ تعداد خسارت از پرونده‌های ثبت‌شده کمتر نمی‌شود', 409);
    }
    const remove = db.prepare('DELETE FROM damaged_assets WHERE id = ?');
    removable.forEach((asset) => remove.run(asset.id));
  }
  if (difference > 0) {
    const insert = db.prepare(`INSERT INTO damaged_assets (product_id, product_name_snapshot, case_type,
      incident_at, customer_id, delivery_list_id, return_event_item_id, issue_description,
      status, created_by_user_id) VALUES (?, ?, 'DAMAGE', ?, ?, ?, ?, ?, ?, ?)`);
    for (let index = 0; index < difference; index += 1) {
      insert.run(row.product_id, row.product_name_snapshot, row.returned_at, row.customer_id,
        row.delivery_list_id, row.id, row.damage_notes || 'خسارت ثبت‌شده در لیست',
        row.issue_resolved_at ? 'COMPLETED' : 'NEEDS_FOLLOW_UP', row.received_by_user_id);
    }
  }
  db.prepare(`UPDATE damaged_assets SET incident_at = ?,
    issue_description = CASE WHEN asset_number IS NULL AND status = 'NEEDS_FOLLOW_UP'
      THEN ? ELSE issue_description END, updated_at = CURRENT_TIMESTAMP
    WHERE return_event_item_id = ? AND deleted_at IS NULL`).run(row.returned_at, row.damage_notes || 'خسارت ثبت‌شده در لیست', row.id);
}

module.exports = { syncDamagedReturnItem };
