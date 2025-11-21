const mongoose = require('mongoose');
const Product = require('../models/Product');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB - use environment variable or default to local
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/IT';
console.log('Connecting to:', mongoUri.substring(0, 50) + '...');
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fixProductImages() {
  try {
    console.log('🔧 Starting product image path fix...');
    
    // Find all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products to check`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const product of products) {
      let needsUpdate = false;
      const updates = {};
      
      // Fix main image
      if (product.image) {
        const cleanImage = product.image
          .replace(/^\/uploads\/products\/products\//, '')
          .replace(/^\/uploads\/products\//, '')
          .replace(/^uploads\/products\//, '')
          .replace(/^products\//, '');
        
        if (cleanImage !== product.image) {
          updates.image = cleanImage;
          needsUpdate = true;
          console.log(`  🖼️  ${product.title}: ${product.image} → ${cleanImage}`);
        }
      }
      
      // Fix images array
      if (product.images && product.images.length > 0) {
        const cleanImages = product.images.map(img => 
          img
            .replace(/^\/uploads\/products\/products\//, '')
            .replace(/^\/uploads\/products\//, '')
            .replace(/^uploads\/products\//, '')
            .replace(/^products\//, '')
        );
        
        const changed = cleanImages.some((img, idx) => img !== product.images[idx]);
        if (changed) {
          updates.images = cleanImages;
          needsUpdate = true;
          console.log(`  📷 ${product.title}: Fixed ${cleanImages.length} images`);
        }
      }
      
      // Fix video if present
      if (product.video) {
        const cleanVideo = product.video
          .replace(/^\/uploads\/products\/products\//, '')
          .replace(/^\/uploads\/products\//, '')
          .replace(/^uploads\/products\//, '')
          .replace(/^products\//, '');
        
        if (cleanVideo !== product.video) {
          updates.video = cleanVideo;
          needsUpdate = true;
          console.log(`  🎥 ${product.title}: ${product.video} → ${cleanVideo}`);
        }
      }
      
      if (needsUpdate) {
        await Product.findByIdAndUpdate(product._id, updates);
        fixed++;
      } else {
        skipped++;
      }
    }
    
    console.log('\n✅ Migration complete!');
    console.log(`   Fixed: ${fixed} products`);
    console.log(`   Skipped: ${skipped} products (already correct)`);
    
  } catch (error) {
    console.error('❌ Error fixing product images:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📊 Database connection closed');
  }
}

// Run the migration
fixProductImages()
  .then(() => {
    console.log('🎉 Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
