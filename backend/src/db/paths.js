const path = require('path');

function getDataDir() {
  return path.join(__dirname, '../../data');
}

function getDatabasePath() {
  return path.join(getDataDir(), 'tracking.db');
}

function getBackupDir() {
  return path.join(getDataDir(), 'backups');
}

module.exports = {
  getDataDir,
  getDatabasePath,
  getBackupDir
};