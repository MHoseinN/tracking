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
    display_name: user.display_name || user.username,
    phone: user.phone || '',
    role: user.role
  };
}

// POST /api/auth/login
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = db.prepare(`
      SELECT id, username, password, display_name, phone, role, is_active, deleted_at
      FROM users
      WHERE username = ?
    `).get(username);

    if (!user || !user.is_active || user.deleted_at) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/auth/me
function getCurrentUser(req, res) {
  return res.json({ user: serializeUser(req.user) });
}

function getProfile(req, res) {
  const user = db.prepare(`
    SELECT id, username, display_name, phone, role, is_active, deleted_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  return res.json({
    user: serializeUser(user),
    performance: performanceService.getUserPerformance(req.user.id)
  });
}

function updateProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const current = db.prepare(`
    SELECT id, username, password, display_name, phone, role, is_active, deleted_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!current || !current.is_active || current.deleted_at) {
    return res.status(404).json({ message: 'User not found' });
  }

  const displayName = req.body.display_name === undefined
    ? current.display_name
    : String(req.body.display_name || '').trim();
  const phone = req.body.phone === undefined ? current.phone : (String(req.body.phone || '').trim() || null);
  const newPassword = String(req.body.new_password || '');
  let password = current.password;
  if (newPassword) {
    if (!bcrypt.compareSync(String(req.body.current_password || ''), current.password)) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    password = bcrypt.hashSync(newPassword, 10);
  }

  db.prepare(`
    UPDATE users
    SET display_name = ?, phone = ?, password = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(displayName || current.username, phone, password, current.id);
  const updated = db.prepare(`
    SELECT id, username, display_name, phone, role, is_active, deleted_at
    FROM users WHERE id = ?
  `).get(current.id);
  return res.json({
    user: serializeUser(updated),
    performance: performanceService.getUserPerformance(current.id)
  });
}

module.exports = { login, getCurrentUser, getProfile, updateProfile, serializeUser };
