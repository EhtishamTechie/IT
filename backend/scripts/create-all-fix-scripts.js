// Master script to create all SEO fix scripts at once
const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname);

console.log('🔧 Creating all SEO fix scripts...\n');

// Script 1: Fix Category Slugs
const script1 = `// Fix missing category slugs
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const MONGODB_URI = process.env.MONGODB_URI;

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s-]/g, '')
    .replace(/[\\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function fixCategorySlugs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\\n');

    const categories = await Category.find({ $or: [{ slug: null }, { slug: '' }] });
    console.log(\`🔍 Found \${categories.length} categories without slugs\\n\`);

    if (categories.length === 0) {
      console.log('✅ All categories already have slugs!');
      await mongoose.disconnect();
      return;
    }

    console.log('📝 Categories to fix:');
    categories.forEach((cat, i) => {
      const newSlug = generateSlug(cat.name);
      console.log(\`\${i + 1}. \${cat.name} → \${newSlug}\`);
    });

    console.log('\\n🔄 Applying fixes...');
    
    for (const category of categories) {
      let slug = generateSlug(category.name);
      
      // Ensure uniqueness
      let counter = 1;
      let uniqueSlug = slug;
      while (await Category.findOne({ slug: uniqueSlug, _id: { $ne: category._id } })) {
        uniqueSlug = \`\${slug}-\${counter}\`;
        counter++;
      }
      
      category.slug = uniqueSlug;
      await category.save();
      console.log(\`  ✅ Updated: \${category.name} → \${uniqueSlug}\`);
    }

    console.log(\`\\n✅ Fixed \${categories.length} category slugs!\\n\`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

fixCategorySlugs();
`;

// Script 2: Fix Category Meta Data
const script2 = `// Fix missing category meta titles and descriptions
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixCategoryMetaData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\\n');

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

    console.log('🔄 Processing categories...\\n');

    for (const category of categories) {
      let updated = false;
      const productCount = countMap[category._id.toString()] || 0;

      // Fix missing meta title
      if (!category.metaTitle) {
        category.metaTitle = \`\${category.name} Products - Shop Quality \${category.name} | International Tijarat\`;
        // Trim to 60 chars if too long
        if (category.metaTitle.length > 60) {
          category.metaTitle = \`\${category.name} Products | International Tijarat\`;
        }
        console.log(\`  ✅ Added meta title: \${category.name}\`);
        titlesFixed++;
        updated = true;
      }

      // Fix missing meta description
      if (!category.metaDescription) {
        const productText = productCount > 0 ? \`\${productCount} premium\` : 'premium';
        category.metaDescription = \`Discover \${productText} \${category.name.toLowerCase()} products at International Tijarat. Fast delivery, competitive prices, and quality guaranteed. Shop now!\`;
        // Ensure under 160 chars
        if (category.metaDescription.length > 160) {
          category.metaDescription = \`Shop \${productText} \${category.name.toLowerCase()} with fast delivery and best prices at International Tijarat.\`;
        }
        console.log(\`  ✅ Added meta description: \${category.name}\`);
        descriptionsFixed++;
        updated = true;
      }

      if (updated) {
        await category.save();
      }
    }

    console.log(\`\\n✅ Fixed \${titlesFixed} meta titles and \${descriptionsFixed} meta descriptions!\\n\`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

fixCategoryMetaData();
`;

// Script 3: Fix Remaining SEO Issues
const script3 = `// Fix remaining SEO issues (keywords and category descriptions)
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixRemainingSEO() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\\n');

    // Fix products missing SEO keywords
    const productsWithoutKeywords = await Product.find({
      $or: [
        { seoKeywords: { $exists: false } },
        { seoKeywords: { $size: 0 } }
      ]
    });

    console.log(\`🔍 Found \${productsWithoutKeywords.length} products without SEO keywords\\n\`);

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
      console.log(\`  ✅ Added keywords to: \${product.title}\`);
    }

    // Fix categories missing descriptions
    const categoriesWithoutDesc = await Category.find({
      $or: [
        { description: { $exists: false } },
        { description: '' },
        { description: null }
      ]
    });

    console.log(\`\\n🔍 Found \${categoriesWithoutDesc.length} categories without descriptions\\n\`);

    for (const category of categoriesWithoutDesc) {
      // Generate a basic description
      category.description = \`Explore our extensive collection of \${category.name.toLowerCase()} products. ` +
        `We offer premium quality items at competitive prices with fast delivery across Pakistan. ` +
        `Whether you're looking for the latest trends or timeless classics in \${category.name.toLowerCase()}, ` +
        `you'll find everything you need at International Tijarat. Browse our selection and shop with confidence.\`;
      
      await category.save();
      console.log(\`  ✅ Added description to: \${category.name}\`);
    }

    console.log(\`\\n✅ Fixed all remaining SEO issues!\\n\`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

fixRemainingSEO();
`;

// Script 4: Trim Long Meta Descriptions
const script4 = `// Trim meta descriptions that are too long
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

function trimDescription(text, maxLength = 160) {
  if (text.length <= maxLength) return text;
  
  // Try to cut at last complete sentence
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastPeriod > maxLength - 50) {
    return truncated.substring(0, lastPeriod + 1);
  } else if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  } else {
    return truncated + '...';
  }
}

async function trimLongDescriptions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\\n');

    const products = await Product.find({});
    const longDescriptions = products.filter(p => 
      p.metaDescription && p.metaDescription.length > 160
    );

    console.log(\`🔍 Found \${longDescriptions.length} products with meta descriptions > 160 chars\\n\`);

    if (longDescriptions.length === 0) {
      console.log('✅ All meta descriptions are within limits!');
      await mongoose.disconnect();
      return;
    }

    for (const product of longDescriptions) {
      const oldDesc = product.metaDescription;
      const newDesc = trimDescription(oldDesc);
      
      console.log(\`\\nProduct: \${product.title}\`);
      console.log(\`  Old (\${oldDesc.length} chars): \${oldDesc}\`);
      console.log(\`  New (\${newDesc.length} chars): \${newDesc}\`);
      
      product.metaDescription = newDesc;
      await product.save();
      console.log('  ✅ Updated');
    }

    console.log(\`\\n✅ Trimmed \${longDescriptions.length} meta descriptions!\\n\`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

trimLongDescriptions();
`;

// Script 5: Run All Fixes
const script5 = `// Master script to run all SEO fixes in sequence
const { execSync } = require('child_process');

console.log('🚀 Running all SEO fixes in sequence...\\n');
console.log('='.repeat(60));

const scripts = [
  { name: 'Fix Category Slugs', file: 'fix-category-slugs-final.js' },
  { name: 'Fix Category Meta Data', file: 'fix-category-meta-data.js' },
  { name: 'Fix Remaining SEO Issues', file: 'fix-remaining-seo-issues.js' },
  { name: 'Trim Long Meta Descriptions', file: 'trim-long-meta-descriptions.js' }
];

for (let i = 0; i < scripts.length; i++) {
  const script = scripts[i];
  console.log(\`\\n[\${i + 1}/\${scripts.length}] Running: \${script.name}\`);
  console.log('-'.repeat(60));
  
  try {
    execSync(\`node scripts/\${script.file}\`, { stdio: 'inherit' });
    console.log(\`✅ \${script.name} completed successfully\\n\`);
  } catch (error) {
    console.error(\`❌ \${script.name} failed!\`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log('='.repeat(60));
console.log('\\n🎉 All SEO fixes completed successfully!\\n');
console.log('📊 Running final SEO analysis...\\n');

try {
  execSync('node scripts/analyze-seo-issues.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to run final analysis');
}
`;

// Write all scripts
const scripts = [
  { name: 'fix-category-slugs-final.js', content: script1 },
  { name: 'fix-category-meta-data.js', content: script2 },
  { name: 'fix-remaining-seo-issues.js', content: script3 },
  { name: 'trim-long-meta-descriptions.js', content: script4 },
  { name: 'run-all-seo-fixes.js', content: script5 }
];

scripts.forEach(script => {
  const filePath = path.join(scriptsDir, script.name);
  fs.writeFileSync(filePath, script.content);
  console.log(`✅ Created: ${script.name}`);
});

console.log('\\n🎉 All SEO fix scripts created successfully!\\n');
console.log('📋 Next steps:');
console.log('1. Review the SYSTEMATIC_SEO_FIX_PLAN.md document');
console.log('2. Run individual scripts one by one, OR');
console.log('3. Run: node scripts/run-all-seo-fixes.js\\n');
console.log('⚠️  Recommended: Run step-by-step with validation after each step\\n');
