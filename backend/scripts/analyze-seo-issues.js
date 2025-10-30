// Comprehensive SEO Analysis Script for International Tijarat
// This script analyzes all SEO-related issues across the website

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const UsedProduct = require('../models/UsedProduct');
const Property = require('../models/Property');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ehtisham:ehtisham123@internationaltijaratnew.6oxhrwv.mongodb.net/internationalTijaratDB?retryWrites=true&w=majority&appName=internationalTijaratNew';

const seoIssues = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  recommendations: []
};

async function analyzeSEO() {
  try {
    console.log('🔍 Starting comprehensive SEO analysis...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Analyze Products
    await analyzeProducts();
    
    // 2. Analyze Categories
    await analyzeCategories();
    
    // 3. Analyze Used Products
    await analyzeUsedProducts();
    
    // 4. Analyze Properties
    await analyzeProperties();
    
    // 5. Generate Report
    generateReport();
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await mongoose.disconnect();
  }
}

async function analyzeProducts() {
  console.log('📦 Analyzing Products...');
  
  const products = await Product.find({});
  const total = products.length;
  
  let missingSlug = 0;
  let missingMetaTitle = 0;
  let missingMetaDescription = 0;
  let missingSEOKeywords = 0;
  let missingAltText = 0;
  let longMetaTitle = 0;
  let longMetaDescription = 0;
  let shortMetaDescription = 0;
  let missingImages = 0;
  let duplicateSlugs = {};
  
  products.forEach(product => {
    // Missing fields
    if (!product.slug) missingSlug++;
    if (!product.metaTitle) missingMetaTitle++;
    if (!product.metaDescription) missingMetaDescription++;
    if (!product.seoKeywords || product.seoKeywords.length === 0) missingSEOKeywords++;
    if (!product.altText && ((product.images && product.images.length > 0) || product.image)) missingAltText++;
    // Check if product has NO real images (neither images array nor single image field)
    const hasRealImage = (product.images && product.images.length > 0) || 
                         (product.image && product.image !== 'placeholder-image.jpg' && product.image !== '');
    if (!hasRealImage) missingImages++;
    
    // Meta title length issues
    if (product.metaTitle && product.metaTitle.length > 60) longMetaTitle++;
    
    // Meta description length issues
    if (product.metaDescription) {
      if (product.metaDescription.length > 160) longMetaDescription++;
      if (product.metaDescription.length < 50) shortMetaDescription++;
    }
    
    // Duplicate slugs tracking
    if (product.slug) {
      if (!duplicateSlugs[product.slug]) {
        duplicateSlugs[product.slug] = [];
      }
      duplicateSlugs[product.slug].push(product._id);
    }
  });
  
  // Find actual duplicates
  const actualDuplicates = Object.keys(duplicateSlugs).filter(slug => duplicateSlugs[slug].length > 1);
  
  // Add to issues
  if (missingSlug > 0) {
    seoIssues.critical.push({
      category: 'Products',
      issue: 'Missing SEO-friendly slugs',
      count: missingSlug,
      impact: 'URLs will use database IDs instead of readable text, hurting SEO',
      fix: 'Run bulk optimization script to generate slugs'
    });
  }
  
  if (missingMetaTitle > 0) {
    seoIssues.high.push({
      category: 'Products',
      issue: 'Missing meta titles',
      count: missingMetaTitle,
      impact: 'Search engines will use generic page titles',
      fix: 'Generate meta titles from product names'
    });
  }
  
  if (missingMetaDescription > 0) {
    seoIssues.high.push({
      category: 'Products',
      issue: 'Missing meta descriptions',
      count: missingMetaDescription,
      impact: 'Poor search result snippets, lower click-through rates',
      fix: 'Generate descriptions from product details'
    });
  }
  
  if (missingSEOKeywords > 0) {
    seoIssues.medium.push({
      category: 'Products',
      issue: 'Missing SEO keywords',
      count: missingSEOKeywords,
      impact: 'Reduced discoverability in search engines',
      fix: 'Extract keywords from titles and descriptions'
    });
  }
  
  if (missingAltText > 0) {
    seoIssues.medium.push({
      category: 'Products',
      issue: 'Missing image alt text',
      count: missingAltText,
      impact: 'Poor image SEO and accessibility issues',
      fix: 'Generate alt text from product names'
    });
  }
  
  if (longMetaTitle > 0) {
    seoIssues.medium.push({
      category: 'Products',
      issue: 'Meta titles too long (>60 chars)',
      count: longMetaTitle,
      impact: 'Titles get truncated in search results',
      fix: 'Shorten meta titles to 60 characters or less'
    });
  }
  
  if (longMetaDescription > 0) {
    seoIssues.low.push({
      category: 'Products',
      issue: 'Meta descriptions too long (>160 chars)',
      count: longMetaDescription,
      impact: 'Descriptions get truncated in search results',
      fix: 'Shorten descriptions to 160 characters'
    });
  }
  
  if (shortMetaDescription > 0) {
    seoIssues.low.push({
      category: 'Products',
      issue: 'Meta descriptions too short (<50 chars)',
      count: shortMetaDescription,
      impact: 'Not enough information in search snippets',
      fix: 'Expand descriptions to 50-160 characters'
    });
  }
  
  if (missingImages > 0) {
    seoIssues.medium.push({
      category: 'Products',
      issue: 'Products without images',
      count: missingImages,
      impact: 'Poor user experience and lower conversion rates',
      fix: 'Add product images'
    });
  }
  
  if (actualDuplicates.length > 0) {
    seoIssues.critical.push({
      category: 'Products',
      issue: 'Duplicate slugs detected',
      count: actualDuplicates.length,
      impact: 'URL conflicts and indexing problems',
      fix: 'Make slugs unique by appending numbers or regenerating',
      details: actualDuplicates.slice(0, 5).join(', ') + (actualDuplicates.length > 5 ? '...' : '')
    });
  }
  
  console.log(`✅ Analyzed ${total} products`);
  console.log(`   - ${missingSlug} missing slugs`);
  console.log(`   - ${missingMetaTitle} missing meta titles`);
  console.log(`   - ${missingMetaDescription} missing meta descriptions`);
  console.log(`   - ${actualDuplicates.length} duplicate slugs\n`);
}

async function analyzeCategories() {
  console.log('📁 Analyzing Categories...');
  
  const categories = await Category.find({});
  const total = categories.length;
  
  if (total === 0) {
    seoIssues.critical.push({
      category: 'Categories',
      issue: 'No categories found in database',
      count: 0,
      impact: 'Cannot organize products or create category pages',
      fix: 'Create category structure and assign products to categories'
    });
    console.log('⚠️  No categories found in database!\n');
    return;
  }
  
  let missingSlug = 0;
  let missingMetaTitle = 0;
  let missingMetaDescription = 0;
  let missingSEOKeywords = 0;
  let missingDescription = 0;
  
  categories.forEach(category => {
    if (!category.slug) missingSlug++;
    if (!category.metaTitle) missingMetaTitle++;
    if (!category.metaDescription) missingMetaDescription++;
    if (!category.seoKeywords || category.seoKeywords.length === 0) missingSEOKeywords++;
    if (!category.description) missingDescription++;
  });
  
  if (missingSlug > 0) {
    seoIssues.critical.push({
      category: 'Categories',
      issue: 'Missing SEO-friendly slugs',
      count: missingSlug,
      impact: 'Category URLs will use database IDs',
      fix: 'Generate slugs from category names'
    });
  }
  
  if (missingMetaTitle > 0) {
    seoIssues.high.push({
      category: 'Categories',
      issue: 'Missing meta titles',
      count: missingMetaTitle,
      impact: 'Poor category page titles in search results',
      fix: 'Generate optimized meta titles'
    });
  }
  
  if (missingMetaDescription > 0) {
    seoIssues.high.push({
      category: 'Categories',
      issue: 'Missing meta descriptions',
      count: missingMetaDescription,
      impact: 'Generic category descriptions in search results',
      fix: 'Create compelling descriptions for each category'
    });
  }
  
  if (missingDescription > 0) {
    seoIssues.medium.push({
      category: 'Categories',
      issue: 'Missing category descriptions',
      count: missingDescription,
      impact: 'No content for category pages',
      fix: 'Add descriptive content to category pages'
    });
  }
  
  console.log(`✅ Analyzed ${total} categories`);
  console.log(`   - ${missingSlug} missing slugs`);
  console.log(`   - ${missingMetaTitle} missing meta titles`);
  console.log(`   - ${missingMetaDescription} missing meta descriptions\n`);
}

async function analyzeUsedProducts() {
  console.log('🔄 Analyzing Used Products...');
  
  const usedProducts = await UsedProduct.find({});
  const total = usedProducts.length;
  const approved = usedProducts.filter(p => p.isApproved && p.status === 'approved').length;
  
  console.log(`✅ Found ${total} used products (${approved} approved)\n`);
  
  if (total > 0 && approved === 0) {
    seoIssues.medium.push({
      category: 'Used Products',
      issue: 'No approved used products',
      count: total,
      impact: 'Used products not visible in sitemap or search',
      fix: 'Review and approve pending used product listings'
    });
  }
}

async function analyzeProperties() {
  console.log('🏠 Analyzing Properties...');
  
  const properties = await Property.find({});
  const total = properties.length;
  const approved = properties.filter(p => p.isApproved && p.status === 'approved').length;
  
  console.log(`✅ Found ${total} properties (${approved} approved)\n`);
  
  if (total > 0 && approved === 0) {
    seoIssues.medium.push({
      category: 'Properties',
      issue: 'No approved properties',
      count: total,
      impact: 'Properties not visible in sitemap or search',
      fix: 'Review and approve pending property listings'
    });
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE SEO ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');
  
  // Critical Issues
  if (seoIssues.critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES (Fix Immediately):');
    console.log('-'.repeat(80));
    seoIssues.critical.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.issue}`);
      console.log(`   Count: ${issue.count}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Fix: ${issue.fix}`);
      if (issue.details) console.log(`   Details: ${issue.details}`);
      console.log('');
    });
  }
  
  // High Priority Issues
  if (seoIssues.high.length > 0) {
    console.log('⚠️  HIGH PRIORITY ISSUES:');
    console.log('-'.repeat(80));
    seoIssues.high.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.issue}`);
      console.log(`   Count: ${issue.count}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Fix: ${issue.fix}`);
      console.log('');
    });
  }
  
  // Medium Priority Issues
  if (seoIssues.medium.length > 0) {
    console.log('📝 MEDIUM PRIORITY ISSUES:');
    console.log('-'.repeat(80));
    seoIssues.medium.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.issue}`);
      console.log(`   Count: ${issue.count}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Fix: ${issue.fix}`);
      console.log('');
    });
  }
  
  // Low Priority Issues
  if (seoIssues.low.length > 0) {
    console.log('ℹ️  LOW PRIORITY ISSUES:');
    console.log('-'.repeat(80));
    seoIssues.low.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.issue}`);
      console.log(`   Count: ${issue.count}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Fix: ${issue.fix}`);
      console.log('');
    });
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY:');
  console.log(`  Critical Issues: ${seoIssues.critical.length}`);
  console.log(`  High Priority: ${seoIssues.high.length}`);
  console.log(`  Medium Priority: ${seoIssues.medium.length}`);
  console.log(`  Low Priority: ${seoIssues.low.length}`);
  console.log(`  Total Issues: ${seoIssues.critical.length + seoIssues.high.length + seoIssues.medium.length + seoIssues.low.length}`);
  console.log('='.repeat(80) + '\n');
  
  // Additional Recommendations
  console.log('💡 ADDITIONAL SEO RECOMMENDATIONS:\n');
  console.log('1. Set up Google Search Console and submit sitemap');
  console.log('2. Implement structured data (Schema.org) on all pages ✅ (Already implemented)');
  console.log('3. Ensure all images are compressed and optimized');
  console.log('4. Add canonical URLs to prevent duplicate content ✅ (Already implemented)');
  console.log('5. Implement Open Graph tags for social sharing ✅ (Already implemented)');
  console.log('6. Create a comprehensive internal linking strategy');
  console.log('7. Add breadcrumbs to all pages ✅ (Already implemented)');
  console.log('8. Ensure mobile-friendliness and page speed optimization');
  console.log('9. Create and submit robots.txt ✅ (Already implemented)');
  console.log('10. Monitor Core Web Vitals in Google Search Console\n');
}

// Run analysis
analyzeSEO();
