const Category = require('../models/Category');
const FooterCategories = require('../models/FooterCategories');
const mongoose = require('mongoose');

// Get all ADMIN categories (exclude vendor categories)
const getAdminCategories = async (req, res) => {
  try {
    console.log('📂 Admin Categories Request - Admin Only');
    
    // Filter: Only categories created by admin
    const filter = { 
      $or: [
        { createdByType: 'admin' },
        { createdByType: { $exists: false } } // Legacy categories without createdByType field
      ]
    };
    
    console.log('🔍 Admin category filter:', filter);
    
    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }
    
    // Add active filter if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    const categories = await Category.find(filter)
      .populate('parentCategory', 'name')
      .sort({ name: 1 });
    
    console.log(`✅ Found ${categories.length} admin categories`);
    
    res.json({
      success: true,
      data: categories.map(cat => ({
        ...cat.toObject(),
        source: 'admin'
      })),
      total: categories.length
    });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin categories',
      error: error.message
    });
  }
};

// Get single admin category
const getAdminCategoryById = async (req, res) => {
  try {
    console.log('🔍 Fetching admin category:', req.params.id);
    
    const category = await Category.findOne({ 
      _id: req.params.id,
      $or: [
        { createdByType: 'admin' },
        { createdByType: { $exists: false } }
      ]
    }).populate('parentCategory', 'name');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Admin category not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...category.toObject(),
        source: 'admin'
      }
    });
  } catch (error) {
    console.error('Error fetching admin category by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin category',
      error: error.message
    });
  }
};

// Add admin category
const addAdminCategory = async (req, res) => {
  try {
    console.log('📝 Adding admin category');
    console.log('📦 Category data received:', req.body);
    
    const categoryData = { ...req.body };
    
    // Set admin-specific fields
    categoryData.createdByType = 'admin';
    categoryData.createdBy = null; // null for admin
    categoryData.isActive = categoryData.isActive !== undefined ? categoryData.isActive : true;
    
    console.log('📝 Final admin category data:', categoryData);
    
    const category = new Category(categoryData);
    await category.save();
    
    console.log('✅ Admin category created successfully:', category._id);
    
    res.status(201).json({
      success: true,
      message: 'Admin category created successfully',
      data: {
        ...category.toObject(),
        source: 'admin'
      }
    });
  } catch (error) {
    console.error('Error creating admin category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin category',
      error: error.message
    });
  }
};

// Update admin category
const updateAdminCategory = async (req, res) => {
  try {
    console.log('📝 Updating admin category:', req.params.id);
    
    const updateData = { ...req.body };
    updateData.updatedAt = new Date();
    
    // Ensure it remains an admin category
    updateData.createdByType = 'admin';
    updateData.createdBy = null;
    
    const category = await Category.findOneAndUpdate(
      { 
        _id: req.params.id,
        $or: [
          { createdByType: 'admin' },
          { createdByType: { $exists: false } }
        ]
      },
      updateData,
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Admin category not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin category updated successfully',
      data: {
        ...category.toObject(),
        source: 'admin'
      }
    });
  } catch (error) {
    console.error('Error updating admin category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin category',
      error: error.message
    });
  }
};

// Delete admin category
const deleteAdminCategory = async (req, res) => {
  try {
    console.log('🗑️ Deleting admin category:', req.params.id);
    
    // Check if category has child categories
    const childCategories = await Category.find({ 
      parentCategory: req.params.id,
      createdByType: 'admin'
    });
    
    if (childCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Please delete subcategories first.'
      });
    }
    
    const category = await Category.findOneAndDelete({ 
      _id: req.params.id,
      $or: [
        { createdByType: 'admin' },
        { createdByType: { $exists: false } }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Admin category not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin category',
      error: error.message
    });
  }
};

// Get main admin categories (no parent)
const getAdminMainCategories = async (req, res) => {
  try {
    console.log('📂 Getting admin main categories');
    
    const categories = await Category.find({ 
      parentCategory: null,
      createdByType: 'admin',
      isActive: true
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: categories.map(cat => ({
        ...cat.toObject(),
        source: 'admin'
      }))
    });
  } catch (error) {
    console.error('Error fetching admin main categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin main categories',
      error: error.message
    });
  }
};

// Get admin subcategories for a parent category
const getAdminSubcategories = async (req, res) => {
  try {
    console.log('📂 Getting admin subcategories for:', req.params.parentId);
    
    const subcategories = await Category.find({ 
      parentCategory: req.params.parentId,
      createdByType: 'admin',
      isActive: true
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: subcategories.map(cat => ({
        ...cat.toObject(),
        source: 'admin'
      }))
    });
  } catch (error) {
    console.error('Error fetching admin subcategories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin subcategories',
      error: error.message
    });
  }
};

// Get footer categories configuration
const getFooterCategories = async (req, res) => {
  try {
    console.log('📂 Getting footer categories configuration');
    
    const config = await FooterCategories.getConfiguration();
    
    res.json({
      success: true,
      data: config.categories,
      lastUpdated: config.lastUpdated,
      updatedBy: config.updatedBy
    });
  } catch (error) {
    console.error('Error fetching footer categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch footer categories',
      error: error.message
    });
  }
};

// Update footer categories configuration
const updateFooterCategories = async (req, res) => {
  try {
    console.log('📝 Updating footer categories configuration');
    
    const { categories } = req.body;
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories must be an array'
      });
    }
    
    const adminId = req.admin?.id || req.admin?._id || 'unknown';
    const config = await FooterCategories.updateConfiguration(categories, adminId);
    
    console.log(`✅ Footer categories updated: ${categories.length} categories`);
    
    res.json({
      success: true,
      message: 'Footer categories updated successfully',
      data: config.categories
    });
  } catch (error) {
    console.error('Error updating footer categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update footer categories',
      error: error.message
    });
  }
};

module.exports = {
  getAdminCategories,
  getAdminCategoryById,
  addAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminMainCategories,
  getAdminSubcategories,
  getFooterCategories,
  updateFooterCategories
};
