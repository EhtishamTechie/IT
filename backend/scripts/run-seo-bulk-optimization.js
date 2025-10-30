/**
 * Bulk SEO Optimization Script
 * 
 * This script runs bulk SEO optimization on all products and categories
 * to generate missing slugs, meta titles, meta descriptions, and SEO keywords.
 * 
 * Run this script to ensure all products have proper SEO data.
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function runBulkOptimization() {
  try {
    console.log('🚀 Starting SEO Bulk Optimization...\n');
    
    // Step 1: Optimize Products
    console.log('📦 Step 1: Optimizing Products...');
    try {
      const productResponse = await axios.post(`${API_URL}/api/seo/products/bulk-optimize`);
      console.log('✅ Products optimized:');
      console.log(`   Total Products: ${productResponse.data.totalProducts}`);
      console.log(`   Optimized: ${productResponse.data.optimizedCount}`);
      console.log(`   Message: ${productResponse.data.message}\n`);
    } catch (error) {
      console.error('❌ Error optimizing products:', error.response?.data || error.message);
    }
    
    // Step 2: Optimize Categories
    console.log('📁 Step 2: Optimizing Categories...');
    try {
      const categoryResponse = await axios.post(`${API_URL}/api/seo/categories/bulk-optimize`);
      console.log('✅ Categories optimized:');
      console.log(`   Total Categories: ${categoryResponse.data.totalCategories}`);
      console.log(`   Optimized: ${categoryResponse.data.optimizedCount}`);
      console.log(`   Message: ${categoryResponse.data.message}\n`);
    } catch (error) {
      console.error('❌ Error optimizing categories:', error.response?.data || error.message);
    }
    
    // Step 3: Check SEO Health
    console.log('🏥 Step 3: Checking SEO Health...');
    try {
      const healthResponse = await axios.get(`${API_URL}/api/seo/health`);
      console.log('✅ SEO Health Report:');
      console.log('\n📦 Products:');
      console.log(`   Total: ${healthResponse.data.products.total}`);
      console.log(`   Slugs: ${healthResponse.data.products.seoOptimized.slugs}`);
      console.log(`   Meta Titles: ${healthResponse.data.products.seoOptimized.metaTitles}`);
      console.log(`   Meta Descriptions: ${healthResponse.data.products.seoOptimized.metaDescriptions}`);
      
      console.log('\n📁 Categories:');
      console.log(`   Total: ${healthResponse.data.categories.total}`);
      console.log(`   Slugs: ${healthResponse.data.categories.seoOptimized.slugs}`);
      console.log(`   Meta Titles: ${healthResponse.data.categories.seoOptimized.metaTitles}`);
      console.log(`   Meta Descriptions: ${healthResponse.data.categories.seoOptimized.metaDescriptions}\n`);
    } catch (error) {
      console.error('❌ Error checking SEO health:', error.response?.data || error.message);
    }
    
    // Step 4: Test Sitemap Generation
    console.log('🗺️  Step 4: Testing Sitemap Generation...');
    try {
      const sitemapResponse = await axios.get(`${API_URL}/api/seo/sitemap.xml`);
      const urlCount = (sitemapResponse.data.match(/<url>/g) || []).length;
      const imageCount = (sitemapResponse.data.match(/<image:image>/g) || []).length;
      
      console.log('✅ Sitemap generated successfully:');
      console.log(`   Total URLs: ${urlCount}`);
      console.log(`   Total Images: ${imageCount}`);
      console.log(`   Size: ${(sitemapResponse.data.length / 1024).toFixed(2)} KB\n`);
    } catch (error) {
      console.error('❌ Error testing sitemap:', error.response?.data || error.message);
    }
    
    console.log('✅ SEO Bulk Optimization Complete!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Run the category typo fix: node backend/scripts/fix-category-typo.js');
    console.log('   2. Test sitemap: Visit http://localhost:5000/api/seo/sitemap.xml');
    console.log('   3. Submit sitemap to Google Search Console');
    console.log('   4. Monitor SEO health regularly\n');
    
  } catch (error) {
    console.error('❌ Fatal error during bulk optimization:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  runBulkOptimization();
}

module.exports = runBulkOptimization;
