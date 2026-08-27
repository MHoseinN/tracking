const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { AdminServiceError, createAdminService } = require('../src/services/adminService');
const requireRole = require('../src/middleware/requireRole');

function createDatabase() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      phone TEXT,
      role TEXT NOT NULL CHECK (role IN ('MANAGER', 'ADMIN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      deleted_at TEXT
    );

    INSERT INTO users (username, password, display_name, role, is_active, updated_at)
    VALUES ('manager', 'hash', 'مدیر', 'MANAGER', 1, CURRENT_TIMESTAMP);
  `);
  return db;
}

test('manager can create, edit and deactivate admins without exposing password hashes', () => {
  const db = createDatabase();
  try {
    const service = createAdminService(db);
    const created = service.createAdmin({
      username: 'admin01',
      password: 'secret12',
      display_name: 'ادمین اول',
      phone: '09120000000'
    });

    assert.equal(created.role, 'ADMIN');
    assert.equal(created.is_active, true);
    assert.equal(created.phone, '09120000000');
    assert.equal(Object.hasOwn(created, 'password'), false);

    const storedPassword = db.prepare('SELECT password FROM users WHERE id = ?').get(created.id).password;
    assert.equal(bcrypt.compareSync('secret12', storedPassword), true);

    const updated = service.updateAdmin(created.id, {
      username: 'admin02',
      display_name: 'ادمین ویرایش‌شده',
      password: 'new-secret',
      is_active: true
    });
    assert.equal(updated.username, 'admin02');
    assert.equal(updated.display_name, 'ادمین ویرایش‌شده');

    const deactivated = service.setAdminStatus(created.id, false);
    assert.equal(deactivated.is_active, false);
  } finally {
    db.close();
  }
});

test('manager account cannot be edited or deleted through admin management', () => {
  const db = createDatabase();
  try {
    const service = createAdminService(db);
    assert.throws(
      () => service.updateAdmin(1, { display_name: 'تغییر غیرمجاز' }),
      (error) => error instanceof AdminServiceError && error.statusCode === 403
    );
    assert.throws(
      () => service.deleteAdmin(1),
      (error) => error instanceof AdminServiceError && error.statusCode === 403
    );
  } finally {
    db.close();
  }
});

test('deleted admin is hidden and its former username can be reused', () => {
  const db = createDatabase();
  try {
    const service = createAdminService(db);
    const first = service.createAdmin({
      username: 'reusable',
      password: 'secret12',
      display_name: 'ادمین حذف‌شونده'
    });
    service.deleteAdmin(first.id);

    const replacement = service.createAdmin({
      username: 'reusable',
      password: 'secret34',
      display_name: 'ادمین جدید'
    });

    assert.notEqual(replacement.id, first.id);
    assert.equal(service.listInternalUsers().some((user) => user.id === first.id), false);
  } finally {
    db.close();
  }
});

test('role middleware allows manager and rejects admin', () => {
  const middleware = requireRole('MANAGER');
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  middleware({ user: { role: 'MANAGER' } }, {}, next);
  assert.equal(nextCalled, true);

  let statusCode = null;
  let responseBody = null;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };
  middleware({ user: { role: 'ADMIN' } }, response, () => {});
  assert.equal(statusCode, 403);
  assert.match(responseBody.message, /permission/i);
});
