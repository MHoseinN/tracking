const express = require('express');
const { body } = require('express-validator');
const {
  getAllCustomers,
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

// POST /api/customers
router.post('/', [
  body('name').notEmpty().withMessage('Customer name is required').trim()
], createCustomer);

// PUT /api/customers/:id
router.put('/:id', [
  body('name').notEmpty().withMessage('Customer name is required').trim()
], updateCustomer);


// DELETE /api/customers/:id
router.delete('/:id', deleteCustomer);

module.exports = router;
