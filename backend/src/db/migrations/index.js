const deliveryWorkflowMigration = require('./001-delivery-workflow');
const removeLegacyReservationsMigration = require('./002-remove-legacy-reservations');
const convertLegacyAccountsMigration = require('./003-convert-legacy-accounts');
const internalUserProfilesMigration = require('./004-internal-user-profiles');
const internalUserNamesMigration = require('./005-internal-user-names');
const productPriceVersionsMigration = require('./006-product-price-versions');
const removeLostItemConceptMigration = require('./007-remove-lost-item-concept');
const itemReturnFollowUpMigration = require('./008-item-return-follow-up');

const migrations = [
  deliveryWorkflowMigration,
  removeLegacyReservationsMigration,
  convertLegacyAccountsMigration,
  internalUserProfilesMigration,
  internalUserNamesMigration,
  productPriceVersionsMigration,
  removeLostItemConceptMigration,
  itemReturnFollowUpMigration
];

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function runMigrations(db) {
  ensureMigrationTable(db);
  const applied = new Set(
    db.prepare('SELECT id FROM schema_migrations').all().map((row) => row.id)
  );

  migrations.forEach((migration) => {
    if (applied.has(migration.id)) {
      return;
    }

    const apply = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(migration.id);
    });

    if (migration.foreignKeysOff) {
      db.pragma('foreign_keys = OFF');
      try {
        apply();
      } finally {
        db.pragma('foreign_keys = ON');
      }
    } else {
      apply();
    }
    console.log(`[database] Applied migration ${migration.id}`);
  });

  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyErrors.length > 0) {
    throw new Error(`Database foreign-key check failed: ${JSON.stringify(foreignKeyErrors)}`);
  }
}

module.exports = {
  migrations,
  runMigrations
};
