const { backupDatabase } = require('../src/services/backupService');

backupDatabase('manual')
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('[backup] Manual backup failed:', error.message || error);
    process.exit(1);
  });