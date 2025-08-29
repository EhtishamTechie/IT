const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Define upload directories and paths
const uploadsPath = path.join(__dirname, '..', 'uploads');
const uploadDirs = ['products', 'properties', 'used-products', 'vendor-logos'];

// Logging helper
const logPath = (type, path) => console.log(`📁 [STATIC] ${type}: ${path}`);

// Ensure upload directories exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  logPath('Created base uploads directory', uploadsPath);
}

uploadDirs.forEach(dir => {
  const fullPath = path.join(uploadsPath, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    logPath('Created subdirectory', fullPath);
  }
});

// Export paths for other modules to use
module.exports.paths = {
  uploads: uploadsPath,
  vendorLogos: path.join(uploadsPath, 'vendor-logos'),
  products: path.join(uploadsPath, 'products'),
  properties: path.join(uploadsPath, 'properties'),
  usedProducts: path.join(uploadsPath, 'used-products')
};

// Serve placeholder image from products directory when files are not found
router.get('/uploads/products/placeholder-image.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'uploads', 'products', 'placeholder-image.jpg'));
});

// Debug middleware for file requests
router.use('/uploads', (req, res, next) => {
  const requestedPath = req.path;
  const fullPath = path.join(uploadsPath, requestedPath);
  
  console.log('🔍 [STATIC] Checking file:', {
    url: requestedPath,
    fullPath,
    exists: fs.existsSync(fullPath)
  });
  
  next();
});

// Serve files from uploads directory with proper headers
router.use('/uploads', express.static(uploadsPath, {
  fallthrough: true,
  index: false,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    // Set proper cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Log serving of important files
    if (filePath.includes('vendor-logos')) {
      console.log('✅ [STATIC] Serving vendor logo:', path.relative(uploadsPath, filePath));
    }
  }
}));

// Handle file not found for uploads with detailed logging
router.use('/uploads/*', (req, res) => {
  const requestedPath = req.path;
  const fullPath = path.join(uploadsPath, requestedPath.replace('/uploads/', ''));
  
  console.log('❌ [STATIC] File not found:', {
    requested: requestedPath,
    fullPath,
    exists: fs.existsSync(fullPath)
  });
  
  res.redirect('/placeholder-image.jpg');
});

module.exports = router;
