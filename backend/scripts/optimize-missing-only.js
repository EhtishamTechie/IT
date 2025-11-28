const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// List of specific images that are failing (from the 404 errors)
const MISSING_IMAGES = [
  // Category carousel images
  'category-1764193847405-744727563',
  'category-1759741840168-558580868',
  'category-1759741986480-496076035',
  'category-1760522161873-331793637',
  'category-1761673342662-928853413',
  'category-1764193819887-277515691',
  
  // Premium products with missing 600w
  'product-1760998935778-cr3l9r3iz',
  'product-1760997112997-vr6r8sg4',
  'product-1759224681243-jhxi8mwmu',
];

const uploadsDir = path.join(__dirname, '..', 'uploads');
const sizes = [300, 600, 1200];
const formats = ['avif', 'webp'];

async function optimizeImage(filePath, baseNameWithoutExt, directory) {
  console.log(`\n🔄 Processing: ${path.basename(filePath)}`);
  
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    console.log(`   Original: ${metadata.width}x${metadata.height} (${metadata.format})`);
    
    // Generate responsive sizes
    for (const size of sizes) {
      // Skip if image is smaller than target size
      if (metadata.width < size) {
        console.log(`   ⏭️  Skipping ${size}w (original is ${metadata.width}px)`);
        continue;
      }
      
      for (const format of formats) {
        const outputPath = path.join(directory, `${baseNameWithoutExt}-${size}w.${format}`);
        
        // Check if already exists
        if (fs.existsSync(outputPath)) {
          console.log(`   ✅ Already exists: ${size}w.${format}`);
          continue;
        }
        
        try {
          await sharp(filePath)
            .resize(size, null, {
              withoutEnlargement: true,
              fit: 'inside'
            })
            [format]({
              quality: format === 'avif' ? 65 : 80,
              effort: format === 'avif' ? 4 : 4
            })
            .toFile(outputPath);
          
          const stats = fs.statSync(outputPath);
          console.log(`   ✅ Created: ${size}w.${format} (${(stats.size / 1024).toFixed(1)} KB)`);
        } catch (err) {
          console.error(`   ❌ Error creating ${size}w.${format}:`, err.message);
        }
      }
    }
    
    // Generate full-size modern formats
    for (const format of formats) {
      const outputPath = path.join(directory, `${baseNameWithoutExt}.${format}`);
      
      if (fs.existsSync(outputPath)) {
        console.log(`   ✅ Already exists: full.${format}`);
        continue;
      }
      
      try {
        await sharp(filePath)
          [format]({
            quality: format === 'avif' ? 70 : 85,
            effort: format === 'avif' ? 4 : 4
          })
          .toFile(outputPath);
        
        const stats = fs.statSync(outputPath);
        console.log(`   ✅ Created: full.${format} (${(stats.size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`   ❌ Error creating full.${format}:`, err.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error processing image:`, error.message);
    return false;
  }
}

async function findAndOptimize() {
  console.log('🚀 Starting targeted image optimization...\n');
  console.log(`📁 Uploads directory: ${uploadsDir}\n`);
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  for (const baseName of MISSING_IMAGES) {
    // Determine subdirectory
    const subDir = baseName.startsWith('product-') ? 'products' : 
                   baseName.startsWith('category-') ? 'categories' : null;
    
    if (!subDir) {
      console.log(`⚠️  Unknown type for: ${baseName}`);
      continue;
    }
    
    const directory = path.join(uploadsDir, subDir);
    
    // Find the original file (could be .jpg, .jpeg, .png, .JPEG, etc.)
    const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.jfif', '.JFIF'];
    let foundFile = null;
    
    for (const ext of extensions) {
      const filePath = path.join(directory, `${baseName}${ext}`);
      if (fs.existsSync(filePath)) {
        foundFile = filePath;
        break;
      }
    }
    
    if (!foundFile) {
      console.log(`⚠️  Original file not found for: ${baseName}`);
      failed++;
      continue;
    }
    
    processed++;
    const success = await optimizeImage(foundFile, baseName, directory);
    
    if (success) {
      succeeded++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${succeeded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total attempted: ${processed}`);
  console.log('='.repeat(60));
}

// Run the optimization
findAndOptimize().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
