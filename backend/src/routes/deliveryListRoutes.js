const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  listDrafts,
  getDraft,
  createDraft,
  saveDraft,
  deleteDraft
} = require('../controllers/deliveryListController');

const router = express.Router();
router.use(authMiddleware);

const idValidation = param('id').isInt({ min: 1 });

router.get('/drafts', listDrafts);
router.post('/drafts', createDraft);
router.get('/:id', [idValidation], getDraft);
router.put('/:id/draft', [
  idValidation,
  body('version').isInt({ min: 1 }),
  body('customer_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('customer_name_snapshot').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('delivered_at').optional({ nullable: true }).isISO8601(),
  body('expected_return_at').optional({ nullable: true }).isISO8601(),
  body('night_before').optional().isBoolean(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('items').isArray({ max: 500 }),
  body('items.*.product_id').isInt({ min: 1 }),
  body('items.*.daily_price_toman').isInt({ min: 0 }),
  body('items.*.delivered_quantity').isInt({ min: 1 }),
  body('items.*.notes').optional({ nullable: true }).isString().isLength({ max: 1000 })
], saveDraft);
router.delete('/:id/draft', [idValidation], deleteDraft);

module.exports = router;
