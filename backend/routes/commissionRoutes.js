const express = require('express');
const router = express.Router();
const {
  getCommissionSettings,
  updateCommissionSettings
} = require('../controllers/commissionSettingsController');

const {
  getCommissionOverview,
  getVendorCommissionDetails
} = require('../controllers/commissionController');
const authAdmin = require('../middleware/authAdmin');

// Commission settings routes
router.get('/settings', getCommissionSettings); // Public access for vendors
router.put('/settings', authAdmin, updateCommissionSettings); // Admin only for updates

// Commission overview routes (admin only)
router.get('/overview', authAdmin, getCommissionOverview);
router.get('/vendors/:vendorId', authAdmin, getVendorCommissionDetails);

module.exports = router;
