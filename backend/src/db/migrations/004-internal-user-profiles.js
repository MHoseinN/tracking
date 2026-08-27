const { ensureColumn } = require('./helpers');

module.exports = {
  id: '20260827_004_internal_user_profiles',
  up(db) {
    ensureColumn(db, 'users', 'phone', 'TEXT');
  }
};
