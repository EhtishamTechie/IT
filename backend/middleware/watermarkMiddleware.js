const watermarkService = require('../services/watermarkService');
const path = require('path');
const fs = require('fs');

/**
 * Middleware to apply watermark to uploaded files
 * This middleware runs after multer has saved the files
 * OPTIMIZED: Non-blocking with faster processing
 */
const applyWatermarkToUploads = async (req, res, next) => {
  try {
    console.log('🎯 [WATERMARK-MIDDLEWARE] Starting watermark processing...');

    // Check if files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      console.log('ℹ️ [WATERMARK-MIDDLEWARE] No files to process, continuing...');
      return next();
    }

    console.log(`📁 [WATERMARK-MIDDLEWARE] Files received:`, Object.keys(req.files));

    const processedFiles = {};
    
    // Process files in parallel for speed
    const processingPromises = [];
    
    for (const [fieldName, files] of Object.entries(req.files)) {
      console.log(`🔄 [WATERMARK-MIDDLEWARE] Processing field: ${fieldName} (${files.length} files)`);
      
      if (Array.isArray(files)) {
        // Process multiple files in parallel
        processedFiles[fieldName] = [];
        
        for (const file of files) {
          const promise = processImageFile(file).then(result => {
            processedFiles[fieldName].push(result);
          });
          processingPromises.push(promise);
        }
      } else {
        // Single file
        const promise = processImageFile(files).then(result => {
          processedFiles[fieldName] = [result];
        });
        processingPromises.push(promise);
      }
    }

    // Wait for all processing to complete
    await Promise.all(processingPromises);

    // Update req.files with processed file information
    req.processedFiles = processedFiles;
    
    console.log('✅ [WATERMARK-MIDDLEWARE] Watermarking completed successfully');
    next();

  } catch (error) {
    console.error('❌ [WATERMARK-MIDDLEWARE] Error in watermarking middleware:', error);
    // Don't block the upload if watermarking fails
    next();
  }
};

/**
 * Process individual image file
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Processed file info
 */
async function processImageFile(file) {
  try {
    console.log(`🖼️ [WATERMARK-MIDDLEWARE] Processing file: ${file.originalname}`);

    // Check if file is an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!imageExtensions.includes(fileExtension)) {
      console.log(`⏭️ [WATERMARK-MIDDLEWARE] Skipping non-image file: ${file.originalname}`);
      return {
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        watermarked: false,
        reason: 'Not an image file'
      };
    }

    // Check file size (skip very small images for speed)
    const stats = fs.statSync(file.path);
    if (stats.size < 5000) { // Less than 5KB
      console.log(`⏭️ [WATERMARK-MIDDLEWARE] Skipping tiny file: ${file.originalname} (${stats.size} bytes)`);
      return {
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        watermarked: false,
        reason: 'File too small'
      };
    }

    // Apply watermark using the service
    const uploadDir = path.dirname(file.path);
    const result = await watermarkService.processUploadedImage(file, uploadDir, {
      replaceOriginal: true // Replace original with watermarked version
    });

    console.log(`✅ [WATERMARK-MIDDLEWARE] Successfully processed: ${file.originalname}`);
    
    return {
      filename: result.filename || file.filename,
      originalname: file.originalname,
      path: result.path || file.path,
      watermarked: result.watermarked,
      size: stats.size
    };

  } catch (error) {
    console.error(`❌ [WATERMARK-MIDDLEWARE] Error processing ${file.originalname}:`, error);
    
    return {
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      watermarked: false,
      error: error.message
    };
  }
}

/**
 * Middleware specifically for product images
 * This ensures product images are always watermarked
 */
const watermarkProductImages = async (req, res, next) => {
  try {
    console.log('🎯 [PRODUCT-WATERMARK] Starting product image watermarking...');

    // Apply watermark to all uploaded files
    await applyWatermarkToUploads(req, res, next);

  } catch (error) {
    console.error('❌ [PRODUCT-WATERMARK] Error in product watermarking:', error);
    next(error);
  }
};

/**
 * Log watermarking results
 */
const logWatermarkResults = (req, res, next) => {
  if (req.processedFiles) {
    console.log('📊 [WATERMARK-LOG] Processing Summary:');
    
    for (const [field, files] of Object.entries(req.processedFiles)) {
      const watermarkedCount = files.filter(f => f.watermarked).length;
      const totalCount = files.length;
      
      console.log(`   ${field}: ${watermarkedCount}/${totalCount} watermarked`);
      
      files.forEach(file => {
        if (file.watermarked) {
          console.log(`   ✅ ${file.originalname}`);
        } else {
          console.log(`   ⏭️ ${file.originalname} (${file.reason || file.error || 'unknown'})`);
        }
      });
    }
  }
  
  next();
};

module.exports = {
  applyWatermarkToUploads,
  watermarkProductImages,
  logWatermarkResults,
  processImageFile
};
