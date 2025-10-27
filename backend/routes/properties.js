const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { optimizeUploadedImages } = require('../middleware/imageOptimization');
const Property = require('../models/Property');
const {
  submitProperty,
  getPublicProperties,
  getPropertyDetails,
  getUserProperties,
  updatePropertyPrice,
  markPropertySold
} = require('../controllers/propertyController');

// Public routes - no auth required
router.get('/public', getPublicProperties);
router.get('/public/:id', getPropertyDetails);

// Configure multer for property image uploads
// Note: On Vercel/production, we use /tmp directory only
// Note: Static file serving for property images is handled in api.js

// Ensure uploads directory exists
const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/properties')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      } catch (error) {
        console.error(`❌ Error creating directory ${dir}:`, error);
      }
    }
  });
};

// Initialize upload directories
ensureUploadDirs();

// Get single property for user
router.get('/user/:id', authenticateToken, async (req, res) => {
  try {
    // Special handling for my-listings route
    if (req.params.id === 'my-listings') {
      const properties = await Property.find({ 
        submittedBy: req.user.id 
      }).lean();

      return res.json({
        success: true,
        data: properties
      });
    }

    // Normal single property lookup
    const property = await Property.findOne({ 
      _id: req.params.id,
      submittedBy: req.user.id 
    }).lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or you do not have permission to view it'
      });
    }

    res.json({
      success: true,
      data: normalizePropertyData(property)
    });
  } catch (error) {
    console.error('Error fetching user property:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property details'
    });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Always save directly to uploads/properties
    const uploadsPath = path.join(__dirname, '../uploads/properties');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsPath)) {
      try {
        fs.mkdirSync(uploadsPath, { recursive: true });
        console.log('📁 Created properties upload directory:', uploadsPath);
      } catch (error) {
        console.error('❌ Error creating properties upload directory:', error);
      }
    }
    
    cb(null, uploadsPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and proper extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `property-${uniqueSuffix}${ext}`;
    console.log('📄 Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Please upload only image files (JPG, PNG, GIF, WebP)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 10 files
  }
});

// Public Routes (No authentication required)
// Get all approved properties with filtering and pagination
router.get('/public', getPublicProperties);

// Get specific property details (public)
router.get('/public/:id', getPropertyDetails);

// Protected Routes (Authentication required)
// Submit new property listing
router.post('/submit', 
  authenticateToken, 
  upload.array('images', 10),
  optimizeUploadedImages({ quality: 85, generateWebP: true }),
  submitProperty
);

// Get user's own properties
router.get('/user/my-listings', authenticateToken, getUserProperties);

// Update property price
router.patch('/user/:id/update-price', authenticateToken, updatePropertyPrice);

// Mark property as sold
router.patch('/user/:id/mark-sold', authenticateToken, markPropertySold);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 10MB per image allowed.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 images allowed per property.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Please use "images" field for file uploads.'
      });
    }
  }
  
  if (error.message.includes('Please upload only image files')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Please upload only image files (JPG, PNG, GIF, WebP).'
    });
  }

  // Generic error
  return res.status(500).json({
    success: false,
    message: 'File upload error occurred.'
  });
});

module.exports = router;
