// Combined homepage data endpoint to reduce API calls
const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const HomepageCategory = require('../models/HomepageCategory');
const HomepageCard = require('../models/HomepageCard');
const HomepageStaticCategory = require('../models/HomepageStaticCategory');
const CacheService = require('../services/cacheService');

/**
 * GET /api/homepage/all
 * Returns all homepage data in a single API call
 * This reduces the number of HTTP requests from 4+ to 1
 */
router.get('/all', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'homepage:all-data';
    const cachedData = await CacheService.get(cacheKey);
    
    if (cachedData) {
      console.log('✅ Returning cached homepage data');
      return res.json({
        success: true,
        cached: true,
        data: cachedData
      });
    }

    console.log('📡 Fetching fresh homepage data from database');

    // Fetch all data in parallel for maximum performance
    const [banners, categories, cards, staticCategories] = await Promise.all([
      Banner.find({ isActive: true }).sort({ order: 1 }).lean(),
      HomepageCategory.find({ isActive: true }).sort({ order: 1 }).lean(),
      HomepageCard.find({ isActive: true }).sort({ order: 1 }).lean(),
      HomepageStaticCategory.find({ isActive: true })
        .sort({ displayOrder: 1 })
        .populate('category', 'name')
        .populate('selectedProducts', 'title image images price')
        .lean()
    ]);

    const responseData = {
      banners: banners || [],
      categories: categories || [],
      cards: {
        cards: cards || []
      },
      staticCategories: {
        success: true,
        categories: staticCategories || []
      }
    };

    // Cache for 1 hour (3600 seconds)
    await CacheService.set(cacheKey, responseData, 3600);

    console.log(`✅ Homepage data fetched successfully:`, {
      banners: banners.length,
      categories: categories.length,
      cards: cards.length,
      staticCategories: staticCategories.length
    });

    res.json({
      success: true,
      cached: false,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error fetching combined homepage data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homepage data',
      message: error.message
    });
  }
});

/**
 * POST /api/homepage/invalidate-cache
 * Invalidates the combined homepage cache
 * Call this whenever any homepage data is updated
 */
router.post('/invalidate-cache', async (req, res) => {
  try {
    await CacheService.del('homepage:all-data');
    console.log('🗑️ Homepage cache invalidated');
    
    res.json({
      success: true,
      message: 'Homepage cache invalidated successfully'
    });
  } catch (error) {
    console.error('❌ Error invalidating homepage cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache'
    });
  }
});

module.exports = router;
