const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Property = require('../models/Property');
const Product = require('../models/Product');

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/internationaltijarat';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected for image URL fix');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Fix property image URLs
const fixPropertyImageUrls = async () => {
  try {
    console.log('🔧 Starting property image URL fix...');
    
    const properties = await Property.find({});
    let fixedCount = 0;
    
    for (const property of properties) {
      let needsUpdate = false;
      
      if (property.images && Array.isArray(property.images)) {
        const fixedImages = property.images.map(img => {
          // Clean up any malformed URLs
          let cleanImage = img;
          
          // Remove any double slashes, incorrect prefixes
          cleanImage = cleanImage
            .replace(/^\/+/, '')                    // Remove leading slashes
            .replace(/^uploads\/+/, '')             // Remove uploads/ prefix
            .replace(/^properties\/+/, '')          // Remove properties/ prefix
            .replace(/http:\/\/localhost:\d+\//, '') // Remove localhost URLs
            .replace(/https?:\/\/[^\/]+\//, '')     // Remove any domain URLs
          
          // Just keep the filename
          const filename = cleanImage.split('/').pop().split('\\').pop();
          
          if (filename !== img) {
            needsUpdate = true;
            console.log(`📄 Fixed image: ${img} -> ${filename}`);
          }
          
          return filename;
        });
        
        if (needsUpdate) {
          property.images = fixedImages;
          await property.save();
          fixedCount++;
          console.log(`✅ Fixed property: ${property.title} (${property._id})`);
        }
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} properties with image URL issues`);
    
  } catch (error) {
    console.error('❌ Error fixing property image URLs:', error);
  }
};

// Fix product image URLs (if needed)
const fixProductImageUrls = async () => {
  try {
    console.log('🔧 Starting product image URL fix...');
    
    // Check if Product model exists
    try {
      const products = await Product.find({});
      let fixedCount = 0;
      
      for (const product of products) {
        let needsUpdate = false;
        
        if (product.image) {
          let cleanImage = product.image
            .replace(/^\/+/, '')
            .replace(/^uploads\/+/, '')
            .replace(/^products\/+/, '')
            .replace(/http:\/\/localhost:\d+\//, '')
            .replace(/https?:\/\/[^\/]+\//, '');
          
          const filename = cleanImage.split('/').pop().split('\\').pop();
          
          if (filename !== product.image) {
            product.image = filename;
            needsUpdate = true;
          }
        }
        
        if (product.images && Array.isArray(product.images)) {
          const fixedImages = product.images.map(img => {
            let cleanImage = img
              .replace(/^\/+/, '')
              .replace(/^uploads\/+/, '')
              .replace(/^products\/+/, '')
              .replace(/http:\/\/localhost:\d+\//, '')
              .replace(/https?:\/\/[^\/]+\//, '');
            
            const filename = cleanImage.split('/').pop().split('\\').pop();
            
            if (filename !== img) {
              needsUpdate = true;
            }
            
            return filename;
          });
          
          if (needsUpdate) {
            product.images = fixedImages;
          }
        }
        
        if (needsUpdate) {
          await product.save();
          fixedCount++;
          console.log(`✅ Fixed product: ${product.name} (${product._id})`);
        }
      }
      
      console.log(`🎉 Fixed ${fixedCount} products with image URL issues`);
      
    } catch (error) {
      console.log('ℹ️ Product model not found or no products to fix');
    }
    
  } catch (error) {
    console.error('❌ Error fixing product image URLs:', error);
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting image URL fix script...');
    
    await connectDB();
    
    await fixPropertyImageUrls();
    await fixProductImageUrls();
    
    console.log('✅ Image URL fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  fixPropertyImageUrls,
  fixProductImageUrls
};