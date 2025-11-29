const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Image optimization settings
const SIZES = [300, 600, 1200];
const QUALITY = {
  avif: 75,
  webp: 85
};

// Folders to optimize
const FOLDERS = [
  'homepage-categories',
  'homepage-cards',
  'homepage-banners'
];

/**
 * Optimize a single image file
 */
async function optimizeImage(filePath, fileName, folder) {
  try {
    console.log(`\n📸 Processing: ${fileName}`);
    
    const ext = path.extname(fileName).toLowerCase();
    const baseName = fileName.replace(ext, '');
    const folderPath = path.join(__dirname, '..', 'uploads', folder);
    
    // Skip if already an optimized variant
    if (/-\d+w\.(avif|webp)$/.test(fileName)) {
      return { success: false, reason: 'Already optimized variant' };
    }
    
    // Get image metadata
    const image = sharp(filePath);
    const metadata = await image.metadata();
    console.log(`   Original: ${metadata.width}x${metadata.height}`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Generate AVIF variants
    for (const size of SIZES) {
      if (metadata.width >= size) {
        try {
          const outputPath = path.join(folderPath, `${baseName}-${size}w.avif`);
          await sharp(filePath)
            .resize(size, null, { withoutEnlargement: true })
            .avif({ quality: QUALITY.avif })
            .toFile(outputPath);
          successCount++;
        } catch (error) {
          console.log(`   ❌ Failed ${size}w AVIF: ${error.message}`);
          failCount++;
        }
      }
    }
    
    // Generate WebP variants
    for (const size of SIZES) {
      if (metadata.width >= size) {
        try {
          const outputPath = path.join(folderPath, `${baseName}-${size}w.webp`);
          await sharp(filePath)
            .resize(size, null, { withoutEnlargement: true })
            .webp({ quality: QUALITY.webp })
            .toFile(outputPath);
          successCount++;
        } catch (error) {
          console.log(`   ❌ Failed ${size}w WebP: ${error.message}`);
          failCount++;
        }
      }
    }
    
    // Generate full-size AVIF
    try {
      const outputPath = path.join(folderPath, `${baseName}.avif`);
      await sharp(filePath)
        .avif({ quality: QUALITY.avif })
        .toFile(outputPath);
      successCount++;
    } catch (error) {
      console.log(`   ❌ Failed full AVIF: ${error.message}`);
      failCount++;
    }
    
    // Generate full-size WebP
    try {
      const outputPath = path.join(folderPath, `${baseName}.webp`);
      await sharp(filePath)
        .webp({ quality: QUALITY.webp })
        .toFile(outputPath);
      successCount++;
    } catch (error) {
      console.log(`   ❌ Failed full WebP: ${error.message}`);
      failCount++;
    }
    
    if (successCount > 0) {
      console.log(`   ✅ Generated ${successCount} variants`);
    }
    
    return { 
      success: successCount > 0, 
      successCount, 
      failCount,
      reason: successCount > 0 ? 'Success' : 'All variants failed'
    };
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

/**
 * Process all images in a folder
 */
async function processFolder(folder) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📁 PROCESSING FOLDER: ${folder}`);
  console.log('='.repeat(60));
  
  const folderPath = path.join(__dirname, '..', 'uploads', folder);
  
  try {
    await fs.access(folderPath);
  } catch {
    console.log(`⚠️  Folder does not exist: ${folderPath}`);
    return { total: 0, success: 0, failed: 0 };
  }
  
  const files = await fs.readdir(folderPath);
  
  // Filter original images only (not optimized variants)
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) &&
           !/-\d+w\.(avif|webp)$/.test(file) &&
           file !== 'placeholder-image.jpg';
  });
  
  console.log(`Found ${imageFiles.length} original images`);
  
  let stats = {
    total: imageFiles.length,
    success: 0,
    failed: 0
  };
  
  for (const file of imageFiles) {
    const filePath = path.join(folderPath, file);
    const result = await optimizeImage(filePath, file, folder);
    
    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }
  }
  
  return stats;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 HOMEPAGE IMAGE OPTIMIZATION\n');
  console.log('This will generate AVIF and WebP variants for all homepage images');
  console.log('Sizes: 300w, 600w, 1200w + full size\n');
  
  const allStats = {
    total: 0,
    success: 0,
    failed: 0
  };
  
  for (const folder of FOLDERS) {
    const stats = await processFolder(folder);
    allStats.total += stats.total;
    allStats.success += stats.success;
    allStats.failed += stats.failed;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 OVERALL SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTotal Images: ${allStats.total}`);
  console.log(`✅ Success: ${allStats.success}`);
  console.log(`❌ Failed: ${allStats.failed}`);
  console.log('\n' + '='.repeat(60));
  console.log('✨ Optimization complete!\n');
}

main().catch(console.error);
