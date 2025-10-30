// Fix missing category meta titles and descriptions
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixCategoryMetaData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const categories = await Category.find({});
    let titlesFixed = 0;
    let descriptionsFixed = 0;

    // Get product counts per category
    const productCounts = await Product.aggregate([
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const countMap = {};
    productCounts.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    console.log('🔄 Processing categories...\n');

    for (const category of categories) {
      let updated = false;
      const productCount = countMap[category._id.toString()] || 0;

      // Fix missing meta title
      if (!category.metaTitle) {
        category.metaTitle = `${category.name} Products - Shop Quality ${category.name} | International Tijarat`;
        // Trim to 60 chars if too long
        if (category.metaTitle.length > 60) {
          category.metaTitle = `${category.name} Products | International Tijarat`;
        }
        console.log(`  ✅ Added meta title: ${category.name}`);
        titlesFixed++;
        updated = true;
      }

      // Fix missing meta description
      if (!category.metaDescription) {
        const productText = productCount > 0 ? `${productCount} premium` : 'premium';
        category.metaDescription = `Discover ${productText} ${category.name.toLowerCase()} products at International Tijarat. Fast delivery, competitive prices, and quality guaranteed. Shop now!`;
        // Ensure under 160 chars
        if (category.metaDescription.length > 160) {
          category.metaDescription = `Shop ${productText} ${category.name.toLowerCase()} with fast delivery and best prices at International Tijarat.`;
        }
        console.log(`  ✅ Added meta description: ${category.name}`);
        descriptionsFixed++;
        updated = true;
      }

      if (updated) {
        await category.save();
      }
    }

    console.log(`\n✅ Fixed ${titlesFixed} meta titles and ${descriptionsFixed} meta descriptions!\n`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

fixCategoryMetaData();
