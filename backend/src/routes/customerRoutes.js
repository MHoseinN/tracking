const express = require('express');
const { body } = require('express-validator');
const {
  getAllCustomers,
  getCustomersOverview,
  createCustomer,
  updateCustomer,
  updateCustomerProfile,
  updateCustomerNotes,
  deleteCustomer
} = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All customer routes require authentication
router.use(authMiddleware);

// GET /api/customers
router.get('/', getAllCustomers);

// GET /api/customers/overview
router.get('/overview', getCustomersOverview);

// POST /api/customers
router.post('/', [
  body().custom((_value, { req }) => {
    const hasLegacyName = String(req.body?.name || '').trim().length > 0;
    const hasFirstName = String(req.body?.first_name || '').trim().length > 0;
    const hasLastName = String(req.body?.last_name || '').trim().length > 0;

    if (hasLegacyName || (hasFirstName && hasLastName)) return true;
    throw new Error('Customer first_name and last_name are required');
  }),
  body('account_status').optional().isIn(['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'])
], createCustomer);

// PUT /api/customers/:id
router.put('/:id', [
  body().custom((_value, { req }) => {
    const hasLegacyName = String(req.body?.name || '').trim().length > 0;
    const hasFirstName = String(req.body?.first_name || '').trim().length > 0;
    const hasLastName = String(req.body?.last_name || '').trim().length > 0;

    if (hasLegacyName || (hasFirstName && hasLastName)) return true;
    throw new Error('Customer first_name and last_name are required');
  }),
  body('account_status').optional().isIn(['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'])
], updateCustomer);

// PATCH /api/customers/:id/profile
router.patch('/:id/profile', [
  body('first_name').optional().isString().isLength({ min: 1, max: 100 }),
  body('last_name').optional().isString().isLength({ min: 1, max: 100 }),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('referrer').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('account_status').optional({ nullable: true }).isIn(['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'])
], updateCustomerProfile);

// PATCH /api/customers/:id/notes
router.patch('/:id/notes', [
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 })
], updateCustomerNotes);


// DELETE /api/customers/:id
router.delete('/:id', deleteCustomer);

module.exports = router;
