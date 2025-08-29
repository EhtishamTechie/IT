const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StockManager = require('../services/StockManager');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { getUploadUrl } = require('../utils/urlHelpers');

// Helper function to transform product images with better error handling
const transformProductImages = (product) => {
  if (!product) {
    console.error('❌ [TRANSFORM] Null/undefined product passed to transformProductImages');
    return null;
  }

  try {
    console.log('� [TRANSFORM] Input:', {
      id: product._id,
      title: product.title,
      rawImage: product.image,
      rawImages: product.images
    });

    // Ensure we have arrays even if empty
    const images = Array.isArray(product.images) ? product.images : [];
    
    const transformed = {
      ...product,
      image: product.image || null,  // Just return the filename
      images: images.map(img => img) // Just return the filenames
    };
    
    console.log('✅ [TRANSFORM] Image paths updated:', {
      mainImage: transformed.image,
      additionalImages: transformed.images?.length || 0
    });
    
    return transformed;
  } catch (error) {
    console.error('❌ Error in transformProductImages:', error, 'Product:', product);
    return null;
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use consistent naming format: timestamp only
    const timestamp = Date.now();
    const filename = `${timestamp}${path.extname(file.originalname)}`;
    console.log('📸 Saving product image as:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('🔍 [PRODUCTS FETCH] Request received:', {
      query: req.query,
      path: req.path,
      headers: {
        'content-type': req.headers['content-type'],
        'accept': req.headers['accept']
      }
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    console.log('📊 [PRODUCTS FETCH] Pagination params:', { page, limit, skip });
    
    // Build filter conditions
    const filter = {}; // Show all products (admin and vendor products)
    console.log('🎯 [PRODUCTS FETCH] Filter:', filter);
    
    if (req.query.category) {
      console.log('🏷️ [PRODUCTS FETCH] Category filter requested:', req.query.category);
      // Find category by name to get ObjectId for filtering
      const Category = require('../models/Category');
      
      // First try exact match
      let categoryDoc = await Category.findOne({ name: req.query.category });
      
      // If exact match not found, try case-insensitive search
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({ 
          name: { $regex: new RegExp(req.query.category, 'i') } 
        });
      }
      
      // If still not found, try partial match
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({ 
          name: { $regex: new RegExp(req.query.category.replace(/[-\s]/g, '.*'), 'i') } 
        });
      }
      
      if (categoryDoc) {
        filter.$or = [
          { mainCategory: { $in: [categoryDoc._id] } },
          { subCategory: { $in: [categoryDoc._id] } },
          { category: { $in: [categoryDoc._id] } }
        ];
        console.log(`✅ Category filter applied: "${req.query.category}" -> "${categoryDoc.name}"`);
      } else {
        // If no category found in database, try direct string matching on product fields
        console.log(`⚠️ Category not found in database: "${req.query.category}", trying direct product matching`);
        const categoryRegex = new RegExp(req.query.category.replace(/[-\s&]/g, '.*'), 'i');
        
        // Try multiple variations of the category name
        const categoryVariations = [
          req.query.category,
          req.query.category.replace(/-/g, ' '),
          req.query.category.replace(/-/g, ' & '),
          req.query.category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        ];
        
        filter.$or = [
          // Search in populated category names (when categories are populated)
          { 'mainCategory.name': { $in: categoryVariations } },
          { 'subCategory.name': { $in: categoryVariations } },
          { 'category.name': { $in: categoryVariations } },
          // Search with regex for partial matches
          { 'mainCategory.name': categoryRegex },
          { 'subCategory.name': categoryRegex },
          { 'category.name': categoryRegex }
        ];
        
        console.log(`🔍 Trying category variations:`, categoryVariations);
      }
    }
    
    if (req.query.subCategory) {
      const Category = require('../models/Category');
      const categoryDoc = await Category.findOne({ name: req.query.subCategory });
      if (categoryDoc) {
        // Add to existing filter or create new one
        if (filter.$or) {
          filter.$and = [
            { $or: filter.$or },
            { $or: [
              { subCategory: { $in: [categoryDoc._id] } },
              { category: { $in: [categoryDoc._id] } }
            ]}
          ];
          delete filter.$or;
        } else {
          filter.$or = [
            { subCategory: { $in: [categoryDoc._id] } },
            { category: { $in: [categoryDoc._id] } }
          ];
        }
      }
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { keywords: { $in: [searchRegex] } }
      ];
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) {
        filter.price.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter.price.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price-low':
          sortOption = { price: 1 };
          break;
        case 'price-high':
          sortOption = { price: -1 };
          break;
        case 'popular':
          sortOption = { soldCount: -1 };
          break;
        case 'rating':
          sortOption = { 'ratings.average': -1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
      }
    }

    // Add debug logging
    console.log('🔍 Executing product query with filter:', JSON.stringify(filter));
    console.log('🔍 Sort option:', sortOption);
    console.log('🔍 Skip:', skip, 'Limit:', limit);

    console.log('🔍 [PRODUCTS FETCH] Executing query with:', {
      filter,
      sortOption,
      skip,
      limit,
      populate: ['vendor', 'mainCategory', 'subCategory', 'category']
    });

    const queryStartTime = Date.now();
    
    // Build and execute the query with lean() for better performance
    const products = await Product.find(filter)
      .populate('vendor', 'businessName email contactPhone rating')
      .populate('mainCategory', 'name')
      .populate('subCategory', 'name')
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(); // Add timeout and cache control

    const queryTime = Date.now() - queryStartTime;
    console.log(`⚡ [PRODUCTS FETCH] Query executed in ${queryTime}ms`);

    const totalProducts = await Product.countDocuments(filter);
    
    // Log raw product data for debugging
    console.log('📦 [PRODUCTS FETCH] Raw product data:', products.map(p => ({
      id: p._id,
      title: p.title,
      imageCount: p.images ? p.images.length : 0,
      firstImage: p.images && p.images.length > 0 ? p.images[0] : null
    })));

    console.log('� [PRODUCTS FETCH] Results:', {
      found: products.length,
      total: totalProducts,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      hasMore: skip + products.length < totalProducts
    });

    console.log('🔄 [PRODUCTS FETCH] Starting image transformation');
    const transformStart = Date.now();

    // Transform products using the simpler approach (like admin panel)
    const transformedProducts = products.map(product => {
      try {
        if (!product) {
          console.error('❌ [PRODUCTS FETCH] Null product encountered');
          return null;
        }
        
        const transformedProduct = {
          ...product, // product is already a plain object due to .lean()
          image: product.image ? `/uploads/products/${product.image}` : null,
          images: (product.images || []).map(img => `/uploads/products/${img}`),
          // Handle populated category fields (they're already plain objects from .lean())
          mainCategoryName: product.mainCategory?.[0]?.name || '',
          subCategoryName: product.subCategory?.[0]?.name || '',
          categoryName: product.category?.[0]?.name || '',
          // Vendor information (already a plain object from .lean())
          vendor: product.vendor ? {
            businessName: product.vendor.businessName,
            email: product.vendor.email,
            contactPhone: product.vendor.contactPhone,
            rating: product.vendor.rating
          } : null
        };

        console.log('✨ [TRANSFORM] Product transformed:', {
          id: product._id,
          title: product.title,
          images: transformedProduct.images
        });

        return transformedProduct;
      } catch (error) {
        console.error('❌ [PRODUCTS FETCH] Error transforming product:', {
          error: error.message,
          productId: product?._id,
          title: product?.title
        });
        return null;
      }
    }).filter(Boolean); // Remove any null products from failed transformations

    res.json({
      success: true,
      products: transformedProducts,
      totalProducts,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      hasNextPage: page < Math.ceil(totalProducts / limit),
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    let product = null;
    
    // Check if productId is a valid MongoDB ObjectId format (24 character hex string)
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24;
    
    if (isValidObjectId) {
      // Try database lookup only if it's a valid ObjectId
      product = await Product.findById(productId)
        .populate('vendor', 'businessName email contactPhone rating')
        .populate('mainCategory', 'name')
        .populate('subCategory', 'name')
        .populate('category', 'name');
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID '${productId}' not found. ${!isValidObjectId ? 'Invalid ID format. ' : ''}Please check the product ID and try again.`
      });
    }

    // Increment view count for database products
    await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

    // Transform image URLs for database products
    const transformedProduct = transformProductImages(product.toObject());

    res.json({
      success: true,
      product: transformedProduct
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

// Add new product
const addProduct = async (req, res) => {
  try {
    console.log('🚀 [PRODUCT CREATE] Request received');
    
    const {
      title,
      description,
      price,
      keywords,
      mainCategory,
      subCategory,
      stock,
      specifications,
      tags
    } = req.body;

    console.log('📝 [PRODUCT CREATE] Validating input data...');
    console.log('📦 [PRODUCT CREATE] Product details:', {
      title,
      description: description?.substring(0, 100) + '...',
      price,
      mainCategory,
      subCategory,
      stock,
      keywordCount: keywords?.length,
      specificationsCount: Object.keys(specifications || {}).length,
      tagsCount: tags?.length
    });

    // Handle mainCategory - convert string to ObjectId by looking up Category
    let parsedMainCategory;
    if (mainCategory !== undefined) {
      if (typeof mainCategory === 'string') {
        console.log('➕ [PRODUCT CREATE] Looking up mainCategory:', mainCategory);
        const Category = require('../models/Category');
        const category = await Category.findOne({ name: mainCategory.trim() });
        if (category) {
          parsedMainCategory = [category._id];
          console.log('➕ [PRODUCT CREATE] Found mainCategory ObjectId:', category._id);
        } else {
          console.warn('➕ [PRODUCT CREATE] mainCategory not found:', mainCategory);
          parsedMainCategory = [];
        }
      } else if (Array.isArray(mainCategory)) {
        // Handle array of strings
        const Category = require('../models/Category');
        const categoryIds = [];
        for (const categoryName of mainCategory) {
          if (typeof categoryName === 'string') {
            const category = await Category.findOne({ name: categoryName.trim() });
            if (category) {
              categoryIds.push(category._id);
            }
          } else {
            // Already ObjectId
            categoryIds.push(categoryName);
          }
        }
        parsedMainCategory = categoryIds;
      } else {
        parsedMainCategory = mainCategory;
      }
    }

    // Handle subCategory - convert string to ObjectId by looking up Category
    let parsedSubCategory;
    if (subCategory !== undefined) {
      if (typeof subCategory === 'string') {
        console.log('➕ [PRODUCT CREATE] Looking up subCategory:', subCategory);
        const Category = require('../models/Category');
        const category = await Category.findOne({ name: subCategory.trim() });
        if (category) {
          parsedSubCategory = [category._id];
          console.log('➕ [PRODUCT CREATE] Found subCategory ObjectId:', category._id);
        } else {
          console.warn('➕ [PRODUCT CREATE] subCategory not found:', subCategory);
          parsedSubCategory = [];
        }
      } else if (Array.isArray(subCategory)) {
        // Handle array of strings
        const Category = require('../models/Category');
        const categoryIds = [];
        for (const categoryName of subCategory) {
          if (typeof categoryName === 'string') {
            const category = await Category.findOne({ name: categoryName.trim() });
            if (category) {
              categoryIds.push(category._id);
            }
          } else {
            // Already ObjectId
            categoryIds.push(categoryName);
          }
        }
        parsedSubCategory = categoryIds;
      } else {
        parsedSubCategory = subCategory;
      }
    }

    // Handle other fields
    const parsedKeywords = typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords;
    const parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    
    let parsedSpecs;
    if (specifications !== undefined) {
      if (typeof specifications === 'string') {
        try {
          parsedSpecs = JSON.parse(specifications);
        } catch (e) {
          console.warn('➕ [PRODUCT CREATE] Failed to parse specifications, keeping as string');
          parsedSpecs = specifications;
        }
      } else {
        parsedSpecs = specifications;
      }
    }

    // Create product object
    const productData = {
      title,
      description,
      price: parseFloat(price),
      keywords: parsedKeywords || [],
      mainCategory: parsedMainCategory || [],
      subCategory: parsedSubCategory || [],
      tags: parsedTags || [],
      stock: parseInt(stock) || 0,
      specifications: parsedSpecs || [],
      isActive: true
    };

    // If this is a vendor request, assign the vendor to the product
    if (req.vendor) {
      productData.vendor = req.vendor.id;
      console.log(`✅ Product will be assigned to vendor: ${req.vendor.id}`);
    } else {
      console.log(`✅ Product will be created as admin product (no vendor)`);
    }

    // Handle image upload
    if (req.file) {
      productData.image = req.file.filename;
    }

    const product = new Product(productData);
    await product.save();

    // Create inventory record for vendor products
    if (req.vendor) {
      try {
        const inventoryData = {
          product: product._id,
          vendor: req.vendor.id,
          currentStock: parseInt(stock) || 0,
          lowStockThreshold: 10,
          reorderPoint: 20,
          reorderQuantity: 50,
          costPrice: parseFloat(price) * 0.7 // Default cost price (70% of selling price)
        };

        const inventory = new Inventory(inventoryData);
        await inventory.save();
      } catch (inventoryError) {
        console.error('Error creating inventory record:', inventoryError);
        // Don't fail the product creation if inventory creation fails
      }
    }

    // Clear Mongoose's internal model cache after adding a product
    Product.collection.conn.db.command({ refreshSessions: 1 });
    
    // Transform response
    const transformedProduct = transformProductImages(product.toObject());

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: transformedProduct
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add product',
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updates = { ...req.body };

    console.log('🔄 [PRODUCT UPDATE] Starting product update for ID:', productId);
    console.log('🔄 [PRODUCT UPDATE] Raw updates received:', updates);

    // Handle mainCategory - convert string to ObjectId by looking up Category
    if (updates.mainCategory !== undefined) {
      if (typeof updates.mainCategory === 'string') {
        console.log('🔄 [PRODUCT UPDATE] Looking up mainCategory:', updates.mainCategory);
        const Category = require('../models/Category');
        const category = await Category.findOne({ name: updates.mainCategory.trim() });
        if (category) {
          updates.mainCategory = [category._id];
          console.log('🔄 [PRODUCT UPDATE] Found mainCategory ObjectId:', category._id);
        } else {
          console.warn('🔄 [PRODUCT UPDATE] mainCategory not found, removing field');
          delete updates.mainCategory;
        }
      } else if (Array.isArray(updates.mainCategory)) {
        // Handle array of strings
        const Category = require('../models/Category');
        const categoryIds = [];
        for (const categoryName of updates.mainCategory) {
          if (typeof categoryName === 'string') {
            const category = await Category.findOne({ name: categoryName.trim() });
            if (category) {
              categoryIds.push(category._id);
            }
          } else {
            // Already ObjectId
            categoryIds.push(categoryName);
          }
        }
        updates.mainCategory = categoryIds;
      }
    }

    // Handle subCategory - convert string to ObjectId by looking up Category
    if (updates.subCategory !== undefined) {
      if (typeof updates.subCategory === 'string') {
        console.log('🔄 [PRODUCT UPDATE] Looking up subCategory:', updates.subCategory);
        const Category = require('../models/Category');
        const category = await Category.findOne({ name: updates.subCategory.trim() });
        if (category) {
          updates.subCategory = [category._id];
          console.log('🔄 [PRODUCT UPDATE] Found subCategory ObjectId:', category._id);
        } else {
          console.warn('🔄 [PRODUCT UPDATE] subCategory not found, removing field');
          delete updates.subCategory;
        }
      } else if (Array.isArray(updates.subCategory)) {
        // Handle array of strings
        const Category = require('../models/Category');
        const categoryIds = [];
        for (const categoryName of updates.subCategory) {
          if (typeof categoryName === 'string') {
            const category = await Category.findOne({ name: categoryName.trim() });
            if (category) {
              categoryIds.push(category._id);
            }
          } else {
            // Already ObjectId
            categoryIds.push(categoryName);
          }
        }
        updates.subCategory = categoryIds;
      }
    }

    // Handle legacy 'category' field the same way
    if (updates.category !== undefined) {
      if (typeof updates.category === 'string') {
        console.log('🔄 [PRODUCT UPDATE] Looking up category:', updates.category);
        const Category = require('../models/Category');
        const category = await Category.findOne({ name: updates.category.trim() });
        if (category) {
          updates.category = [category._id];
          console.log('🔄 [PRODUCT UPDATE] Found category ObjectId:', category._id);
        } else {
          console.warn('🔄 [PRODUCT UPDATE] category not found, removing field');
          delete updates.category;
        }
      }
    }

    // Handle other fields
    if (updates.keywords && typeof updates.keywords === 'string') {
      updates.keywords = updates.keywords.split(',').map(k => k.trim());
    }
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(t => t.trim());
    }
    if (updates.specifications && typeof updates.specifications === 'string') {
      try {
        updates.specifications = JSON.parse(updates.specifications);
      } catch (e) {
        console.warn('🔄 [PRODUCT UPDATE] Failed to parse specifications, keeping as string');
        updates.specifications = updates.specifications;
      }
    }

    // Convert price and stock to numbers
    if (updates.price !== undefined) updates.price = parseFloat(updates.price);
    if (updates.stock !== undefined) {
      updates.stock = parseInt(updates.stock);
    }

    // Handle image upload
    if (req.file) {
      updates.image = req.file.filename;
      console.log('📸 [UPDATE] New image filename:', req.file.filename);
      
      // Delete old image if it exists
      const oldProduct = await Product.findById(productId);
      if (oldProduct && oldProduct.image) {
        const oldImagePath = path.join(__dirname, '../uploads/products', oldProduct.image);
        console.log('🗑️ [UPDATE] Attempting to delete old image:', oldImagePath);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('✅ [UPDATE] Successfully deleted old image');
          } else {
            console.log('ℹ️ [UPDATE] Old image not found at path');
          }
        } catch (error) {
          console.error('❌ [UPDATE] Error deleting old image:', error);
        }
      }
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('✅ Product updated successfully. New stock:', product.stock);

    // Transform response
    const transformedProduct = transformProductImages(product.toObject());

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: transformedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete image file
    if (product.image) {
      const imagePath = path.join('./uploads', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Soft delete by setting isActive to false
    await Product.findByIdAndUpdate(productId, { isActive: false });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    const products = await Product.find({
      isActive: true,
      stock: { $gt: 100, $lt: 200 }  // Filter products with stock between 100 and 200
    })
    .sort({ soldCount: -1, 'ratings.average': -1 })
    .limit(limit)
    .lean();

    const transformedProducts = products.map(transformProductImages);

    res.json({
      success: true,
      products: transformedProducts
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products',
      error: error.message
    });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { q: query, sort, category, minPrice, maxPrice } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log('🔍 [SEARCH] Starting search with query:', query);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build search filter - only search string fields, not ObjectId references
    let filter = {
      isActive: true,
      $or: [
        { title: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { brand: new RegExp(query, 'i') },
        { keywords: { $in: [new RegExp(query, 'i')] } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    // Add category filter if specified
    if (category && category !== 'all') {
      filter.mainCategory = category;
    }

    // Add price range filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Build sort option
    let sortOption = { createdAt: -1 }; // Default to newest
    if (sort) {
      switch (sort) {
        case 'price':
        case 'price-low':
          sortOption = { price: 1 };
          break;
        case 'price-high':
          sortOption = { price: -1 };
          break;
        case 'name':
          sortOption = { title: 1 };
          break;
        case 'rating':
          sortOption = { 'ratings.average': -1 };
          break;
        case 'newest':
        default:
          sortOption = { createdAt: -1 };
          break;
      }
    }

    console.log('🔍 [SEARCH] Filter:', JSON.stringify(filter));
    console.log('🔍 [SEARCH] Sort:', sortOption);

    // First, try to search in categories by name and get their ObjectIds
    let categoryIds = [];
    try {
      const Category = require('../models/Category');
      const matchingCategories = await Category.find({
        name: new RegExp(query, 'i')
      }).select('_id');
      categoryIds = matchingCategories.map(cat => cat._id);
      console.log('🔍 [SEARCH] Found matching category IDs:', categoryIds.length);
    } catch (error) {
      console.log('⚠️ [SEARCH] Category search failed:', error.message);
    }

    // Add category search to the filter if we found matching categories
    if (categoryIds.length > 0) {
      filter.$or.push(
        { category: { $in: categoryIds } },
        { mainCategory: { $in: categoryIds } },
        { subCategory: { $in: categoryIds } }
      );
      console.log('🔍 [SEARCH] Added category search to filter');
    }

    // Execute search query
    const products = await Product.find(filter)
      .populate('vendor', 'businessName email contactPhone rating')
      .populate('mainCategory', 'name')
      .populate('subCategory', 'name')
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalResults = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalResults / limit);

    console.log(`🔍 [SEARCH] Found ${totalResults} results, showing page ${page}/${totalPages}`);

    // Transform product images
    const transformedProducts = products.map(transformProductImages);

    res.json({
      success: true,
      products: transformedProducts,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
      query
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message
    });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const categoryName = req.params.categoryName || req.params.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find category by name to get ObjectId
    const Category = require('../models/Category');
    const category = await Category.findOne({ name: categoryName });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category "${categoryName}" not found`
      });
    }

    // Find products that have this category in any of their category fields
    const filter = {
      $or: [
        { mainCategory: { $in: [category._id] } },
        { subCategory: { $in: [category._id] } },
        { category: { $in: [category._id] } }
      ]
    };

    const products = await Product.find(filter)
      .populate('vendor', 'businessName email contactPhone rating')
      .populate('mainCategory', 'name')
      .populate('subCategory', 'name')
      .populate('category', 'name')
      .skip(skip)
      .limit(limit)
      .lean();

    const totalProducts = await Product.countDocuments(filter);

    const transformedProducts = products.map(product => ({
      ...product,
      image: product.image ? getImageUrl(product.image) : null,
      images: product.images ? product.images.map(img => getImageUrl(img)) : []
    }));

    res.json({
      success: true,
      products: transformedProducts,
      totalProducts,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      category: categoryName
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products by category',
      error: error.message
    });
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      // Remove isActive filter to show all categories
      { $unwind: '$mainCategory' },
      {
        $group: {
          _id: '$mainCategory',
          count: { $sum: 1 },
          subCategories: { $addToSet: '$subCategory' }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1,
          subCategories: {
            $reduce: {
              input: '$subCategories',
              initialValue: [],
              in: {
                $setUnion: ['$$value', '$$this']
              }
            }
          }
        }
      },
      { $sort: { name: 1 } }
    ]);

    // Get unique subcategories across all categories
    const allSubCategories = await Product.aggregate([
      // Remove isActive filter to show all subcategories
      { $unwind: '$subCategory' },
      {
        $group: {
          _id: '$subCategory',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1,
          type: 'subcategory'
        }
      },
      { $sort: { name: 1 } }
    ]);

    res.json({
      success: true,
      categories: categories,
      subcategories: allSubCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get new arrivals (most recently added products)
const getTrendingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20; // Default limit of 20 products
    
    const products = await Product.find({
      isActive: true
    })
    .sort({ createdAt: -1 })  // Sort by creation date in descending order
    .limit(Math.min(limit, 20))  // Ensure we never return more than 20 products
    .lean();

    const transformedProducts = products.map(transformProductImages);

    res.json({
      success: true,
      products: transformedProducts
    });
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch new arrivals',
      error: error.message
    });
  }
};

// Additional compatibility functions
const getNewArrivals = getFeaturedProducts;
const getProductsByMainCategory = getProductsByCategory;
const getProductsBySubCategory = getProductsByCategory;

// Stock Management Functions

// Get low stock products (admin)
const getLowStockProducts = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const result = await StockManager.getLowStockProducts(threshold);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting low stock products',
      error: error.message
    });
  }
};

// Get stock summary for dashboard
const getStockSummary = async (req, res) => {
  try {
    const result = await StockManager.getStockSummary();
    
    res.json(result);
  } catch (error) {
    console.error('Error getting stock summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting stock summary',
      error: error.message
    });
  }
};

// Update product stock (admin)
const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    
    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a non-negative number'
      });
    }
    
    const result = await StockManager.updateStock(id, stock);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stock',
      error: error.message
    });
  }
};

// Get premium products (stock < 50)
const getPremiumProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    const products = await Product.find({
      isActive: true,
      stock: { $lt: 50 }
    })
    .sort({ price: -1, 'ratings.average': -1 }) // Sort by price descending and then by rating
    .limit(limit)
    .lean();

    const transformedProducts = products.map(transformProductImages);

    res.json({
      success: true,
      products: transformedProducts
    });
  } catch (error) {
    console.error('Error fetching premium products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch premium products',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getPremiumProducts, // Added premium products
  searchProducts,
  getProductsByCategory,
  getCategories,
  getTrendingProducts,
  getNewArrivals,
  getProductsByMainCategory,
  getProductsBySubCategory,
  getLowStockProducts,
  getStockSummary,
  updateProductStock,
  upload
};
