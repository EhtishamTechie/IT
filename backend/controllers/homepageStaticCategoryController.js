const HomepageStaticCategory = require('../models/HomepageStaticCategory');
const cacheService = require('../services/cacheService');
const { purgeCloudflareUrls } = require('../services/cloudflarePurge');

const SITE_URL = process.env.SITE_URL || 'https://internationaltijarat.com';
const HOMEPAGE_CACHE_KEY = 'cache:/api/homepage/all-data';

// Helper: clear server cache and Cloudflare edge cache after any homepage change
const invalidateHomepageCache = async () => {
  await cacheService.del(HOMEPAGE_CACHE_KEY);
  purgeCloudflareUrls([`${SITE_URL}/api/homepage/all-data`, `${SITE_URL}/`]);
};

// Get all static categories
const getStaticCategories = async (req, res) => {
    try {
        const categories = await HomepageStaticCategory.find()
            .populate('category')
            .populate('selectedProducts')
            .sort('displayOrder');

        // Clean up any null category references automatically
        const validCategories = [];
        const idsToDelete = [];
        
        for (const cat of categories) {
            if (cat.category && cat.category._id) {
                validCategories.push(cat);
            } else {
                console.log('Found null category reference, marking for deletion:', cat._id);
                idsToDelete.push(cat._id);
            }
        }

        // Delete null references if found
        if (idsToDelete.length > 0) {
            await HomepageStaticCategory.deleteMany({ _id: { $in: idsToDelete } });
            console.log('Cleaned up null category references:', idsToDelete.length);
        }

        res.json({
            success: true,
            categories: validCategories
        });
    } catch (error) {
        console.error('Error fetching static categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch static categories',
            error: error.message
        });
    }
};

// Add a new static category
const addStaticCategory = async (req, res) => {
    try {
        const { categoryId, displayOrder } = req.body;

        // Validate categoryId
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        // Check if category is already selected for homepage
        const existingCategory = await HomepageStaticCategory.findOne({ category: categoryId });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category is already selected for homepage'
            });
        }

        // Validate if we already have 4 categories
        const count = await HomepageStaticCategory.countDocuments();
        if (count >= 4) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 4 static categories allowed'
            });
        }

        // Auto-assign displayOrder if not provided or use next available order
        const nextDisplayOrder = displayOrder || (count + 1);

        const newStaticCategory = await HomepageStaticCategory.create({
            category: categoryId,
            displayOrder: nextDisplayOrder,
            selectedProducts: []
        });

        const populatedCategory = await HomepageStaticCategory.findById(newStaticCategory._id)
            .populate('category')
            .populate('selectedProducts');

        await invalidateHomepageCache();

        res.json({
            success: true,
            category: populatedCategory
        });
    } catch (error) {
        console.error('Error adding static category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add static category',
            error: error.message
        });
    }
};

// Update static category products
const updateStaticCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { selectedProducts } = req.body;
        
        if (!Array.isArray(selectedProducts)) {
            return res.status(400).json({
                success: false,
                message: 'Selected products must be an array'
            });
        }

        if (selectedProducts.length > 8) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 8 products allowed per category'
            });
        }

        const updated = await HomepageStaticCategory.findByIdAndUpdate(
            id,
            { selectedProducts },
            { new: true }
        )
        .populate('category')
        .populate('selectedProducts');

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Static category not found'
            });
        }

        await invalidateHomepageCache();

        res.json({
            success: true,
            category: updated
        });
    } catch (error) {
        console.error('Error updating static category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update static category',
            error: error.message
        });
    }
};

// Delete static category
const deleteStaticCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await HomepageStaticCategory.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Static category not found'
            });
        }

        await invalidateHomepageCache();

        res.json({
            success: true,
            message: 'Static category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting static category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete static category',
            error: error.message
        });
    }
};

module.exports = {
    getStaticCategories,
    addStaticCategory,
    updateStaticCategory,
    deleteStaticCategory
};
