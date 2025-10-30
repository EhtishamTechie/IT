// Fix remaining SEO issues (keywords and category descriptions)
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixRemainingSEO() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Fix products missing SEO keywords
    const productsWithoutKeywords = await Product.find({
      $or: [
        { seoKeywords: { $exists: false } },
        { seoKeywords: { $size: 0 } }
      ]
    });

    console.log(`🔍 Found ${productsWithoutKeywords.length} products without SEO keywords\n`);

    for (const product of productsWithoutKeywords) {
      const keywords = [
        product.title.toLowerCase(),
        'buy online',
        'international tijarat',
        'pakistan',
        'best price',
        'quality products'
      ];
      
      if (product.brand) keywords.push(product.brand.toLowerCase());
      
      product.seoKeywords = [...new Set(keywords)]; // Remove duplicates
      await product.save();
      console.log(`  ✅ Added keywords to: ${product.title}`);
    }

    // Fix categories missing descriptions
    const categoriesWithoutDesc = await Category.find({
      $or: [
        { description: { $exists: false } },
        { description: '' },
        { description: null }
      ]
    });

    console.log(`\n🔍 Found ${categoriesWithoutDesc.length} categories without descriptions\n`);

    for (const category of categoriesWithoutDesc) {
      // Generate a basic description
      category.description = `Explore our extensive collection of ${category.name.toLowerCase()} products. We offer premium quality items at competitive prices with fast delivery across Pakistan. Whether you're looking for the latest trends or timeless classics in ${category.name.toLowerCase()}, you'll find everything you need at International Tijarat. Browse our selection and shop with confidence.`;
      
      await category.save();
      console.log(`  ✅ Added description to: ${category.name}`);
    }

    console.log(`\n✅ Fixed all remaining SEO issues!\n`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

fixRemainingSEO();
