const { restoreBackup, getLatestBackupPath } = require('../src/services/backupService');

async function main() {
  const requestedBackup = process.argv[2] || getLatestBackupPath();

  if (!requestedBackup) {
    console.error('[restore] No backup files were found.');
    process.exit(1);
  }

  try {
    await restoreBackup(requestedBackup);
    process.exit(0);
  } catch (error) {
    console.error('[restore] Restore failed:', error.message || error);
    process.exit(1);
  }
}

main();