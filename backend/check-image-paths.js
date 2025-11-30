require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Use MONGODB_URI from .env (MongoDB Atlas)
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/international-tijarat';
console.log('🔗 Connecting to:', dbUri.includes('@') ? 'MongoDB Atlas' : 'Local MongoDB');

mongoose.connect(dbUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Find the 5 most recent products
    const products = await Product.find().sort({ updatedAt: -1 }).limit(5);
    
    if (products.length > 0) {
      console.log(`\n📦 Found ${products.length} most recent products:\n`);
      
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.title}`);
        console.log(`   Slug: ${product.slug}`);
        console.log(`   Main Image: ${product.image}`);
        console.log(`   Additional Images:`, product.images);
        console.log('');
      });
    } else {
      console.log('❌ No products found in database');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
