const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { validationResult } = require('express-validator');
const { createInternalUserPerformanceService } = require('../services/internalUserPerformanceService');

const performanceService = createInternalUserPerformanceService(db);

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    display_name: user.display_name || user.username,
    phone: user.phone || '',
    role: user.role
  };
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { username, password } = req.body;
  try {
    const user = db.prepare(`
      SELECT id, username, password, first_name, last_name, display_name, phone, role, is_active, deleted_at
      FROM users WHERE username = ?
    `).get(username);
    if (!user || !user.is_active || user.deleted_at || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

function getCurrentUser(req, res) {
  return res.json({ user: serializeUser(req.user) });
}

function getProfile(req, res) {
  const user = db.prepare(`
    SELECT id, username, first_name, last_name, display_name, phone, role, is_active, deleted_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  return res.json({ user: serializeUser(user) });
}

function getProfilePerformance(req, res) {
  if (req.query.view === 'overview') {
    return res.json(performanceService.getUserPerformanceOverview(req.user.id, req.query.year));
  }
  return res.json({
    performance: performanceService.getUserPerformanceRange(req.user.id, req.query),
    available_years: performanceService.getAvailableYears(req.user.id)
  });
}

function updateProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const current = db.prepare(`
    SELECT id, username, first_name, last_name, display_name, phone, role, is_active, deleted_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!current || !current.is_active || current.deleted_at) {
    return res.status(404).json({ message: 'User not found' });
  }

  const username = req.body.username === undefined ? current.username : String(req.body.username || '').trim();
  const firstName = req.body.first_name === undefined ? current.first_name : String(req.body.first_name || '').trim();
  const lastName = req.body.last_name === undefined ? current.last_name : String(req.body.last_name || '').trim();
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username;
  const phone = req.body.phone === undefined ? current.phone : (String(req.body.phone || '').trim() || null);

  try {
    db.prepare(`
      UPDATE users
      SET username = ?, first_name = ?, last_name = ?, display_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(username, firstName || null, lastName || null, displayName, phone, current.id);
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Username already exists' });
    }
    throw error;
  }

  const updated = db.prepare(`
    SELECT id, username, first_name, last_name, display_name, phone, role, is_active, deleted_at
    FROM users WHERE id = ?
  `).get(current.id);
  return res.json({ user: serializeUser(updated) });
}

function changePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const current = db.prepare(`SELECT id, password, is_active, deleted_at FROM users WHERE id = ?`).get(req.user.id);
  if (!current || !current.is_active || current.deleted_at) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (!bcrypt.compareSync(String(req.body.current_password || ''), current.password)) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(bcrypt.hashSync(String(req.body.new_password), 10), current.id);
  return res.json({ message: 'Password changed successfully' });
}

module.exports = {
  login,
  getCurrentUser,
  getProfile,
  getProfilePerformance,
  updateProfile,
  changePassword,
  serializeUser
};
