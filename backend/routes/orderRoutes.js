
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const cacheService = require('../services/cacheService');
const cacheInvalidator = require('../utils/cacheInvalidator');
const {
  createOrder,
  addOrder,
  getAllOrders,
  getOrderById,
  getOrderDetails,
  // updateOrderStatus, // REMOVED - Status changes disabled
  confirmOrder,
  cancelOrder,
  cancelUserOrder, // Add the new function
  cancelVendorPart,
  cancelAdminPart,
  cancelOrderItems, // Add individual item cancellation
  getOrderStats,
  getUserOrders
} = require('../controllers/orderController');

// Multer config for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use temp directory in production (Vercel), upload directory in development
    const destPath = process.env.NODE_ENV === 'production' ? '/tmp' : './uploads/';
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Order routes

// Public routes
// Cache durations for orders (in seconds)
const ORDER_CACHE = 180; // 3 minutes for user orders
const ORDER_DETAIL_CACHE = 300; // 5 minutes for order details
const ORDER_STATS_CACHE = 600; // 10 minutes for admin stats

// Order creation routes
router.post('/', upload.single('paymentProof'), async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, addOrder); // Legacy compatibility
router.post('/create', upload.single('paymentProof'), async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, createOrder); // New comprehensive endpoint
router.get('/confirmation/:id', cacheService.middleware(ORDER_DETAIL_CACHE), getOrderById); // Public order confirmation - no auth required

// Admin routes (require admin authentication)
router.get('/all', authenticateAdmin, cacheService.middleware(ORDER_CACHE), getAllOrders);
router.get('/stats', authenticateAdmin, cacheService.middleware(ORDER_STATS_CACHE), getOrderStats);

// User routes (require user authentication with cache invalidation)
router.get('/user', authenticateToken, cacheService.middleware(ORDER_CACHE), getUserOrders); // Simple endpoint for frontend
router.get('/user/:userId', authenticateToken, cacheService.middleware(ORDER_CACHE), getUserOrders);
router.get('/user/my-orders', authenticateToken, cacheService.middleware(ORDER_CACHE), getUserOrders); // Alternative endpoint
router.post('/user/cancel/:id', authenticateToken, async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, cancelUserOrder); // User can cancel their own orders
router.post('/user/cancel-vendor-part/:vendorOrderId', authenticateToken, async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, cancelVendorPart); // User can cancel vendor parts
router.post('/user/cancel-admin-part/:adminOrderId', authenticateToken, async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, cancelAdminPart); // User can cancel admin parts
router.post('/user/cancel-items/:orderId', authenticateToken, async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, cancelOrderItems); // User can cancel specific items

// Import mixed order controller for split details
const { getSplitOrderDetails } = require('../controllers/mixedOrderController');

// Customer split-details endpoint (authenticated)
router.get('/:orderId/split-details', authenticateToken, getSplitOrderDetails); // Customer order details with unified status

// TEST ROUTE - Temporary debugging
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Authentication test successful',
    user: req.user 
  });
});

// Specific admin routes (before parameter routes)
// Note: Using getAllOrders with query parameters instead of separate endpoints

// Import enhanced tracking controller
const { trackOrder, getOrderStatus } = require('../controllers/enhancedOrderTracking');

// Public order tracking routes (no authentication required)
router.get('/:orderNumber/track', trackOrder); // Enhanced tracking with detailed status
router.get('/:orderNumber/status', getOrderStatus); // Quick status check

// Public order details route (with optional email verification)
router.get('/:id/details', getOrderDetails); // Detailed order info for customer

// Generic routes with parameters (MUST come after specific routes)
router.get('/:id', authenticateAdmin, getOrderById);
// router.put('/:id/status', authenticateAdmin, updateOrderStatus); // REMOVED - Status changes disabled
router.put('/:id/confirm', authenticateAdmin, confirmOrder); // Legacy compatibility
router.put('/:id/cancel', authenticateAdmin, cancelOrder);

// Legacy routes for compatibility - DISABLED
// router.put('/status/:id', authenticateAdmin, updateOrderStatus); // REMOVED - Status changes disabled

module.exports = router;
