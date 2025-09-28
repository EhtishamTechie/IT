const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const cacheInvalidator = require('../utils/cacheInvalidator');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const { uploadProductMedia, handleUploadError } = require('../middleware/uploadMiddleware');
const {
  addProduct,
  getAllProducts,
  getProductById,
  getProduct,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFeaturedProducts,
  getPremiumProducts,
  getTrendingProducts,
  getNewArrivals,
  getProductsByMainCategory,
  getProductsBySubCategory,
  getCategories,
  getLowStockProducts,
  getStockSummary,
  updateProductStock
} = require('../controllers/productController');

// Cache durations (in seconds)
const PRODUCT_LIST_CACHE = 300; // 5 minutes
const PRODUCT_DETAIL_CACHE = 1800; // 30 minutes
const CATEGORY_CACHE = 3600; // 1 hour

// Product routes

// Admin-only routes (require admin authentication with cache invalidation)
router.post('/add', authenticateAdmin, uploadProductMedia, handleUploadError, async (req, res, next) => {
  await cacheInvalidator.invalidateProducts();
  next();
}, addProduct);
router.put('/:id', authenticateAdmin, uploadProductMedia, handleUploadError, async (req, res, next) => {
  await cacheInvalidator.invalidateProducts();
  next();
}, updateProduct);
router.delete('/:id', authenticateAdmin, async (req, res, next) => {
  await cacheInvalidator.invalidateProducts();
  next();
}, deleteProduct);

// Stock Management Routes (Admin only with cache invalidation)
router.get('/admin/low-stock', authenticateAdmin, getLowStockProducts);
router.get('/admin/stock-summary', authenticateAdmin, getStockSummary);
router.put('/admin/:id/stock', authenticateAdmin, async (req, res, next) => {
  await cacheInvalidator.invalidateProducts();
  next();
}, updateProductStock);

// Public product routes with caching
router.get('/', cacheService.middleware(PRODUCT_LIST_CACHE), getAllProducts);  // Main products endpoint
router.get('/all', cacheService.middleware(PRODUCT_LIST_CACHE), getAllProducts);  // Keep /all for backward compatibility
router.get('/search', searchProducts); // Don't cache search results
router.get('/featured', cacheService.middleware(PRODUCT_LIST_CACHE), getFeaturedProducts);
router.get('/premium', cacheService.middleware(PRODUCT_LIST_CACHE), getPremiumProducts); // New premium products endpoint
router.get('/trending', cacheService.middleware(PRODUCT_LIST_CACHE), getTrendingProducts);
router.get('/new-arrivals', cacheService.middleware(PRODUCT_LIST_CACHE), getNewArrivals);
router.get('/categories', cacheService.middleware(CATEGORY_CACHE), getCategories);
router.get('/main-category/:categoryName', cacheService.middleware(PRODUCT_LIST_CACHE), getProductsByMainCategory);
router.get('/sub-category/:categoryName', cacheService.middleware(PRODUCT_LIST_CACHE), getProductsBySubCategory);
router.get('/category/:categoryName', cacheService.middleware(PRODUCT_LIST_CACHE), getProductsByCategory);
// Legacy ID-based endpoint for backward compatibility
router.get('/id/:id', cacheService.middleware(PRODUCT_DETAIL_CACHE), getProductById);
// New unified endpoint supporting both slugs and IDs
router.get('/:identifier', cacheService.middleware(PRODUCT_DETAIL_CACHE), getProduct);

module.exports = router;
