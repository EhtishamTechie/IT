const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const authAdmin = require('../middleware/authAdmin');

// Get all categories with populated parent categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({})
      .populate('parentCategory', 'name')
      .sort({ createdAt: -1 });
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to fetch categories' });
    }
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentCategory', 'name');
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
});

// Get all products in a category
router.get('/:categoryId/products', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // First check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Find all products in this category
    const products = await Product.find({ 
      category: categoryId,
      isActive: true 
    })
    .select('name price images category description') // Select needed fields
    .populate('category', 'name');

    res.json(products);
  } catch (err) {
    console.error('Error fetching category products:', err);
    res.status(500).json({ message: 'Failed to fetch category products' });
  }
});

// Create new category (Admin only)
router.post('/', authAdmin, async (req, res) => {
  try {
    const { name, description, parentCategory, isActive } = req.body;

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new Category({
      name,
      description,
      parentCategory: parentCategory || null,
      isActive: isActive !== undefined ? isActive : true
    });

    await category.save();
    
    // Populate the response
    const populatedCategory = await Category.findById(category._id)
      .populate('parentCategory', 'name');
    
    res.status(201).json(populatedCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

// Update category (Admin only)
router.put('/:id', authAdmin, async (req, res) => {
  try {
    const { name, description, parentCategory, isActive } = req.body;
    const categoryId = req.params.id;

    // Check if another category with same name exists
    const existingCategory = await Category.findOne({ 
      name, 
      _id: { $ne: categoryId } 
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      {
        name,
        description,
        parentCategory: parentCategory || null,
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

// Delete category (Admin only)
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if there are subcategories
    const subcategories = await Category.find({ parentCategory: categoryId });
    if (subcategories.length > 0) {
      // Delete all subcategories first
      await Category.deleteMany({ parentCategory: categoryId });
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category and its subcategories deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// Get categories by parent (for building hierarchy)
router.get('/parent/:parentId', async (req, res) => {
  try {
    const parentId = req.params.parentId === 'null' ? null : req.params.parentId;
    
    const categories = await Category.find({ parentCategory: parentId })
      .populate('parentCategory', 'name')
      .sort({ name: 1 });
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories by parent:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Get subcategories for a specific category
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const subcategories = await Category.find({ parentCategory: categoryId })
      .select('_id name description isActive createdByType createdBy')
      .sort({ name: 1 });
    
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ message: 'Failed to fetch subcategories' });
  }
});

module.exports = router;
