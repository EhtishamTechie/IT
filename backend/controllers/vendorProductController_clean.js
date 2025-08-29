const Product = require('../models/Product');
const Vendor = require('../models/Vendor');

// Get all vendor products (only products belonging to the logged-in vendor)
const getVendorProducts = async (req, res) => {
  try {
    console.log('🔍 [VENDOR PRODUCTS] Starting fetch...');
    console.log('🔍 [VENDOR PRODUCTS] req.vendor:', req.vendor);
    console.log('🔍 [VENDOR PRODUCTS] req.query:', req.query);
    
    const vendorId = req.vendor?.id; // Safe access
    if (!vendorId) {
      console.error('❌ [VENDOR PRODUCTS] No vendor ID found in request');
      return res.status(400).json({
        success: false,
        message: 'Vendor authentication required'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items
    const skip = (page - 1) * limit;
    
    console.log('🔍 [VENDOR PRODUCTS] Pagination:', { page, limit, skip });
    
    // Build query for vendor's products
    const query = { vendor: vendorId };
    
    // Add filters if provided
    if (req.query.category) {
      query.mainCategory = req.query.category;
      console.log('🔍 [VENDOR PRODUCTS] Category filter applied:', req.query.category);
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
      console.log('🔍 [VENDOR PRODUCTS] Active filter applied:', req.query.isActive);
    }
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
      console.log('🔍 [VENDOR PRODUCTS] Search filter applied:', req.query.search);
    }
    
    console.log('🔍 [VENDOR PRODUCTS] Final query:', JSON.stringify(query, null, 2));
    
    // Build sort
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = {};
    sort[sortBy] = sortOrder;
    
    console.log('🔍 [VENDOR PRODUCTS] Sort:', sort);
    
    // Get products with pagination
    console.log('🔍 [VENDOR PRODUCTS] Executing Product.find...');
    const products = await Product.find(query)
      .populate('mainCategory', 'name')
      .populate('vendor', 'businessName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    console.log('🔍 [VENDOR PRODUCTS] Found products:', products.length);
    
    // Transform image URLs to full URLs (same as productController)
    const baseURL = process.env.BASE_URL || 'http://localhost:5000';
    const transformedProducts = products.map(product => ({
      ...product,
      image: product.image ? `${baseURL}/uploads/${product.image}` : null,
      images: product.images ? product.images.map(img => `${baseURL}/uploads/${img}`) : []
    }));
    
    console.log('🔍 [VENDOR PRODUCTS] Sample image URLs:', 
      transformedProducts.length > 0 ? 
      { 
        originalImage: products[0]?.image, 
        transformedImage: transformedProducts[0]?.image 
      } : 'No products'
    );
    
    // Get total count
    console.log('🔍 [VENDOR PRODUCTS] Getting total count...');
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    
    console.log('✅ [VENDOR PRODUCTS] Success:', { 
      productsFound: products.length, 
      totalProducts, 
      totalPages, 
      vendorId 
    });
    
    res.json({
      success: true,
      products: transformedProducts,
      totalProducts,
      totalPages,
      currentPage: page,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalProducts,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ [VENDOR PRODUCTS] Error:', error);
    console.error('❌ [VENDOR PRODUCTS] Stack:', error.stack);
    console.error('❌ [VENDOR PRODUCTS] req.vendor:', req.vendor);
    console.error('❌ [VENDOR PRODUCTS] req.query:', req.query);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor products',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get vendor product by ID
const getVendorProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const vendorId = req.vendor.id;
    
    const product = await Product.findOne({ 
      _id: productId, 
      vendor: vendorId 
    })
    .populate('mainCategory', 'name')
    .populate('vendor', 'businessName')
    .lean();
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching vendor product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor product',
      error: error.message
    });
  }
};

// Add new vendor product
const addVendorProduct = async (req, res) => {
  try {
    console.log('🚀 ADD VENDOR PRODUCT - Starting...');
    console.log('📦 Raw request body:', req.body);
    
    const vendorId = req.vendor.id;
    
    // Parse and handle category data properly
    let productData = { ...req.body };
    
    // Handle mainCategory - convert from names to ObjectIds if needed
    if (productData.mainCategory) {
      console.log('📂 Processing mainCategory:', productData.mainCategory);
      
      // Handle different input formats
      let categoryInput = productData.mainCategory;
      if (typeof categoryInput === 'string') {
        try {
          categoryInput = JSON.parse(categoryInput);
        } catch (e) {
          console.log('📂 String mainCategory, treating as single category');
          categoryInput = [categoryInput];
        }
      }
      
      console.log('📂 Parsed mainCategory:', categoryInput);
      
      // Convert category names to ObjectIds
      if (Array.isArray(categoryInput) && categoryInput.length > 0) {
        const Category = require('../models/Category');
        const categoryIds = [];
        
        for (const catInput of categoryInput) {
          if (typeof catInput === 'string' && catInput.trim()) {
            // Find category by name
            const category = await Category.findOne({ 
              name: new RegExp(`^${catInput.trim()}$`, 'i'),
              isActive: true
            });
            
            if (category) {
              categoryIds.push(category._id);
              console.log(`📂 Found category: ${catInput} -> ${category._id}`);
            } else {
              console.log(`📂 ❌ Category not found: ${catInput}`);
            }
          } else if (catInput && catInput.toString().match(/^[0-9a-fA-F]{24}$/)) {
            // Already an ObjectId
            categoryIds.push(catInput);
            console.log(`📂 Using ObjectId: ${catInput}`);
          }
        }
        
        productData.mainCategory = categoryIds;
      } else {
        productData.mainCategory = [];
      }
    }
    
    // Handle image data from multer/watermark middleware
    console.log('🖼️ Processing uploaded images...');
    console.log('🖼️ req.files:', req.files);
    console.log('🖼️ req.file:', req.file);
    
    if (req.files && req.files.image) {
      if (Array.isArray(req.files.image)) {
        productData.image = req.files.image[0].filename;
        productData.images = req.files.image.map(file => file.filename);
      } else {
        productData.image = req.files.image.filename;
      }
      console.log('🖼️ Set image:', productData.image);
    } else if (req.file) {
      productData.image = req.file.filename;
      console.log('🖼️ Set image from req.file:', productData.image);
    }
    
    // Add vendor and default values
    productData.vendor = vendorId;
    productData.isActive = true;
    
    console.log('📦 Final processed productData:', {
      title: productData.title,
      hasImage: !!productData.image,
      imageName: productData.image,
      mainCategory: productData.mainCategory,
      vendor: productData.vendor
    });
    
    const product = new Product(productData);
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('mainCategory', 'name')
      .populate('vendor', 'businessName');
    
    console.log('✅ Product created successfully:', populatedProduct._id);
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Error adding vendor product:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add vendor product',
      error: error.message
    });
  }
};

module.exports = {
  getVendorProducts,
  getVendorProductById,
  addVendorProduct
};
