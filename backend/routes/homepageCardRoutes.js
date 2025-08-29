const express = require('express');
const router = express.Router();
const HomepageCard = require('../models/HomepageCard');
const Category = require('../models/Category');
const { authenticateAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for card images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/homepage-cards');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'card-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// GET /api/homepage/cards - Get all homepage cards
router.get('/', async (req, res) => {
  try {
    const cards = await HomepageCard.find({ isActive: true })
      .sort({ order: 1 })
      .populate('mainCategory', 'name')
      .populate('subcategoryItems.category', 'name');
      
    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching homepage cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage cards'
    });
  }
});

// GET /api/homepage/cards/admin - Get all cards for admin (including inactive)
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const cards = await HomepageCard.find()
      .sort({ order: 1 })
      .populate('mainCategory', 'name')
      .populate('subcategoryItems.category', 'name');
      
    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching homepage cards for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage cards'
    });
  }
});

// POST /api/homepage/cards - Create a new homepage card
router.post('/', authenticateAdmin, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'subcategoryImage1', maxCount: 1 },
  { name: 'subcategoryImage2', maxCount: 1 },
  { name: 'subcategoryImage3', maxCount: 1 },
  { name: 'subcategoryImage4', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Creating homepage card...');
    console.log('📦 Request body:', req.body);
    console.log('🖼️ Files received:', Object.keys(req.files || {}));
    
    const { title, type, order, mainCategory, linkText, subcategoryData } = req.body;
    
    // Validate required fields
    if (!title || !type || !order || !mainCategory) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, order, and main category are required'
      });
    }

    // Check if order is already taken
    const existingCard = await HomepageCard.findOne({ order: parseInt(order) });
    if (existingCard) {
      return res.status(400).json({
        success: false,
        message: `Order ${order} is already taken`
      });
    }

    // Validate category exists
    const category = await Category.findById(mainCategory);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Main category not found'
      });
    }

    const cardData = {
      title,
      type,
      order: parseInt(order),
      mainCategory,
      linkText: linkText || 'Shop now'
    };

    // Handle main image for main-category type
    if (type === 'main-category') {
      if (!req.files || !req.files.mainImage || !req.files.mainImage[0]) {
        return res.status(400).json({
          success: false,
          message: 'Main image is required for main-category type'
        });
      }
      cardData.mainImage = req.files.mainImage[0].filename;
    }

    // Handle subcategory items for subcategories type
    if (type === 'subcategories') {
      console.log('🔍 Processing subcategories type...');
      console.log('📊 Subcategory data received:', subcategoryData);
      
      if (!subcategoryData) {
        console.log('❌ No subcategory data provided');
        return res.status(400).json({
          success: false,
          message: 'Subcategory data is required for subcategories type'
        });
      }

      let subcategoryItems;
      try {
        subcategoryItems = JSON.parse(subcategoryData);
        console.log('📋 Parsed subcategory items:', subcategoryItems);
      } catch (parseError) {
        console.log('❌ Failed to parse subcategory data:', parseError);
        return res.status(400).json({
          success: false,
          message: 'Invalid subcategory data format'
        });
      }

      if (!Array.isArray(subcategoryItems) || subcategoryItems.length !== 4) {
        console.log('❌ Invalid subcategory items array:', subcategoryItems);
        return res.status(400).json({
          success: false,
          message: 'Exactly 4 subcategory items are required'
        });
      }

      // Process subcategory items with their images
      const processedItems = [];
      for (let i = 0; i < 4; i++) {
        const item = subcategoryItems[i];
        const imageField = `subcategoryImage${i + 1}`;
        
        console.log(`🔍 Processing item ${i + 1}:`, item);
        console.log(`🖼️ Looking for image field: ${imageField}`);
        console.log(`📁 Files for ${imageField}:`, req.files[imageField]);
        
        if (!req.files || !req.files[imageField] || !req.files[imageField][0]) {
          console.log(`❌ Missing image for subcategory item ${i + 1}`);
          return res.status(400).json({
            success: false,
            message: `Image for subcategory item ${i + 1} is required`
          });
        }

        // Validate subcategory exists
        const subcat = await Category.findById(item.categoryId);
        if (!subcat) {
          console.log(`❌ Category not found for item ${i + 1}:`, item.categoryId);
          return res.status(400).json({
            success: false,
            message: `Subcategory ${i + 1} not found`
          });
        }

        processedItems.push({
          name: item.name,
          image: req.files[imageField][0].filename,
          category: item.categoryId
        });
        
        console.log(`✅ Processed item ${i + 1} successfully`);
      }

      cardData.subcategoryItems = processedItems;
    }

    const newCard = new HomepageCard(cardData);
    await newCard.save();

    // Populate the response
    await newCard.populate('mainCategory', 'name');
    await newCard.populate('subcategoryItems.category', 'name');

    res.status(201).json({
      success: true,
      message: 'Homepage card created successfully',
      card: newCard
    });

  } catch (error) {
    console.error('Error creating homepage card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create homepage card'
    });
  }
});

// PUT /api/homepage/cards/:id - Update a homepage card
router.put('/:id', authenticateAdmin, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'subcategoryImage1', maxCount: 1 },
  { name: 'subcategoryImage2', maxCount: 1 },
  { name: 'subcategoryImage3', maxCount: 1 },
  { name: 'subcategoryImage4', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, order, mainCategory, linkText, subcategoryData } = req.body;

    const card = await HomepageCard.findById(id);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Homepage card not found'
      });
    }

    // Check if order is already taken by another card
    if (order && parseInt(order) !== card.order) {
      const existingCard = await HomepageCard.findOne({ 
        order: parseInt(order), 
        _id: { $ne: id } 
      });
      if (existingCard) {
        return res.status(400).json({
          success: false,
          message: `Order ${order} is already taken`
        });
      }
    }

    // Update basic fields
    if (title) card.title = title;
    if (type) card.type = type;
    if (order) card.order = parseInt(order);
    if (mainCategory) card.mainCategory = mainCategory;
    if (linkText) card.linkText = linkText;

    // Handle image updates based on type
    if (card.type === 'main-category') {
      if (req.files && req.files.mainImage && req.files.mainImage[0]) {
        // Delete old main image if exists
        if (card.mainImage) {
          const oldImagePath = path.join(__dirname, '../uploads/homepage-cards', card.mainImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        card.mainImage = req.files.mainImage[0].filename;
      }
      // Clear subcategory items if switching to main-category
      card.subcategoryItems = [];
    }

    if (card.type === 'subcategories' && subcategoryData) {
      const subcategoryItems = JSON.parse(subcategoryData);
      if (Array.isArray(subcategoryItems) && subcategoryItems.length === 4) {
        const processedItems = [];
        
        for (let i = 0; i < 4; i++) {
          const item = subcategoryItems[i];
          const imageField = `subcategoryImage${i + 1}`;
          
          let imageFilename = card.subcategoryItems[i]?.image; // Keep existing image by default
          
          // If new image is uploaded, use it
          if (req.files && req.files[imageField] && req.files[imageField][0]) {
            // Delete old image if exists
            if (card.subcategoryItems[i]?.image) {
              const oldImagePath = path.join(__dirname, '../uploads/homepage-cards', card.subcategoryItems[i].image);
              if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
              }
            }
            imageFilename = req.files[imageField][0].filename;
          }

          processedItems.push({
            name: item.name,
            image: imageFilename,
            category: item.categoryId
          });
        }

        card.subcategoryItems = processedItems;
      }
      // Clear main image if switching to subcategories
      if (card.mainImage) {
        const oldImagePath = path.join(__dirname, '../uploads/homepage-cards', card.mainImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
        card.mainImage = undefined;
      }
    }

    await card.save();
    await card.populate('mainCategory', 'name');
    await card.populate('subcategoryItems.category', 'name');

    res.json({
      success: true,
      message: 'Homepage card updated successfully',
      card
    });

  } catch (error) {
    console.error('Error updating homepage card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update homepage card'
    });
  }
});

// DELETE /api/homepage/cards/:id - Delete a homepage card
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const card = await HomepageCard.findById(id);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Homepage card not found'
      });
    }

    // Delete associated images
    if (card.mainImage) {
      const mainImagePath = path.join(__dirname, '../uploads/homepage-cards', card.mainImage);
      if (fs.existsSync(mainImagePath)) {
        fs.unlinkSync(mainImagePath);
      }
    }

    if (card.subcategoryItems && card.subcategoryItems.length > 0) {
      card.subcategoryItems.forEach(item => {
        if (item.image) {
          const imagePath = path.join(__dirname, '../uploads/homepage-cards', item.image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      });
    }

    await HomepageCard.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Homepage card deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting homepage card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete homepage card'
    });
  }
});

module.exports = router;
