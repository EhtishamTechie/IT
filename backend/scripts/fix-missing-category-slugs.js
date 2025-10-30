/**
 * Fix Missing Category Slugs
 * 
 * This script finds categories without slugs and generates proper SEO-friendly slugs for them.
 * This fixes the issue of ObjectID URLs appearing in the sitemap.
 */

const mongoose = require('mongoose');
const Category = require('../models/Category');
const { generateSlug } = require('../utils/seoUtils');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/internationaltijarat';

async function fixMissingCategorySlugs() {
  try {
    console.log('🔧 Starting category slug fix...');
    console.log('📡 Connecting to MongoDB:', MONGO_URI);
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find categories without slugs
    const categoriesWithoutSlugs = await Category.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });
    
    console.log(`📋 Found ${categoriesWithoutSlugs.length} categories without slugs\n`);
    
    if (categoriesWithoutSlugs.length === 0) {
      console.log('✅ All categories already have slugs!');
      await mongoose.connection.close();
      return;
    }
    
    // Fix each category
    let fixedCount = 0;
    for (const category of categoriesWithoutSlugs) {
      console.log(`\n🔄 Fixing category:`);
      console.log(`   ID: ${category._id}`);
      console.log(`   Name: ${category.name || 'UNNAMED'}`);
      console.log(`   Current Slug: ${category.slug || 'MISSING'}`);
      
      if (!category.name) {
        console.log('   ⚠️  SKIPPED - Category has no name!');
        continue;
      }
      
      // Generate slug from name
      const newSlug = generateSlug(category.name);
      
      // Check if slug already exists (avoid duplicates)
      const existingWithSlug = await Category.findOne({ 
        slug: newSlug,
        _id: { $ne: category._id }
      });
      
      let finalSlug = newSlug;
      if (existingWithSlug) {
        // Add category ID to make it unique
        finalSlug = `${newSlug}-${category._id.toString().substring(0, 8)}`;
        console.log(`   ⚠️  Slug "${newSlug}" already exists, using "${finalSlug}"`);
      }
      
      // Update the category
      category.slug = finalSlug;
      
      // Auto-generate meta fields if missing
      if (!category.metaTitle) {
        const title = category.name.length > 45
          ? category.name.substring(0, 45) + '...'
          : category.name;
        category.metaTitle = `${title} Products - Shop Online | International Tijarat`;
      }
      
      if (!category.metaDescription) {
        category.metaDescription = `Explore our wide range of ${category.name.toLowerCase()} products. Quality guaranteed, competitive prices, and fast delivery. Shop now at International Tijarat.`;
      }
      
      await category.save();
      
      console.log(`   ✅ Fixed! New slug: ${finalSlug}`);
      fixedCount++;
    }
    
    console.log(`\n✅ Successfully fixed ${fixedCount} categories!`);
    console.log('\n📋 Summary:');
    console.log(`   Total categories checked: ${categoriesWithoutSlugs.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Skipped: ${categoriesWithoutSlugs.length - fixedCount}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Restart your backend server to clear cache');
    console.log('   2. Visit http://localhost:3001/api/seo/sitemap.xml');
    console.log('   3. Verify no ObjectID URLs remain');
    console.log('   4. Submit updated sitemap to Google Search Console\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error fixing category slugs:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixMissingCategorySlugs();
}

module.exports = fixMissingCategorySlugs;
