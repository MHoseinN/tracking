const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
  getSettings,
  updateBillingCutoff,
  updateGeneralSettings
} = require('../controllers/settingsController');

const router = express.Router();
router.use(authMiddleware);
router.get('/', getSettings);
router.put('/', [
  requireRole('MANAGER'),
  body('collection_name').trim().isLength({ min: 2, max: 120 }),
  body('billing_cutoff_time').matches(/^([01]\d|2[0-3]):[0-5]\d$/)
], updateGeneralSettings);
router.put('/billing-cutoff', [
  requireRole('MANAGER'),
  body('billing_cutoff_time').matches(/^([01]\d|2[0-3]):[0-5]\d$/)
], updateBillingCutoff);

module.exports = router;
