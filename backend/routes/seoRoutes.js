const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const UsedProduct = require('../models/UsedProduct');
const Property = require('../models/Property');
const { generateSitemapEntry, generateSlug } = require('../utils/seoUtils');

// Generate XML sitemap for products and categories
router.get('/sitemap.xml', async (req, res) => {
  try {
    console.log('🗺️ [SITEMAP] Generating XML sitemap');
    
    const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';
    
    // Helper function to validate and sanitize dates
    const getValidDate = (date) => {
      const now = new Date();
      const inputDate = date ? new Date(date) : now;
      
      // If date is in the future or invalid, use current date
      if (isNaN(inputDate.getTime()) || inputDate > now) {
        console.warn(`⚠️ [SITEMAP] Invalid or future date detected: ${date}, using current date`);
        return now.toISOString();
      }
      
      return inputDate.toISOString();
    };
    
    // Helper function to escape XML special characters
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    // Get all active products - include both slug and _id for flexibility
    const products = await Product.find({ 
      isActive: true, 
      isVisible: true
    }).select('_id slug title updatedAt images image');
    
    // Get all active categories with slugs
    const categories = await Category.find({ 
      isActive: true
    }).select('_id slug name updatedAt');
    
    // Get active used products
    const usedProducts = await UsedProduct.find({
      isApproved: true,
      status: 'approved'
    }).select('_id title updatedAt images');
    
    // Get active properties
    const properties = await Property.find({
      isApproved: true,
      status: 'approved'
    }).select('_id title updatedAt images');
    
    // Start XML sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add homepage
    const currentDate = getValidDate(new Date());
    sitemap += `  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

    // Add comprehensive static pages
    const staticPages = [
      { path: '/products', changefreq: 'daily', priority: '0.9' },
      { path: '/used-products', changefreq: 'daily', priority: '0.8' },
      { path: '/properties', changefreq: 'daily', priority: '0.8' },
      { path: '/sell-used-product', changefreq: 'monthly', priority: '0.5' },
      { path: '/sell-property', changefreq: 'monthly', priority: '0.5' },
      { path: '/contact-wholeseller', changefreq: 'monthly', priority: '0.6' },
      { path: '/ContactUsPage', changefreq: 'monthly', priority: '0.6' },
      { path: '/about', changefreq: 'monthly', priority: '0.6' },
      { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
      { path: '/terms', changefreq: 'yearly', priority: '0.3' }
    ];

    staticPages.forEach(page => {
      sitemap += `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    });

    // Add category pages
    categories.forEach(category => {
      // Use slug if available, otherwise use _id
      const categoryPath = category.slug || category._id;
      const lastmod = getValidDate(category.updatedAt);
      
      sitemap += `  <url>
    <loc>${escapeXml(`${baseUrl}/category-group/${categoryPath}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    });

    // Add product pages with images
    products.forEach(product => {
      // Use slug if available, otherwise fall back to _id
      const productPath = product.slug || product._id;
      const lastmod = getValidDate(product.updatedAt);
      
      sitemap += `  <url>
    <loc>${escapeXml(`${baseUrl}/product/${productPath}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;
    
      // Add ALL product images to sitemap (not just some)
      const productImages = product.images && product.images.length > 0 
        ? product.images 
        : (product.image ? [product.image] : []);
      
      if (productImages.length > 0) {
        productImages.forEach(image => {
          // Skip if image is placeholder or empty
          if (image && image !== 'placeholder-image.jpg') {
            sitemap += `
    <image:image>
      <image:loc>${escapeXml(baseUrl + '/uploads/products/' + image)}</image:loc>
      <image:title>${escapeXml(product.title)}</image:title>
    </image:image>`;
          }
        });
      }
      
      sitemap += `
  </url>
`;
    });
    
    // Add used product pages
    usedProducts.forEach(usedProduct => {
      const lastmod = getValidDate(usedProduct.updatedAt);
      
      sitemap += `  <url>
    <loc>${escapeXml(`${baseUrl}/used-product/${usedProduct._id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;
    
      // Add used product images
      if (usedProduct.images && usedProduct.images.length > 0) {
        usedProduct.images.forEach(image => {
          if (image) {
            sitemap += `
    <image:image>
      <image:loc>${escapeXml(baseUrl + '/uploads/used-products/' + image)}</image:loc>
      <image:title>${escapeXml(usedProduct.title)}</image:title>
    </image:image>`;
          }
        });
      }
      
      sitemap += `
  </url>
`;
    });
    
    // Add property pages
    properties.forEach(property => {
      const lastmod = getValidDate(property.updatedAt);
      
      sitemap += `  <url>
    <loc>${escapeXml(`${baseUrl}/property/${property._id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;
    
      // Add property images
      if (property.images && property.images.length > 0) {
        property.images.forEach(image => {
          if (image) {
            sitemap += `
    <image:image>
      <image:loc>${escapeXml(baseUrl + '/uploads/properties/' + image)}</image:loc>
      <image:title>${escapeXml(property.title)}</image:title>
    </image:image>`;
          }
        });
      }
      
      sitemap += `
  </url>
`;
    });

    // Close sitemap
    sitemap += `</urlset>`;

    // Set proper headers for XML
    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(sitemap);
    
    console.log('✅ [SITEMAP] Generated successfully:', {
      products: products.length,
      categories: categories.length,
      usedProducts: usedProducts.length,
      properties: properties.length,
      staticPages: staticPages.length,
      total: products.length + categories.length + usedProducts.length + properties.length + staticPages.length + 1
    });
    
  } catch (error) {
    console.error('❌ [SITEMAP] Error generating sitemap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sitemap',
      error: error.message
    });
  }
});

// Generate robots.txt
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';
  
  const robots = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/api/seo/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Disallow admin areas
Disallow: /admin/
Disallow: /vendor/
Disallow: /api/
Disallow: /uploads/
Disallow: /private/

# Allow important pages
Allow: /product/
Allow: /category-group/
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /terms
`;

  res.set({
    'Content-Type': 'text/plain',
    'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
  });

  res.send(robots);
});

// SEO health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Count products and categories with and without SEO data
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withSlugs: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$slug', null] }, { $ne: ['$slug', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaTitle: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaTitle', null] }, { $ne: ['$metaTitle', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaDescription: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaDescription', null] }, { $ne: ['$metaDescription', ''] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const categoryStats = await Category.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withSlugs: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$slug', null] }, { $ne: ['$slug', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaTitle: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaTitle', null] }, { $ne: ['$metaTitle', ''] }] },
                1,
                0
              ]
            }
          },
          withMetaDescription: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$metaDescription', null] }, { $ne: ['$metaDescription', ''] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const productHealth = productStats[0] || { total: 0, withSlugs: 0, withMetaTitle: 0, withMetaDescription: 0 };
    const categoryHealth = categoryStats[0] || { total: 0, withSlugs: 0, withMetaTitle: 0, withMetaDescription: 0 };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      products: {
        total: productHealth.total,
        seoOptimized: {
          slugs: `${productHealth.withSlugs}/${productHealth.total} (${Math.round((productHealth.withSlugs / productHealth.total) * 100) || 0}%)`,
          metaTitles: `${productHealth.withMetaTitle}/${productHealth.total} (${Math.round((productHealth.withMetaTitle / productHealth.total) * 100) || 0}%)`,
          metaDescriptions: `${productHealth.withMetaDescription}/${productHealth.total} (${Math.round((productHealth.withMetaDescription / productHealth.total) * 100) || 0}%)`
        }
      },
      categories: {
        total: categoryHealth.total,
        seoOptimized: {
          slugs: `${categoryHealth.withSlugs}/${categoryHealth.total} (${Math.round((categoryHealth.withSlugs / categoryHealth.total) * 100) || 0}%)`,
          metaTitles: `${categoryHealth.withMetaTitle}/${categoryHealth.total} (${Math.round((categoryHealth.withMetaTitle / categoryHealth.total) * 100) || 0}%)`,
          metaDescriptions: `${categoryHealth.withMetaDescription}/${categoryHealth.total} (${Math.round((categoryHealth.withMetaDescription / categoryHealth.total) * 100) || 0}%)`
        }
      }
    });
  } catch (error) {
    console.error('❌ [SEO HEALTH] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check SEO health',
      error: error.message
    });
  }
});

// Product SEO Analysis for Dashboard
router.get('/products/analyze', async (req, res) => {
  try {
    const products = await Product.find({}, {
      name: 1,
      slug: 1,
      metaTitle: 1,
      metaDescription: 1,
      seoKeywords: 1,
      altText: 1,
      images: 1,
      updatedAt: 1
    });

    const total = products.length;
    let optimized = 0;
    const analyzedProducts = [];

    products.forEach(product => {
      const analysis = analyzeProductSEO(product);
      analyzedProducts.push({
        _id: product._id,
        name: product.name,
        slug: product.slug,
        seoScore: analysis.score,
        issues: analysis.issues,
        updatedAt: product.updatedAt
      });
      
      if (analysis.score >= 80) {
        optimized++;
      }
    });

    // Sort by SEO score (lowest first to highlight issues)
    analyzedProducts.sort((a, b) => a.seoScore - b.seoScore);

    // Generate overall issues
    const issues = generateProductIssues(analyzedProducts);

    res.json({
      total,
      optimized,
      products: analyzedProducts,
      issues
    });
  } catch (error) {
    console.error('Error analyzing products SEO:', error);
    res.status(500).json({ error: 'Failed to analyze products SEO' });
  }
});

// Category SEO Analysis for Dashboard
router.get('/categories/analyze', async (req, res) => {
  try {
    const categories = await Category.find({}, {
      name: 1,
      slug: 1,
      metaTitle: 1,
      metaDescription: 1,
      seoKeywords: 1,
      description: 1,
      updatedAt: 1
    });

    // Get product counts for each category
    const categoryProductCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const productCountMap = {};
    categoryProductCounts.forEach(item => {
      productCountMap[item._id] = item.count;
    });

    const total = categories.length;
    let optimized = 0;
    const analyzedCategories = [];

    categories.forEach(category => {
      const analysis = analyzeCategorySEO(category);
      analyzedCategories.push({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        seoScore: analysis.score,
        issues: analysis.issues,
        productCount: productCountMap[category.name] || 0,
        updatedAt: category.updatedAt
      });
      
      if (analysis.score >= 80) {
        optimized++;
      }
    });

    // Sort by SEO score (lowest first to highlight issues)
    analyzedCategories.sort((a, b) => a.seoScore - b.seoScore);

    // Generate overall issues
    const issues = generateCategoryIssues(analyzedCategories);

    res.json({
      total,
      optimized,
      categories: analyzedCategories,
      issues
    });
  } catch (error) {
    console.error('Error analyzing categories SEO:', error);
    res.status(500).json({ error: 'Failed to analyze categories SEO' });
  }
});

// Bulk optimize products
router.post('/products/bulk-optimize', async (req, res) => {
  try {
    const products = await Product.find({});
    const updates = [];

    for (const product of products) {
      const updates_needed = {};
      let hasUpdates = false;

      // Generate slug if missing
      if (!product.slug && product.name) {
        updates_needed.slug = generateSlug(product.name);
        hasUpdates = true;
      }

      // Generate meta title if missing
      if (!product.metaTitle && product.name) {
        updates_needed.metaTitle = `${product.name} - Buy Online | International Tijarat`;
        hasUpdates = true;
      }

      // Generate meta description if missing
      if (!product.metaDescription && product.description) {
        const desc = product.description.replace(/<[^>]*>/g, '').substring(0, 150);
        updates_needed.metaDescription = `${desc}... Shop now at International Tijarat with fast delivery and best prices.`;
        hasUpdates = true;
      }

      // Generate SEO keywords if missing
      if (!product.seoKeywords && product.name) {
        const keywords = generateSEOKeywords(product.name, product.category, product.subcategory);
        updates_needed.seoKeywords = keywords;
        hasUpdates = true;
      }

      // Generate alt text for images if missing
      if (product.images && product.images.length > 0 && !product.altText) {
        updates_needed.altText = `${product.name} - High quality product image showing details and features`;
        hasUpdates = true;
      }

      if (hasUpdates) {
        updates.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: updates_needed }
          }
        });
      }
    }

    if (updates.length > 0) {
      await Product.bulkWrite(updates);
    }

    res.json({
      message: `Successfully optimized ${updates.length} products`,
      optimizedCount: updates.length,
      totalProducts: products.length
    });
  } catch (error) {
    console.error('Error in bulk product optimization:', error);
    res.status(500).json({ error: 'Failed to bulk optimize products' });
  }
});

// Bulk optimize categories
router.post('/categories/bulk-optimize', async (req, res) => {
  try {
    const categories = await Category.find({});
    const updates = [];

    for (const category of categories) {
      const updates_needed = {};
      let hasUpdates = false;

      // Generate slug if missing
      if (!category.slug && category.name) {
        updates_needed.slug = generateSlug(category.name);
        hasUpdates = true;
      }

      // Generate meta title if missing
      if (!category.metaTitle && category.name) {
        updates_needed.metaTitle = `${category.name} Products - Shop Online | International Tijarat`;
        hasUpdates = true;
      }

      // Generate meta description if missing
      if (!category.metaDescription && category.name) {
        updates_needed.metaDescription = `Explore our wide range of ${category.name.toLowerCase()} products. Quality guaranteed, competitive prices, and fast delivery. Shop now at International Tijarat.`;
        hasUpdates = true;
      }

      // Generate SEO keywords if missing
      if (!category.seoKeywords && category.name) {
        const keywords = generateCategorySEOKeywords(category.name);
        updates_needed.seoKeywords = keywords;
        hasUpdates = true;
      }

      if (hasUpdates) {
        updates.push({
          updateOne: {
            filter: { _id: category._id },
            update: { $set: updates_needed }
          }
        });
      }
    }

    if (updates.length > 0) {
      await Category.bulkWrite(updates);
    }

    res.json({
      message: `Successfully optimized ${updates.length} categories`,
      optimizedCount: updates.length,
      totalCategories: categories.length
    });
  } catch (error) {
    console.error('Error in bulk category optimization:', error);
    res.status(500).json({ error: 'Failed to bulk optimize categories' });
  }
});

// Helper Functions for SEO Analysis
function analyzeProductSEO(product) {
  let score = 0;
  const issues = [];
  const maxScore = 100;

  // Slug check (20 points)
  if (product.slug) {
    score += 20;
  } else {
    issues.push({ severity: 'high', message: 'Missing SEO-friendly URL slug' });
  }

  // Meta title check (20 points)
  if (product.metaTitle) {
    score += 20;
    if (product.metaTitle.length > 60) {
      issues.push({ severity: 'medium', message: 'Meta title too long (>60 chars)' });
    }
  } else {
    issues.push({ severity: 'high', message: 'Missing meta title' });
  }

  // Meta description check (20 points)
  if (product.metaDescription) {
    score += 20;
    if (product.metaDescription.length > 160) {
      issues.push({ severity: 'medium', message: 'Meta description too long (>160 chars)' });
    }
  } else {
    issues.push({ severity: 'high', message: 'Missing meta description' });
  }

  // SEO keywords check (15 points)
  if (product.seoKeywords && product.seoKeywords.length > 0) {
    score += 15;
  } else {
    issues.push({ severity: 'medium', message: 'Missing SEO keywords' });
  }

  // Image alt text check (15 points)
  if (product.altText) {
    score += 15;
  } else if (product.images && product.images.length > 0) {
    issues.push({ severity: 'medium', message: 'Missing image alt text' });
  }

  // Image optimization check (10 points)
  if (product.images && product.images.length > 0) {
    score += 10;
  } else {
    issues.push({ severity: 'low', message: 'No product images' });
  }

  return { score: Math.min(score, maxScore), issues };
}

function analyzeCategorySEO(category) {
  let score = 0;
  const issues = [];
  const maxScore = 100;

  // Slug check (25 points)
  if (category.slug) {
    score += 25;
  } else {
    issues.push({ severity: 'high', message: 'Missing SEO-friendly URL slug' });
  }

  // Meta title check (25 points)
  if (category.metaTitle) {
    score += 25;
    if (category.metaTitle.length > 60) {
      issues.push({ severity: 'medium', message: 'Meta title too long (>60 chars)' });
    }
  } else {
    issues.push({ severity: 'high', message: 'Missing meta title' });
  }

  // Meta description check (25 points)
  if (category.metaDescription) {
    score += 25;
    if (category.metaDescription.length > 160) {
      issues.push({ severity: 'medium', message: 'Meta description too long (>160 chars)' });
    }
  } else {
    issues.push({ severity: 'high', message: 'Missing meta description' });
  }

  // SEO keywords check (15 points)
  if (category.seoKeywords && category.seoKeywords.length > 0) {
    score += 15;
  } else {
    issues.push({ severity: 'medium', message: 'Missing SEO keywords' });
  }

  // Description check (10 points)
  if (category.description) {
    score += 10;
  } else {
    issues.push({ severity: 'low', message: 'Missing category description' });
  }

  return { score: Math.min(score, maxScore), issues };
}

function generateProductIssues(products) {
  const issues = [];
  
  const lowScoreProducts = products.filter(p => p.seoScore < 60);
  if (lowScoreProducts.length > 0) {
    issues.push({
      type: 'products',
      severity: 'high',
      title: 'Low SEO Score Products',
      description: `${lowScoreProducts.length} products have SEO scores below 60%`
    });
  }

  const noSlugProducts = products.filter(p => p.issues.some(i => i.message.includes('slug')));
  if (noSlugProducts.length > 0) {
    issues.push({
      type: 'products',
      severity: 'high',
      title: 'Missing Product Slugs',
      description: `${noSlugProducts.length} products don't have SEO-friendly URLs`
    });
  }

  return issues;
}

function generateCategoryIssues(categories) {
  const issues = [];
  
  const lowScoreCategories = categories.filter(c => c.seoScore < 60);
  if (lowScoreCategories.length > 0) {
    issues.push({
      type: 'categories',
      severity: 'high',
      title: 'Low SEO Score Categories',
      description: `${lowScoreCategories.length} categories have SEO scores below 60%`
    });
  }

  const noSlugCategories = categories.filter(c => c.issues.some(i => i.message.includes('slug')));
  if (noSlugCategories.length > 0) {
    issues.push({
      type: 'categories',
      severity: 'high',
      title: 'Missing Category Slugs',
      description: `${noSlugCategories.length} categories don't have SEO-friendly URLs`
    });
  }

  return issues;
}

function generateSEOKeywords(name, category, subcategory) {
  const keywords = [name.toLowerCase()];
  
  if (category) keywords.push(category.toLowerCase());
  if (subcategory) keywords.push(subcategory.toLowerCase());
  
  // Add common e-commerce keywords
  keywords.push('buy online', 'best price', 'international tijarat');
  
  return keywords;
}

function generateCategorySEOKeywords(categoryName) {
  const keywords = [
    categoryName.toLowerCase(),
    `${categoryName.toLowerCase()} products`,
    `buy ${categoryName.toLowerCase()}`,
    `${categoryName.toLowerCase()} online`,
    'international tijarat',
    'best prices',
    'quality products'
  ];
  
  return keywords;
}

module.exports = router;