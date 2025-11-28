const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const HomepageCategory = require('../models/HomepageCategory');
const Category = require('../models/Category');
const authAdmin = require('../middleware/authAdmin');
const cacheService = require('../services/cacheService');
const { optimizeUploadedImages } = require('../middleware/imageOptimization');

// Cache duration constants (in seconds)
const HOMEPAGE_CACHE = 3600; // 1 hour - homepage content changes infrequently

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/homepage-categories';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Get all homepage categories
router.get('/', cacheService.middleware(HOMEPAGE_CACHE), async (req, res) => {
  try {
    const categories = await HomepageCategory.find()
      .sort({ displayOrder: 1 })
      .populate('categoryId', 'name description');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching homepage categories:', error);
    res.status(500).json({ message: 'Failed to fetch homepage categories' });
  }
});

// Add category to homepage
router.post('/', authAdmin, upload.single('image'), optimizeUploadedImages({
  quality: 85,
  generateWebP: true,
  generateAVIF: true,
  generateResponsive: true,
  responsiveSizes: [300, 600, 1200]
}), async (req, res) => {
  try {
    const { categoryId, name } = req.body;
    
    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category is already on homepage
    const existing = await HomepageCategory.findOne({ categoryId });
    if (existing) {
      return res.status(400).json({ message: 'Category already added to homepage' });
    }

    // Get max display order
    const maxOrderCategory = await HomepageCategory.findOne()
      .sort('-displayOrder');
    const displayOrder = maxOrderCategory ? maxOrderCategory.displayOrder + 1 : 0;

    const homepageCategory = new HomepageCategory({
      categoryId,
      name,
      imageUrl: '/uploads/homepage-categories/' + req.file.filename,
      displayOrder
    });

    await homepageCategory.save();
    
    // Clear homepage cache
    cacheService.clearPattern('cache:*/homepage*');
    
    res.status(201).json(homepageCategory);
  } catch (error) {
    console.error('Error adding homepage category:', error);
    res.status(500).json({ message: 'Failed to add category to homepage' });
  }
});

// Remove category from homepage
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const category = await HomepageCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Homepage category not found' });
    }

    // Delete the image file
    if (category.imageUrl) {
      const imagePath = path.join(__dirname, '..', category.imageUrl.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Use findByIdAndDelete instead of remove()
    await HomepageCategory.findByIdAndDelete(req.params.id);
    
    // Clear homepage cache
    cacheService.clearPattern('cache:*/homepage*');
    
    res.json({ 
      success: true,
      message: 'Category removed from homepage successfully' 
    });
  } catch (error) {
    console.error('Error removing homepage category:', error);
    res.status(500).json({ message: 'Failed to remove category from homepage' });
  }
});

// Reorder homepage categories
router.put('/reorder', authAdmin, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    // Update display order for each category
    await Promise.all(orderedIds.map((id, index) => 
      HomepageCategory.findByIdAndUpdate(id, { displayOrder: index })
    ));

    // Clear homepage cache
    cacheService.clearPattern('cache:*/homepage*');

    res.json({ message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Error reordering homepage categories:', error);
    res.status(500).json({ message: 'Failed to reorder categories' });
  }
});

module.exports = router;
