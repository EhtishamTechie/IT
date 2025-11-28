const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Categories that are failing (from browser Network tab)
const categoryImages = [
  'category-1764193819887-277515691.jpg',
  'category-1759741840168-558580868.jpg', 
  'category-1759741986480-496076035.jpg',
  'category-1760522161873-331793637.jpg',
  'category-1761679342662-928853413.jpg',
  'category-1764193847405-744727563.jpg'
];

// Premium products that are failing
const productImages = [
  'product-1760998935778-cr3l9r3z.jpg',
  'product-1760997112997-zp6r8sg4.jpg'
];

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const CATEGORY_DIR = path.join(UPLOADS_DIR, 'category-carousel');
const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products');

// Optimization settings
const QUALITY = {
  webp: 85,
  avif: 80
};

const SIZES = [300, 600, 1200];

async function optimizeImage(inputPath, outputBasePath, filename) {
  try {
    console.log(`\n📸 Processing: ${filename}`);
    
    // Check if input exists
    try {
      await fs.access(inputPath);
    } catch (err) {
      console.log(`   ❌ File not found: ${inputPath}`);
      return { success: false, reason: 'not_found' };
    }

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const originalWidth = metadata.width;
    console.log(`   Original size: ${originalWidth}px wide`);

    let generatedCount = 0;

    // Generate responsive variants
    for (const size of SIZES) {
      // Skip if size is larger than original
      if (size > originalWidth) {
        console.log(`   ⏭️  Skipping ${size}w (larger than original ${originalWidth}px)`);
        continue;
      }

      // Generate WebP
      const webpPath = `${outputBasePath}-${size}w.webp`;
      await sharp(inputPath)
        .resize(size, null, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .webp({ quality: QUALITY.webp })
        .toFile(webpPath);
      console.log(`   ✅ Generated: ${path.basename(webpPath)}`);
      generatedCount++;

      // Generate AVIF
      const avifPath = `${outputBasePath}-${size}w.avif`;
      await sharp(inputPath)
        .resize(size, null, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .avif({ quality: QUALITY.avif })
        .toFile(avifPath);
      console.log(`   ✅ Generated: ${path.basename(avifPath)}`);
      generatedCount++;
    }

    // Generate full-size variants
    const webpFullPath = `${outputBasePath}.webp`;
    await sharp(inputPath)
      .webp({ quality: QUALITY.webp })
      .toFile(webpFullPath);
    console.log(`   ✅ Generated: ${path.basename(webpFullPath)} (full)`);
    generatedCount++;

    const avifFullPath = `${outputBasePath}.avif`;
    await sharp(inputPath)
      .avif({ quality: QUALITY.avif })
      .toFile(avifFullPath);
    console.log(`   ✅ Generated: ${path.basename(avifFullPath)} (full)`);
    generatedCount++;

    console.log(`   ✨ Success! Generated ${generatedCount} variants`);
    return { success: true, count: generatedCount };

  } catch (error) {
    console.error(`   ❌ Error processing ${filename}:`, error.message);
    return { success: false, reason: error.message };
  }
}

async function main() {
  console.log('🚀 Starting targeted image optimization...\n');
  
  const stats = {
    categories: { processed: 0, success: 0, failed: 0, notFound: 0 },
    products: { processed: 0, success: 0, failed: 0, notFound: 0 }
  };

  // Process category images
  console.log('📁 Processing Category Images...');
  console.log(`   Directory: ${CATEGORY_DIR}\n`);
  
  for (const filename of categoryImages) {
    stats.categories.processed++;
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const inputPath = path.join(CATEGORY_DIR, filename);
    const outputBasePath = path.join(CATEGORY_DIR, baseName);
    
    const result = await optimizeImage(inputPath, outputBasePath, filename);
    if (result.success) {
      stats.categories.success++;
    } else if (result.reason === 'not_found') {
      stats.categories.notFound++;
    } else {
      stats.categories.failed++;
    }
  }

  // Process product images
  console.log('\n\n📁 Processing Product Images...');
  console.log(`   Directory: ${PRODUCTS_DIR}\n`);
  
  for (const filename of productImages) {
    stats.products.processed++;
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const inputPath = path.join(PRODUCTS_DIR, filename);
    const outputBasePath = path.join(PRODUCTS_DIR, baseName);
    
    const result = await optimizeImage(inputPath, outputBasePath, filename);
    if (result.success) {
      stats.products.success++;
    } else if (result.reason === 'not_found') {
      stats.products.notFound++;
    } else {
      stats.products.failed++;
    }
  }

  // Print summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\nCategory Images:');
  console.log(`   Processed: ${stats.categories.processed}`);
  console.log(`   ✅ Success: ${stats.categories.success}`);
  console.log(`   ❌ Failed: ${stats.categories.failed}`);
  console.log(`   🔍 Not Found: ${stats.categories.notFound}`);
  
  console.log('\nProduct Images:');
  console.log(`   Processed: ${stats.products.processed}`);
  console.log(`   ✅ Success: ${stats.products.success}`);
  console.log(`   ❌ Failed: ${stats.products.failed}`);
  console.log(`   🔍 Not Found: ${stats.products.notFound}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Optimization complete!\n');
}

main().catch(console.error);
