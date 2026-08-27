const bcrypt = require('bcryptjs');
const { createInternalUserPerformanceService } = require('./internalUserPerformanceService');

class AdminServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AdminServiceError';
    this.statusCode = statusCode;
  }
}

function serializeInternalUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name || user.username,
    phone: user.phone || '',
    role: user.role,
    is_active: Boolean(user.is_active),
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

function createAdminService(db) {
  const performanceService = createInternalUserPerformanceService(db);
  const selectPublicColumns = `
    SELECT id, username, display_name, phone, role, is_active, created_at, updated_at
    FROM users
  `;

  function listInternalUsers() {
    const users = db.prepare(`
      ${selectPublicColumns}
      WHERE deleted_at IS NULL
      ORDER BY CASE role WHEN 'MANAGER' THEN 0 ELSE 1 END, id ASC
    `).all().map(serializeInternalUser);
    const performance = performanceService.getPerformanceByUser();
    return users.map((user) => ({ ...user, performance: performance[user.id] }));
  }

  function getEditableAdmin(id) {
    const user = db.prepare(`
      ${selectPublicColumns}
      WHERE id = ? AND deleted_at IS NULL
    `).get(id);

    if (!user) {
      throw new AdminServiceError('Admin not found', 404);
    }
    if (user.role !== 'ADMIN') {
      throw new AdminServiceError('The manager account cannot be changed here', 403);
    }

    return user;
  }

  function translateConstraintError(error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AdminServiceError('Username already exists', 409);
    }
    throw error;
  }

  function createAdmin({ username, password, display_name, phone }) {
    const normalizedUsername = String(username || '').trim();
    const normalizedDisplayName = String(display_name || '').trim();
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      const result = db.prepare(`
        INSERT INTO users (
          username, password, display_name, phone, role, is_active, updated_at
        )
        VALUES (?, ?, ?, ?, 'ADMIN', 1, CURRENT_TIMESTAMP)
      `).run(normalizedUsername, passwordHash, normalizedDisplayName || normalizedUsername, String(phone || '').trim() || null);

      return serializeInternalUser(db.prepare(`
        ${selectPublicColumns}
        WHERE id = ?
      `).get(result.lastInsertRowid));
    } catch (error) {
      return translateConstraintError(error);
    }
  }

  function updateAdmin(id, updates) {
    const current = getEditableAdmin(id);
    const username = updates.username === undefined
      ? current.username
      : String(updates.username || '').trim();
    const displayName = updates.display_name === undefined
      ? current.display_name
      : String(updates.display_name || '').trim();
    const isActive = updates.is_active === undefined
      ? current.is_active
      : Number(Boolean(updates.is_active));
    const phone = updates.phone === undefined ? current.phone : (String(updates.phone || '').trim() || null);

    const values = [username, displayName || username, phone, isActive];
    let passwordAssignment = '';
    if (updates.password) {
      passwordAssignment = ', password = ?';
      values.push(bcrypt.hashSync(updates.password, 10));
    }
    values.push(id);

    try {
      db.prepare(`
        UPDATE users
        SET username = ?, display_name = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
          ${passwordAssignment}
        WHERE id = ? AND role = 'ADMIN' AND deleted_at IS NULL
      `).run(...values);
    } catch (error) {
      return translateConstraintError(error);
    }

    return serializeInternalUser(db.prepare(`
      ${selectPublicColumns}
      WHERE id = ?
    `).get(id));
  }

  function setAdminStatus(id, isActive) {
    getEditableAdmin(id);
    db.prepare(`
      UPDATE users
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND role = 'ADMIN' AND deleted_at IS NULL
    `).run(Number(Boolean(isActive)), id);

    return serializeInternalUser(db.prepare(`
      ${selectPublicColumns}
      WHERE id = ?
    `).get(id));
  }

  function deleteAdmin(id) {
    const current = getEditableAdmin(id);
    const deletedUsername = `deleted_${id}_${Date.now()}_${current.username}`;

    db.prepare(`
      UPDATE users
      SET username = ?, is_active = 0, deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND role = 'ADMIN' AND deleted_at IS NULL
    `).run(deletedUsername, id);

    return { id: Number(id) };
  }

  return {
    listInternalUsers,
    createAdmin,
    updateAdmin,
    setAdminStatus,
    deleteAdmin
  };
}

module.exports = {
  AdminServiceError,
  createAdminService,
  serializeInternalUser
};
