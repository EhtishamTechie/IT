const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cacheService = require('../services/cacheService');
const cacheInvalidator = require('../utils/cacheInvalidator');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const {
  addProduct,
  getAllProducts,
  getProductById,
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

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use temp directory in production (Vercel), upload directory in development
    let destPath;
    if (process.env.NODE_ENV === 'production') {
      // Use system temp directory and ensure it exists
      const os = require('os');
      destPath = path.join(os.tmpdir());
    } else {
      // Use local uploads/products directory
      destPath = path.join(__dirname, '../uploads/products');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
      console.log('📁 Created products upload directory:', destPath);
    }
    
    cb(null, destPath);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Product routes

// Admin-only routes (require admin authentication with cache invalidation)
router.post('/add', authenticateAdmin, upload.single('image'), async (req, res, next) => {
  await cacheInvalidator.invalidateProducts();
  next();
}, addProduct);
router.put('/:id', authenticateAdmin, upload.single('image'), async (req, res, next) => {
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
router.get('/:id', cacheService.middleware(PRODUCT_DETAIL_CACHE), getProductById);

module.exports = router;
