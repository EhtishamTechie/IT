/**
 * Database Migration Script: Fix Category Typo
 * 
 * Purpose: Fix 'fragnace' → 'fragrance' in Category collection
 * This also updates the slug and any product references
 * 
 * Run this script once to fix the typo
 */

const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/internationaltijarat';

async function fixCategoryTypo() {
  try {
    console.log('🔧 Starting category typo fix...');
    console.log('📡 Connecting to MongoDB:', MONGO_URI);
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Find the category with typo
    const typoCategory = await Category.findOne({
      $or: [
        { name: 'fragnace' },
        { name: /fragnace/i },
        { slug: 'fragnace' }
      ]
    });
    
    if (!typoCategory) {
      console.log('⚠️  No category found with typo "fragnace"');
      console.log('ℹ️  Checking all categories for similar names...');
      
      const allCategories = await Category.find({
        name: /fragn/i
      }).select('name slug');
      
      if (allCategories.length > 0) {
        console.log('Found similar categories:');
        allCategories.forEach(cat => {
          console.log(`  - Name: "${cat.name}", Slug: "${cat.slug}"`);
        });
      } else {
        console.log('No categories found with "fragn" in the name');
      }
      
      await mongoose.connection.close();
      return;
    }
    
    console.log('📌 Found category:', {
      id: typoCategory._id,
      name: typoCategory.name,
      slug: typoCategory.slug
    });
    
    // Step 2: Update the category
    const oldId = typoCategory._id;
    typoCategory.name = typoCategory.name.replace(/fragnace/gi, 'Fragrance');
    typoCategory.slug = 'fragrance';
    
    // Update other SEO fields if they contain the typo
    if (typoCategory.metaTitle) {
      typoCategory.metaTitle = typoCategory.metaTitle.replace(/fragnace/gi, 'Fragrance');
    }
    if (typoCategory.metaDescription) {
      typoCategory.metaDescription = typoCategory.metaDescription.replace(/fragnace/gi, 'fragrance');
    }
    
    await typoCategory.save();
    console.log('✅ Category updated successfully');
    console.log('   New name:', typoCategory.name);
    console.log('   New slug:', typoCategory.slug);
    
    // Step 3: Check for products referencing this category
    const productsWithCategory = await Product.find({
      $or: [
        { category: oldId },
        { mainCategory: oldId },
        { subCategory: oldId }
      ]
    }).select('title category mainCategory subCategory');
    
    console.log(`\n📦 Found ${productsWithCategory.length} products referencing this category`);
    
    if (productsWithCategory.length > 0) {
      console.log('   Sample products:');
      productsWithCategory.slice(0, 5).forEach(product => {
        console.log(`   - ${product.title}`);
      });
    }
    
    // Products are already correctly linked by ObjectId, no update needed
    console.log('\n✅ All done! Summary:');
    console.log('   - Category name fixed: fragnace → Fragrance');
    console.log('   - Slug updated: fragnace → fragrance');
    console.log(`   - ${productsWithCategory.length} products remain properly linked`);
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error fixing category typo:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  fixCategoryTypo();
}

module.exports = fixCategoryTypo;
