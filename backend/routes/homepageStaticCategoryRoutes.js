const express = require('express');
const router = express.Router();
const {
    getStaticCategories,
    addStaticCategory,
    updateStaticCategory,
    deleteStaticCategory
} = require('../controllers/homepageStaticCategoryController');

// Get all static categories
router.get('/', getStaticCategories);

// Add a new static category
router.post('/', addStaticCategory);

// Update static category products
router.put('/:id', updateStaticCategory);

// Delete static category
router.delete('/:id', deleteStaticCategory);

module.exports = router;
