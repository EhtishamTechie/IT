// Trim meta descriptions that are too long
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
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({});
    const longDescriptions = products.filter(p => 
      p.metaDescription && p.metaDescription.length > 160
    );

    console.log(`🔍 Found ${longDescriptions.length} products with meta descriptions > 160 chars\n`);

    if (longDescriptions.length === 0) {
      console.log('✅ All meta descriptions are within limits!');
      await mongoose.disconnect();
      return;
    }

    for (const product of longDescriptions) {
      const oldDesc = product.metaDescription;
      const newDesc = trimDescription(oldDesc);
      
      console.log(`\nProduct: ${product.title}`);
      console.log(`  Old (${oldDesc.length} chars): ${oldDesc}`);
      console.log(`  New (${newDesc.length} chars): ${newDesc}`);
      
      product.metaDescription = newDesc;
      await product.save();
      console.log('  ✅ Updated');
    }

    console.log(`\n✅ Trimmed ${longDescriptions.length} meta descriptions!\n`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

trimLongDescriptions();
