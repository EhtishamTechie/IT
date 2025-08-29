const HomepageStaticCategory = require('../models/HomepageStaticCategory');

// Get all static categories
const getStaticCategories = async (req, res) => {
    try {
        const categories = await HomepageStaticCategory.find()
            .populate('category')
            .populate('selectedProducts')
            .sort('displayOrder');

        res.json({
            success: true,
            categories
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

        // Validate if we already have 4 categories
        const count = await HomepageStaticCategory.countDocuments();
        if (count >= 4) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 4 static categories allowed'
            });
        }

        const newStaticCategory = await HomepageStaticCategory.create({
            category: categoryId,
            displayOrder,
            selectedProducts: []
        });

        const populatedCategory = await HomepageStaticCategory.findById(newStaticCategory._id)
            .populate('category')
            .populate('selectedProducts');

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
