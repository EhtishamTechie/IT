const Product = require('../models/Product');
const Category = require('../models/Category');
const Vendor = require('../models/Vendor');
const constants = require('../config/constants');
const path = require('path');

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
    
      // Transform image URLs to ensure consistent path handling
    const transformedProducts = products.map(product => {
      console.log(`🔍 Processing product: ${product.title}, originalImage: ${product.image}`);
      
      // Handle different image path formats and ensure correct URL generation
      let transformedImage = null;
      let transformedImages = [];
      
      if (product.image) {
        console.log(`🔍 Image processing for "${product.image}"`);
        // Ensure consistent path format by always using products/ prefix
        const imageWithoutPrefix = product.image.replace(/^(products\/|uploads\/products\/)/g, '');
        transformedImage = `products/${imageWithoutPrefix}`; // Store with products/ prefix only
        console.log(`🔍 Final transformed image path: ${transformedImage}`);
      }
      
      if (product.images && Array.isArray(product.images)) {
        transformedImages = product.images.map(img => {
          // Ensure consistent path format by always using products/ prefix
          const imgWithoutPrefix = img.replace(/^(products\/|uploads\/products\/)/g, '');
          return `products/${imgWithoutPrefix}`; // Store with products/ prefix only
        });
      }
      
      return {
        ...product,
        image: transformedImage,
        images: transformedImages
      };
    });
    
    console.log('🔍 [VENDOR PRODUCTS] Sample image URLs - BEFORE TRANSFORMATION:', 
      transformedProducts.length > 0 ? 
      { 
        originalImage: products[0]?.image, 
        transformedImage: transformedProducts[0]?.image 
      } : 'No products'
    );
    
    // Debug image data for all products
    console.log('🔍 [VENDOR PRODUCTS] All products image debug:');
    transformedProducts.forEach((product, index) => {
      console.log(`Product ${index + 1} (${product.title}):`, {
        hasImage: !!product.image,
        imageOriginal: products[index]?.image,
        imageTransformed: product.image,
        hasImages: !!product.images?.length,
        imagesArray: product.images
      });
    });
    
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
  console.log('🚨 [GET VENDOR PRODUCT BY ID] Function called!');
  try {
    const productId = req.params.id;
    const vendorId = req.vendor.id;
    
    console.log('🔍 [GET VENDOR PRODUCT BY ID] Starting...', {
      productId,
      vendorId: vendorId?.toString(),
      vendorObject: req.vendor
    });

    // Validate productId format
    if (!productId || typeof productId !== 'string' || productId.length !== 24) {
      console.log('❌ [GET VENDOR PRODUCT BY ID] Invalid product ID format:', productId);
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const product = await Product.findOne({ 
      _id: productId, 
      vendor: vendorId 
    })
    .populate('mainCategory', 'name')
    .populate('vendor', 'businessName')
    .lean();
    
    console.log('🔍 [GET VENDOR PRODUCT BY ID] Database query result:', {
      found: !!product,
      productTitle: product?.title,
      productVendor: product?.vendor?.toString()
    });
    
    if (!product) {
      console.log('❌ [GET VENDOR PRODUCT BY ID] Product not found or unauthorized for vendor:', vendorId);
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }
    
    // Transform image URLs
    const baseURL = constants.BASE_URL;
    let transformedImage = null;
    let transformedImages = [];
    
    if (product.image) {
      if (product.image.includes('/')) {
        transformedImage = `${baseURL}/uploads/${product.image}`;
      } else {
        transformedImage = product.image.startsWith('product-') ? 
          `${baseURL}/uploads/products/${product.image}` : 
          `${baseURL}/uploads/${product.image}`;
      }
    }
    
    if (product.images && Array.isArray(product.images)) {
      transformedImages = product.images.map(img => {
        if (img.includes('/')) {
          return `${baseURL}/uploads/${img}`;
        } else {
          return img.startsWith('product-') ? 
            `${baseURL}/uploads/products/${img}` : 
            `${baseURL}/uploads/${img}`;
        }
      });
    }
    
    const transformedProduct = {
      ...product,
      image: transformedImage,
      images: transformedImages
    };
    
    console.log('✅ [GET VENDOR PRODUCT BY ID] Success - sending product:', {
      id: transformedProduct._id,
      title: transformedProduct.title,
      hasImage: !!transformedProduct.image,
      imageUrl: transformedProduct.image
    });
    
    res.json({
      success: true,
      product: transformedProduct
    });
  } catch (error) {
    console.error('❌ [GET VENDOR PRODUCT BY ID] Error:', error);
    console.error('❌ [GET VENDOR PRODUCT BY ID] Stack:', error.stack);
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
    
    // Handle subCategory similarly
    if (productData.subCategory) {
      console.log('📂 Processing subCategory:', productData.subCategory);
      
      let subcategoryInput = productData.subCategory;
      if (typeof subcategoryInput === 'string') {
        try {
          subcategoryInput = JSON.parse(subcategoryInput);
        } catch (e) {
          subcategoryInput = [subcategoryInput];
        }
      }
      
      if (Array.isArray(subcategoryInput) && subcategoryInput.length > 0) {
        const subcategoryIds = [];
        
        for (const subCatInput of subcategoryInput) {
          if (typeof subCatInput === 'string' && subCatInput.trim()) {
            const category = await Category.findOne({ 
              name: new RegExp(`^${subCatInput.trim()}$`, 'i'),
              isActive: true
            });
            
            if (category) {
              subcategoryIds.push(category._id);
              console.log(`📂 Found subcategory: ${subCatInput} -> ${category._id}`);
            }
          } else if (subCatInput && subCatInput.toString().match(/^[0-9a-fA-F]{24}$/)) {
            subcategoryIds.push(subCatInput);
          }
        }
        
        productData.subCategory = subcategoryIds;
      } else {
        productData.subCategory = [];
      }
    }
    
    // Add vendor and default values
    productData.vendor = vendorId;
    productData.isActive = true;
    
    // Handle image data from multer/watermark middleware
    console.log('🖼️ Processing uploaded images...');
    console.log('🖼️ req.files:', req.files);
    console.log('🖼️ req.file:', req.file);
    console.log('🖼️ req.processedFiles:', req.processedFiles);
    
    // Check for processed files first (after watermarking)
    if (req.processedFiles && Object.keys(req.processedFiles).length > 0) {
      console.log('🖼️ Using processed files from watermarking middleware');
      
      for (const [fieldName, processedFiles] of Object.entries(req.processedFiles)) {
        console.log(`🖼️ Processing field ${fieldName} with ${processedFiles.length} files`);
        
        if (processedFiles && processedFiles.length > 0) {
          if (fieldName === 'image' || fieldName === 'images') {
            // Store just the filename without products/ prefix to match existing pattern
            productData.image = processedFiles[0].filename;
            console.log(`🖼️ Set main image:`, productData.image);
            
            if (processedFiles.length > 1) {
              productData.images = processedFiles.map(file => file.filename);
              console.log(`🖼️ Set additional images:`, productData.images);
            }
            break; // Use the first valid field found
          }
        }
      }
    }
    // Fallback to original files if no processed files
    else if (req.files || req.file) {
      console.log('🖼️ Using original files (watermarking may have failed)');
      
      // Handle single file upload (req.file)
      if (req.file) {
        console.log('🖼️ Single file upload detected:', req.file.filename);
        productData.image = req.file.filename; // Store just the filename without products/ prefix
      } 
      // Handle multiple file fields (req.files)
      else if (req.files) {
        console.log('🖼️ Multiple files upload detected');
        
        // Check for different possible field names
        if (req.files.image) {
          console.log('🖼️ Image field found:', req.files.image);
          if (Array.isArray(req.files.image)) {
            productData.image = `products/${req.files.image[0].filename}`;
            productData.images = req.files.image.map(file => `products/${file.filename}`);
            console.log('🖼️ Array of images, using first as main with products/ prefix:', productData.image);
          } else {
            productData.image = `products/${req.files.image.filename}`;
            console.log('🖼️ Single image file with products/ prefix:', productData.image);
          }
        }
        // Check for 'images' field
        else if (req.files.images) {
          console.log('🖼️ Images field found:', req.files.images);
          if (Array.isArray(req.files.images)) {
            productData.image = `products/${req.files.images[0].filename}`;
            productData.images = req.files.images.map(file => `products/${file.filename}`);
          } else {
            productData.image = `products/${req.files.images.filename}`;
          }
        }
        // Check for any file field (fallback)
        else {
          const fileKeys = Object.keys(req.files);
          console.log('🖼️ Available file fields:', fileKeys);
          if (fileKeys.length > 0) {
            const firstFieldFiles = req.files[fileKeys[0]];
            if (Array.isArray(firstFieldFiles) && firstFieldFiles.length > 0) {
              productData.image = `products/${firstFieldFiles[0].filename}`;
              productData.images = firstFieldFiles.map(file => `products/${file.filename}`);
            } else if (firstFieldFiles && firstFieldFiles.filename) {
              productData.image = `products/${firstFieldFiles.filename}`;
            }
            console.log('🖼️ Using fallback field with products/ prefix:', fileKeys[0], 'with image:', productData.image);
          }
        }
      }
    } else {
      console.log('🖼️ No files detected in request');
      console.log('🖼️ req.file:', req.file);
      console.log('🖼️ req.files:', req.files);
      console.log('🖼️ req.processedFiles:', req.processedFiles);
    }
    
    // Additional debugging
    console.log('🖼️ Final image assignment:', {
      hasImage: !!productData.image,
      imageName: productData.image,
      hasImages: !!productData.images,
      imagesCount: productData.images?.length || 0
    });
    
    console.log('📦 Final processed productData:', {
      title: productData.title,
      price: productData.price,
      vendor: productData.vendor,
      mainCategory: productData.mainCategory,
      subCategory: productData.subCategory,
      hasImage: !!productData.image,
      imageName: productData.image,
      hasImages: !!productData.images,
      imagesArray: productData.images,
      fullProductData: productData
    });
    
    const product = new Product(productData);
    
    // Log what's about to be saved
    console.log('💾 About to save product with image data:', {
      productId: product._id,
      image: product.image,
      images: product.images,
      hasImageField: product.image !== undefined,
      imageValue: product.image
    });
    
    await product.save();
    
    console.log('✅ Product saved to database');
    
    // Clear product caches after successful save
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated');
    
    // Verify what was actually saved
    const savedProduct = await Product.findById(product._id).lean();
    console.log('🔍 Verified saved product image data:', {
      savedImage: savedProduct.image,
      savedImages: savedProduct.images,
      imageExists: !!savedProduct.image
    });
    
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

// Update vendor product
const updateVendorProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const vendorId = req.vendor.id;
    
    console.log('🔄 [UPDATE PRODUCT] Starting update for:', productId);
    console.log('🔄 [UPDATE PRODUCT] Request body:', req.body);
    console.log('🔄 [UPDATE PRODUCT] MainCategory from form:', req.body.mainCategory);
    console.log('🔄 [UPDATE PRODUCT] SubCategory from form:', req.body.subCategory);
    
    // Find product belonging to this vendor
    const existingProduct = await Product.findOne({ 
      _id: productId, 
      vendor: vendorId 
    });
    
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }
    
    // Start with existing product data and apply updates
    let updateData = { ...existingProduct.toObject() };
    delete updateData._id; // Remove _id to prevent conflicts
    
    // Apply new form data
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== '') {
        updateData[key] = req.body[key];
      }
    });
    
    // Handle category updates
    if (req.body.mainCategory) {
      let categoryInput = req.body.mainCategory;
      if (typeof categoryInput === 'string') {
        try {
          categoryInput = JSON.parse(categoryInput);
        } catch (e) {
          categoryInput = [categoryInput];
        }
      }
      
      if (Array.isArray(categoryInput) && categoryInput.length > 0) {
        const categoryIds = [];
        for (const catInput of categoryInput) {
          if (typeof catInput === 'string' && catInput.trim()) {
            const category = await Category.findOne({ 
              name: new RegExp(`^${catInput.trim()}$`, 'i'),
              isActive: true
            });
            if (category) {
              categoryIds.push(category._id);
            }
          } else if (catInput && catInput.toString().match(/^[0-9a-fA-F]{24}$/)) {
            categoryIds.push(catInput);
          }
        }
        updateData.mainCategory = categoryIds;
      }
    }

    // Handle subCategory updates (same logic as mainCategory)
    if (updateData.subCategory) {
      let subcategoryInput = updateData.subCategory;
      console.log('🔍 [UPDATE] Processing subCategory:', subcategoryInput, 'Type:', typeof subcategoryInput);
      
      if (typeof subcategoryInput === 'string') {
        try {
          subcategoryInput = JSON.parse(subcategoryInput);
        } catch (e) {
          // If it's just a string and not JSON, treat it as single category
          subcategoryInput = subcategoryInput.trim() ? [subcategoryInput.trim()] : [];
        }
      }
      
      console.log('🔍 [UPDATE] Parsed subCategory:', subcategoryInput);
      
      if (Array.isArray(subcategoryInput) && subcategoryInput.length > 0) {
        const subcategoryIds = [];
        for (const subCatInput of subcategoryInput) {
          if (typeof subCatInput === 'string' && subCatInput.trim()) {
            const subcategory = await Category.findOne({ 
              name: new RegExp(`^${subCatInput.trim()}$`, 'i'),
              isActive: true
            });
            if (subcategory) {
              subcategoryIds.push(subcategory._id);
            }
          } else if (subCatInput && subCatInput.toString().match(/^[0-9a-fA-F]{24}$/)) {
            subcategoryIds.push(subCatInput);
          }
        }
        updateData.subCategory = subcategoryIds;
        console.log('🔍 [UPDATE] Final subCategory IDs:', subcategoryIds);
      } else {
        // If empty or invalid, set to empty array
        updateData.subCategory = [];
        console.log('🔍 [UPDATE] Setting subCategory to empty array');
      }
    }
    
    // Handle image updates with proper products/ prefix
    if (req.files || req.file) {
      console.log('🖼️ Processing file uploads for update');
      
      // Keep track of old images for cleanup
      const oldMainImage = existingProduct.image;
      const oldAdditionalImages = existingProduct.images || [];
      
      if (req.file) {
        // Single file upload
        updateData.image = `products/${req.file.filename}`;
        console.log('🖼️ Single file update with products/ prefix:', updateData.image);
      } else if (req.files && req.files.image) {
        if (Array.isArray(req.files.image)) {
          // Multiple files upload
          updateData.image = `products/${req.files.image[0].filename}`;
          updateData.images = req.files.image.map(file => `products/${file.filename}`);
          console.log('🖼️ Multiple files update with products/ prefix:', {
            main: updateData.image,
            additional: updateData.images
          });
        } else {
          // Single file in files object
          updateData.image = `products/${req.files.image.filename}`;
          console.log('🖼️ Single file from files object with products/ prefix:', updateData.image);
        }
      }
      
      // TODO: Add cleanup of old images after successful update
      // This should be handled by a separate cleanup service
    }
    
    // Use findOneAndUpdate to ensure we only update the correct vendor's product
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, vendor: vendorId }, // Ensure we're updating the right product for this vendor
      { $set: updateData }, // Use $set to update only the specified fields
      { 
        new: true, // Return updated document
        runValidators: true // Run model validations
      }
    )
    .populate('mainCategory', 'name')
    .populate('vendor', 'businessName');

    // Clear product caches after update
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated after vendor product update');
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating vendor product:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update vendor product',
      error: error.message
    });
  }
};

// Delete vendor product
const deleteVendorProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const vendorId = req.vendor.id;
    
    const deletedProduct = await Product.findOneAndDelete({ 
      _id: productId, 
      vendor: vendorId 
    });
    
    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    // Clear product caches after deletion
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated after vendor product deletion');
    
    res.json({
      success: true,
      message: 'Product deleted successfully',
      deletedProduct: { id: deletedProduct._id, title: deletedProduct.title }
    });
  } catch (error) {
    console.error('Error deleting vendor product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor product',
      error: error.message
    });
  }
};

// Get vendor product statistics
const getVendorProductStats = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    
    const stats = await Product.aggregate([
      { $match: { vendor: vendorId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalValue: { $sum: '$price' },
          lowStockProducts: { $sum: { $cond: [{ $lte: ['$stock', 5] }, 1, 0] } },
          outOfStockProducts: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalProducts: 0,
      activeProducts: 0,
      totalValue: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0
    };
    
    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Error fetching vendor product stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor product statistics',
      error: error.message
    });
  }
};

module.exports = {
  getVendorProducts,
  getVendorProductById,
  addVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  getVendorProductStats
};