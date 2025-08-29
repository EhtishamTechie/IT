const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const { protectVendor, requireApprovedVendor, requireActiveVendor } = require('../middleware/vendorAuth');

const {
  updateOrderStatus,
  cancelCustomerOrder,
  getOrderStatusHistory,
  getValidTransitions
} = require('../controllers/simpleStatusController');

// Customer routes
router.put('/:orderId/cancel', authenticateToken, cancelCustomerOrder);

// Admin routes
router.put('/:orderId/status', authenticateAdmin, updateOrderStatus);
router.get('/:orderId/status-history', authenticateAdmin, getOrderStatusHistory);
router.get('/:orderId/valid-transitions', authenticateAdmin, getValidTransitions);

// Vendor routes  
router.put('/:orderId/vendor-status', protectVendor, requireApprovedVendor, requireActiveVendor, updateOrderStatus);

// Public status tracking (no auth required)
router.get('/:orderId/status-history/public', getOrderStatusHistory);

module.exports = router;
