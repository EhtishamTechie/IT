const express = require('express');
const router = express.Router();
const { 
  getCommissionOverview,
  getCommissionSummary,
  getCommissionSettings,
  updateCommissionSettings,
  getCommissionAnalytics,
  updateVendorPayment,
  exportCommissionReport
} = require('../controllers/commissionController');
const authAdmin = require('../middleware/authAdmin');

// Apply admin auth middleware to all routes
router.use(authAdmin);

// Commission summary and settings routes
router.get('/overview', getCommissionOverview);  // /api/admin/commissions/overview
router.get('/summary', getCommissionSummary);    // /api/admin/commissions/summary
router.get('/config', getCommissionSettings);    // /api/admin/commissions/config
router.put('/config', updateCommissionSettings); // /api/admin/commissions/config
router.get('/analytics', getCommissionAnalytics); // /api/admin/commissions/analytics
router.get('/export', exportCommissionReport);   // /api/admin/commissions/export

// Vendor payment management routes
router.post('/vendor/:vendorId/payment', updateVendorPayment); // /api/admin/commissions/vendor/:id/payment

module.exports = router;
