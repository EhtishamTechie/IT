const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

const HomepageCategory = require('../models/HomepageCategory');

async function assignCategoryImages() {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'homepage-categories');
    
    // Get all original category image files (not the optimized variants)
    const allFiles = fs.readdirSync(uploadsDir);
    const originalFiles = allFiles.filter(f => 
      f.startsWith('category-') && 
      !f.includes('-300w') && 
      !f.includes('-600w') &&
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );
    
    console.log(`\n📂 Found ${originalFiles.length} category image files\n`);
    
    // Get all categories from database
    const categories = await HomepageCategory.find().sort({ displayOrder: 1 });
    console.log(`📊 Found ${categories.length} categories in database:\n`);
    
    // Display categories
    categories.forEach(cat => {
      console.log(`   ${cat.name}: ${cat.imageUrl}`);
    });
    
    console.log(`\n📋 Available image files:\n`);
    originalFiles.slice(0, 10).forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file}`);
    });
    
    // Create mapping - assign files to categories in order
    const updates = [];
    for (let i = 0; i < Math.min(categories.length, originalFiles.length); i++) {
      const category = categories[i];
      const newImageFile = originalFiles[i];
      
      if (category.imageUrl !== newImageFile) {
        updates.push({
          category: category.name,
          oldImage: category.imageUrl,
          newImage: newImageFile,
          id: category._id
        });
        
        // Update the category
        await HomepageCategory.findByIdAndUpdate(category._id, {
          imageUrl: newImageFile
        });
      }
    }
    
    console.log(`\n============================================================`);
    console.log(`📊 UPDATE SUMMARY`);
    console.log(`============================================================\n`);
    
    if (updates.length > 0) {
      console.log(`✅ Updated ${updates.length} categories:\n`);
      updates.forEach(u => {
        console.log(`   ${u.category}:`);
        console.log(`      Old: ${u.oldImage}`);
        console.log(`      New: ${u.newImage}\n`);
      });
    } else {
      console.log(`✅ All categories already have correct image files\n`);
    }
    
    console.log(`============================================================\n`);
    console.log(`✨ Script completed!\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

assignCategoryImages();
