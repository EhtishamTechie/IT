const express = require('express');
const router = express.Router();

const {
  getAnalytics,
  getSalesReport,
  getPerformanceMetrics,
  exportSalesReport
} = require('../controllers/vendorAnalyticsController');

const {
  getVendorDashboardStats
} = require('../controllers/vendorDashboardController');

const {
  getVendorAnalyticsStats
} = require('../controllers/vendorAnalyticsOptimizedController');

const { protectVendor, requireApprovedVendor } = require('../middleware/vendorAuth');

// All routes require vendor authentication
router.use(protectVendor);
router.use(requireApprovedVendor);

// Analytics routes
router.get('/dashboard-stats', getVendorDashboardStats);
router.get('/analytics-stats', getVendorAnalyticsStats);
router.get('/', getAnalytics);
router.get('/sales-report', getSalesReport);
router.get('/sales-report/export', exportSalesReport);
router.get('/performance', getPerformanceMetrics);

module.exports = router;
