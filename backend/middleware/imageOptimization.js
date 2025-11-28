const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image Optimization Middleware
 * 
 * Features:
 * - Automatic WebP conversion for modern browsers
 * - Image compression (JPEG/PNG)
 * - Resize large images to maximum dimensions
 * - Generate responsive image variants
 * - Preserve original images as fallback
 */

/**
 * Optimize a single uploaded image
 * @param {string} filePath - Path to the uploaded image
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} - Optimization results
 */
const optimizeImage = async (filePath, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85,
    generateWebP = true,
    generateAVIF = true,
    generateResponsive = true,
    responsiveSizes = [300, 600, 1200]
  } = options;

  try {
    const ext = path.extname(filePath).toLowerCase();
    const basePath = filePath.replace(ext, '');
    const dir = path.dirname(filePath);
    
    // Get original image metadata
    const metadata = await sharp(filePath).metadata();
    
    // Determine if resize is needed
    const needsResize = metadata.width > maxWidth || metadata.height > maxHeight;
    
    const results = {
      original: filePath,
      optimized: null,
      webp: null,
      avif: null,
      responsive: {
        webp: [],
        avif: [],
        original: []
      },
      originalSize: metadata.size,
      optimizedSize: 0,
      savings: 0
    };

    // 1. Optimize original format (JPEG/PNG)
    let pipeline = sharp(filePath);
    
    // Resize if needed
    if (needsResize) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Format-specific optimization
    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ 
        quality, 
        progressive: true,
        mozjpeg: true // Better compression
      });
    } else if (ext === '.png') {
      pipeline = pipeline.png({ 
        quality,
        compressionLevel: 9,
        adaptiveFiltering: true
      });
    }
    
    const optimizedPath = `${basePath}-optimized${ext}`;
    await pipeline.toFile(optimizedPath);
    
    const optimizedStats = await fs.stat(optimizedPath);
    results.optimized = optimizedPath;
    results.optimizedSize = optimizedStats.size;
    results.savings = ((metadata.size - optimizedStats.size) / metadata.size * 100).toFixed(2);
    
    // 2. Generate WebP version
    if (generateWebP) {
      const webpPath = `${basePath}.webp`;
      await sharp(filePath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ 
          quality: quality - 5,
          effort: 4 // Good balance of compression and speed
        })
        .toFile(webpPath);
      
      results.webp = webpPath;
    }
    
    // 3. Generate AVIF version (best compression)
    if (generateAVIF) {
      const avifPath = `${basePath}.avif`;
      await sharp(filePath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .avif({ 
          quality: quality - 10, // AVIF can use lower quality for same visual result
          effort: 4
        })
        .toFile(avifPath);
      
      results.avif = avifPath;
    }
    
    // 4. Generate responsive variants with multiple formats
    if (generateResponsive) {
      for (const size of responsiveSizes) {
        // Only generate if source is larger than target size
        if (size <= metadata.width) {
          // Original format
          const responsivePath = `${basePath}-${size}w${ext}`;
          let resizePipeline = sharp(filePath).resize(size, null, {
            fit: 'inside',
            withoutEnlargement: true
          });
          
          if (ext === '.jpg' || ext === '.jpeg') {
            resizePipeline = resizePipeline.jpeg({ quality, progressive: true, mozjpeg: true });
          } else if (ext === '.png') {
            resizePipeline = resizePipeline.png({ quality, compressionLevel: 9 });
          }
          
          await resizePipeline.toFile(responsivePath);
          results.responsive.original.push({
            width: size,
            path: responsivePath,
            filename: path.basename(responsivePath)
          });
          
          // WebP variant
          if (generateWebP) {
            const webpResponsivePath = `${basePath}-${size}w.webp`;
            await sharp(filePath)
              .resize(size, null, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .webp({ quality: quality - 5, effort: 4 })
              .toFile(webpResponsivePath);
            
            results.responsive.webp.push({
              width: size,
              path: webpResponsivePath,
              filename: path.basename(webpResponsivePath)
            });
          }
          
          // AVIF variant
          if (generateAVIF) {
            const avifResponsivePath = `${basePath}-${size}w.avif`;
            await sharp(filePath)
              .resize(size, null, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .avif({ quality: quality - 10, effort: 4 })
              .toFile(avifResponsivePath);
            
            results.responsive.avif.push({
              width: size,
              path: avifResponsivePath,
              filename: path.basename(avifResponsivePath)
            });
          }
        }
      }
    }
    
    console.log(`✅ Image optimized: ${path.basename(filePath)}`);
    console.log(`   Original: ${(metadata.size / 1024).toFixed(2)} KB`);
    console.log(`   Optimized: ${(results.optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`   Savings: ${results.savings}%`);
    console.log(`   Formats: ${[results.webp && 'WebP', results.avif && 'AVIF'].filter(Boolean).join(', ')}`);
    console.log(`   Responsive sizes: ${results.responsive.original.length} variants per format`);
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error optimizing image ${filePath}:`, error);
    throw error;
  }
};

/**
 * Express middleware to automatically optimize uploaded images
 * Use this after multer middleware
 */
const optimizeUploadedImages = (options = {}) => {
  return async (req, res, next) => {
    try {
      // Handle single file upload
      if (req.file) {
        const result = await optimizeImage(req.file.path, options);
        req.file.optimized = result;
      }
      
      // Handle multiple file uploads
      if (req.files) {
        if (Array.isArray(req.files)) {
          // Array of files
          req.files.optimized = [];
          for (const file of req.files) {
            const result = await optimizeImage(file.path, options);
            req.files.optimized.push(result);
          }
        } else {
          // Object with field names as keys
          for (const fieldName in req.files) {
            const files = req.files[fieldName];
            for (const file of files) {
              const result = await optimizeImage(file.path, options);
              file.optimized = result;
            }
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Error in image optimization middleware:', error);
      // Don't fail the upload if optimization fails
      next();
    }
  };
};

/**
 * Optimize all images in a directory (for batch processing)
 */
const optimizeDirectory = async (dirPath, options = {}) => {
  try {
    const files = await fs.readdir(dirPath);
    const results = [];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
          const result = await optimizeImage(filePath, options);
          results.push(result);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error optimizing directory ${dirPath}:`, error);
    throw error;
  }
};

/**
 * Generate WebP version of an existing image
 */
const generateWebP = async (imagePath, quality = 80) => {
  const ext = path.extname(imagePath);
  const webpPath = imagePath.replace(ext, '.webp');
  
  await sharp(imagePath)
    .webp({ quality })
    .toFile(webpPath);
  
  return webpPath;
};

/**
 * Create responsive image variants
 */
const createResponsiveVariants = async (imagePath, sizes = [400, 800, 1200]) => {
  const ext = path.extname(imagePath);
  const basePath = imagePath.replace(ext, '');
  const variants = [];
  
  for (const size of sizes) {
    const variantPath = `${basePath}-${size}w${ext}`;
    await sharp(imagePath)
      .resize(size, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(variantPath);
    
    variants.push({
      width: size,
      path: variantPath
    });
  }
  
  return variants;
};

module.exports = {
  optimizeImage,
  optimizeUploadedImages,
  optimizeDirectory,
  generateWebP,
  createResponsiveVariants
};
