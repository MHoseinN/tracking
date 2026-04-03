const express = require('express');
const { body } = require('express-validator');
const {
  getInvoicesByMonth,
  getCustomerInvoices,
  searchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus
} = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All invoice routes require authentication
router.use(authMiddleware);

// GET /api/invoices/search - must be before /:id routes
router.get('/search', searchInvoices);

// GET /api/invoices/customer/:customerId - must be before /:id routes
router.get('/customer/:customerId', getCustomerInvoices);

// GET /api/invoices?year=&month=
router.get('/', getInvoicesByMonth);

// POST /api/invoices
router.post('/', [
  body('customer_id').notEmpty().withMessage('Customer is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('price').isNumeric().withMessage('Price must be a number').custom(v => v > 0).withMessage('Price must be positive')
], createInvoice);

// PUT /api/invoices/:id
router.put('/:id', [
  body('date').optional().notEmpty().withMessage('Date cannot be empty'),
  body('price').optional().isNumeric().withMessage('Price must be a number').custom(v => v > 0).withMessage('Price must be positive')
], updateInvoice);

// DELETE /api/invoices/:id
router.delete('/:id', deleteInvoice);

// PATCH /api/invoices/:id/status
router.patch('/:id/status', [
  body('field').isIn(['is_shipped', 'is_settled']).withMessage('Field must be is_shipped or is_settled'),
  body('value').isBoolean().withMessage('Value must be boolean')
], updateInvoiceStatus);

module.exports = router;
