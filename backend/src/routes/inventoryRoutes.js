const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAvailabilityDashboard,
  getInventoryLookups,
  getActiveReservationOrders,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  createReservation,
  updateReservationOrder,
  updateUnitAssignment,
  deleteUnitAssignment,
  restoreUnitAssignment,
  releaseReservationOrder,
  restoreReservationOrder,
  releaseAllReservations,
  restoreAllReservations
} = require('../controllers/inventoryController');

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', getAvailabilityDashboard);
router.get('/lookups', getInventoryLookups);
router.get('/reservations/active', getActiveReservationOrders);
router.get('/categories/tree', getCategoryTree);

router.post('/categories', [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('parent_id').optional({ nullable: true }).isInt({ min: 1 })
], createCategory);

router.put('/categories/:id', [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('parent_id').optional({ nullable: true }).isInt({ min: 1 })
], updateCategory);

router.delete('/categories/:id', deleteCategory);

router.post('/products', [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('total_quantity').isInt({ min: 1 }),
  body('category_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('category_name').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 255 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 })
], createProduct);

router.put('/products/:id', [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('total_quantity').isInt({ min: 1 }),
  body('category_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('category_name').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 255 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 })
], updateProduct);

router.delete('/products/:id', deleteProduct);

router.post('/reservations', [
  body('customer_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('customer_name').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 255 }),
  body('start_date').isString().trim().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('end_date').isString().trim().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('items').isArray({ min: 1 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 })
], createReservation);

router.put('/reservations/:reservationOrderId', [
  body('customer_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('customer_name').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 255 }),
  body('start_date').isString().trim().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('end_date').isString().trim().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('items').isArray({ min: 1 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 })
], updateReservationOrder);

router.put('/units/:unitId/assignment', [
  body('customer_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('customer_name').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 255 }),
  body('start_date').isString().trim().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('end_date').isString().trim().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('reservation_item_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 })
], updateUnitAssignment);

router.delete('/units/:unitId/assignment', deleteUnitAssignment);
router.post('/units/:unitId/assignment/restore', restoreUnitAssignment);
router.post('/reservations/:reservationOrderId/release', releaseReservationOrder);
router.post('/reservations/:reservationOrderId/restore', restoreReservationOrder);
router.post('/reservations/release-all', releaseAllReservations);
router.post('/reservations/restore-all', restoreAllReservations);

module.exports = router;
