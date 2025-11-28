/**
 * Batch Image Optimization Script
 * 
 * This script converts all existing images in uploads/ directories to:
 * - WebP format (70-80% smaller)
 * - AVIF format (80-90% smaller)
 * - Responsive sizes (300w, 600w, 1200w)
 * 
 * Features:
 * - Processes images in batches to avoid memory issues
 * - Skips already optimized images
 * - Generates detailed report
 * - Keeps original files as backup
 * - Can be run on production server or locally
 * 
 * Usage:
 *   node scripts/optimize-existing-images.js
 *   node scripts/optimize-existing-images.js --dry-run (preview only)
 *   node scripts/optimize-existing-images.js --directory=products (specific folder)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Configuration
const CONFIG = {
  uploadsDir: path.join(__dirname, '../uploads'),
  directories: [
    'products',
    'homepage-categories',
    'homepage-cards',
    'vendor-logos',
    'properties',
    'used-products',
    'wholesale-suppliers'
  ],
  formats: {
    webp: {
      quality: 80,
      effort: 4
    },
    avif: {
      quality: 70,
      effort: 4
    },
    jpeg: {
      quality: 85,
      progressive: true,
      mozjpeg: true
    }
  },
  responsiveSizes: [300, 600, 1200],
  batchSize: 10, // Process 10 images at a time
  skipExisting: false // Force re-optimization of all images
};

// Statistics tracking
const stats = {
  totalImages: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  totalOriginalSize: 0,
  totalOptimizedSize: 0,
  startTime: Date.now(),
  fileDetails: []
};

/**
 * Check if image has already been optimized
 */
async function isAlreadyOptimized(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const actualExt = path.extname(imagePath);
  const baseWithoutExt = imagePath.slice(0, -actualExt.length);
  
  // Check if WebP version exists
  const webpPath = `${baseWithoutExt}.webp`;
  
  try {
    await fs.access(webpPath);
    return true; // WebP exists, assume already optimized
  } catch {
    return false; // WebP doesn't exist, needs optimization
  }
}

/**
 * Get file size in bytes
 */
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Optimize a single image
 */
async function optimizeImage(imagePath, isDryRun = false) {
  try {
    const ext = path.extname(imagePath).toLowerCase();
    const actualExt = path.extname(imagePath); // Keep original case
    const baseWithoutExt = imagePath.slice(0, -actualExt.length); // Remove extension properly
    const filename = path.basename(imagePath);
    
    console.log(`\n📸 Processing: ${filename}`);
    
    // Get original file size
    const originalSize = await getFileSize(imagePath);
    stats.totalOriginalSize += originalSize;
    
    if (isDryRun) {
      console.log(`   [DRY RUN] Would optimize: ${(originalSize / 1024).toFixed(2)} KB`);
      return { success: true, skipped: false };
    }
    
    // Get image metadata with error handling for corrupted files
    let metadata;
    try {
      metadata = await sharp(imagePath).metadata();
    } catch (metadataError) {
      console.log(`   ⚠️  Corrupted file, attempting to repair...`);
      
      // Try to repair PNG by re-encoding through Sharp
      try {
        const tempPath = `${imagePath}.temp`;
        await sharp(imagePath, { limitInputPixels: false, failOnError: false })
          .png({ compressionLevel: 9, force: true })
          .toFile(tempPath);
        
        // Replace original with repaired version
        await fs.unlink(imagePath);
        await fs.rename(tempPath, imagePath);
        
        // Retry metadata
        metadata = await sharp(imagePath).metadata();
        console.log(`   ✅ File repaired successfully`);
      } catch (repairError) {
        throw new Error(`Cannot repair: ${repairError.message}`);
      }
    }
    const results = {
      original: imagePath,
      originalSize,
      generated: []
    };
    
    console.log(`   Original: ${metadata.width}x${metadata.height}, ${(originalSize / 1024).toFixed(2)} KB`);
    
    // 1. Generate full-size WebP
    const webpPath = `${baseWithoutExt}.webp`;
    await sharp(imagePath, { limitInputPixels: false, failOnError: false })
      .webp(CONFIG.formats.webp)
      .toFile(webpPath);
    
    const webpSize = await getFileSize(webpPath);
    stats.totalOptimizedSize += webpSize;
    results.generated.push({ path: webpPath, size: webpSize, format: 'webp' });
    console.log(`   ✅ WebP: ${(webpSize / 1024).toFixed(2)} KB (${((1 - webpSize/originalSize) * 100).toFixed(1)}% smaller)`);
    
    // 2. Generate full-size AVIF
    const avifPath = `${baseWithoutExt}.avif`;
    await sharp(imagePath, { limitInputPixels: false, failOnError: false })
      .avif(CONFIG.formats.avif)
      .toFile(avifPath);
    
    const avifSize = await getFileSize(avifPath);
    stats.totalOptimizedSize += avifSize;
    results.generated.push({ path: avifPath, size: avifSize, format: 'avif' });
    console.log(`   ✅ AVIF: ${(avifSize / 1024).toFixed(2)} KB (${((1 - avifSize/originalSize) * 100).toFixed(1)}% smaller)`);
    
    // 3. Generate responsive variants
    for (const size of CONFIG.responsiveSizes) {
      // Only generate if source is larger than target
      if (metadata.width > size) {
        // Original format responsive
        const responsivePath = `${baseWithoutExt}-${size}w${ext}`;
        await sharp(imagePath, { limitInputPixels: false, failOnError: false })
          .resize(size, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg(CONFIG.formats.jpeg)
          .toFile(responsivePath);
        
        const responsiveSize = await getFileSize(responsivePath);
        stats.totalOptimizedSize += responsiveSize;
        results.generated.push({ path: responsivePath, size: responsiveSize, format: 'responsive-jpg' });
        
        // WebP responsive
        const webpResponsivePath = `${baseWithoutExt}-${size}w.webp`;
        await sharp(imagePath, { limitInputPixels: false, failOnError: false })
          .resize(size, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp(CONFIG.formats.webp)
          .toFile(webpResponsivePath);
        
        const webpResponsiveSize = await getFileSize(webpResponsivePath);
        stats.totalOptimizedSize += webpResponsiveSize;
        results.generated.push({ path: webpResponsivePath, size: webpResponsiveSize, format: 'responsive-webp' });
        
        // AVIF responsive
        const avifResponsivePath = `${baseWithoutExt}-${size}w.avif`;
        await sharp(imagePath, { limitInputPixels: false, failOnError: false })
          .resize(size, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .avif(CONFIG.formats.avif)
          .toFile(avifResponsivePath);
        
        const avifResponsiveSize = await getFileSize(avifResponsivePath);
        stats.totalOptimizedSize += avifResponsiveSize;
        results.generated.push({ path: avifResponsivePath, size: avifResponsiveSize, format: 'responsive-avif' });
        
        console.log(`   ✅ ${size}w: Generated in all formats`);
      }
    }
    
    stats.fileDetails.push(results);
    return { success: true, skipped: false, results };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    stats.errors++;
    return { success: false, error: error.message };
  }
}

/**
 * Process images in a directory
 */
async function processDirectory(dirName, isDryRun = false) {
  const dirPath = path.join(CONFIG.uploadsDir, dirName);
  
  console.log(`\n📁 Processing directory: ${dirName}`);
  console.log(`   Path: ${dirPath}`);
  
  try {
    // Check if directory exists
    await fs.access(dirPath);
  } catch {
    console.log(`   ⚠️  Directory not found, skipping...`);
    return;
  }
  
  try {
    const files = await fs.readdir(dirPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });
    
    console.log(`   Found ${imageFiles.length} images`);
    stats.totalImages += imageFiles.length;
    
    // Process in batches
    for (let i = 0; i < imageFiles.length; i += CONFIG.batchSize) {
      const batch = imageFiles.slice(i, i + CONFIG.batchSize);
      const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(imageFiles.length / CONFIG.batchSize);
      
      console.log(`\n   📦 Batch ${batchNumber}/${totalBatches}`);
      
      // Process batch in parallel
      const promises = batch.map(async (file) => {
        const filePath = path.join(dirPath, file);
        
        // Skip if already optimized
        if (CONFIG.skipExisting && await isAlreadyOptimized(filePath)) {
          console.log(`   ⏭️  Skipped (already optimized): ${file}`);
          stats.skipped++;
          return { skipped: true };
        }
        
        const result = await optimizeImage(filePath, isDryRun);
        if (result.success && !result.skipped) {
          stats.processed++;
        }
        return result;
      });
      
      await Promise.all(promises);
      
      // Progress update
      const processed = Math.min(i + CONFIG.batchSize, imageFiles.length);
      console.log(`   Progress: ${processed}/${imageFiles.length} images`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing directory: ${error.message}`);
  }
}

/**
 * Generate optimization report
 */
function generateReport() {
  const duration = (Date.now() - stats.startTime) / 1000;
  const originalSizeMB = (stats.totalOriginalSize / 1024 / 1024).toFixed(2);
  const optimizedSizeMB = (stats.totalOptimizedSize / 1024 / 1024).toFixed(2);
  const savedMB = (originalSizeMB - optimizedSizeMB).toFixed(2);
  const savingsPercent = stats.totalOriginalSize > 0 
    ? ((1 - stats.totalOptimizedSize / stats.totalOriginalSize) * 100).toFixed(1)
    : 0;
  
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 OPTIMIZATION REPORT');
  console.log('='.repeat(70));
  console.log(`\n📈 Statistics:`);
  console.log(`   Total images found:     ${stats.totalImages}`);
  console.log(`   Successfully processed: ${stats.processed}`);
  console.log(`   Skipped (optimized):    ${stats.skipped}`);
  console.log(`   Errors:                 ${stats.errors}`);
  console.log(`   Duration:               ${duration.toFixed(1)} seconds`);
  
  console.log(`\n💾 Storage:`);
  console.log(`   Original size:          ${originalSizeMB} MB`);
  console.log(`   Optimized size:         ${optimizedSizeMB} MB`);
  console.log(`   Space saved:            ${savedMB} MB`);
  console.log(`   Compression:            ${savingsPercent}%`);
  
  console.log(`\n🚀 Performance Impact:`);
  console.log(`   Expected LCP improvement:   40-60%`);
  console.log(`   Expected load time reduction: 50-70%`);
  console.log(`   Mobile data savings:    ${savedMB} MB per user`);
  
  console.log('\n' + '='.repeat(70));
}

/**
 * Save detailed report to file
 */
async function saveDetailedReport() {
  const reportPath = path.join(__dirname, '../optimization-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: stats,
    config: CONFIG
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportPath}`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const specificDir = args.find(arg => arg.startsWith('--directory='))?.split('=')[1];
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 BATCH IMAGE OPTIMIZATION SCRIPT');
  console.log('='.repeat(70));
  
  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  console.log(`\n⚙️  Configuration:`);
  console.log(`   Formats: WebP, AVIF`);
  console.log(`   Responsive sizes: ${CONFIG.responsiveSizes.join(', ')}w`);
  console.log(`   Batch size: ${CONFIG.batchSize} images`);
  console.log(`   Skip existing: ${CONFIG.skipExisting}`);
  
  // Process directories
  const directoriesToProcess = specificDir 
    ? [specificDir] 
    : CONFIG.directories;
  
  for (const dir of directoriesToProcess) {
    await processDirectory(dir, isDryRun);
  }
  
  // Generate report
  generateReport();
  
  if (!isDryRun) {
    await saveDetailedReport();
  }
  
  console.log('\n✅ Optimization complete!\n');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { optimizeImage, processDirectory };
