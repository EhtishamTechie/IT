/**
 * Facebook Catalog Export Script (Simplified)
 * 
 * This script uses the backend's database connection to export products.
 * 
 * Usage:
 *   node catalogue/export-catalog-simple.js
 */

const path = require('path');

// Load environment variables from backend
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Use backend's database connection
const connectDB = require('../backend/config/database');
const Product = require('../backend/models/Product');
const Category = require('../backend/models/Category'); // Load Category model

const fs = require('fs');

// Escape CSV fields
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Clean description
const cleanDescription = (description) => {
  if (!description) return '';
  let clean = description.replace(/<[^>]*>/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  if (clean.length > 5000) {
    clean = clean.substring(0, 4997) + '...';
  }
  return clean;
};

// Main export function
const exportCatalog = async () => {
  try {
    console.log('🚀 Starting Facebook Catalog Export...\n');
    
    // Connect to database
    await connectDB();
    
    console.log('🔍 Fetching products from database...');
    
    // Get products with category information
    const products = await Product.find({
      isActive: true,
      isVisible: true
    })
    .populate('category', 'name _id')
    .populate('mainCategory', 'name _id')
    .select('_id title description price originalPrice discount image images brand slug category mainCategory')
    .lean();

    console.log(`📦 Found ${products.length} products\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found. Exiting.');
      process.exit(0);
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';

    // Create CSV
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
      'google_pr_ctgn',
      'item_group_id'
    ].join(',');

    const rows = products.map((product, index) => {
      const id = `prod_${product._id}`;
      const title = escapeCSV(product.title.substring(0, 150));
      const description = escapeCSV(cleanDescription(product.description));
      const availability = 'in stock';
      const condition = 'new';
      
      const finalPrice = product.discount > 0 && product.originalPrice 
        ? product.originalPrice - (product.originalPrice * product.discount / 100)
        : product.price;
      const price = `${finalPrice.toFixed(2)} USD`;
      
      const productPath = product.slug || product._id;
      const link = escapeCSV(`https://m.internationaltijarat.com/product/${productPath}`);
      
      const imageFile = product.images && product.images.length > 0 
        ? product.images[0] 
        : product.image;
      const image_link = escapeCSV(`${baseUrl}/uploads/products/${imageFile}`);
      
      const brand = escapeCSV(product.brand || 'International Tijarat');
      
      // Use actual category name from mainCategory or category
      let categoryName = 'Apparel & Accessories'; // Default
      let categoryId = 'general';
      
      if (product.mainCategory && product.mainCategory.length > 0) {
        categoryName = product.mainCategory[0].name;
        categoryId = product.mainCategory[0]._id.toString();
      } else if (product.category && product.category.length > 0) {
        categoryName = product.category[0].name;
        categoryId = product.category[0]._id.toString();
      }
      
      const google_pr_ctgn = escapeCSV(categoryName);
      const item_group_id = `group_${categoryId}`;
      
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

    const csvContent = [header, ...rows].join('\n');

    // Write CSV with timestamp to avoid file lock issues
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputPath = path.join(__dirname, `facebook-product-catalog.csv`);
    
    // Delete old file if exists and not locked
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (err) {
      // If locked, use timestamped filename
      const outputPathAlt = path.join(__dirname, `facebook-product-catalog-${timestamp}.csv`);
      fs.writeFileSync(outputPathAlt, csvContent, 'utf8');
      console.log('✅ Catalog exported successfully!');
      console.log(`📁 File: ${outputPathAlt}`);
      console.log(`📊 Products: ${products.length}`);
      console.log(`💾 Size: ${(fs.statSync(outputPathAlt).size / 1024).toFixed(2)} KB\n`);
      
      const summary = {
        totalProducts: products.length,
        exportDate: new Date().toISOString(),
        fileSize: `${(fs.statSync(outputPathAlt).size / 1024).toFixed(2)} KB`,
        filePath: outputPathAlt
      };
      const summaryPath = path.join(__dirname, 'export-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📋 Summary: ${summaryPath}\n`);
      console.log('✨ Export completed successfully!');
      console.log('📤 Upload to Facebook Business Manager > Catalog > Data Sources\n');
      process.exit(0);
    }
    
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log('✅ Catalog exported successfully!');
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Products: ${products.length}`);
    console.log(`💾 Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

    // Save summary
    const summary = {
      totalProducts: products.length,
      exportDate: new Date().toISOString(),
      fileSize: `${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`,
      filePath: outputPath
    };

    const summaryPath = path.join(__dirname, 'export-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📋 Summary: ${summaryPath}\n`);

    console.log('✨ Export completed successfully!');
    console.log('📤 Upload to Facebook Business Manager > Catalog > Data Sources\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run
exportCatalog();
