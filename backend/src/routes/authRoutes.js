const express = require('express');
const { body } = require('express-validator');
const { login, getCurrentUser, getProfile, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.get('/me', authMiddleware, getCurrentUser);
router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, [
  body('display_name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('current_password').optional().isString().isLength({ max: 128 }),
  body('new_password').optional({ checkFalsy: true }).isString().isLength({ min: 6, max: 128 })
], updateProfile);

module.exports = router;
