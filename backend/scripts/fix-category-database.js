const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://internationaltijarat:i9Yw1sETUTRZ5OBn@cluster0.xyhoh.mongodb.net/international-tijarat?retryWrites=true&w=majority&appName=Cluster0';

// Category carousel model
const HomepageCategory = mongoose.model('HomepageCategory', new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  imageUrl: String,
  displayOrder: Number,
  description: String
}, { collection: 'homepage_categories' }));

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all category images from filesystem
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'homepage-categories');
    const files = await fs.readdir(uploadsDir);
    
    // Filter for original images (not optimized variants)
    const originalImages = files.filter(file => 
      !file.includes('-300w') && 
      !file.includes('-600w') && 
      !file.includes('-1200w') &&
      (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
    );

    console.log(`📁 Found ${originalImages.length} original category images on filesystem\n`);

    // Get all categories from database
    const dbCategories = await HomepageCategory.find().populate('categoryId', 'name');
    console.log(`📊 Found ${dbCategories.length} categories in database\n`);

    // Check which database entries have missing files
    console.log('🔍 Checking for missing images:\n');
    const missingImages = [];
    
    for (const cat of dbCategories) {
      if (!cat.imageUrl) {
        console.log(`❌ ${cat.categoryId?.name || 'Unknown'}: No imageUrl in database`);
        missingImages.push(cat);
        continue;
      }

      // Extract filename from imageUrl
      const filename = cat.imageUrl.split('/').pop();
      const exists = files.includes(filename);
      
      if (!exists) {
        console.log(`❌ ${cat.categoryId?.name || 'Unknown'}: Missing file "${filename}"`);
        missingImages.push(cat);
      } else {
        console.log(`✅ ${cat.categoryId?.name || 'Unknown'}: "${filename}"`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total categories in DB: ${dbCategories.length}`);
    console.log(`   Missing images: ${missingImages.length}`);
    console.log(`   Valid images: ${dbCategories.length - missingImages.length}`);

    if (missingImages.length > 0) {
      console.log(`\n⚠️  ${missingImages.length} categories have missing images!`);
      console.log(`\n💡 Suggestions:`);
      console.log(`   1. Re-upload the missing images through admin panel`);
      console.log(`   2. Or delete these database entries`);
      console.log(`\n🔧 To delete entries with missing images, run:`);
      console.log(`   node scripts/fix-category-database.js --delete-missing`);
    }

    // If --delete-missing flag is provided, delete entries with missing files
    if (process.argv.includes('--delete-missing')) {
      console.log(`\n🗑️  Deleting ${missingImages.length} categories with missing images...`);
      for (const cat of missingImages) {
        await HomepageCategory.deleteOne({ _id: cat._id });
        console.log(`   Deleted: ${cat.categoryId?.name || 'Unknown'}`);
      }
      console.log(`✅ Cleanup complete!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
