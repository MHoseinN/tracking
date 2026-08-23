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
  getPriceHistory
} = require('../controllers/productCatalogController');

const router = express.Router();
router.use(authMiddleware);

const idValidation = param('id').isInt({ min: 1 }).withMessage('Invalid id');
const optionalCategoryId = body('category_id').optional({ nullable: true }).isInt({ min: 1 });
const optionalParentId = body('parent_id').optional({ nullable: true }).isInt({ min: 1 });

router.get('/', getCatalog);

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
