const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
  listAdmins,
  createAdmin,
  updateAdmin,
  updateAdminStatus,
  deleteAdmin
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, requireRole('MANAGER'));

const idValidation = param('id').isInt({ min: 1 }).withMessage('Invalid admin id');
const usernameValidation = body('username')
  .isString().trim().isLength({ min: 3, max: 50 })
  .withMessage('Username must be between 3 and 50 characters');
const displayNameValidation = body('display_name')
  .isString().trim().isLength({ min: 1, max: 100 })
  .withMessage('Display name is required');
const passwordValidation = body('password')
  .isString().isLength({ min: 6, max: 128 })
  .withMessage('Password must be between 6 and 128 characters');

router.get('/', listAdmins);
router.post('/', [usernameValidation, displayNameValidation, passwordValidation], createAdmin);
router.put('/:id', [
  idValidation,
  body('username').optional().isString().trim().isLength({ min: 3, max: 50 }),
  body('display_name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('password').optional({ checkFalsy: true }).isString().isLength({ min: 6, max: 128 }),
  body('is_active').optional().isBoolean()
], updateAdmin);
router.patch('/:id/status', [idValidation, body('is_active').isBoolean()], updateAdminStatus);
router.delete('/:id', [idValidation], deleteAdmin);

module.exports = router;
