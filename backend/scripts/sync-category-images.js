const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use the actual HomepageCategory model
const HomepageCategory = require('../models/HomepageCategory');

const syncCategoryImages = async () => {
  console.log('\n============================================================');
  console.log('🔄 SYNCING HOMEPAGE CATEGORY CAROUSEL IMAGES');
  console.log('============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB Connected\n');

  const uploadsDir = path.join(__dirname, '..', 'uploads', 'homepage-categories');
  
  // Check if directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Directory not found:', uploadsDir);
    return;
  }

  // Get all ORIGINAL image files (not -300w, -600w variants)
  const files = fs.readdirSync(uploadsDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    const isVariant = file.includes('-300w') || file.includes('-600w') || file.includes('-1200w');
    return isImage && !isVariant;
  });

  console.log(`📂 Found ${files.length} original image files\n`);

  // Group by timestamp and prefer jpg/jpeg over webp
  const imageMap = {};
  files.forEach(file => {
    const match = file.match(/category-(\d+)-(\d+)/);
    if (match) {
      const key = `${match[1]}-${match[2]}`;
      if (!imageMap[key] || file.match(/\.(jpg|jpeg)$/i)) {
        imageMap[key] = file;
      }
    }
  });

  const uniqueImages = Object.values(imageMap);
  console.log(`📊 ${uniqueImages.length} unique images (jpg preferred)\n`);

  // Get all homepage categories from database
  const categories = await HomepageCategory.find().sort({ displayOrder: 1 });
  console.log(`📊 Found ${categories.length} homepage categories in database\n`);

  let updatedCount = 0;
  let correctCount = 0;

  for (const category of categories) {
    if (!category.imageUrl) {
      console.log(`⚠️  ${category.name} - No imageUrl in database`);
      continue;
    }

    // Extract the filename from the current imageUrl
    const currentFilename = path.basename(category.imageUrl.split('?')[0]);
    
    // Check if this exact file exists
    if (uniqueImages.includes(currentFilename)) {
      console.log(`✅ ${category.name} - Correct: ${currentFilename}`);
      correctCount++;
      continue;
    }

    // File doesn't exist - assign from available images (round-robin)
    const newFilename = uniqueImages[updatedCount % uniqueImages.length];
    const newImageUrl = `/uploads/homepage-categories/${newFilename}`;
    
    await HomepageCategory.updateOne(
      { _id: category._id },
      { $set: { imageUrl: newImageUrl } }
    );
    
    console.log(`🔄 ${category.name}`);
    console.log(`   Old: ${currentFilename} ❌`);
    console.log(`   New: ${newFilename} ✅`);
    updatedCount++;
  }

  console.log('\n============================================================');
  console.log('📊 SYNC SUMMARY');
  console.log('============================================================');
  console.log(`✅ Already Correct: ${correctCount}`);
  console.log(`🔄 Updated: ${updatedCount}`);
  console.log(`📁 Total Categories: ${categories.length}`);
  console.log('============================================================\n');
};

// Run the script
const run = async () => {
  try {
    await syncCategoryImages();
    await mongoose.connection.close();
    console.log('✨ Script completed!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Script error:', err);
    process.exit(1);
  }
};

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
