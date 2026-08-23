const { initDatabase } = require('../src/db/init');
const db = require('../src/db/database');

const requiredTables = [
  'app_settings',
  'users',
  'customers',
  'product_categories',
  'products',
  'product_price_history',
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

try {
  initDatabase();

  const existingTables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
      .map((row) => row.name)
  );
  const missingTables = requiredTables.filter((name) => !existingTables.has(name));
  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
  const settings = db.prepare(`
    SELECT timezone, billing_cutoff_minutes
    FROM app_settings
    WHERE id = 1
  `).get();

  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
  }
  if (foreignKeyErrors.length > 0) {
    throw new Error(`Foreign-key errors: ${JSON.stringify(foreignKeyErrors)}`);
  }
  if (settings?.timezone !== 'Asia/Tehran' || settings?.billing_cutoff_minutes !== 660) {
    throw new Error(`Unexpected default settings: ${JSON.stringify(settings)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    databasePath: db.dbPath,
    requiredTableCount: requiredTables.length,
    migrationCount: db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count,
    settings
  }, null, 2));
} finally {
  db.close();
}
