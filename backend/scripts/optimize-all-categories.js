const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const CATEGORY_DIR = path.join(__dirname, '..', 'uploads', 'homepage-categories');

async function optimizeAllCategoryImages() {
  console.log('🚀 Optimizing ALL category carousel images...\n');
  
  try {
    // Get all image files in directory
    const files = await fs.readdir(CATEGORY_DIR);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|JPEG|JPG|PNG)$/i.test(file) && 
      !file.includes('-300w') && 
      !file.includes('-600w') && 
      !file.includes('-1200w')
    );
    
    console.log(`📁 Found ${imageFiles.length} original images to optimize\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of imageFiles) {
      const inputPath = path.join(CATEGORY_DIR, file);
      const ext = path.extname(file);
      const baseName = file.replace(ext, '');
      
      console.log(`📸 Processing: ${file}`);
      
      try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();
        
        console.log(`   Original: ${metadata.width}x${metadata.height}`);
        
        // Generate 300w variants
        if (metadata.width >= 300) {
          await image.clone()
            .resize(300, null, { withoutEnlargement: true })
            .avif({ quality: 80 })
            .toFile(path.join(CATEGORY_DIR, `${baseName}-300w.avif`));
          
          await image.clone()
            .resize(300, null, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(path.join(CATEGORY_DIR, `${baseName}-300w.webp`));
          
          console.log(`   ✅ Generated 300w variants`);
        }
        
        // Generate 600w variants
        if (metadata.width >= 600) {
          await image.clone()
            .resize(600, null, { withoutEnlargement: true })
            .avif({ quality: 80 })
            .toFile(path.join(CATEGORY_DIR, `${baseName}-600w.avif`));
          
          await image.clone()
            .resize(600, null, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(path.join(CATEGORY_DIR, `${baseName}-600w.webp`));
          
          console.log(`   ✅ Generated 600w variants`);
        }
        
        // Generate 1200w variants
        if (metadata.width >= 1200) {
          await image.clone()
            .resize(1200, null, { withoutEnlargement: true })
            .avif({ quality: 80 })
            .toFile(path.join(CATEGORY_DIR, `${baseName}-1200w.avif`));
          
          await image.clone()
            .resize(1200, null, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(path.join(CATEGORY_DIR, `${baseName}-1200w.webp`));
          
          console.log(`   ✅ Generated 1200w variants`);
        }
        
        successCount++;
        console.log(`   ✅ Success!\n`);
        
      } catch (error) {
        failCount++;
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }
    
    console.log('\n============================================================');
    console.log('📊 OPTIMIZATION SUMMARY');
    console.log('============================================================\n');
    console.log(`Total Images: ${imageFiles.length}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('\n============================================================');
    console.log('✨ Optimization complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

optimizeAllCategoryImages();
