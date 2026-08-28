const { initDatabase } = require('../src/db/init');
const db = require('../src/db/database');

const requiredTables = [
  'app_settings',
  'users',
  'customers',
  'product_categories',
  'products',
  'product_price_history',
  'product_price_versions',
  'product_price_version_items',
  'delivery_lists',
  'delivery_list_items',
  'return_events',
  'return_event_items',
  'invoices',
  'invoice_lines',
  'invoice_adjustments',
  'payments',
  'invoice_send_logs',
  'audit_logs'
];

const removedLegacyTables = [
  'inventory_categories',
  'inventory_categories_legacy',
  'inventory_products',
  'inventory_reservations',
  'inventory_units',
  'inventory_reservation_orders',
  'inventory_reservation_items'
];

try {
  initDatabase();

  const existingTables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
      .map((row) => row.name)
  );
  const missingTables = requiredTables.filter((name) => !existingTables.has(name));
  const remainingLegacyTables = removedLegacyTables.filter((name) => existingTables.has(name));
  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
  const settings = db.prepare(`
    SELECT timezone, billing_cutoff_minutes
    FROM app_settings
    WHERE id = 1
  `).get();

  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
  }
  if (remainingLegacyTables.length > 0) {
    throw new Error(`Legacy inventory tables still exist: ${remainingLegacyTables.join(', ')}`);
  }
  if (foreignKeyErrors.length > 0) {
    throw new Error(`Foreign-key errors: ${JSON.stringify(foreignKeyErrors)}`);
  }
  const cutoffMinutes = Number(settings?.billing_cutoff_minutes);
  if (
    settings?.timezone !== 'Asia/Tehran'
    || !Number.isInteger(cutoffMinutes)
    || cutoffMinutes < 0
    || cutoffMinutes > 1439
  ) {
    throw new Error(`Invalid application settings: ${JSON.stringify(settings)}`);
  }

  const migrationCount = db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count;
  if (migrationCount !== 6) {
    throw new Error(`Unexpected migration count: ${migrationCount}`);
  }

  console.log(JSON.stringify({
    ok: true,
    databasePath: db.dbPath,
    requiredTableCount: requiredTables.length,
    migrationCount,
    settings
  }, null, 2));
} finally {
  db.close();
}
