const express = require('express');
const router = express.Router();
const HomepageBanner = require('../models/HomepageBanner');
const HomepageCategory = require('../models/HomepageCategory');
const HomepageStaticCategory = require('../models/HomepageStaticCategory');
const PremiumProducts = require('../models/PremiumProducts');
const FeaturedProducts = require('../models/FeaturedProducts');
const Product = require('../models/Product');
const cacheService = require('../services/cacheService');

// Cache duration: 1 hour for homepage data (changes infrequently)
const HOMEPAGE_CACHE_TTL = 3600;

/**
 * GET /api/homepage/all-data
 * 
 * Single optimized endpoint that fetches ALL homepage data in parallel
 * Reduces 6-7 sequential API calls to 1 parallel request
 * 
 * Performance improvements:
 * - Parallel database queries (vs sequential)
 * - Field selection (only needed fields)
 * - Lean queries (plain objects, not mongoose docs)
 * - Server-side caching (1 hour)
 * - Combined response (1 HTTP request)
 */
router.get('/all-data', cacheService.middleware(HOMEPAGE_CACHE_TTL), async (req, res) => {
  try {
    console.log('🚀 Fetching all homepage data (parallel queries)...');
    const startTime = Date.now();

    // Execute all database queries in PARALLEL for maximum speed
    const [
      bannerData,
      categories,
      staticCategories,
      premiumProducts,
      featuredProducts,
      newArrivals
    ] = await Promise.all([
      // 1. Hero Banner Slides
      HomepageBanner.findOne()
        .select('slides')
        .populate({
          path: 'slides.primaryProduct',
          select: 'title price image images discount slug'
        })
        .populate({
          path: 'slides.secondaryProducts',
          select: 'title image images slug'
        })
        .populate({
          path: 'slides.category',
          select: 'name slug'
        })
        .lean(), // Use lean() for better performance (plain JS objects)

      // 2. Category Carousel
      HomepageCategory.find()
        .select('name imageUrl displayOrder description categoryId')
        .populate('categoryId', 'name slug')
        .sort({ displayOrder: 1 })
        .limit(20)
        .lean(),

      // 3. Static Category Sections (Amazon-style displays)
      HomepageStaticCategory.find()
        .select('category selectedProducts displayOrder')
        .populate('category', 'name slug')
        .populate({
          path: 'selectedProducts',
          select: 'title price image images discount rating slug stock'
        })
        .sort({ displayOrder: 1 })
        .limit(4)
        .lean(),

      // 4. Premium Products
      PremiumProducts.findOne()
        .select('products')
        .populate({
          path: 'products',
          select: 'title price image images discount rating slug stock description vendor'
        })
        .lean(),

      // 5. Featured Products
      FeaturedProducts.findOne()
        .select('products')
        .populate({
          path: 'products',
          select: 'title price image images discount rating slug stock description vendor'
        })
        .lean(),

      // 6. New Arrivals (Latest 20 products)
      // Include products with approvalStatus 'approved' OR undefined (for legacy products)
      Product.find({ 
        $or: [
          { approvalStatus: 'approved' },
          { approvalStatus: { $exists: false } },
          { approvalStatus: undefined }
        ]
      })
        .select('title price image images discount rating slug stock createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const queryTime = Date.now() - startTime;
    console.log(`✅ All homepage queries completed in ${queryTime}ms`);

    // Construct optimized response
    const responseData = {
      // Banner slides
      banners: bannerData?.slides?.map(slide => ({
        _id: slide._id,
        title: slide.title,
        category: slide.category,
        image: slide.image,
        primaryProduct: slide.primaryProduct,
        secondaryProducts: slide.secondaryProducts
      })) || [],

      // Category carousel
      categories: categories.map(cat => ({
        _id: cat._id,
        name: cat.name || cat.categoryId?.name,
        imageUrl: cat.imageUrl,
        displayOrder: cat.displayOrder,
        description: cat.description
      })),

      // Static category sections
      staticCategories: staticCategories.map(section => ({
        _id: section._id,
        category: section.category,
        selectedProducts: section.selectedProducts || [],
        displayOrder: section.displayOrder
      })),

      // Special products
      specialProducts: {
        // Reverse arrays so newest products appear first
        premium: premiumProducts?.products ? [...premiumProducts.products].reverse() : [],
        featured: featuredProducts?.products ? [...featuredProducts.products].reverse() : [],
        newArrivals: newArrivals || []
      },

      // Metadata
      meta: {
        cached: false, // Will be true if served from cache
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📊 Homepage data stats:', {
      banners: responseData.banners.length,
      categories: responseData.categories.length,
      staticCategories: responseData.staticCategories.length,
      premium: responseData.specialProducts.premium.length,
      featured: responseData.specialProducts.featured.length,
      newArrivals: responseData.specialProducts.newArrivals.length,
      queryTime: `${queryTime}ms`
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error fetching homepage data:', error);
    res.status(500).json({
      error: 'Failed to load homepage data',
      message: error.message
    });
  }
});

/**
 * POST /api/homepage/clear-cache
 * Admin endpoint to manually clear homepage cache
 */
router.post('/clear-cache', async (req, res) => {
  try {
    cacheService.clearPattern('cache:*/homepage*');
    console.log('✅ Homepage cache cleared successfully');
    res.json({
      success: true,
      message: 'Homepage cache cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/homepage/cache-status
 * Check if homepage data is cached
 */
router.get('/cache-status', async (req, res) => {
  try {
    const cacheKey = 'cache:/api/homepage/all-data';
    const cached = await cacheService.get(cacheKey);
    
    res.json({
      isCached: !!cached,
      cacheKey: cacheKey,
      ttl: cached ? 'Active' : 'Not cached'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
