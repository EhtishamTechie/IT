// Fix missing category slugs
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const MONGODB_URI = process.env.MONGODB_URI;

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function fixCategorySlugs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const categories = await Category.find({ $or: [{ slug: null }, { slug: '' }] });
    console.log(`🔍 Found ${categories.length} categories without slugs\n`);

    if (categories.length === 0) {
      console.log('✅ All categories already have slugs!');
      await mongoose.disconnect();
      return;
    }

    console.log('📝 Categories to fix:');
    categories.forEach((cat, i) => {
      const newSlug = generateSlug(cat.name);
      console.log(`${i + 1}. ${cat.name} → ${newSlug}`);
    });

    console.log('\n🔄 Applying fixes...');
    
    for (const category of categories) {
      let slug = generateSlug(category.name);
      
      // Ensure uniqueness
      let counter = 1;
      let uniqueSlug = slug;
      while (await Category.findOne({ slug: uniqueSlug, _id: { $ne: category._id } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      
      category.slug = uniqueSlug;
      await category.save();
      console.log(`  ✅ Updated: ${category.name} → ${uniqueSlug}`);
    }

    console.log(`\n✅ Fixed ${categories.length} category slugs!\n`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

fixCategorySlugs();
