const multer = require('multer');
const path = require('path');
const fs = require('fs');
const imageOptimizationService = require('../services/imageOptimizationService');
const watermarkService = require('../services/watermarkService');

/**
 * Enhanced image upload middleware with SEO optimization
 * Integrates with existing watermarking system
 */

// Enhanced storage configuration for SEO-optimized filenames
const createSEOStorage = (uploadType = 'products') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, `../uploads/${uploadType}`);
      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      try {
        console.log('🎯 [SEO-UPLOAD] Generating SEO filename for:', file.originalname);
        
        // Get product/category data from request body
        const data = {
          name: req.body.name || req.body.title,
          category: req.body.category || req.body.mainCategory,
          businessName: req.body.businessName,
          ...req.body
        };

        // Generate SEO-friendly filename
        const seoFilename = imageOptimizationService.generateSEOFilename(
          data, 
          file.originalname, 
          uploadType === 'vendor-logos' ? 'vendor' : 'product'
        );
        
        console.log('✅ [SEO-UPLOAD] Generated SEO filename:', seoFilename);
        cb(null, seoFilename);
      } catch (error) {
        console.error('❌ [SEO-UPLOAD] Error generating filename:', error);
        // Fallback to timestamp-based naming
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname);
        cb(null, `image-${timestamp}-${random}${ext}`);
      }
    }
  });
};

// Enhanced file filter with better validation
const enhancedImageFilter = (req, file, cb) => {
  console.log('🔍 [SEO-UPLOAD] Validating file:', file.originalname, 'Type:', file.mimetype);
  
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    console.log('✅ [SEO-UPLOAD] File validation passed');
    cb(null, true);
  } else {
    console.log('❌ [SEO-UPLOAD] File validation failed');
    const error = new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// SEO-optimized product image upload middleware
const uploadSEOProductImages = multer({
  storage: createSEOStorage('products'),
  fileFilter: enhancedImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Max 10 files
  }
}).fields([
  { name: 'image', maxCount: 1 },    // Primary image
  { name: 'images', maxCount: 10 }   // Additional images
]);

// SEO-optimized single image upload
const uploadSEOSingleImage = multer({
  storage: createSEOStorage('products'),
  fileFilter: enhancedImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 1
  }
}).single('image');

// SEO-optimized vendor logo upload
const uploadSEOVendorLogo = multer({
  storage: createSEOStorage('vendor-logos'),
  fileFilter: enhancedImageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for logos
    files: 1
  }
}).single('logo');

/**
 * Enhanced middleware that combines SEO optimization with watermarking
 * This runs after file upload but before database storage
 */
const applySEOAndWatermark = async (req, res, next) => {
  try {
    console.log('🎨 [SEO-WATERMARK] Starting enhanced image processing...');
    
    if (!req.files && !req.file) {
      console.log('ℹ️ [SEO-WATERMARK] No files to process');
      return next();
    }

    const processedImages = [];
    const allFiles = [];

    // Collect all uploaded files
    if (req.file) {
      allFiles.push({ field: 'single', file: req.file });
    }
    
    if (req.files) {
      Object.entries(req.files).forEach(([fieldName, files]) => {
        if (Array.isArray(files)) {
          files.forEach(file => allFiles.push({ field: fieldName, file }));
        } else {
          allFiles.push({ field: fieldName, file: files });
        }
      });
    }

    console.log(`📁 [SEO-WATERMARK] Processing ${allFiles.length} files`);

    // Process each file
    for (const { field, file } of allFiles) {
      try {
        console.log(`🔄 [SEO-WATERMARK] Processing ${field}: ${file.filename}`);
        
        // 1. Generate alt text and SEO metadata
        const data = {
          name: req.body.name || req.body.title,
          category: req.body.category || req.body.mainCategory,
          businessName: req.body.businessName,
          brand: req.body.brand,
          ...req.body
        };

        const altText = imageOptimizationService.generateAltText(
          data, 
          field === 'logo' ? 'vendor' : 'product',
          processedImages.filter(img => img.field === field).length
        );

        // 2. Extract image metadata
        const metadata = await imageOptimizationService.extractImageMetadata(file.path);
        
        // 3. Apply watermark (reuse existing watermark service)
        const watermarked = await watermarkService.processUploadedImage(
          file,
          path.dirname(file.path),
          { replaceOriginal: true }
        );

        // 4. Optimize for web (if not already done by watermarking)
        // This is optional and can be enabled for additional optimization
        
        // 5. Store processing results
        const processedImage = {
          field,
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          altText,
          metadata,
          watermarked: watermarked.watermarked,
          seoOptimized: true
        };

        processedImages.push(processedImage);
        console.log(`✅ [SEO-WATERMARK] Processed ${field}: ${file.filename}`);

      } catch (error) {
        console.error(`❌ [SEO-WATERMARK] Error processing ${field}:`, error);
        // Continue processing other files
        processedImages.push({
          field,
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          error: error.message,
          seoOptimized: false,
          watermarked: false
        });
      }
    }

    // Store results in request for controller access
    req.processedSEOImages = processedImages;
    
    // Generate alt text suggestions for frontend
    req.seoSuggestions = {
      altTexts: processedImages.map(img => img.altText).filter(Boolean),
      filenames: processedImages.map(img => img.filename),
      optimization: processedImages.map(img => ({
        filename: img.filename,
        optimized: img.seoOptimized && img.watermarked,
        metadata: img.metadata
      }))
    };

    console.log(`🎯 [SEO-WATERMARK] Enhanced processing completed: ${processedImages.length} images processed`);
    next();

  } catch (error) {
    console.error('❌ [SEO-WATERMARK] Error in enhanced image processing:', error);
    
    // Clean up uploaded files on error
    const cleanup = (files) => {
      if (Array.isArray(files)) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      } else if (files && files.path && fs.existsSync(files.path)) {
        fs.unlinkSync(files.path);
      }
    };

    if (req.file) cleanup(req.file);
    if (req.files) {
      Object.values(req.files).forEach(cleanup);
    }

    return res.status(500).json({
      success: false,
      message: 'Error processing images with SEO optimization',
      error: error.message
    });
  }
};

/**
 * Middleware to validate image SEO compliance
 */
const validateImageSEO = async (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return next();
    }

    console.log('🔍 [SEO-VALIDATE] Validating image SEO compliance...');
    
    const validationResults = [];
    const allFiles = [];

    // Collect files for validation
    if (req.file) allFiles.push(req.file);
    if (req.files) {
      Object.values(req.files).flat().forEach(file => allFiles.push(file));
    }

    // Validate each file
    for (const file of allFiles) {
      const validation = await imageOptimizationService.validateImageSEO(file.path, req.body);
      validationResults.push({
        filename: file.filename,
        ...validation
      });
    }

    // Store validation results
    req.imageValidation = validationResults;
    
    // Check if any critical issues exist
    const criticalIssues = validationResults.filter(result => !result.valid);
    if (criticalIssues.length > 0) {
      console.log(`⚠️ [SEO-VALIDATE] Found ${criticalIssues.length} images with SEO issues`);
      // Note: We don't block upload, just log for monitoring
    }

    console.log(`✅ [SEO-VALIDATE] Validation completed for ${validationResults.length} images`);
    next();

  } catch (error) {
    console.error('❌ [SEO-VALIDATE] Error in image SEO validation:', error);
    // Don't block upload on validation errors
    next();
  }
};

/**
 * Error handling middleware for enhanced uploads
 */
const handleSEOUploadError = (error, req, res, next) => {
  console.error('❌ [SEO-UPLOAD] Upload error:', error);

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum 5MB per image.',
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 10 images allowed.',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.',
          code: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error.',
          code: error.code
        });
    }
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error during file upload.',
    code: 'INTERNAL_ERROR'
  });
};

module.exports = {
  // SEO-optimized upload middleware
  uploadSEOProductImages,
  uploadSEOSingleImage,
  uploadSEOVendorLogo,
  
  // Enhanced processing middleware
  applySEOAndWatermark,
  validateImageSEO,
  
  // Utility functions
  createSEOStorage,
  enhancedImageFilter,
  handleSEOUploadError
};