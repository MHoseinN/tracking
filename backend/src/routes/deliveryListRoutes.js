const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  listDeliveryLists,
  subscribeDeliveryListEvents,
  listDrafts,
  getList,
  createDraft,
  saveDraft,
  archiveList,
  finalizeDraft,
  recordReturn,
  getInvoicePreview,
  issueInvoice,
  getIssuedInvoice,
  updateIssuedInvoice,
  updateInvoiceSendStatus,
  getSettlement,
  recordPayment,
  voidPayment,
  downloadInvoicePdf
} = require('../controllers/deliveryListController');

const router = express.Router();
router.use(authMiddleware);

const idValidation = param('id').isInt({ min: 1 });

router.get('/drafts', listDrafts);
router.post('/drafts', createDraft);
router.get('/events', subscribeDeliveryListEvents);
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
  body('items.*.id').optional({ nullable: true }).isInt({ min: 1 }),
  body('items.*.product_id').isInt({ min: 1 }),
  body('items.*.daily_price_toman').isInt({ min: 0 }),
  body('items.*.delivered_quantity').isInt({ min: 1 }),
  body('items.*.notes').optional({ nullable: true }).isString().isLength({ max: 1000 })
], saveDraft);
// Keep the original delete URL as a backwards-compatible alias for safe list archiving.
router.delete('/:id/draft', [idValidation], archiveList);
router.delete('/:id', [idValidation], archiveList);
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
router.get('/:id/invoice-preview', [idValidation], getInvoicePreview);
router.post('/:id/invoices', [
  idValidation,
  body('issued_at').optional().isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('lines').optional().isArray({ min: 1, max: 500 }),
  body('lines.*.return_event_item_id').optional().isInt({ min: 1 }),
  body('lines.*.charged_days').optional().isInt({ min: 1 }),
  body('lines.*.unit_price_toman').optional().isInt({ min: 0 }),
  body('extras').optional().isArray({ max: 100 }),
  body('extras.*.type').optional().isIn(['DAMAGE', 'LOSS', 'TRANSPORT', 'OTHER']),
  body('extras.*.description').optional().isString().isLength({ min: 1, max: 1000 }),
  body('extras.*.amount_toman').optional().isInt({ min: 1 }),
  body('discount_percent_basis_points').optional().isInt({ min: 0, max: 10000 }),
  body('discount_amount_toman').optional().isInt({ min: 0 }),
  body('rounding_adjustment_toman').optional().isInt({ max: 0 })
], issueInvoice);
router.get('/:id/invoices/:invoiceId', [
  idValidation,
  param('invoiceId').isInt({ min: 1 })
], getIssuedInvoice);
router.put('/:id/invoices/:invoiceId', [
  idValidation,
  param('invoiceId').isInt({ min: 1 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('lines').isArray({ min: 1, max: 500 }),
  body('lines.*.id').isInt({ min: 1 }),
  body('lines.*.charged_days').isInt({ min: 1 }),
  body('lines.*.unit_price_toman').isInt({ min: 0 }),
  body('extras').optional().isArray({ max: 100 }),
  body('extras.*.type').optional().isIn(['DAMAGE', 'LOSS', 'TRANSPORT', 'OTHER']),
  body('extras.*.description').optional().isString().isLength({ min: 1, max: 1000 }),
  body('extras.*.amount_toman').optional().isInt({ min: 1 }),
  body('discount_percent_basis_points').optional().isInt({ min: 0, max: 10000 }),
  body('discount_amount_toman').optional().isInt({ min: 0 }),
  body('rounding_adjustment_toman').optional().isInt({ max: 0 })
], updateIssuedInvoice);
router.patch('/:id/invoices/:invoiceId/send-status', [
  idValidation,
  param('invoiceId').isInt({ min: 1 }),
  body('send_status').isIn(['SENT', 'NOT_SENT']),
  body('channel').optional().isIn(['EITA', 'PRINT', 'MANUAL', 'OTHER']),
  body('recipient').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('sent_at').optional().isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 })
], updateInvoiceSendStatus);
router.get('/:id/settlement', [idValidation], getSettlement);
router.post('/:id/payments', [
  idValidation,
  body('invoice_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('amount_toman').isInt({ min: 1 }),
  body('payment_method').isIn(['CASH', 'POS', 'CARD_TRANSFER', 'OTHER']),
  body('reference_number').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('paid_at').isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 })
], recordPayment);
router.post('/:id/payments/:paymentId/void', [
  idValidation,
  param('paymentId').isInt({ min: 1 })
], voidPayment);
router.get('/:id/invoices/:invoiceId/pdf', [
  idValidation,
  param('invoiceId').isInt({ min: 1 })
], downloadInvoicePdf);

module.exports = router;
