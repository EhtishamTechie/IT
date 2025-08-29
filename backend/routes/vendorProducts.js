// Production vendor product routes - WITH AUTHENTICATION
const express = require('express');
const router = express.Router();

// Import authentication middleware
const { protectVendor } = require('../middleware/vendorAuth');

// Import watermarking middleware
const { uploadMultipleProductImages, handleUploadError } = require('../middleware/uploadMiddleware');
const { watermarkProductImages, logWatermarkResults } = require('../middleware/watermarkMiddleware');

// Import controller with error handling
let vendorProductController;
try {
  vendorProductController = require('../controllers/vendorProductController');
  console.log('✅ Vendor product controller loaded successfully');
  console.log('Controller exports:', Object.keys(vendorProductController));
} catch (error) {
  console.error('❌ Failed to load vendor product controller:', error.message);
  
  // Fallback functions if controller fails
  vendorProductController = {
    getVendorProducts: (req, res) => res.status(500).json({ success: false, message: 'Controller not available' }),
    getVendorProductById: (req, res) => res.status(500).json({ success: false, message: 'Controller not available' }),
    addVendorProduct: (req, res) => res.status(500).json({ success: false, message: 'Controller not available' }),
    updateVendorProduct: (req, res) => res.status(500).json({ success: false, message: 'Controller not available' }),
    deleteVendorProduct: (req, res) => res.status(500).json({ success: false, message: 'Controller not available' }),
    getVendorProductStats: (req, res) => res.status(500).json({ success: false, message: 'Controller not available' })
  };
}

// Apply vendor authentication middleware to all routes
router.use(protectVendor);

// Routes without file upload
router.get('/', vendorProductController.getVendorProducts);
router.get('/stats', vendorProductController.getVendorProductStats);
router.get('/:id', (req, res, next) => {
  console.log('🚨 [ROUTE] GET /:id route hit with productId:', req.params.id);
  next();
}, vendorProductController.getVendorProductById);

// Routes with watermarked file upload
router.post('/', 
  uploadMultipleProductImages,
  watermarkProductImages,
  logWatermarkResults,
  vendorProductController.addVendorProduct
);

router.put('/:id', 
  uploadMultipleProductImages,
  watermarkProductImages,
  logWatermarkResults,
  vendorProductController.updateVendorProduct
);

router.delete('/:id', vendorProductController.deleteVendorProduct);

// Error handling middleware
router.use(handleUploadError);

module.exports = router;
