const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Database = require('better-sqlite3');

test('tracks individual repairs, allocates payments oldest first, and appends or supplements damage invoices', async () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, deleted_at TEXT);
    CREATE TABLE delivery_lists (id INTEGER PRIMARY KEY, customer_id INTEGER, list_number TEXT,
      status TEXT, completed_at TEXT, updated_at TEXT, version INTEGER DEFAULT 1);
    CREATE TABLE return_events (id INTEGER PRIMARY KEY, delivery_list_id INTEGER,
      returned_at TEXT, received_by_user_id INTEGER, deleted_at TEXT);
    CREATE TABLE delivery_list_items (id INTEGER PRIMARY KEY, delivery_list_id INTEGER, product_id INTEGER,
      product_name_snapshot TEXT, delivered_quantity INTEGER, deleted_at TEXT);
    CREATE TABLE return_event_items (id INTEGER PRIMARY KEY, return_event_id INTEGER, delivery_list_item_id INTEGER,
      damaged_quantity INTEGER, healthy_quantity INTEGER, damage_notes TEXT, deleted_at TEXT, issue_resolved_at TEXT, updated_at TEXT);
    CREATE TABLE invoices (id INTEGER PRIMARY KEY, customer_id INTEGER, delivery_list_id INTEGER, parent_invoice_id INTEGER,
      invoice_number TEXT, invoice_type TEXT, status TEXT, send_status TEXT, settlement_status TEXT,
      is_shipped INTEGER DEFAULT 0, is_settled INTEGER DEFAULT 0, subtotal_toman INTEGER DEFAULT 0,
      extra_charges_toman INTEGER DEFAULT 0, discount_amount_toman INTEGER DEFAULT 0,
      discount_percent_basis_points INTEGER DEFAULT 0, rounding_adjustment_toman INTEGER DEFAULT 0,
      final_amount_toman INTEGER DEFAULT 0, price INTEGER DEFAULT 0, date TEXT, description TEXT,
      issued_at TEXT, issued_by_user_id INTEGER, updated_at TEXT, version INTEGER DEFAULT 1, deleted_at TEXT);
    CREATE TABLE invoice_adjustments (id INTEGER PRIMARY KEY, invoice_id INTEGER, adjustment_type TEXT,
      description TEXT, percent_basis_points INTEGER, amount_toman INTEGER, sort_order INTEGER, deleted_at TEXT);
    CREATE TABLE invoice_send_logs (id INTEGER PRIMARY KEY, invoice_id INTEGER, channel TEXT, recipient TEXT,
      status TEXT, sent_at TEXT, sent_by_user_id INTEGER);
    CREATE TABLE app_settings (id INTEGER PRIMARY KEY, collection_name TEXT);
    INSERT INTO users VALUES (1);
    INSERT INTO customers VALUES (1, 'مشتری آزمایشی', NULL);
    INSERT INTO products VALUES (1, 'دستگاه', NULL);
    INSERT INTO invoices (id, customer_id, invoice_number, invoice_type, status, send_status,
      settlement_status, final_amount_toman, price, date, issued_at)
      VALUES (1, 1, '14051000', 'LEGACY', 'ISSUED', 'NOT_SENT', 'UNPAID', 1000, 1000,
        '2026-11-20', '2026-11-20T10:00:00.000Z');
  `);
  require('../src/db/migrations/009-damaged-assets').up(db);
  require('../src/db/migrations/010-sync-damaged-assets').up(db);
  require('../src/db/migrations/011-soft-delete-damaged-assets').up(db);
  const databasePath = require.resolve('../src/db/database');
  const authPath = require.resolve('../src/middleware/authMiddleware');
  const routePath = require.resolve('../src/routes/damagedAssetRoutes');
  const oldDb = require.cache[databasePath];
  const oldAuth = require.cache[authPath];
  const oldRoute = require.cache[routePath];
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: db };
  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: (req, _res, next) => { req.user = { id: 1, role: 'MANAGER' }; next(); } };
  delete require.cache[routePath];
  const app = express();
  app.use(express.json());
  app.use('/api/damaged-assets', require(routePath));
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const url = `http://127.0.0.1:${server.address().port}/api/damaged-assets`;
  async function request(path, method = 'GET', body) {
    const response = await fetch(`${url}${path}`, { method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(result)}`);
    return result;
  }
  try {
    const removable = await request('', 'POST', { product_id: 1, asset_number: 'A-remove', case_type: 'SERVICE',
      incident_at: '2026-11-01', issue_description: 'ثبت اشتباه' });
    assert.deepEqual(await request(`/${removable.id}`, 'DELETE'), { success: true });
    assert.ok(db.prepare('SELECT deleted_at FROM damaged_assets WHERE id = ?').get(removable.id).deleted_at);
    assert.equal((await request('')).assets.some((asset) => asset.id === removable.id), false);
    const repairer = await request('/repairers', 'POST', { name: 'مرکز تعمیر' });
    const first = await request('', 'POST', { product_id: 1, asset_number: 'A-1', case_type: 'DAMAGE',
      incident_at: '2026-11-01', customer_id: 1,
      related_invoice_id: 1, issue_description: 'شکستگی' });
    const second = await request('', 'POST', { product_id: 1, asset_number: 'A-2', case_type: 'SERVICE',
      incident_at: '2026-11-04',
      issue_description: 'سرویس دوره‌ای' });
    for (const [asset, sentAt, returnedAt, cost] of [
      [first, '2026-11-01', '2026-11-03', 100], [second, '2026-11-04', '2026-11-05', 200]
    ]) {
      await request(`/${asset.id}`, 'PATCH', { operation: 'send', repairer_id: repairer.id, sent_at: sentAt });
      await request(`/${asset.id}`, 'PATCH', { operation: 'return', returned_at: returnedAt, repair_cost_toman: cost });
    }
    await request(`/repairers/${repairer.id}/payments`, 'POST', { amount_toman: 150, paid_at: '2026-11-06' });
    const assets = (await request('')).assets;
    assert.equal(assets.find((asset) => asset.id === first.id).repair_due_toman, 0);
    assert.equal(assets.find((asset) => asset.id === second.id).repair_paid_toman, 50);
    assert.equal((await request('/repairers')).repairers[0].due, 150);

    await request(`/${first.id}`, 'PATCH', { operation: 'assess', damage_amount_toman: 500 });
    const appended = await request(`/${first.id}/invoice`, 'POST');
    assert.equal(appended.invoice_id, 1);
    assert.equal(db.prepare('SELECT final_amount_toman FROM invoices WHERE id = 1').get().final_amount_toman, 1500);
    await request(`/${first.id}/send-invoice`, 'PATCH', { channel: 'MANUAL' });
    assert.equal((await request('')).assets.find((asset) => asset.id === first.id).status, 'COMPLETED');

    const third = await request('', 'POST', { product_id: 1, asset_number: 'A-3', case_type: 'DAMAGE',
      incident_at: '2026-11-07', customer_id: 1,
      related_invoice_id: 1, issue_description: 'آسیب بدنه' });
    await request(`/${third.id}`, 'PATCH', { operation: 'assess', damage_amount_toman: 300 });
    const supplement = await request(`/${third.id}/invoice`, 'POST');
    assert.notEqual(supplement.invoice_id, 1);
    assert.equal(db.prepare('SELECT parent_invoice_id FROM invoices WHERE id = ?').get(supplement.invoice_id).parent_invoice_id, 1);
    const pdf = await request(`/${third.id}/invoice/pdf?transport=base64`);
    assert.equal(Buffer.from(pdf.data_base64, 'base64').subarray(0, 4).toString(), '%PDF');
    assert.ok((await request('/customer-invoices/1')).invoices.some((invoice) => invoice.id === supplement.invoice_id));
    const independent = await request('', 'POST', { product_id: 1, asset_number: 'A-independent',
      case_type: 'DAMAGE', incident_at: '2026-11-08', customer_id: 1, issue_description: 'آسیب مستقل' });
    await request(`/${independent.id}`, 'PATCH', { operation: 'assess', damage_amount_toman: 250 });
    const newInvoice = await request(`/${independent.id}/invoice`, 'POST');
    assert.equal(db.prepare('SELECT parent_invoice_id FROM invoices WHERE id = ?').get(newInvoice.invoice_id).parent_invoice_id, null);
    await request(`/${first.id}`, 'DELETE');
    assert.equal((await request('')).assets.some((asset) => asset.id === first.id), false);
    assert.ok((await request('?include_deleted=true')).assets.find((asset) => asset.id === first.id).deleted_at);
    assert.equal((await request('/repairers')).repairers[0].due, 150);
    assert.equal(db.prepare('SELECT id FROM invoices WHERE id = 1').get().id, 1);

    db.exec(`INSERT INTO delivery_lists (id, customer_id, list_number, status) VALUES (1, 1, 'L-1', 'NEEDS_FOLLOW_UP');
      INSERT INTO delivery_list_items VALUES (1, 1, 1, 'دستگاه', 3, NULL);
      INSERT INTO return_events VALUES (1, 1, '2026-11-07', 1, NULL);
      INSERT INTO return_event_items VALUES (1, 1, 1, 3, 0, 'خرابی', NULL, NULL, NULL);`);
    require('../src/services/damagedAssetSyncService').syncDamagedReturnItem(db, 1);
    assert.equal((await request('/candidates')).candidates.length, 0);
    const linked = (await request('')).assets.filter((asset) => asset.return_event_item_id === 1);
    assert.equal(linked.length, 3);
    assert.deepEqual(await request(`/${linked[0].id}`, 'DELETE'), { success: true });
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM damaged_assets WHERE return_event_item_id = 1').get().count, 3);
    assert.equal((await request('')).assets.some((asset) => asset.id === linked[0].id), false);
    require('../src/services/damagedAssetSyncService').syncDamagedReturnItem(db, 1);
    assert.equal((await request('')).assets.some((asset) => asset.id === linked[0].id), false);
    for (const [index, asset] of linked.slice(1).entries()) {
      assert.equal(asset.asset_number, null);
      assert.equal(asset.incident_at, '2026-11-07');
      await request(`/${asset.id}`, 'PATCH', { operation: 'details', asset_number: `A-${index + 4}`, issue_description: 'خرابی' });
      await request(`/${asset.id}`, 'PATCH', { operation: 'resolve' });
      assert.equal(db.prepare('SELECT status FROM delivery_lists WHERE id = 1').get().status, 'NEEDS_FOLLOW_UP');
    }
    assert.equal(db.prepare('SELECT issue_resolved_at FROM return_event_items WHERE id = 1').get().issue_resolved_at, null);
    assert.equal(db.prepare('SELECT status FROM delivery_lists WHERE id = 1').get().status, 'NEEDS_FOLLOW_UP');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    if (oldDb) require.cache[databasePath] = oldDb; else delete require.cache[databasePath];
    if (oldAuth) require.cache[authPath] = oldAuth; else delete require.cache[authPath];
    if (oldRoute) require.cache[routePath] = oldRoute; else delete require.cache[routePath];
  }
});

test('migration preserves existing cases and backfills one row for each damaged unit', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  try {
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      CREATE TABLE customers (id INTEGER PRIMARY KEY);
      CREATE TABLE products (id INTEGER PRIMARY KEY);
      CREATE TABLE delivery_lists (id INTEGER PRIMARY KEY, customer_id INTEGER);
      CREATE TABLE delivery_list_items (id INTEGER PRIMARY KEY, delivery_list_id INTEGER,
        product_id INTEGER, product_name_snapshot TEXT);
      CREATE TABLE return_events (id INTEGER PRIMARY KEY, delivery_list_id INTEGER,
        returned_at TEXT, received_by_user_id INTEGER, deleted_at TEXT);
      CREATE TABLE return_event_items (id INTEGER PRIMARY KEY, return_event_id INTEGER,
        delivery_list_item_id INTEGER, damaged_quantity INTEGER, damage_notes TEXT,
        issue_resolved_at TEXT, deleted_at TEXT);
      CREATE TABLE invoices (id INTEGER PRIMARY KEY);
      INSERT INTO users VALUES (1);
      INSERT INTO customers VALUES (1);
      INSERT INTO products VALUES (1);
      INSERT INTO delivery_lists VALUES (1, 1);
      INSERT INTO delivery_list_items VALUES (1, 1, 1, 'دستگاه');
      INSERT INTO return_events VALUES (1, 1, '2026-11-21', 1, NULL);
      INSERT INTO return_event_items VALUES (1, 1, 1, 3, 'شکستگی', NULL, NULL);
    `);
    require('../src/db/migrations/009-damaged-assets').up(db);
    db.prepare(`INSERT INTO damaged_assets (product_id, product_name_snapshot, asset_number,
      customer_id, delivery_list_id, return_event_item_id, issue_description, created_by_user_id)
      VALUES (1, 'دستگاه', 'A-1', 1, 1, 1, 'شکستگی', 1)`).run();
    require('../src/db/migrations/010-sync-damaged-assets').up(db);
    require('../src/db/migrations/011-soft-delete-damaged-assets').up(db);
    const rows = db.prepare('SELECT asset_number, case_type, incident_at FROM damaged_assets ORDER BY id').all();
    assert.equal(rows.length, 3);
    assert.equal(rows[0].asset_number, 'A-1');
    assert.equal(rows.filter((row) => row.asset_number === null).length, 2);
    assert.ok(rows.every((row) => row.case_type === 'DAMAGE' && row.incident_at === '2026-11-21'));
  } finally { db.close(); }
});
