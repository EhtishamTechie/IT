const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// HomepageCategory Schema (correct model for carousel)
const homepageCategorySchema = new mongoose.Schema({
  categoryId: mongoose.Schema.Types.ObjectId,
  name: String,
  imageUrl: String,
  displayOrder: Number
}, { collection: 'homepagecategories' });

const HomepageCategory = mongoose.model('HomepageCategory', homepageCategorySchema);

const syncCategoryImages = async () => {
  console.log('\n============================================================');
  console.log('🔄 SYNCING CATEGORY IMAGES WITH DATABASE');
  console.log('============================================================\n');

  const uploadsDir = path.join(__dirname, '..', 'uploads', 'homepage-categories');
  
  // Check if directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Directory not found:', uploadsDir);
    return;
  }

  // Get all image files from the directory
  const files = fs.readdirSync(uploadsDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });

  console.log(`📂 Found ${files.length} image files in uploads/homepage-categories/\n`);

  // Get all homepage categories from database
  const categories = await HomepageCategory.find();
  console.log(`📊 Found ${categories.length} homepage categories in database\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const category of categories) {
    if (!category.imageUrl) {
      console.log(`⏭️  Skipping ${category.name} - no imageUrl in database`);
      skippedCount++;
      continue;
    }

    // Extract the filename from the current imageUrl
    const currentFilename = path.basename(category.imageUrl);
    
    // Check if this exact file exists
    if (files.includes(currentFilename)) {
      console.log(`✅ ${category.name} - Image exists: ${currentFilename}`);
      skippedCount++;
      continue;
    }

    // Extract the base pattern (timestamp part) from the filename
    // Example: category-1759741840168-55858068.webp -> 1759741840168
    const timestampMatch = currentFilename.match(/category-(\d+)-/);
    
    if (!timestampMatch) {
      console.log(`⚠️  ${category.name} - Cannot extract timestamp from: ${currentFilename}`);
      skippedCount++;
      continue;
    }

    const timestamp = timestampMatch[1];
    
    // Find a file with the same base name but different format
    const matchingFile = files.find(file => {
      // Look for files with similar timestamp (allow for slight variations)
      return file.includes(`category-${timestamp}-`);
    });

    if (matchingFile) {
      // Update the database with the correct filename
      const newImageUrl = `/uploads/homepage-categories/${matchingFile}`;
      await Category.updateOne(
        { _id: category._id },
        { $set: { imageUrl: newImageUrl } }
      );
      
      console.log(`🔄 ${category.name}`);
      console.log(`   Old: ${category.imageUrl}`);
      console.log(`   New: ${newImageUrl}`);
      updatedCount++;
    } else {
      console.log(`❌ ${category.name} - No matching file found for: ${currentFilename}`);
      
      // Try to find ANY file that might match by category name
      const namePattern = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const possibleMatch = files.find(file => {
        const filePattern = file.toLowerCase().replace(/[^a-z0-9]+/g, '');
        return filePattern.includes(namePattern) || namePattern.includes(filePattern);
      });
      
      if (possibleMatch) {
        console.log(`   ℹ️  Possible match found: ${possibleMatch}`);
        console.log(`   👉 Manual verification needed`);
      }
      
      skippedCount++;
    }
  }

  console.log('\n============================================================');
  console.log('📊 SYNC SUMMARY');
  console.log('============================================================\n');
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`📁 Total Categories: ${categories.length}`);
  console.log('\n============================================================');
};

// Run the script
const run = async () => {
  await connectDB();
  await syncCategoryImages();
  await mongoose.connection.close();
  console.log('\n✨ Script completed!');
  process.exit(0);
};

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
