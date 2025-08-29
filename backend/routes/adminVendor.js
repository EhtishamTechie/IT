const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/authAdmin');

const {
  getVendorApplications,
  getVendorApplication,
  approveVendorApplication,
  rejectVendorApplication,
  getAllVendors,
  getVendor,
  suspendVendor,
  unsuspendVendor,
  updateVendorCommission,
  getVendorStats,
  loginAsVendor
} = require('../controllers/adminVendorController');

// Apply admin authentication middleware to all routes
router.use(authAdmin);

// Vendor application management
router.get('/applications', getVendorApplications);
router.get('/applications/:id', getVendorApplication);
router.post('/applications/:id/approve', approveVendorApplication);
router.post('/applications/:id/reject', rejectVendorApplication);

// Vendor management
router.get('/vendors', getAllVendors);
router.get('/vendors/stats', getVendorStats);
router.get('/vendors/:id', getVendor);
router.post('/vendors/:id/suspend', suspendVendor);
router.post('/vendors/:id/unsuspend', unsuspendVendor);
router.put('/vendors/:id/commission', updateVendorCommission);
router.post('/vendors/:id/login-as', loginAsVendor); // Admin impersonation

module.exports = router;
