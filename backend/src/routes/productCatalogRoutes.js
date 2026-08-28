const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCatalog,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getPriceHistory,
  listPriceVersions,
  getPriceVersion,
  createPriceVersion,
  downloadPriceVersionPdf
} = require('../controllers/productCatalogController');

const router = express.Router();
router.use(authMiddleware);

const idValidation = param('id').isInt({ min: 1 }).withMessage('Invalid id');
const optionalCategoryId = body('category_id').optional({ nullable: true }).isInt({ min: 1 });
const optionalParentId = body('parent_id').optional({ nullable: true }).isInt({ min: 1 });
const versionIdValidation = param('versionId').isInt({ min: 1 }).withMessage('Invalid version id');

router.get('/', getCatalog);
router.get('/price-versions', listPriceVersions);
router.post('/price-versions', [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('effective_from').optional({ nullable: true }).isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isInt({ min: 1 }),
  body('items.*.new_price_toman').isInt({ min: 0 })
], createPriceVersion);
router.get('/price-versions/:versionId', [versionIdValidation], getPriceVersion);
router.get('/price-versions/:versionId/pdf', [versionIdValidation], downloadPriceVersionPdf);

router.post('/categories', [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  optionalParentId
], createCategory);
router.put('/categories/:id', [
  idValidation,
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  optionalParentId,
  body('is_active').optional().isBoolean()
], updateCategory);
router.delete('/categories/:id', [idValidation], deleteCategory);

router.post('/', [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('daily_price_toman').isInt({ min: 0 }),
  optionalCategoryId,
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('is_active').optional().isBoolean(),
  body('price_change_reason').optional({ nullable: true }).isString().isLength({ max: 500 })
], createProduct);
router.put('/:id', [
  idValidation,
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('daily_price_toman').optional().isInt({ min: 0 }),
  optionalCategoryId,
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('is_active').optional().isBoolean(),
  body('price_change_reason').optional({ nullable: true }).isString().isLength({ max: 500 })
], updateProduct);
router.delete('/:id', [idValidation], deleteProduct);
router.get('/:id/price-history', [idValidation], getPriceHistory);

module.exports = router;
