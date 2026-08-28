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
    first_name: user.first_name || '',
    last_name: user.last_name || '',
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
    SELECT id, username, first_name, last_name, display_name, phone, role, is_active, created_at, updated_at
    FROM users
  `;

  function listInternalUsers() {
    const users = db.prepare(`
      ${selectPublicColumns}
      WHERE deleted_at IS NULL
      ORDER BY CASE role WHEN 'MANAGER' THEN 0 ELSE 1 END, id ASC
    `).all().map(serializeInternalUser);
    const totals = performanceService.getPerformanceByUserRange();
    return users.map((user) => ({
      ...user,
      delivered_count: totals[user.id]?.delivered || 0,
      received_count: totals[user.id]?.received || 0
    }));
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

  function createAdmin({ username, password, first_name, last_name, display_name, phone }) {
    const normalizedUsername = String(username || '').trim();
    const normalizedFirstName = String(first_name || display_name || '').trim();
    const normalizedLastName = String(last_name || '').trim();
    const normalizedDisplayName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ') || normalizedUsername;
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      const result = db.prepare(`
        INSERT INTO users (
          username, password, first_name, last_name, display_name, phone, role, is_active, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'ADMIN', 1, CURRENT_TIMESTAMP)
      `).run(normalizedUsername, passwordHash, normalizedFirstName || null, normalizedLastName || null,
        normalizedDisplayName, String(phone || '').trim() || null);

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
    const firstName = updates.first_name === undefined
      ? (updates.display_name === undefined ? current.first_name : String(updates.display_name || '').trim())
      : String(updates.first_name || '').trim();
    const lastName = updates.last_name === undefined
      ? current.last_name
      : String(updates.last_name || '').trim();
    const normalizedFirstName = firstName;
    const displayName = [normalizedFirstName, lastName].filter(Boolean).join(' ') || username;
    const isActive = updates.is_active === undefined
      ? current.is_active
      : Number(Boolean(updates.is_active));
    const phone = updates.phone === undefined ? current.phone : (String(updates.phone || '').trim() || null);

    const values = [username, normalizedFirstName || null, lastName || null, displayName, phone, isActive];
    let passwordAssignment = '';
    if (updates.password) {
      passwordAssignment = ', password = ?';
      values.push(bcrypt.hashSync(updates.password, 10));
    }
    values.push(id);

    try {
      db.prepare(`
        UPDATE users
        SET username = ?, first_name = ?, last_name = ?, display_name = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
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

  function getUserPerformance(id, range = {}) {
    const user = db.prepare(`${selectPublicColumns} WHERE id = ? AND deleted_at IS NULL`).get(id);
    if (!user) throw new AdminServiceError('Admin not found', 404);
    if (range.view === 'overview') {
      return {
        user: serializeInternalUser(user),
        ...performanceService.getUserPerformanceOverview(id, range.year)
      };
    }
    return {
      user: serializeInternalUser(user),
      performance: performanceService.getUserPerformanceRange(id, range),
      available_years: performanceService.getAvailableYears(id)
    };
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
    getUserPerformance,
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
