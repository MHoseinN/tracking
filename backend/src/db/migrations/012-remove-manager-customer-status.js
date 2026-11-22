module.exports = {
  id: '20261122_012_remove_manager_customer_status',
  up(db) {
    const hasStatus = db.prepare("SELECT 1 FROM pragma_table_info('customers') WHERE name = 'account_status'").get();
    if (hasStatus) db.prepare("UPDATE customers SET account_status = NULL WHERE account_status = 'هماهنگی با مدیر'").run();
  }
};
