
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

// Multer config for payment proof and payment receipt uploads
const fs = require('fs');

// Ensure payment receipts upload directory exists
const paymentReceiptsDir = path.join(__dirname, '..', 'uploads', 'payment-receipts');
if (!fs.existsSync(paymentReceiptsDir)) {
  fs.mkdirSync(paymentReceiptsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Always use the payment receipts directory
    cb(null, paymentReceiptsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = req.body.paymentMethod === 'advance_payment' ? 'receipt-' : 'payment-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP images and PDF files are allowed.'), false);
    }
  }
});

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
router.post('/with-receipt', upload.single('paymentReceipt'), async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, createOrder); // Order creation with payment receipt for advance payments
router.post('/:orderId/verify-payment', authenticateAdmin, async (req, res, next) => {
  await cacheInvalidator.invalidateOrders();
  next();
}, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentMethod !== 'advance_payment') {
      return res.status(400).json({
        success: false,
        message: 'This order does not use advance payment method'
      });
    }

    if (order.paymentVerified) {
      return res.status(400).json({
        success: false,
        message: 'Payment already verified for this order'
      });
    }

    // Update payment verification status
    await Order.findByIdAndUpdate(orderId, {
      paymentVerified: true,
      paymentStatus: 'verified',
      status: 'confirmed',
      lastStatusUpdate: new Date(),
      $push: {
        statusHistory: {
          status: 'payment_verified',
          updatedBy: req.admin?.name || 'Admin',
          reason: 'Payment verified by admin',
          timestamp: new Date(),
          userRole: 'admin'
        }
      }
    });

    // Send email notification about payment verification
    try {
      const { emailService } = require('../services/emailService');
      await emailService.sendOrderStatusUpdate(order.email, order, 'payment_verified', 'pending_verification');
      console.log(`📧 Payment verification email sent for order: ${order.orderNumber}`);
    } catch (emailError) {
      console.error('Failed to send payment verification email:', emailError);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        orderNumber: order.orderNumber,
        paymentVerified: true,
        status: 'confirmed'
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
}); // Payment verification endpoint
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
