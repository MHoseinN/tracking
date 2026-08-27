const jwt = require('jsonwebtoken');
const db = require('../db/database');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare(`
      SELECT id, username, display_name, phone, role, is_active, deleted_at
      FROM users
      WHERE id = ?
    `).get(decoded.id);

    if (!user || !user.is_active || user.deleted_at) {
      return res.status(401).json({ message: 'User account is inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
