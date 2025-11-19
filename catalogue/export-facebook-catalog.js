/**
 * Facebook Catalog Export Script
 * 
 * This script exports all products from the database to a CSV file
 * formatted for Facebook Catalog Ads.
 * 
 * Usage:
 *   node catalogue/export-facebook-catalog.js
 * 
 * Output:
 *   catalogue/facebook-product-catalog.csv
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables from backend directory
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Import Product model
const Product = require('../backend/models/Product');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    // Use same connection settings as backend
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      bufferCommands: false, // Disable buffering
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`🗄️  Database: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Escape CSV fields (handle commas, quotes, newlines)
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

// Clean and truncate description (remove HTML tags, limit length)
const cleanDescription = (description) => {
  if (!description) return '';
  
  // Remove HTML tags
  let clean = description.replace(/<[^>]*>/g, ' ');
  
  // Remove extra whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // Limit to 5000 characters (Facebook recommendation)
  if (clean.length > 5000) {
    clean = clean.substring(0, 4997) + '...';
  }
  
  return clean;
};

// Export products to CSV
const exportProductsCatalog = async () => {
  try {
    console.log('🔍 Fetching products from database...');
    
    // Ensure connection is ready
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for database connection...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Get all active and visible products
    const products = await Product.find({
      isActive: true,
      isVisible: true
    })
    .populate('category', 'name slug')
    .populate('mainCategory', 'name')
    .select('_id title description price originalPrice discount image images brand category mainCategory slug')
    .lean()
    .exec();

    console.log(`📦 Found ${products.length} products`);

    if (products.length === 0) {
      console.log('⚠️  No products found. Exiting.');
      return;
    }

    // Base URL for the website
    const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';

    // Create CSV header matching your format
    const header = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
      'google_product_category',
      'item_group_id'
    ].join(',');

    // Create CSV rows
    const rows = products.map((product, index) => {
      // Product ID
      const id = `prod_${product._id}`;
      
      // Title (limit to 150 characters for Facebook)
      const title = escapeCSV(product.title.substring(0, 150));
      
      // Description (clean and escape)
      const description = escapeCSV(cleanDescription(product.description));
      
      // Availability
      const availability = 'in stock';
      
      // Condition
      const condition = 'new';
      
      // Price (use discounted price if available)
      const finalPrice = product.discount > 0 && product.originalPrice 
        ? product.originalPrice - (product.originalPrice * product.discount / 100)
        : product.price;
      const price = `${finalPrice.toFixed(2)} USD`;
      
      // Product link (use slug if available)
      const productPath = product.slug || product._id;
      const link = escapeCSV(`https://m.internationaltijarat.com/product/${productPath}`);
      
      // Image link (use first image or main image)
      const imageFile = product.images && product.images.length > 0 
        ? product.images[0] 
        : product.image;
      const image_link = escapeCSV(`${baseUrl}/uploads/products/${imageFile}`);
      
      // Brand
      const brand = escapeCSV(product.brand || 'International Tijarat');
      
      // Google product category (use main category name)
      const google_pr_ctgn = product.mainCategory && product.mainCategory.length > 0
        ? escapeCSV(product.mainCategory[0].name)
        : (product.category && product.category.length > 0 
            ? escapeCSV(product.category[0].name)
            : 'Apparel & Accessories');
      
      // Item group ID (for variants - use first 3 letters of category + group number)
      const categoryPrefix = product.category && product.category.length > 0 
        ? product.category[0].name.substring(0, 3).toLowerCase().replace(/[^a-z]/g, '')
        : 'gen';
      const groupNumber = Math.floor(index / 5) + 1; // Group every 5 products
      const item_group_id = `group_${categoryPrefix}_${groupNumber}`;
      
      // Create CSV row
      return [
        id,
        title,
        description,
        availability,
        condition,
        price,
        link,
        image_link,
        brand,
        google_pr_ctgn,
        item_group_id
      ].join(',');
    });

    // Combine header and rows
    const csvContent = [header, ...rows].join('\n');

    // Write to CSV file
    const outputPath = path.join(__dirname, 'facebook-product-catalog.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log('✅ Catalog exported successfully!');
    console.log(`📁 File location: ${outputPath}`);
    console.log(`📊 Total products exported: ${products.length}`);
    console.log(`💾 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

    // Generate summary
    const summary = {
      totalProducts: products.length,
      exportDate: new Date().toISOString(),
      fileSize: `${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`,
      filePath: outputPath
    };

    // Save summary JSON
    const summaryPath = path.join(__dirname, 'export-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`📋 Export summary saved: ${summaryPath}`);

  } catch (error) {
    console.error('❌ Error exporting products:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    console.log('🚀 Starting Facebook Catalog Export...\n');
    
    await connectDB();
    await exportProductsCatalog();
    
    console.log('\n✨ Export completed successfully!');
    console.log('📤 Upload the CSV file to Facebook Business Manager > Catalog > Data Sources');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    process.exit(1);
  }
};

// Run the script
main();
