const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getVendorOrders,
  getVendorOrder,
  getOrderAnalytics,
  handleVendorOrderAction,  // ✅ RESTORED
  getVendorCommissionSummary,
  getVendorMonthlyCommissions,
  getVendorCommission,
  exportVendorCommissionReport
} = require('../controllers/vendorOrderController_clean');

// Import simplified controller  
const { getSimplifiedVendorOrders } = require('../controllers/simplifiedVendorOrdersController');

const { protectVendor, requireApprovedVendor, requireActiveVendor } = require('../middleware/vendorAuth');

// All routes require vendor authentication
router.use(protectVendor);

// ✅ VENDOR STATUS MANAGEMENT RESTORED
router.put('/orders/:id/vendor-action', requireApprovedVendor, requireActiveVendor, handleVendorOrderAction);

// Temporary: Redirect legacy status calls to unified status API
router.put('/:id/status', requireApprovedVendor, requireActiveVendor, async (req, res) => {
  const { updateOrderStatus } = require('../controllers/simpleStatusController');
  // Forward to the unified status controller
  req.params.orderId = req.params.id;
  return updateOrderStatus(req, res);
});

// Multi-vendor system routes
router.get('/', getSimplifiedVendorOrders); // SIMPLIFIED vendor orders endpoint
router.get('/debug-auth', (req, res) => {
  // Debug route to check vendor authentication
  res.json({
    success: true,
    message: 'Vendor authentication successful',
    vendor: req.vendor,
    timestamp: new Date().toISOString()
  });
});
router.get('/commission', getVendorCommission); // Detailed commission data for commission page
router.get('/commission/export', exportVendorCommissionReport); // Export commission report
router.get('/commissions', getVendorCommissionSummary); // Commission summary endpoint
router.get('/commissions/monthly', getVendorMonthlyCommissions); // Monthly commission breakdown
router.get('/analytics', getOrderAnalytics);
// router.put('/bulk-status', requireApprovedVendor, requireActiveVendor, bulkUpdateOrderStatus); // REMOVED - Status changes disabled

// Legacy order routes (backward compatibility) - REMOVED DUPLICATE
router.route('/:id')
  .get(getVendorOrder);

// router.put('/:id/tracking', requireApprovedVendor, requireActiveVendor, updateOrderTracking); // REMOVED - Status changes disabled

module.exports = router;
