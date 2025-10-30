// Diagnostic script to check actual product image status
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

async function diagnoseImages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({});
    console.log(`📦 Total Products: ${products.length}\n`);

    // Categorize products by image status
    const withImagesArray = products.filter(p => p.images && p.images.length > 0);
    const withSingleImage = products.filter(p => p.image && p.image !== 'placeholder-image.jpg' && p.image !== '');
    const withPlaceholder = products.filter(p => p.image === 'placeholder-image.jpg' || p.image === '');
    const withEitherImage = products.filter(p => 
      (p.images && p.images.length > 0) || 
      (p.image && p.image !== 'placeholder-image.jpg' && p.image !== '')
    );
    const withoutAnyImage = products.filter(p => 
      (!p.images || p.images.length === 0) && 
      (!p.image || p.image === 'placeholder-image.jpg' || p.image === '')
    );

    console.log('📊 Image Status Breakdown:');
    console.log('─'.repeat(60));
    console.log(`✅ Products with images[] array: ${withImagesArray.length} (${Math.round(withImagesArray.length/products.length*100)}%)`);
    console.log(`✅ Products with single image field: ${withSingleImage.length} (${Math.round(withSingleImage.length/products.length*100)}%)`);
    console.log(`⚠️  Products with placeholder only: ${withPlaceholder.length} (${Math.round(withPlaceholder.length/products.length*100)}%)`);
    console.log(`✅ Products with ANY real image: ${withEitherImage.length} (${Math.round(withEitherImage.length/products.length*100)}%)`);
    console.log(`❌ Products WITHOUT any real image: ${withoutAnyImage.length} (${Math.round(withoutAnyImage.length/products.length*100)}%)`);
    console.log('─'.repeat(60));

    if (withoutAnyImage.length > 0) {
      console.log('\n🔍 Sample products WITHOUT images:');
      withoutAnyImage.slice(0, 10).forEach((p, i) => {
        console.log(`${i + 1}. ${p.title}`);
        console.log(`   - images: ${JSON.stringify(p.images)}`);
        console.log(`   - image: ${p.image}`);
      });
      
      if (withoutAnyImage.length > 10) {
        console.log(`   ... and ${withoutAnyImage.length - 10} more`);
      }
    }

    // Check image array details
    console.log('\n📸 Image Array Details:');
    const avgImagesPerProduct = withImagesArray.reduce((sum, p) => sum + p.images.length, 0) / Math.max(withImagesArray.length, 1);
    const maxImages = Math.max(...products.map(p => p.images ? p.images.length : 0));
    const minImages = Math.min(...withImagesArray.map(p => p.images.length));
    
    console.log(`   Average images per product: ${avgImagesPerProduct.toFixed(2)}`);
    console.log(`   Max images on a product: ${maxImages}`);
    console.log(`   Min images (with array): ${minImages}`);

    // Sample products with good images
    console.log('\n✅ Sample products WITH images:');
    withImagesArray.slice(0, 5).forEach((p, i) => {
      console.log(`${i + 1}. ${p.title}`);
      console.log(`   - images count: ${p.images.length}`);
      console.log(`   - first image: ${p.images[0]}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Diagnosis complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

diagnoseImages();
