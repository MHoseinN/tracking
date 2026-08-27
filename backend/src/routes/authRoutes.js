const express = require('express');
const { body } = require('express-validator');
const {
  login,
  getCurrentUser,
  getProfile,
  getProfilePerformance,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.get('/me', authMiddleware, getCurrentUser);
router.get('/profile', authMiddleware, getProfile);
router.get('/profile/performance', authMiddleware, getProfilePerformance);
router.patch('/profile', authMiddleware, [
  body('username').optional().isString().trim().isLength({ min: 3, max: 50 }),
  body('first_name').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('last_name').optional().isString().trim().isLength({ min: 1, max: 70 }),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 50 }),
], updateProfile);
router.patch('/profile/password', authMiddleware, [
  body('current_password').isString().isLength({ min: 1, max: 128 }),
  body('new_password').isString().isLength({ min: 6, max: 128 })
], changePassword);

module.exports = router;
