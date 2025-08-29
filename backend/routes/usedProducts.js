const express = require('express');
const router = express.Router();
const {
  upload,
  submitUsedProduct,
  getApprovedUsedProducts,
  getUsedProductById,
  getUsedProductByIdPublic,
  getUserUsedProducts,
  getPendingRequests,
  approveUsedProduct,
  rejectUsedProduct,
  getAllUsedProductsAdmin,
  getUsedProductsForAdmin,
  getUsedProductByIdForAdmin,
  markProductAsSold,
  updateProductPrice
} = require('../controllers/usedProductController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public Routes
router.get('/', getApprovedUsedProducts); // Get all approved used products
router.get('/public/:id', getUsedProductByIdPublic); // Get single used product details (public)

// User Protected Routes
router.post('/', protect, upload.array('images', 6), submitUsedProduct); // Submit used product
router.get('/user/my-submissions', protect, getUserUsedProducts); // Get user's submissions
router.patch('/user/:id/mark-sold', protect, markProductAsSold); // Mark product as sold
router.patch('/user/:id/update-price', protect, updateProductPrice); // Update product price

// Admin Only Routes
router.get('/admin/pending', protect, adminOnly, getPendingRequests); // Get pending requests
router.get('/admin/all', protect, adminOnly, getAllUsedProductsAdmin); // Get all used products (legacy)
router.get('/admin/used-products', protect, adminOnly, getUsedProductsForAdmin); // Get used products with stats
router.get('/admin/used-products/:id', protect, adminOnly, getUsedProductByIdForAdmin); // Get single product for admin
router.post('/admin/:id/approve', protect, adminOnly, approveUsedProduct); // Approve request
router.post('/admin/:id/reject', protect, adminOnly, rejectUsedProduct); // Reject request

module.exports = router;
