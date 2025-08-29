const express = require('express');
const router = express.Router();

// Import commission controller functions
const {
  getCommissionOverview,
  updateVendorPayment,
  getVendorCommissionDetails,
  processCommissionPayment,
  bulkProcessCommissionPayments,
  getCommissionAnalytics,
  resetVendorCommission,
  getCommissionConfig
} = require('../controllers/commissionController');

// Import admin order controller functions
const {
  getOrdersWithCategorization,
  forwardOrderToVendors,
  handleSimpleAdminAction, // NEW: Simple admin actions using 6-status system
  getCommissionSummary,
  recategorizeAllOrders,
  checkVendorOrderStatuses,
  getAdminOrders
} = require('../controllers/adminOrderController');

// Import mixed order controller functions
const {
  splitAndForwardMixedOrder,
  getSplitOrderDetails
} = require('../controllers/mixedOrderController');

// Import unified order processor functions
const {
  processUnifiedOrder,
  getUnifiedOrderStatus
} = require('../controllers/unifiedOrderProcessor');

// Import smart order controller functions
const {
  handleVendorRejection,
  getOrderStatusSummary,
  handleSmartAdminAction
} = require('../controllers/smartOrderController');

// Import admin authentication middleware - STANDARDIZED
const authAdmin = require('../middleware/authAdmin');

// Import commission settings controller
const { 
  getCommissionSettings, 
  updateCommissionSettings 
} = require('../controllers/commissionSettingsController');

// Commission Management Routes - FIXED MIDDLEWARE
router.get('/commissions/config', getCommissionConfig); // Allow both admin and vendor access
router.get('/commission/settings', authAdmin, getCommissionSettings);
router.put('/commission/settings', authAdmin, updateCommissionSettings);
router.post('/commissions/vendor/:vendorId/payment', authAdmin, updateVendorPayment);
router.get('/commissions/vendor/:vendorId', authAdmin, getVendorCommissionDetails);
router.put('/commissions/:commissionId/pay', authAdmin, processCommissionPayment);
router.put('/commissions/:vendorId/reset', authAdmin, resetVendorCommission);
router.put('/commissions/bulk-pay', authAdmin, bulkProcessCommissionPayments);
router.get('/commissions/analytics', authAdmin, getCommissionAnalytics);

// Order Management Routes (Admin) - FIXED MIDDLEWARE
router.get('/verify', authAdmin, (req, res) => {
  // Simple endpoint to verify admin authentication
  res.json({
    success: true,
    message: 'Admin authentication verified',
    user: {
      id: req.user.id || req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});
router.get('/', authAdmin, getOrdersWithCategorization); // FIXED: Root path for admin orders
router.get('/my-orders', authAdmin, getAdminOrders); // FIXED: Simplified path
router.post('/:orderId/forward', authAdmin, forwardOrderToVendors); // FIXED: Simplified path
router.post('/:orderId/split-and-forward', authAdmin, splitAndForwardMixedOrder); // FIXED: Simplified path
// router.post('/orders/:orderId/process-unified', authAdmin, processUnifiedOrder); // DEPRECATED - Orders now auto-split at checkout
router.get('/:orderId/unified-status', authAdmin, getUnifiedOrderStatus); // FIXED: Simplified path
router.put('/:orderId/admin-action', authAdmin, handleSimpleAdminAction); // FIXED: Simplified path
router.get('/commission-summary', authAdmin, getCommissionSummary); // FIXED: Simplified path
router.post('/recategorize', authAdmin, recategorizeAllOrders); // FIXED: Simplified path
router.post('/check-vendor-statuses', authAdmin, checkVendorOrderStatuses); // FIXED: Simplified path

// Smart Order Management Routes - FIXED MIDDLEWARE
router.post('/:orderId/handle-vendor-rejection', authAdmin, handleVendorRejection); // FIXED: Simplified path
router.get('/:orderId/status-summary', authAdmin, getOrderStatusSummary); // FIXED: Simplified path
router.put('/:orderId/smart-admin-action', authAdmin, handleSmartAdminAction); // FIXED: Simplified path

// Public routes for customer order tracking
router.get('/:orderId/split-details', getSplitOrderDetails); // FIXED: Simplified path

module.exports = router;
