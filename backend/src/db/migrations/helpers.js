function assertIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQLite identifier: ${value}`);
  }

  return value;
}

function tableExists(db, tableName) {
  return Boolean(db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName));
}

function columnExists(db, tableName, columnName) {
  const safeTableName = assertIdentifier(tableName);
  return db.prepare(`PRAGMA table_info(${safeTableName})`).all()
    .some((column) => column.name === columnName);
}

function ensureColumn(db, tableName, columnName, definition) {
  if (columnExists(db, tableName, columnName)) {
    return;
  }

  const safeTableName = assertIdentifier(tableName);
  const safeColumnName = assertIdentifier(columnName);
  db.exec(`ALTER TABLE ${safeTableName} ADD COLUMN ${safeColumnName} ${definition}`);
}

module.exports = {
  columnExists,
  ensureColumn,
  tableExists
};
