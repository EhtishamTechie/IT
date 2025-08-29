const express = require('express');
const router = express.Router();
const {
  getUsedProductsForAdmin,
  getUsedProductByIdForAdmin,
  approveUsedProduct,
  rejectUsedProduct
} = require('../controllers/usedProductController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Get used products with stats and pagination for admin
router.get('/', getUsedProductsForAdmin);

// Get single used product details for admin
router.get('/:id', getUsedProductByIdForAdmin);

// Approve used product
router.post('/:id/approve', approveUsedProduct);

// Reject used product
router.post('/:id/reject', rejectUsedProduct);

module.exports = router;
