module.exports = {
  id: '20261122_011_soft_delete_damaged_assets',
  up(db) {
    db.exec(`
      ALTER TABLE damaged_assets ADD COLUMN deleted_at TEXT;
      CREATE INDEX ix_damaged_assets_active ON damaged_assets(deleted_at, incident_at DESC, id DESC);
    `);
  }
};
