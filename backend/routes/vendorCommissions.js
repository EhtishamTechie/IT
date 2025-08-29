const express = require('express');
const router = express.Router();

const {
  getVendorCommissions,
  getCommissionDetails,
  getCommissionAnalytics,
  getMonthlyCommissionReports,
  requestPayout
} = require('../controllers/vendorCommissionController');

const { protectVendor, requireApprovedVendor } = require('../middleware/vendorAuth');

// All routes require vendor authentication
router.use(protectVendor);
router.use(requireApprovedVendor);

// Commission routes
router.get('/', getVendorCommissions);
router.get('/analytics', getCommissionAnalytics);
router.get('/monthly', getMonthlyCommissionReports);
router.post('/request-payout', requestPayout);
router.get('/:id', getCommissionDetails);

module.exports = router;
