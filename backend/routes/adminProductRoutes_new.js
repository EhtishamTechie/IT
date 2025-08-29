const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const adminProductController = require('../controllers/adminProductController');
const { uploadMultipleProductImages, handleUploadError } = require('../middleware/uploadMiddleware');
const { watermarkProductImages, logWatermarkResults } = require('../middleware/watermarkMiddleware');

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

// Admin Product Routes
router.get('/', adminProductController.getAdminProducts);
router.get('/:id', adminProductController.getAdminProductById);

// Add product with watermarked images
router.post('/', 
  uploadMultipleProductImages,
  watermarkProductImages,
  logWatermarkResults,
  adminProductController.addAdminProduct
);

// Update product with watermarked images
router.put('/:id', 
  uploadMultipleProductImages,
  watermarkProductImages,
  logWatermarkResults,
  adminProductController.updateAdminProduct
);

router.delete('/:id', adminProductController.deleteAdminProduct);

// Error handling middleware
router.use(handleUploadError);

module.exports = router;
