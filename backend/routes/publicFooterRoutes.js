const express = require('express');
const router = express.Router();
const FooterCategories = require('../models/FooterCategories');

// Public endpoint to get footer categories (no authentication required)
router.get('/', async (req, res) => {
  try {
    console.log('📂 Public footer categories request');
    
    const config = await FooterCategories.getConfiguration();
    
    res.json({
      success: true,
      data: config.categories
    });
  } catch (error) {
    console.error('Error fetching public footer categories:', error);
    // Return default categories if database fails
    res.json({
      success: true,
      data: [
        'Electronics',
        'Fashion',
        'Home & Garden',
        'Sports & Outdoors',
        'Books & Media',
        'Health & Beauty',
        'Automotive',
        'Business & Industrial'
      ]
    });
  }
});

module.exports = router;