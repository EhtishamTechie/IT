#!/usr/bin/env node

/**
 * Batch Image Optimization Script
 * 
 * Optimizes all existing images in the uploads directory
 * Creates WebP versions and compresses originals
 * 
 * Usage:
 *   node scripts/optimize-images.js
 *   node scripts/optimize-images.js --dir=uploads/products
 *   node scripts/optimize-images.js --webp-only
 */

const { optimizeImage, generateWebP } = require('../middleware/imageOptimization');
const path = require('path');
const fs = require('fs').promises;

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dir: 'uploads',
  webpOnly: args.includes('--webp-only'),
  quality: 85,
  maxWidth: 1920,
  maxHeight: 1920
};

// Override directory if specified
const dirArg = args.find(arg => arg.startsWith('--dir='));
if (dirArg) {
  options.dir = dirArg.split('=')[1];
}

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Recursively find all images in a directory
 */
async function findImages(dir) {
  const images = [];
  
  try {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other system directories
        if (!item.startsWith('.') && item !== 'node_modules') {
          const subImages = await findImages(fullPath);
          images.push(...subImages);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          // Skip already optimized images
          if (!item.includes('-optimized') && !item.includes('-400w') && 
              !item.includes('-800w') && !item.includes('-1200w')) {
            images.push(fullPath);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return images;
}

/**
 * Main optimization function
 */
async function optimizeAllImages() {
  console.log('🖼️  Image Optimization Script');
  console.log('================================\n');
  console.log(`📁 Scanning directory: ${options.dir}`);
  console.log(`⚙️  Mode: ${options.webpOnly ? 'WebP conversion only' : 'Full optimization'}\n`);
  
  const startTime = Date.now();
  
  try {
    // Find all images
    const images = await findImages(options.dir);
    console.log(`📸 Found ${images.length} images to process\n`);
    
    if (images.length === 0) {
      console.log('✅ No images to optimize');
      return;
    }
    
    let processedCount = 0;
    let errorCount = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    // Process each image
    for (const imagePath of images) {
      try {
        console.log(`\n[${processedCount + 1}/${images.length}] Processing: ${path.basename(imagePath)}`);
        
        if (options.webpOnly) {
          // Only generate WebP version
          const webpPath = await generateWebP(imagePath, options.quality);
          console.log(`   ✅ WebP created: ${path.basename(webpPath)}`);
        } else {
          // Full optimization
          const result = await optimizeImage(imagePath, {
            maxWidth: options.maxWidth,
            maxHeight: options.maxHeight,
            quality: options.quality,
            generateWebP: true,
            generateResponsive: false // Set to true for responsive variants
          });
          
          totalOriginalSize += result.originalSize;
          totalOptimizedSize += result.optimizedSize;
        }
        
        processedCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================');
    console.log('📊 Optimization Summary');
    console.log('================================');
    console.log(`✅ Successfully processed: ${processedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏱️  Total time: ${duration}s`);
    
    if (!options.webpOnly && totalOriginalSize > 0) {
      const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(2);
      console.log(`💾 Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`💾 Total optimized size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📉 Total savings: ${totalSavings}%`);
    }
    
    console.log('\n✅ Optimization complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
optimizeAllImages();
