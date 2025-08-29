const Category = require('../models/Category');
const Vendor = require('../models/Vendor');

// @desc    Get all vendor categories
// @route   GET /api/vendors/categories
// @access  Private (Vendor)
const getVendorCategories = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    
    console.log('🔍 Getting categories for vendor:', vendorId);
    
    // Get all categories created by this vendor
    const categories = await Category.find({ 
      createdBy: vendorId,
      createdByType: 'vendor',
      isActive: true
    })
    .populate('parentCategory', 'name description')
    .sort({ name: 1 }); // Sort alphabetically for better UX

    console.log('📋 Found vendor-specific categories count:', categories.length);
    console.log('📋 Categories:', categories.map(cat => ({
      name: cat.name,
      id: cat._id.toString(),
      hasParent: !!cat.parentCategory,
      parentName: cat.parentCategory?.name || 'None'
    })));

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get vendor categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Create new category
// @route   POST /api/vendors/categories
// @access  Private (Vendor)
const createCategory = async (req, res) => {
  try {
    console.log('🚀 CREATE CATEGORY REQUEST RECEIVED!');
    console.log('📦 Request body:', req.body);
    console.log('👤 Vendor ID:', req.vendor.id);
    console.log('🏢 Vendor business name:', req.vendor.businessName);
    
    const vendorId = req.vendor.id;
    const { name, description, parentCategory } = req.body;

    console.log('🔍 Extracted data:', { name, description, parentCategory });

    // Validate required fields
    if (!name || !description) {
      console.log('❌ Validation failed: Missing name or description');
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    // Check if category name already exists for this vendor
    console.log('🔍 Checking for existing category with name:', name);
    const existingCategory = await Category.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      createdBy: vendorId,
      createdByType: 'vendor'
    });

    console.log('🔍 Vendor ID being checked:', vendorId);
    console.log('🔍 Existing category found:', existingCategory ? {
      name: existingCategory.name,
      createdBy: existingCategory.createdBy,
      createdByType: existingCategory.createdByType
    } : 'None');

    if (existingCategory && existingCategory.createdBy.toString() === vendorId.toString()) {
      console.log('❌ Category already exists for this vendor!');
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists in your store'
      });
    }

    // Create new category
    console.log('✨ Creating new category...');
    const categoryData = {
      name: name.trim(),
      description: description.trim(),
      createdBy: vendorId,
      createdByType: 'vendor',
      isActive: true
    };

    // Add parent category if provided
    if (parentCategory) {
      console.log('🔗 Parent category provided:', parentCategory);
      // Verify parent category belongs to the same vendor
      const parent = await Category.findOne({
        _id: parentCategory,
        createdBy: vendorId,
        createdByType: 'vendor'
      });
      
      console.log('🔍 Parent category found:', parent ? parent.name : 'Invalid parent');
      
      if (!parent) {
        console.log('❌ Invalid parent category!');
        return res.status(400).json({
          success: false,
          message: 'Invalid parent category'
        });
      }
      
      categoryData.parentCategory = parentCategory;
    }

    console.log('💾 Final category data:', categoryData);
    const category = new Category(categoryData);
    await category.save();

    console.log('✅ Category created successfully:', category._id);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });

  } catch (error) {
    console.error('💥 Create category error:', error);
    console.error('💥 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/vendors/categories/:id
// @access  Private (Vendor)
const updateCategory = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const categoryId = req.params.id;
    const { name, description, isActive } = req.body;

    // Find category and verify ownership
    const category = await Category.findOne({
      _id: categoryId,
      createdBy: vendorId,
      createdByType: 'vendor'
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name conflicts with existing categories
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: new RegExp(`^${name}$`, 'i'),
        createdBy: vendorId,
        createdByType: 'vendor',
        _id: { $ne: categoryId }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists in your store'
        });
      }
    }

    // Update fields
    if (name) category.name = name.trim();
    if (description) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/vendors/categories/:id
// @access  Private (Vendor)
const deleteCategory = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const categoryId = req.params.id;

    // Find category and verify ownership
    const category = await Category.findOne({
      _id: categoryId,
      createdBy: vendorId,
      createdByType: 'vendor'
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category is being used by any products
    const Product = require('../models/Product');
    const productsUsingCategory = await Product.countDocuments({
      $or: [
        { mainCategory: categoryId },
        { subCategory: categoryId }
      ],
      vendor: vendorId
    });

    if (productsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is being used by ${productsUsingCategory} product(s)`
      });
    }

    await Category.findByIdAndDelete(categoryId);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

module.exports = {
  getVendorCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
