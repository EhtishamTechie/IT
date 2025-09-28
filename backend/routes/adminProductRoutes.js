const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const multer = require('multer');
const path = require('path');
const authAdmin = require('../middleware/authAdmin'); // FIXED MIDDLEWARE
const { uploadSingleProductImage, uploadProductMedia, handleUploadError } = require('../middleware/uploadMiddleware');
const { getImageUrl } = require('../config/serverConfig');

// Create new product
router.post('/', authAdmin, uploadProductMedia, async (req, res) => {
  try {
    console.log('➕ [PRODUCT CREATE] Starting product creation');
    console.log('➕ [PRODUCT CREATE] Raw data received:', req.body);

    // Get the files if uploaded
    console.log('🔍 [ADMIN PRODUCT DEBUG] Raw req.files received:', JSON.stringify(req.files, null, 2));
    console.log('🔍 [ADMIN PRODUCT DEBUG] req.files?.image:', req.files?.image);
    console.log('🔍 [ADMIN PRODUCT DEBUG] req.files?.images:', req.files?.images);
    
    const images = req.files?.images ? req.files.images.map(file => `products/${file.filename}`) : [];
    const video = req.files?.video ? `products/${req.files.video[0].filename}` : null;
    
    // Handle PRIMARY image field (dedicated primary image upload)
    const primaryImage = req.files?.image ? `products/${req.files.image[0].filename}` : null;
    
    // Process category data - ensure arrays for all category fields
    const mainCategory = req.body['mainCategory[]'] || req.body.mainCategory;
    const subCategory = req.body['subCategory[]'] || req.body.subCategory;
    const category = req.body['category[]'] || req.body.category || mainCategory;

    console.log('📸 [ADMIN PRODUCT CREATE] Image processing:', {
      primaryImage,
      multipleImagesCount: images.length,
      videoFile: !!video,
      imagesArray: images
    });

    // Set image fields with correct priority: Primary image takes precedence
    let finalPrimaryImage = null;
    if (primaryImage) {
      // Use the dedicated primary image
      finalPrimaryImage = primaryImage;
      console.log('✅ [ADMIN PRODUCT CREATE] Using dedicated primary image:', primaryImage);
    } else if (images.length > 0) {
      // Fallback to first multiple image if no primary image provided
      finalPrimaryImage = images[0];
      console.log('⚠️ [ADMIN PRODUCT CREATE] No primary image provided, using first multiple image:', images[0]);
    }

    // Create the product using standardized image path format
    const productData = {
      ...req.body,
      image: finalPrimaryImage, // Use the correctly prioritized primary image
      images: images.length > 0 ? images : [], // Multiple images array
      video: video, // Video file
      createdBy: req.user.id,
      vendor: null, // This is an admin product
      mainCategory: mainCategory ? [mainCategory] : [],
      subCategory: subCategory ? [subCategory] : [],
      category: category ? [category] : mainCategory ? [mainCategory] : [] // Fallback to mainCategory
    };

    const product = new Product(productData);
    await product.save();
    
    // Clear product caches after successful save
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated after admin product creation');
    
    // Fetch the product with populated categories
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('mainCategory', 'name')
      .populate('subCategory', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Get all products for admin review (with filtering) - FIXED ROUTE PATH
router.get('/', authAdmin, async (req, res) => {
  try {
    const { approvalStatus, page = 1, limit = 20, search, showAll = false } = req.query;
    
    // Build filter - always start with array for proper combination
    const conditions = [];
    
    // By default, only show admin-created products (products without vendor)
    // Unless explicitly requesting all products
    if (showAll !== 'true') {
      conditions.push({
        $or: [
          { vendor: { $exists: false } }, // Products created by admin (no vendor)
          { vendor: null } // Products with null vendor
        ]
      });
    }
    
    if (approvalStatus && approvalStatus !== 'all') {
      conditions.push({ approvalStatus: approvalStatus });
    }
    
    if (search) {
      conditions.push({
        $or: [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ]
      });
    }

    // Combine all conditions using $and
    const filter = conditions.length > 1 ? { $and: conditions } : (conditions[0] || {});

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute queries in parallel for better performance
    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate('vendor', 'businessName email contactPhone rating')
        .populate('category', 'name')
        .populate('mainCategory', 'name')
        .populate('subCategory', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(filter)
    ]);

    // Debug logging after successful database operations
    console.log('🔍 [ADMIN PRODUCTS] Filter:', JSON.stringify(filter));
    console.log('🔍 [ADMIN PRODUCTS] Found products:', products.length, 'Total:', totalProducts);
    
    if (products.length > 0) {
      products.forEach((product, index) => {
        console.log(`🔍 [PRODUCT ${index + 1}]:`, {
          title: product.title,
          vendor: product.vendor ? (product.vendor.businessName || product.vendor) : 'NO VENDOR',
          hasVendor: !!product.vendor,
          image: product.image,
          images: product.images,
          imageUrl: getImageUrl(product.image)
        });
      });
    }
    
    return res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
        totalProducts,
        hasNextPage: parseInt(page) < Math.ceil(totalProducts / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin products:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message
      });
    }
  }
});

// Update product approval status
router.put('/products/:id/approval', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, rejectionReason } = req.body;
    const adminId = req.user.id;

    // Validate approval status
    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval status'
      });
    }

    // Find the product
    const product = await Product.findById(id).populate('vendor', 'businessName email');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update product approval status
    const updateData = {
      approvalStatus,
      approvedBy: adminId,
      approvedAt: new Date()
    };

    // Clear product caches before update
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated before approval status update');

    if (approvalStatus === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await Product.findByIdAndUpdate(id, updateData);

    // Update vendor stats
    if (product.vendor) {
      const vendorStats = await Product.aggregate([
        { $match: { vendor: product.vendor._id } },
        {
          $group: {
            _id: '$approvalStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      const stats = {
        totalProducts: 0,
        approvedProducts: 0,
        pendingProducts: 0,
        rejectedProducts: 0
      };

      vendorStats.forEach(stat => {
        stats.totalProducts += stat.count;
        if (stat._id === 'approved') stats.approvedProducts = stat.count;
        if (stat._id === 'pending') stats.pendingProducts = stat.count;
        if (stat._id === 'rejected') stats.rejectedProducts = stat.count;
      });

      await Vendor.findByIdAndUpdate(product.vendor._id, {
        'stats.totalProducts': stats.totalProducts,
        'stats.approvedProducts': stats.approvedProducts,
        'stats.pendingProducts': stats.pendingProducts,
        'stats.rejectedProducts': stats.rejectedProducts
      });
    }

    res.json({
      success: true,
      message: `Product ${approvalStatus} successfully`,
      product: await Product.findById(id).populate('vendor', 'businessName email').populate('approvedBy', 'name email')
    });

  } catch (error) {
    console.error('Error updating product approval status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product approval status',
      error: error.message
    });
  }
});

// Bulk approve/reject products
router.put('/products/bulk-approval', authAdmin, async (req, res) => {
  try {
    const { productIds, approvalStatus, rejectionReason } = req.body;
    const adminId = req.user.id;

    // Validate inputs
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs are required'
      });
    }

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval status'
      });
    }

    // Clear product caches before bulk update
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated before bulk approval update');

    // Update products
    const updateData = {
      approvalStatus,
      approvedBy: adminId,
      approvedAt: new Date()
    };

    if (approvalStatus === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      updateData
    );

    // Update vendor stats for affected vendors
    const affectedProducts = await Product.find({ _id: { $in: productIds } }).distinct('vendor');
    
    for (const vendorId of affectedProducts) {
      if (vendorId) {
        const vendorStats = await Product.aggregate([
          { $match: { vendor: vendorId } },
          {
            $group: {
              _id: '$approvalStatus',
              count: { $sum: 1 }
            }
          }
        ]);

        const stats = {
          totalProducts: 0,
          approvedProducts: 0,
          pendingProducts: 0,
          rejectedProducts: 0
        };

        vendorStats.forEach(stat => {
          stats.totalProducts += stat.count;
          if (stat._id === 'approved') stats.approvedProducts = stat.count;
          if (stat._id === 'pending') stats.pendingProducts = stat.count;
          if (stat._id === 'rejected') stats.rejectedProducts = stat.count;
        });

        await Vendor.findByIdAndUpdate(vendorId, {
          'stats.totalProducts': stats.totalProducts,
          'stats.approvedProducts': stats.approvedProducts,
          'stats.pendingProducts': stats.pendingProducts,
          'stats.rejectedProducts': stats.rejectedProducts
        });
      }
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} products ${approvalStatus} successfully`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error bulk updating product approval status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update product approval status',
      error: error.message
    });
  }
});

// Delete a product
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    console.log('🗑️ [ADMIN] Deleting product:', req.params.id);
    
    const product = await Product.findOneAndDelete({ 
      _id: req.params.id,
      vendor: null  // Ensure it's an admin product
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not an admin product'
      });
    }

    // Clear caches after deletion
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated after deletion');

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

// Update a product
router.put('/:id', authAdmin, uploadProductMedia, async (req, res) => {
  try {
    console.log('🔄 [ADMIN] Updating product:', req.params.id);
    console.log('🔄 [ADMIN] Update data:', req.body);

    // Process files if uploaded
    console.log('🔍 [ADMIN UPDATE DEBUG] Raw req.files received:', JSON.stringify(req.files, null, 2));
    console.log('🔍 [ADMIN UPDATE DEBUG] req.files?.image:', req.files?.image);
    console.log('🔍 [ADMIN UPDATE DEBUG] req.files?.images:', req.files?.images);
    
    const images = req.files?.images ? req.files.images.map(file => `products/${file.filename}`) : undefined;
    const video = req.files?.video ? `products/${req.files.video[0].filename}` : undefined;
    const primaryImage = req.files?.image ? `products/${req.files.image[0].filename}` : undefined;
    
    // Process category data - ensure arrays for all category fields
    const mainCategory = req.body['mainCategory[]'] || req.body.mainCategory;
    const subCategory = req.body['subCategory[]'] || req.body.subCategory;
    const category = req.body['category[]'] || req.body.category || mainCategory;

    // Prepare update data
    const updateData = {
      ...req.body,
      mainCategory: mainCategory ? [mainCategory] : undefined,
      subCategory: subCategory ? [subCategory] : undefined,
      category: category ? [category] : mainCategory ? [mainCategory] : undefined
    };

    // Only update files if new ones were uploaded
    if (primaryImage || (images && images.length > 0)) {
      console.log('📸 [ADMIN UPDATE] Image processing:', {
        primaryImage,
        multipleImagesCount: images ? images.length : 0,
        videoFile: !!video
      });

      // Set image fields with correct priority: Primary image takes precedence
      if (primaryImage) {
        // Use the dedicated primary image
        updateData.image = primaryImage;
        console.log('✅ [ADMIN UPDATE] Using dedicated primary image:', primaryImage);
      } else if (images && images.length > 0) {
        // Fallback to first multiple image if no primary image provided
        updateData.image = images[0];
        console.log('⚠️ [ADMIN UPDATE] No primary image provided, using first multiple image:', images[0]);
      }

      // Update multiple images if provided
      if (images && images.length > 0) {
        updateData.images = images;
        console.log('✅ [ADMIN UPDATE] Set multiple images:', images.length);
      }
    }
    
    if (video !== undefined) {
      updateData.video = video;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: null },  // Ensure it's an admin product
      updateData,
      { new: true }
    )
    .populate('category', 'name')
    .populate('mainCategory', 'name')
    .populate('subCategory', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not an admin product'
      });
    }

    // Clear product caches after update
    const cacheInvalidator = require('../utils/cacheInvalidator');
    await cacheInvalidator.invalidateProducts();
    console.log('🔄 Product caches invalidated after update');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// Get approval statistics
router.get('/products/approval-stats', authAdmin, async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const vendorProductStats = await Product.aggregate([
      {
        $match: { vendor: { $ne: null } }
      },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const formatStats = (statsArray) => {
      const result = { approved: 0, pending: 0, rejected: 0, total: 0 };
      statsArray.forEach(stat => {
        if (stat._id) {
          result[stat._id] = stat.count;
        }
        result.total += stat.count;
      });
      return result;
    };

    res.json({
      success: true,
      stats: {
        allProducts: formatStats(stats),
        vendorProducts: formatStats(vendorProductStats)
      }
    });

  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval statistics',
      error: error.message
    });
  }
});

// Error handling middleware 
router.use(handleUploadError);

module.exports = router;
