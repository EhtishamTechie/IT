const express = require('express');
const router = express.Router();

const {
  applyAsVendor,
  loginVendor,
  getVendorProfile,
  updateVendorProfile,
  changeVendorPassword,
  getVendorDashboard,
  checkApplicationStatus,
  uploadVendorLogo
} = require('../controllers/vendorAuthController');

const { protectVendor, requireActiveVendor } = require('../middleware/vendorAuth');
const { uploadVendorLogo: uploadMiddleware, handleUploadError } = require('../middleware/uploadMiddleware');

// Public routes
router.post('/apply', applyAsVendor);
router.post('/login', loginVendor);
router.get('/application-status/:applicationId', checkApplicationStatus);

// Protected vendor routes
router.use(protectVendor); // All routes below this will require vendor authentication

router.get('/profile', getVendorProfile);
router.put('/profile', requireActiveVendor, updateVendorProfile);
router.put('/change-password', requireActiveVendor, changeVendorPassword);
router.get('/dashboard', getVendorDashboard);

// Logo upload route
router.post('/upload-logo', requireActiveVendor, (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    uploadVendorLogo(req, res);
  });
});

module.exports = router;
