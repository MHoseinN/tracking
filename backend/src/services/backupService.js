const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const Database = require('better-sqlite3');
const { getBackupDir, getDatabasePath } = require('../db/paths');

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const RETAIN_BACKUPS = 12;
let weeklyTimer = null;

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatTimestamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function ensureBackupDir() {
  const backupDir = getBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

function getBackupFiles() {
  const backupDir = ensureBackupDir();
  return fs.readdirSync(backupDir)
    .filter((fileName) => /^tracking-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.db$/.test(fileName))
    .map((fileName) => {
      const fullPath = path.join(backupDir, fileName);
      const stats = fs.statSync(fullPath);
      return { fileName, fullPath, mtimeMs: stats.mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function pruneOldBackups() {
  const backups = getBackupFiles();
  for (const backup of backups.slice(RETAIN_BACKUPS)) {
    fs.unlinkSync(backup.fullPath);
  }
}

function removeSQLiteSidecars(dbFilePath) {
  for (const suffix of ['-wal', '-shm']) {
    const sidecarPath = `${dbFilePath}${suffix}`;
    if (fs.existsSync(sidecarPath)) {
      fs.unlinkSync(sidecarPath);
    }
  }
}

function createBackupFileName(date = new Date()) {
  return path.join(ensureBackupDir(), `tracking-${formatTimestamp(date)}.db`);
}

function findGitRepoRoot(startDir) {
  let current = path.resolve(startDir);
  const { root } = path.parse(current);

  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }

    if (current === root) {
      return null;
    }

    current = path.dirname(current);
  }
}

function runGitCommand(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `git ${args.join(' ')} failed`).trim());
  }

  return (result.stdout || '').trim();
}

function hasStagedChanges(cwd) {
  const result = spawnSync('git', ['diff', '--cached', '--quiet'], {
    cwd,
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status === 0) {
    return false;
  }

  if (result.status === 1) {
    return true;
  }

  throw new Error((result.stderr || result.stdout || 'Could not determine staged changes').trim());
}

function ensureGitSyncPrerequisites(repoRoot) {
  const hasOrigin = runGitCommand(['remote'], repoRoot)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .includes('origin');

  if (!hasOrigin) {
    throw new Error('Git remote origin is not configured.');
  }

  const userName = runGitCommand(['config', '--get', 'user.name'], repoRoot);
  const userEmail = runGitCommand(['config', '--get', 'user.email'], repoRoot);

  if (!userName || !userEmail) {
    throw new Error('Git user.name or user.email is not configured.');
  }
}

function syncBackupsToGitRepo(backupPath) {
  if (process.env.BACKUP_GIT_PUSH === 'false') {
    console.log('[backup] Git push is disabled by BACKUP_GIT_PUSH=false.');
    return;
  }

  const repoRoot = findGitRepoRoot(path.join(__dirname, '../../..'));
  if (!repoRoot) {
    console.warn('[backup] No git repository found. Backup was created locally only.');
    return;
  }

  const backupsRelativeDir = path.relative(repoRoot, getBackupDir()).replace(/\\/g, '/');
  if (backupsRelativeDir.startsWith('..')) {
    console.warn('[backup] Backup directory is outside of this git repository; skipping git sync.');
    return;
  }

  try {
    ensureGitSyncPrerequisites(repoRoot);
    runGitCommand(['add', '-A', backupsRelativeDir], repoRoot);

    if (!hasStagedChanges(repoRoot)) {
      console.log('[backup] No backup changes to commit.');
      return;
    }

    const backupFileName = path.basename(backupPath);
    runGitCommand(['commit', '-m', `chore(backup): ${backupFileName}`], repoRoot);
    runGitCommand(['push', 'origin', 'HEAD'], repoRoot);
    console.log('[backup] Backup changes committed and pushed to origin.');
  } catch (error) {
    console.warn(`[backup] Git sync failed: ${error.message || error}`);
  }
}

async function backupDatabase(reason = 'manual') {
  const databasePath = getDatabasePath();
  if (!fs.existsSync(databasePath)) {
    throw new Error(`Database file not found: ${databasePath}`);
  }

  const backupPath = createBackupFileName();
  const source = new Database(databasePath, { readonly: true });

  try {
    await source.backup(backupPath);
    pruneOldBackups();
    console.log(`[backup] ${reason} backup created: ${backupPath}`);
    syncBackupsToGitRepo(backupPath);
    return backupPath;
  } finally {
    source.close();
  }
}

function getLatestBackupPath() {
  const backups = getBackupFiles();
  return backups.length ? backups[0].fullPath : null;
}

function getLatestBackupAgeMs() {
  const backups = getBackupFiles();
  if (!backups.length) {
    return null;
  }

  return Date.now() - backups[0].mtimeMs;
}

async function restoreBackup(backupPath) {
  const databasePath = getDatabasePath();
  const backupDir = ensureBackupDir();
  const resolvedBackupPath = path.isAbsolute(backupPath)
    ? backupPath
    : [
        path.resolve(process.cwd(), backupPath),
        path.join(backupDir, backupPath)
      ].find((candidatePath) => fs.existsSync(candidatePath));

  if (!resolvedBackupPath) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  if (fs.existsSync(databasePath)) {
    const safetyCopy = path.join(backupDir, `tracking-before-restore-${formatTimestamp()}.db`);
    fs.copyFileSync(databasePath, safetyCopy);
  }

  fs.copyFileSync(resolvedBackupPath, databasePath);
  removeSQLiteSidecars(databasePath);

  console.log(`[restore] Database restored from: ${resolvedBackupPath}`);
  console.log(`[restore] A safety copy of the previous database was kept in: ${backupDir}`);
}

function startWeeklyBackupScheduler() {
  if (weeklyTimer) {
    return weeklyTimer;
  }

  const latestAge = getLatestBackupAgeMs();
  if (latestAge === null || latestAge >= WEEK_IN_MS) {
    backupDatabase('startup').catch((error) => {
      console.error('[backup] Startup backup failed:', error);
    });
  }

  weeklyTimer = setInterval(() => {
    backupDatabase('weekly').catch((error) => {
      console.error('[backup] Weekly backup failed:', error);
    });
  }, WEEK_IN_MS);

  if (typeof weeklyTimer.unref === 'function') {
    weeklyTimer.unref();
  }

  return weeklyTimer;
}

module.exports = {
  backupDatabase,
  getLatestBackupPath,
  getLatestBackupAgeMs,
  restoreBackup,
  startWeeklyBackupScheduler,
  WEEK_IN_MS
};