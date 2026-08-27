const { ensureColumn } = require('./helpers');

module.exports = {
  id: '20260828_005_internal_user_names',
  up(db) {
    ensureColumn(db, 'users', 'first_name', 'TEXT');
    ensureColumn(db, 'users', 'last_name', 'TEXT');

    db.exec(`
      UPDATE users
      SET
        first_name = COALESCE(NULLIF(TRIM(first_name), ''), NULLIF(TRIM(display_name), ''), username),
        last_name = COALESCE(last_name, ''),
        display_name = COALESCE(NULLIF(TRIM(display_name), ''), username)
    `);
  }
};
