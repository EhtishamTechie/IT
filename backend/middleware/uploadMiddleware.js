const multer = require('multer');
const path = require('path');
const fs = require('fs');
const watermarkService = require('../services/watermarkService');

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/vendor-logos',
    'uploads/properties',
    'uploads/products',
    'uploads/banner',
    'uploads/wholesale-suppliers'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    // Only create directories in development, not in production (Vercel)
    if (process.env.NODE_ENV !== 'production' && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  });
};

// Initialize upload directories
createUploadDirs();

// Storage configuration for vendor logos
const vendorLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/vendor-logos');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with vendor ID and timestamp
    const vendorId = req.vendor?.id || 'temp';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `vendor-${vendorId}-${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF and WEBP image files are allowed!'), false);
  }
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP4, WebM, OGG, AVI and MOV video files are allowed!'), false);
  }
};

// Combined file filter for images and videos
const mediaFileFilter = (req, file, cb) => {
  const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
  
  if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) and video files (MP4, WebM, OGG, AVI, MOV) are allowed!'), false);
  }
};

// Vendor logo upload middleware
const uploadVendorLogo = multer({
  storage: vendorLogoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file upload
  }
}).single('logo');

// Storage configuration for product images
const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/products');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `product-${timestamp}-${random}${ext}`;
    console.log('📸 Generated filename for upload (will be prefixed with products/):', filename);
    // Filename only - products/ prefix will be added when storing in database
    cb(null, filename);
  }
});

// Product image upload middleware with watermarking
const uploadProductImages = multer({
  storage: productImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Max 10 files
  }
}).array('images', 10);

// Single product image upload with watermarking
const uploadSingleProductImage = multer({
  storage: productImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 1
  }
}).single('image');

// Multiple product images upload with watermarking  
const uploadMultipleProductImages = multer({
  storage: productImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

// Enhanced product media upload (images + video)
const uploadProductMedia = multer({
  storage: productImageStorage, // Same storage for both images and videos
  fileFilter: (req, file, cb) => {
    // Different file type validation for different fields
    if (file.fieldname === 'video') {
      // Video file filter
      const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
      if (allowedVideoMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only MP4, WebM, OGG, AVI and MOV video files are allowed!'), false);
      }
    } else {
      // Image file filter for other fields
      const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedImageMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, GIF and WEBP image files are allowed!'), false);
      }
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (will handle video size validation separately)
    files: 15 // Total files limit (multiple images + 1 video)
  }
}).fields([
  { name: 'image', maxCount: 1 },    // Primary image
  { name: 'images', maxCount: 10 },   // Additional images
  { name: 'video', maxCount: 1 }      // Single video
]);

// Watermarking middleware - applies watermark after upload
const applyWatermarkToUploads = async (req, res, next) => {
  try {
    console.log('🎨 Starting watermark application process...');
    
    const uploadPath = path.join(__dirname, '../uploads/products');
    let processedFiles = [];

    // Handle single image upload
    if (req.file) {
      console.log('📷 Processing single image:', req.file.filename);
      const processed = await watermarkService.processUploadedImage(
        req.file, 
        uploadPath,
        { replaceOriginal: true }
      );
      processedFiles.push(processed);
      console.log('✅ Single image processed with watermark');
    }

    // Handle multiple image uploads (from req.files.images)
    if (req.files && req.files.images && req.files.images.length > 0) {
      console.log(`📷 Processing ${req.files.images.length} multiple images`);
      const processed = await watermarkService.batchProcessImages(
        req.files.images,
        uploadPath,
        { replaceOriginal: true }
      );
      processedFiles = processedFiles.concat(processed);
      console.log(`✅ ${processed.length} multiple images processed with watermarks`);
    }

    // Handle single main image (from req.files.image)
    if (req.files && req.files.image && req.files.image.length > 0) {
      console.log('📷 Processing main image:', req.files.image[0].filename);
      const processed = await watermarkService.processUploadedImage(
        req.files.image[0],
        uploadPath,
        { replaceOriginal: true }
      );
      processedFiles.push(processed);
      console.log('✅ Main image processed with watermark');
    }

    // Handle array of images (from multer array upload)
    if (req.files && Array.isArray(req.files)) {
      console.log(`📷 Processing ${req.files.length} array images`);
      const processed = await watermarkService.batchProcessImages(
        req.files,
        uploadPath,
        { replaceOriginal: true }
      );
      processedFiles = processedFiles.concat(processed);
      console.log(`✅ ${processed.length} array images processed with watermarks`);
    }

    // Store processed files info in request for controller access
    req.processedImages = processedFiles;
    
    console.log(`🎯 Watermark application completed: ${processedFiles.length} images processed`);
    next();

  } catch (error) {
    console.error('❌ Error applying watermarks:', error);
    
    // Clean up any uploaded files if watermarking fails
    if (req.file) {
      deleteUploadedFile(req.file.path);
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(file => deleteUploadedFile(file.path));
      } else {
        Object.values(req.files).flat().forEach(file => deleteUploadedFile(file.path));
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error processing images with watermark',
      error: error.message
    });
  }
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  // If no error, continue to next middleware
  if (!error) {
    return next();
  }
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name in file upload.'
      });
    }
  }
  
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Helper function to delete uploaded file
const deleteUploadedFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

// Storage configuration for banner images
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/banner');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadBannerImage = multer({
  storage: bannerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).array('images', 10); // Allow up to 10 images

// Storage configuration for wholesale supplier profile images
const wholesaleSupplierStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/wholesale-suppliers');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const filename = `supplier-${timestamp}-${random}${ext}`;
    cb(null, filename);
  }
});

// Wholesale supplier profile image upload middleware
const uploadWholesaleSupplierImage = multer({
  storage: wholesaleSupplierStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file upload
  }
}).single('profileImage');

// Wholesale supplier product images upload middleware (multiple images)
const uploadWholesaleSupplierProductImages = multer({
  storage: wholesaleSupplierStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Allow up to 10 product images
  }
}).array('productImages', 10);

// Wholesale supplier ALL images upload middleware (profile + product images)
const uploadWholesaleSupplierAllImages = multer({
  storage: wholesaleSupplierStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 11 // 1 profile image + 10 product images
  }
}).fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'productImages', maxCount: 10 }
]);

module.exports = {
  uploadVendorLogo,
  uploadProductImages,
  uploadSingleProductImage,
  uploadMultipleProductImages,
  uploadProductMedia,  // New enhanced upload for images + video
  uploadBannerImage,
  uploadWholesaleSupplierImage,
  uploadWholesaleSupplierProductImages,
  uploadWholesaleSupplierAllImages,
  applyWatermarkToUploads,
  handleUploadError,
  deleteUploadedFile,
  imageFileFilter,
  videoFileFilter,
  mediaFileFilter
};
