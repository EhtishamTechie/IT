/**
 * Direct SEO Bulk Optimization Script
 * 
 * This script works directly with the database (no server needed)
 * to generate missing slugs, meta titles, meta descriptions, and SEO keywords.
 * 
 * Run this when the backend server is NOT running.
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { generateSlug, generateMetaDescription, extractKeywords } = require('../utils/seoUtils');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/internationaltijarat';

// Helper function to generate SEO keywords
function generateSEOKeywords(name, category, subcategory) {
  const keywords = [name.toLowerCase()];
  
  if (category) keywords.push(category.toLowerCase());
  if (subcategory) keywords.push(subcategory.toLowerCase());
  
  // Add common e-commerce keywords
  keywords.push('buy online', 'best price', 'international tijarat');
  
  return keywords;
}

// Helper function to generate category SEO keywords
function generateCategorySEOKeywords(categoryName) {
  const keywords = [
    categoryName.toLowerCase(),
    `${categoryName.toLowerCase()} products`,
    `buy ${categoryName.toLowerCase()}`,
    `${categoryName.toLowerCase()} online`,
    'international tijarat',
    'best prices',
    'quality products'
  ];
  
  return keywords;
}

async function optimizeProducts() {
  try {
    console.log('\n📦 Optimizing Products...');
    
    const products = await Product.find({});
    console.log(`   Found ${products.length} products`);
    
    let updatedCount = 0;
    const updates = [];

    for (const product of products) {
      const updates_needed = {};
      let hasUpdates = false;

      // Generate slug if missing
      if (!product.slug && product.title) {
        updates_needed.slug = generateSlug(product.title);
        hasUpdates = true;
      }

      // Generate meta title if missing
      if (!product.metaTitle && product.title) {
        const title = product.title.length > 50 
          ? product.title.substring(0, 50) + '...'
          : product.title;
        updates_needed.metaTitle = `${title} - Buy Online | International Tijarat`;
        hasUpdates = true;
      }

      // Generate meta description if missing
      if (!product.metaDescription && product.description) {
        const desc = product.description.replace(/<[^>]*>/g, '').substring(0, 150);
        updates_needed.metaDescription = `${desc}... Shop now at International Tijarat with fast delivery and best prices.`;
        hasUpdates = true;
      }

      // Generate SEO keywords if missing
      if ((!product.seoKeywords || product.seoKeywords.length === 0) && product.title) {
        const categoryName = product.category && product.category.length > 0 
          ? (typeof product.category[0] === 'object' ? product.category[0].name : product.category[0])
          : null;
        const subcategoryName = product.subCategory && product.subCategory.length > 0
          ? (typeof product.subCategory[0] === 'object' ? product.subCategory[0].name : product.subCategory[0])
          : null;
        
        const keywords = generateSEOKeywords(product.title, categoryName, subcategoryName);
        updates_needed.seoKeywords = keywords;
        hasUpdates = true;
      }

      // Generate alt text for images if missing
      if (product.images && product.images.length > 0 && !product.altText) {
        updates_needed.altText = `${product.title} - High quality product image showing details and features`;
        hasUpdates = true;
      }

      if (hasUpdates) {
        updates.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: updates_needed }
          }
        });
        updatedCount++;
      }
    }

    if (updates.length > 0) {
      await Product.bulkWrite(updates);
      console.log(`   ✅ Optimized ${updatedCount} products`);
    } else {
      console.log(`   ℹ️  All products already optimized`);
    }

    return { total: products.length, optimized: updatedCount };
  } catch (error) {
    console.error('   ❌ Error optimizing products:', error.message);
    throw error;
  }
}

async function optimizeCategories() {
  try {
    console.log('\n📁 Optimizing Categories...');
    
    const categories = await Category.find({});
    console.log(`   Found ${categories.length} categories`);
    
    let updatedCount = 0;
    const updates = [];

    for (const category of categories) {
      const updates_needed = {};
      let hasUpdates = false;

      // Generate slug if missing
      if (!category.slug && category.name) {
        updates_needed.slug = generateSlug(category.name);
        hasUpdates = true;
      }

      // Generate meta title if missing
      if (!category.metaTitle && category.name) {
        const title = category.name.length > 45
          ? category.name.substring(0, 45) + '...'
          : category.name;
        updates_needed.metaTitle = `${title} Products - Shop Online | International Tijarat`;
        hasUpdates = true;
      }

      // Generate meta description if missing
      if (!category.metaDescription && category.name) {
        updates_needed.metaDescription = `Explore our wide range of ${category.name.toLowerCase()} products. Quality guaranteed, competitive prices, and fast delivery. Shop now at International Tijarat.`;
        hasUpdates = true;
      }

      // Generate SEO keywords if missing
      if ((!category.seoKeywords || category.seoKeywords.length === 0) && category.name) {
        const keywords = generateCategorySEOKeywords(category.name);
        updates_needed.seoKeywords = keywords;
        hasUpdates = true;
      }

      if (hasUpdates) {
        updates.push({
          updateOne: {
            filter: { _id: category._id },
            update: { $set: updates_needed }
          }
        });
        updatedCount++;
      }
    }

    if (updates.length > 0) {
      await Category.bulkWrite(updates);
      console.log(`   ✅ Optimized ${updatedCount} categories`);
    } else {
      console.log(`   ℹ️  All categories already optimized`);
    }

    return { total: categories.length, optimized: updatedCount };
  } catch (error) {
    console.error('   ❌ Error optimizing categories:', error.message);
    throw error;
  }
}

async function checkSEOHealth() {
  try {
    console.log('\n🏥 Checking SEO Health...');
    
    // Count products and categories with and without SEO data
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withSlugs: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$slug', null] }, { $ne: ['$slug', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaTitle: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaTitle', null] }, { $ne: ['$metaTitle', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaDescription: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaDescription', null] }, { $ne: ['$metaDescription', ''] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const categoryStats = await Category.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withSlugs: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$slug', null] }, { $ne: ['$slug', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaTitle: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaTitle', null] }, { $ne: ['$metaTitle', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaDescription: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaDescription', null] }, { $ne: ['$metaDescription', ''] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const productHealth = productStats[0] || { total: 0, withSlugs: 0, withMetaTitle: 0, withMetaDescription: 0 };
    const categoryHealth = categoryStats[0] || { total: 0, withSlugs: 0, withMetaTitle: 0, withMetaDescription: 0 };

    console.log('\n   📊 Products:');
    console.log(`      Total: ${productHealth.total}`);
    console.log(`      Slugs: ${productHealth.withSlugs}/${productHealth.total} (${Math.round((productHealth.withSlugs / productHealth.total) * 100) || 0}%)`);
    console.log(`      Meta Titles: ${productHealth.withMetaTitle}/${productHealth.total} (${Math.round((productHealth.withMetaTitle / productHealth.total) * 100) || 0}%)`);
    console.log(`      Meta Descriptions: ${productHealth.withMetaDescription}/${productHealth.total} (${Math.round((productHealth.withMetaDescription / productHealth.total) * 100) || 0}%)`);
    
    console.log('\n   📊 Categories:');
    console.log(`      Total: ${categoryHealth.total}`);
    console.log(`      Slugs: ${categoryHealth.withSlugs}/${categoryHealth.total} (${Math.round((categoryHealth.withSlugs / categoryHealth.total) * 100) || 0}%)`);
    console.log(`      Meta Titles: ${categoryHealth.withMetaTitle}/${categoryHealth.total} (${Math.round((categoryHealth.withMetaTitle / categoryHealth.total) * 100) || 0}%)`);
    console.log(`      Meta Descriptions: ${categoryHealth.withMetaDescription}/${categoryHealth.total} (${Math.round((categoryHealth.withMetaDescription / categoryHealth.total) * 100) || 0}%)`);

    return { products: productHealth, categories: categoryHealth };
  } catch (error) {
    console.error('   ❌ Error checking SEO health:', error.message);
    throw error;
  }
}

async function runDirectBulkOptimization() {
  try {
    console.log('🚀 Starting Direct SEO Bulk Optimization...');
    console.log('📡 Connecting to MongoDB:', MONGO_URI);
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Run optimizations
    const productResults = await optimizeProducts();
    const categoryResults = await optimizeCategories();
    const healthResults = await checkSEOHealth();
    
    console.log('\n✅ SEO Bulk Optimization Complete!\n');
    console.log('📋 Summary:');
    console.log(`   Products: ${productResults.optimized}/${productResults.total} optimized`);
    console.log(`   Categories: ${categoryResults.optimized}/${categoryResults.total} optimized`);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Test sitemap: Visit http://localhost:5000/api/seo/sitemap.xml');
    console.log('   3. Submit sitemap to Google Search Console');
    console.log('   4. Monitor SEO health regularly\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Fatal error during bulk optimization:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  runDirectBulkOptimization();
}

module.exports = runDirectBulkOptimization;
