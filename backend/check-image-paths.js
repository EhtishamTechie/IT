const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/international-tijarat')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Find the problematic product
    const product = await Product.findOne({ slug: 'mens-black-fleece-joggers-sweatpants' });
    
    if (product) {
      console.log('\n📦 Product found:');
      console.log('Title:', product.title);
      console.log('Main Image:', product.image);
      console.log('Additional Images:', product.images);
      console.log('\n🔍 Full image data:', JSON.stringify(product.images, null, 2));
    } else {
      console.log('❌ Product not found');
      
      // Find any recent product
      const recent = await Product.findOne().sort({ createdAt: -1 });
      if (recent) {
        console.log('\n📦 Most recent product:');
        console.log('Title:', recent.title);
        console.log('Main Image:', recent.image);
        console.log('Additional Images:', recent.images);
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
