const { tableExists } = require('./helpers');

const legacyTables = [
  'inventory_reservation_items',
  'inventory_reservation_orders',
  'inventory_reservations',
  'inventory_units',
  'inventory_products',
  'inventory_categories_legacy',
  'inventory_categories'
];

module.exports = {
  id: '20260823_002_remove_legacy_reservations',

  up(db) {
    legacyTables.forEach((tableName) => {
      if (tableExists(db, tableName)) {
        db.exec(`DROP TABLE ${tableName}`);
      }
    });
  }
};
