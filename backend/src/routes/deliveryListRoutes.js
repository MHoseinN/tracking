const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  listDeliveryLists,
  listDrafts,
  getList,
  createDraft,
  saveDraft,
  deleteDraft,
  finalizeDraft,
  recordReturn
} = require('../controllers/deliveryListController');

const router = express.Router();
router.use(authMiddleware);

const idValidation = param('id').isInt({ min: 1 });

router.get('/drafts', listDrafts);
router.post('/drafts', createDraft);
router.get('/', listDeliveryLists);
router.get('/:id', [idValidation], getList);
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
router.post('/:id/finalize', [
  idValidation,
  body('version').isInt({ min: 1 })
], finalizeDraft);
router.post('/:id/returns', [
  idValidation,
  body('returned_at').isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('items').isArray({ min: 1, max: 500 }),
  body('items.*.delivery_list_item_id').isInt({ min: 1 }),
  body('items.*.healthy_quantity').optional().isInt({ min: 0 }),
  body('items.*.damaged_quantity').optional().isInt({ min: 0 }),
  body('items.*.lost_quantity').optional().isInt({ min: 0 }),
  body('items.*.final_charged_days').optional({ nullable: true }).isInt({ min: 1 }),
  body('items.*.day_override_reason').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('items.*.damage_notes').optional({ nullable: true }).isString().isLength({ max: 2000 })
], recordReturn);

module.exports = router;
