const express = require('express');
const { body } = require('express-validator');
const {
  getAllCustomers,
  getCustomersOverview,
  createCustomer,
  updateCustomer,
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


// DELETE /api/customers/:id
router.delete('/:id', deleteCustomer);

module.exports = router;
