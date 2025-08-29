const Product = require('../models/Product');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const constants = require('../config/constants');
const { getImageUrl } = require('../config/serverConfig');

// Get all ADMIN products (exclude vendor products)
const getAdminProducts = async (req, res) => {
  try {
    console.log('📊 Admin Products Request - Admin Only');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filter: Only products WITHOUT a vendor (admin products)
    const baseFilter = { 
      $or: [
        { vendor: null },
        { vendor: { $exists: false } }
      ]
    };
    
    console.log('🔍 Admin base filter:', baseFilter);
    
    // Build conditions array for proper combination
    const conditions = [baseFilter];
    
    // Add additional filters
    if (req.query.category) {
      conditions.push({ mainCategory: { $in: [req.query.category] } });
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      conditions.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      });
    }
    
    if (req.query.approvalStatus && req.query.approvalStatus !== 'all') {
      conditions.push({ approvalStatus: req.query.approvalStatus });
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      const priceFilter = {};
      if (req.query.minPrice) {
        priceFilter.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        priceFilter.$lte = parseFloat(req.query.maxPrice);
      }
      conditions.push({ price: priceFilter });
    }

    // Combine all conditions using $and
    const filter = conditions.length > 1 ? { $and: conditions } : conditions[0];
    
    console.log('🔍 Final combined filter:', JSON.stringify(filter, null, 2));
    console.log('🔍 Search term:', req.query.search);
    
    // Sort options
    let sortOption = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price-low':
          sortOption = { price: 1 };
          break;
        case 'price-high':
          sortOption = { price: -1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
      }
    }
    
    const products = await Product.find(filter)
      .populate('mainCategory', 'name')
      .populate('subCategory', 'name')
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    
    // Transform image URLs to full URLs and include populated category names
    const transformedProducts = products.map(product => {
      const productObj = product.toObject();
      
      // Use the same simple image handling as used products
      const imageUrl = product.image ? (
        product.image.startsWith('http') ? 
          product.image : 
          `/uploads/products/${product.image}`
      ) : `/assets/no-image.png`;

      return {
        ...productObj,
        image: imageUrl,
        images: product.images ? product.images.map(img => 
          img.startsWith('http') ? img : `/uploads/products/${img}`
        ) : [],
        source: 'admin', // Mark as admin product
        // Include both ObjectIds and names for categories
        mainCategoryName: Array.isArray(productObj.mainCategory) && productObj.mainCategory.length > 0 
          ? productObj.mainCategory[0]?.name || productObj.mainCategory[0] 
          : '',
        subCategoryName: Array.isArray(productObj.subCategory) && productObj.subCategory.length > 0 
          ? productObj.subCategory[0]?.name || productObj.subCategory[0] 
          : '',
        categoryName: Array.isArray(productObj.category) && productObj.category.length > 0 
          ? productObj.category[0]?.name || productObj.category[0] 
          : ''
      };
    });
    
    console.log(`✅ Found ${totalProducts} admin products`);
    
    // Debug: Log first few products to verify vendor filtering
    products.slice(0, 3).forEach((product, index) => {
      console.log(`🔍 [ADMIN PRODUCT ${index + 1}]:`, {
        title: product.title,
        vendor: product.vendor ? (product.vendor.businessName || product.vendor) : 'NO VENDOR (ADMIN)',
        hasVendor: !!product.vendor
      });
    });
    console.log('📝 Sample product categories:', transformedProducts[0] ? {
      mainCategory: transformedProducts[0].mainCategory,
      mainCategoryName: transformedProducts[0].mainCategoryName,
      subCategory: transformedProducts[0].subCategory, 
      subCategoryName: transformedProducts[0].subCategoryName
    } : 'No products found');
    
    res.json({
      success: true,
      products: transformedProducts,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      hasNextPage: page < Math.ceil(totalProducts / limit),
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin products',
      error: error.message
    });
  }
};

// Get single admin product
const getAdminProductById = async (req, res) => {
  try {
    console.log('🔍 Fetching admin product:', req.params.id);
    
    const product = await Product.findOne({ 
      _id: req.params.id,
      $or: [
        { vendor: null },
        { vendor: { $exists: false } }
      ]
    })
    .populate('mainCategory', 'name')
    .populate('subCategory', 'name')
    .populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Admin product not found'
      });
    }
    
    const productObj = product.toObject();
    
    // Transform image URLs to full URLs and include category names
    const transformedProduct = {
      ...productObj,
      image: product.image ? getImageUrl(product.image) : null,
      images: product.images ? product.images.map(img => getImageUrl(img)) : [],
      // Include both ObjectIds and names for categories
      mainCategoryName: Array.isArray(productObj.mainCategory) && productObj.mainCategory.length > 0 
        ? productObj.mainCategory[0]?.name || productObj.mainCategory[0] 
        : '',
      subCategoryName: Array.isArray(productObj.subCategory) && productObj.subCategory.length > 0 
        ? productObj.subCategory[0]?.name || productObj.subCategory[0] 
        : '',
      categoryName: Array.isArray(productObj.category) && productObj.category.length > 0 
        ? productObj.category[0]?.name || productObj.category[0] 
        : ''
    };
    
    console.log('📝 Product category info:', {
      mainCategory: transformedProduct.mainCategory,
      mainCategoryName: transformedProduct.mainCategoryName,
      subCategory: transformedProduct.subCategory,
      subCategoryName: transformedProduct.subCategoryName
    });
    
    res.json({
      success: true,
      data: transformedProduct,
      product: transformedProduct
    });
  } catch (error) {
    console.error('Error fetching admin product by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin product',
      error: error.message
    });
  }
};

// Add admin product
const addAdminProduct = async (req, res) => {
  try {
    console.log('📝 Adding admin product');
    console.log('📦 Product data received:', req.body);
    console.log('📷 Files received:', req.files);
    
    const productData = { ...req.body };
    
    // Handle category conversion (same logic as vendor products)
    if (productData.mainCategory) {
      try {
        let mainCategories = Array.isArray(productData.mainCategory) 
          ? productData.mainCategory 
          : JSON.parse(productData.mainCategory);
        
        const mainCategoryIds = [];
        for (const categoryName of mainCategories) {
          if (categoryName && categoryName.trim()) {
            const category = await Category.findOne({ 
              name: categoryName.trim(),
              createdByType: 'admin' // Only use admin categories
            });
            if (category) {
              mainCategoryIds.push(category._id);
            }
          }
        }
        productData.mainCategory = mainCategoryIds;
      } catch (error) {
        console.error('Error processing main categories:', error);
        productData.mainCategory = [];
      }
    }

    if (productData.subCategory) {
      try {
        let subCategories = Array.isArray(productData.subCategory) 
          ? productData.subCategory 
          : JSON.parse(productData.subCategory);
        
        const subCategoryIds = [];
        for (const categoryName of subCategories) {
          if (categoryName && categoryName.trim()) {
            const category = await Category.findOne({ 
              name: categoryName.trim(),
              createdByType: 'admin' // Only use admin categories
            });
            if (category) {
              subCategoryIds.push(category._id);
            }
          }
        }
        productData.subCategory = subCategoryIds;
      } catch (error) {
        console.error('Error processing sub categories:', error);
        productData.subCategory = [];
      }
    }
    
    // Handle file uploads
    if (req.files && req.files.image && req.files.image[0]) {
      productData.image = req.files.image[0].filename;
    }
    
    if (req.files && req.files.images && req.files.images.length > 0) {
      productData.images = req.files.images.map(file => file.filename);
    }
    
    // IMPORTANT: Do NOT set vendor field - this makes it an admin product
    delete productData.vendor;
    
    // Set admin-specific defaults
    productData.approvalStatus = 'approved'; // Admin products are auto-approved
    productData.isActive = true;
    
    console.log('📝 Final admin product data:', productData);
    
    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Admin product created successfully:', product._id);
    
    res.status(201).json({
      success: true,
      message: 'Admin product created successfully',
      product: {
        ...product.toObject(),
        image: product.image ? `${constants.UPLOADS_URL}/${product.image}` : null,
        images: product.images ? product.images.map(img => `${constants.UPLOADS_URL}/${img}`) : [],
        source: 'admin'
      }
    });
  } catch (error) {
    console.error('Error creating admin product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin product',
      error: error.message
    });
  }
};

// Update admin product
const updateAdminProduct = async (req, res) => {
  try {
    console.log('📝 Updating admin product:', req.params.id);
    
    const updateData = { ...req.body };
    updateData.updatedAt = new Date();
    
    // Handle category conversion (same logic as add)
    if (updateData.mainCategory) {
      try {
        let mainCategories = Array.isArray(updateData.mainCategory) 
          ? updateData.mainCategory 
          : JSON.parse(updateData.mainCategory);
        
        const mainCategoryIds = [];
        for (const categoryName of mainCategories) {
          if (categoryName && categoryName.trim()) {
            const category = await Category.findOne({ 
              name: categoryName.trim(),
              createdByType: 'admin'
            });
            if (category) {
              mainCategoryIds.push(category._id);
            }
          }
        }
        updateData.mainCategory = mainCategoryIds;
      } catch (error) {
        console.error('Error processing main categories:', error);
        updateData.mainCategory = [];
      }
    }

    if (updateData.subCategory) {
      try {
        let subCategories = Array.isArray(updateData.subCategory) 
          ? updateData.subCategory 
          : JSON.parse(updateData.subCategory);
        
        const subCategoryIds = [];
        for (const categoryName of subCategories) {
          if (categoryName && categoryName.trim()) {
            const category = await Category.findOne({ 
              name: categoryName.trim(),
              createdByType: 'admin'
            });
            if (category) {
              subCategoryIds.push(category._id);
            }
          }
        }
        updateData.subCategory = subCategoryIds;
      } catch (error) {
        console.error('Error processing sub categories:', error);
        updateData.subCategory = [];
      }
    }
    
    // Handle file uploads
    if (req.files && req.files.image && req.files.image[0]) {
      updateData.image = req.files.image[0].filename;
    }
    
    if (req.files && req.files.images && req.files.images.length > 0) {
      updateData.images = req.files.images.map(file => file.filename);
    }
    
    // Ensure vendor field is not set
    delete updateData.vendor;
    
    // Clear product caches before update
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated before admin product update');

    const product = await Product.findOneAndUpdate(
      { 
        _id: req.params.id,
        $or: [
          { vendor: null },
          { vendor: { $exists: false } }
        ]
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Admin product not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin product updated successfully',
      product: {
        ...product.toObject(),
        image: product.image ? `${constants.UPLOADS_URL}/${product.image}` : null,
        images: product.images ? product.images.map(img => `${constants.UPLOADS_URL}/${img}`) : [],
        source: 'admin'
      }
    });
  } catch (error) {
    console.error('Error updating admin product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin product',
      error: error.message
    });
  }
};

// Delete admin product
const deleteAdminProduct = async (req, res) => {
  try {
    console.log('🗑️ Deleting admin product:', req.params.id);
    
    // Clear product caches before deletion
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated before admin product deletion');

    const product = await Product.findOneAndDelete({ 
      _id: req.params.id,
      $or: [
        { vendor: null },
        { vendor: { $exists: false } }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Admin product not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin product',
      error: error.message
    });
  }
};

module.exports = {
  getAdminProducts,
  getAdminProductById,
  addAdminProduct,
  updateAdminProduct,
  deleteAdminProduct
};
