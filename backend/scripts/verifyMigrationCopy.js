const path = require('node:path');
const Database = require('better-sqlite3');
const { runMigrations } = require('../src/db/migrations');
const { tableExists } = require('../src/db/migrations/helpers');

const databasePath = process.argv[2];
if (!databasePath) {
  throw new Error('Usage: node scripts/verifyMigrationCopy.js <database-copy-path>');
}

const resolvedPath = path.resolve(databasePath);
const db = new Database(resolvedPath);
db.pragma('foreign_keys = ON');

function countRows(tableName) {
  if (!tableExists(db, tableName)) return null;
  return db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
}

const before = {
  users: countRows('users'),
  customers: countRows('customers'),
  invoices: countRows('invoices'),
  legacyProducts: countRows('inventory_products')
};

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
  runMigrations(db);
  const after = {
    users: countRows('users'),
    customers: countRows('customers'),
    invoices: countRows('invoices'),
    products: countRows('products'),
    migrations: countRows('schema_migrations')
  };
  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();

  if (before.users !== after.users
    || before.customers !== after.customers
    || before.invoices !== after.invoices) {
    throw new Error(`Legacy row counts changed: ${JSON.stringify({ before, after })}`);
  }
  if (before.legacyProducts !== null && after.products < before.legacyProducts) {
    throw new Error(`Products were not fully migrated: ${JSON.stringify({ before, after })}`);
  }
  const remainingLegacyTables = removedLegacyTables.filter((tableName) => tableExists(db, tableName));
  if (remainingLegacyTables.length > 0) {
    throw new Error(`Legacy inventory tables still exist: ${remainingLegacyTables.join(', ')}`);
  }
  if (after.migrations !== 2) {
    throw new Error(`Unexpected migration count: ${after.migrations}`);
  }
  if (foreignKeyErrors.length > 0) {
    throw new Error(`Foreign-key errors: ${JSON.stringify(foreignKeyErrors)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    databasePath: resolvedPath,
    before,
    after
  }, null, 2));
} finally {
  db.close();
}
