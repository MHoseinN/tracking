const fs = require('fs');
const { getDataDir, getDatabasePath } = require('./paths');

let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  if (error.code === 'ERR_DLOPEN_FAILED' || String(error.message || '').includes('NODE_MODULE_VERSION')) {
    throw new Error(
      'better-sqlite3 روی این دستگاه با نسخه فعلی Node سازگار نیست. پوشه backend/node_modules را حذف کن و دوباره npm install بزن. اگر هنوز خطا بود، npm rebuild better-sqlite3 را اجرا کن.'
    );
  }

  throw error;
}

// Ensure the data directory exists
const dataDir = getDataDir();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = getDatabasePath();
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
module.exports.dbPath = dbPath;
module.exports.dataDir = dataDir;
