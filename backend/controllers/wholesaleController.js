const WholesaleSupplier = require('../models/WholesaleSupplier');
const { optimizeImage } = require('../middleware/imageOptimization');
const path = require('path');
const fs = require('fs').promises;

// Get all wholesale categories and suppliers (Public)
const getWholesaleSuppliers = async (req, res) => {
  try {
    const suppliers = await WholesaleSupplier.find({ isActive: true })
      .sort({ categoryName: 1, displayOrder: 1, supplierName: 1 })
      .lean();

    console.log('📦 [WHOLESALE PUBLIC] Fetched suppliers count:', suppliers.length);
    
    // Log first supplier's images for debugging
    if (suppliers.length > 0) {
      console.log('📸 [WHOLESALE PUBLIC] First supplier:', {
        name: suppliers[0].supplierName,
        profileImage: suppliers[0].profileImage,
        productImagesCount: suppliers[0].productImages?.length || 0,
        productImages: suppliers[0].productImages
      });
    }

    // Group suppliers by category
    const categories = {};
    suppliers.forEach(supplier => {
      if (!categories[supplier.categoryName]) {
        categories[supplier.categoryName] = {
          categoryName: supplier.categoryName,
          categoryDescription: supplier.categoryDescription,
          suppliers: []
        };
      }
      categories[supplier.categoryName].suppliers.push(supplier);
    });

    const categorizedSuppliers = Object.values(categories);

    res.json({
      success: true,
      data: categorizedSuppliers
    });

  } catch (error) {
    console.error('Error fetching wholesale suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wholesale suppliers'
    });
  }
};

// Get suppliers by category (Public)
const getSuppliersByCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;
    
    const suppliers = await WholesaleSupplier.find({ 
      categoryName: categoryName,
      isActive: true 
    })
    .sort({ displayOrder: 1, supplierName: 1 })
    .lean();

    res.json({
      success: true,
      data: suppliers
    });

  } catch (error) {
    console.error('Error fetching suppliers by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers for this category'
    });
  }
};

// Get single supplier by ID (Public)
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const supplier = await WholesaleSupplier.findOne({ 
      _id: id,
      isActive: true 
    }).lean();

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });

  } catch (error) {
    console.error('Error fetching supplier details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier details'
    });
  }
};

// Admin: Get all suppliers (including inactive) with pagination
const getAllSuppliersAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter for search
    let filter = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { supplierName: searchRegex },
        { categoryName: searchRegex },
        { contactNumber: searchRegex },
        { email: searchRegex }
      ];
    }
    
    console.log('📦 [WHOLESALE] Pagination:', { page, limit, skip });
    console.log('📦 [WHOLESALE] Filter:', filter);
    
    const suppliers = await WholesaleSupplier.find(filter)
      .sort({ categoryName: 1, displayOrder: 1, supplierName: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const totalSuppliers = await WholesaleSupplier.countDocuments(filter);
    const totalPages = Math.ceil(totalSuppliers / limit);

    console.log('✅ [WHOLESALE] Success:', { 
      suppliersFound: suppliers.length, 
      totalSuppliers, 
      totalPages 
    });

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        page,
        pages: totalPages,
        total: totalSuppliers,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching all suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers'
    });
  }
};

// Admin: Add new supplier
const addSupplier = async (req, res) => {
  try {
    // Debug logging
    console.log('🔍 [WHOLESALE] addSupplier called');
    console.log('📋 [WHOLESALE] req.body:', JSON.stringify(req.body, null, 2));
    console.log('📁 [WHOLESALE] req.file:', req.file ? 'present' : 'none');
    console.log('📁 [WHOLESALE] req.files:', req.files);
    
    const {
      categoryName,
      categoryDescription,
      supplierName,
      contactNumber,
      whatsappNumber,
      email,
      address,
      specialties,
      minimumOrderQuantity,
      deliveryAreas,
      businessHours,
      displayOrder
    } = req.body;

    // Handle profile image upload (single image for supplier logo)
    let profileImage = null;
    if (req.files && req.files.profileImage && req.files.profileImage[0]) {
      profileImage = req.files.profileImage[0].filename;
      console.log('✅ [WHOLESALE] Profile image uploaded:', profileImage);
    }

    // Handle product images upload (multiple images)
    let productImages = [];
    const productImageFiles = req.files && req.files.productImages ? req.files.productImages : [];
    
    if (productImageFiles.length > 0) {
      console.log(`📦 [WHOLESALE] Processing ${productImageFiles.length} product images...`);
      
      for (let i = 0; i < productImageFiles.length; i++) {
        const file = productImageFiles[i];
        const uploadPath = path.join(__dirname, '../uploads/wholesale-suppliers', file.filename);
        
        try {
          // Optimize image with AVIF and WebP variants
          console.log(`   🖼️  Optimizing image ${i + 1}/${productImageFiles.length}: ${file.filename}`);
          const optimizationResult = await optimizeImage(uploadPath, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 85,
            generateWebP: true,
            generateAVIF: true,
            generateResponsive: true,
            responsiveSizes: [300, 600]
          });

          // Extract optimized filenames
          console.log('🔍 [DEBUG] Optimization result:', JSON.stringify(optimizationResult, null, 2));
          
          // Handle responsive images - they are arrays of objects with {width, path, filename}
          const getResponsiveFile = (files, size) => {
            if (!files) return null;
            if (Array.isArray(files)) {
              const file = files.find(f => f && f.width && f.width.toString() === size.replace('w', ''));
              return file ? file.filename : null;
            }
            return null;
          };
          
          productImages.push({
            filename: file.filename,
            originalName: file.originalname,
            optimized: {
              avif_300: getResponsiveFile(optimizationResult.responsive?.avif, '300w'),
              avif_600: getResponsiveFile(optimizationResult.responsive?.avif, '600w'),
              webp_300: getResponsiveFile(optimizationResult.responsive?.webp, '300w'),
              webp_600: getResponsiveFile(optimizationResult.responsive?.webp, '600w'),
              jpg_300: getResponsiveFile(optimizationResult.responsive?.original, '300w'),
              jpg_600: getResponsiveFile(optimizationResult.responsive?.original, '600w')
            },
            altText: `${supplierName} ${categoryName} product image ${i + 1}`,
            displayOrder: i
          });

          console.log(`   ✅ Image ${i + 1} optimized: ${optimizationResult.savings}% size reduction`);
        } catch (error) {
          console.error(`   ❌ Error optimizing image ${file.filename}:`, error);
          // Still add the original image even if optimization fails
          productImages.push({
            filename: file.filename,
            originalName: file.originalname,
            optimized: {},
            altText: `${supplierName} ${categoryName} product image ${i + 1}`,
            displayOrder: i
          });
        }
      }
      
      console.log(`✅ [WHOLESALE] Successfully processed ${productImages.length} product images`);
    }

    // Handle array fields from FormData
    const processArrayField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return [];
    };

    const newSupplier = new WholesaleSupplier({
      categoryName: categoryName.trim(),
      categoryDescription: categoryDescription?.trim(),
      supplierName: supplierName.trim(),
      profileImage,
      productImages,
      contactNumber: contactNumber.trim(),
      whatsappNumber: whatsappNumber.trim(),
      email: email?.trim(),
      address: address?.trim(),
      specialties: processArrayField(specialties),
      minimumOrderQuantity: minimumOrderQuantity?.trim(),
      deliveryAreas: processArrayField(deliveryAreas),
      businessHours: businessHours?.trim(),
      displayOrder: displayOrder || 0
    });

    const savedSupplier = await newSupplier.save();

    res.status(201).json({
      success: true,
      message: 'Wholesale supplier added successfully',
      data: savedSupplier
    });

  } catch (error) {
    console.error('❌ [WHOLESALE] Error adding supplier:', error);
    console.error('❌ [WHOLESALE] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to add supplier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle profile image upload
    if (req.files && req.files.profileImage && req.files.profileImage[0]) {
      updateData.profileImage = req.files.profileImage[0].filename;
      console.log('✅ [WHOLESALE] Profile image updated:', updateData.profileImage);
    }

    // Handle product images upload (new images to add)
    const productImageFiles = req.files && req.files.productImages ? req.files.productImages : [];
    
    if (productImageFiles.length > 0) {
      console.log(`📦 [WHOLESALE] Processing ${productImageFiles.length} new product images for update...`);
      
      // Get existing product images
      const supplier = await WholesaleSupplier.findById(id);
      const existingImages = supplier.productImages || [];
      
      const newProductImages = [];
      
      for (let i = 0; i < productImageFiles.length; i++) {
        const file = productImageFiles[i];
        const uploadPath = path.join(__dirname, '../uploads/wholesale-suppliers', file.filename);
        
        try {
          // Optimize image
          console.log(`   🖼️  Optimizing image ${i + 1}/${productImageFiles.length}: ${file.filename}`);
          const optimizationResult = await optimizeImage(uploadPath, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 85,
            generateWebP: true,
            generateAVIF: true,
            generateResponsive: true,
            responsiveSizes: [300, 600]
          });

          // Handle responsive images - they are arrays of objects with {width, path, filename}
          const getResponsiveFile = (files, size) => {
            if (!files) return null;
            if (Array.isArray(files)) {
              const file = files.find(f => f && f.width && f.width.toString() === size.replace('w', ''));
              return file ? file.filename : null;
            }
            return null;
          };

          newProductImages.push({
            filename: file.filename,
            originalName: file.originalname,
            optimized: {
              avif_300: getResponsiveFile(optimizationResult.responsive?.avif, '300w'),
              avif_600: getResponsiveFile(optimizationResult.responsive?.avif, '600w'),
              webp_300: getResponsiveFile(optimizationResult.responsive?.webp, '300w'),
              webp_600: getResponsiveFile(optimizationResult.responsive?.webp, '600w'),
              jpg_300: getResponsiveFile(optimizationResult.responsive?.original, '300w'),
              jpg_600: getResponsiveFile(optimizationResult.responsive?.original, '600w')
            },
            altText: `${updateData.supplierName || supplier.supplierName} ${updateData.categoryName || supplier.categoryName} product image`,
            displayOrder: existingImages.length + i
          });

          console.log(`   ✅ Image ${i + 1} optimized`);
        } catch (error) {
          console.error(`   ❌ Error optimizing image ${file.filename}:`, error);
          newProductImages.push({
            filename: file.filename,
            originalName: file.originalname,
            optimized: {},
            altText: `${updateData.supplierName || supplier.supplierName} product image`,
            displayOrder: existingImages.length + i
          });
        }
      }
      
      // Append new images to existing ones
      updateData.productImages = [...existingImages, ...newProductImages];
      console.log(`✅ [WHOLESALE] Added ${newProductImages.length} new product images (total: ${updateData.productImages.length})`);
    }

    // Handle array fields from FormData
    const processArrayField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return [];
    };

    // Process array fields
    if (updateData.specialties !== undefined) {
      updateData.specialties = processArrayField(updateData.specialties);
    }
    if (updateData.deliveryAreas !== undefined) {
      updateData.deliveryAreas = processArrayField(updateData.deliveryAreas);
    }

    // Remove empty strings and undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedSupplier = await WholesaleSupplier.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSupplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: updatedSupplier
    });

  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSupplier = await WholesaleSupplier.findByIdAndDelete(id);

    if (!deletedSupplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete supplier'
    });
  }
};

// Admin: Toggle supplier status
const toggleSupplierStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await WholesaleSupplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    supplier.isActive = !supplier.isActive;
    await supplier.save();

    res.json({
      success: true,
      message: `Supplier ${supplier.isActive ? 'activated' : 'deactivated'} successfully`,
      data: supplier
    });

  } catch (error) {
    console.error('Error toggling supplier status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier status'
    });
  }
};

// Admin: Delete product image
const deleteProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const supplier = await WholesaleSupplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Find and remove the image
    const imageIndex = supplier.productImages.findIndex(img => img._id.toString() === imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = supplier.productImages[imageIndex];
    
    // Delete image files from disk
    try {
      const uploadsDir = path.join(__dirname, '../uploads/wholesale-suppliers');
      const filesToDelete = [
        image.filename,
        image.optimized?.avif_300,
        image.optimized?.avif_600,
        image.optimized?.webp_300,
        image.optimized?.webp_600,
        image.optimized?.jpg_300,
        image.optimized?.jpg_600
      ].filter(Boolean);

      for (const file of filesToDelete) {
        const filePath = path.join(uploadsDir, path.basename(file));
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.log(`Could not delete file ${file}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Error deleting image files:', err);
    }

    // Remove from array
    supplier.productImages.splice(imageIndex, 1);
    
    // Reorder remaining images
    supplier.productImages.forEach((img, idx) => {
      img.displayOrder = idx;
    });

    await supplier.save();

    res.json({
      success: true,
      message: 'Product image deleted successfully',
      data: supplier
    });

  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product image'
    });
  }
};

// Admin: Reorder product images
const reorderProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageOrder } = req.body; // Array of image IDs in new order

    const supplier = await WholesaleSupplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Reorder images based on provided order
    const reorderedImages = [];
    imageOrder.forEach((imageId, index) => {
      const image = supplier.productImages.find(img => img._id.toString() === imageId);
      if (image) {
        image.displayOrder = index;
        reorderedImages.push(image);
      }
    });

    supplier.productImages = reorderedImages;
    await supplier.save();

    res.json({
      success: true,
      message: 'Product images reordered successfully',
      data: supplier
    });

  } catch (error) {
    console.error('Error reordering product images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder product images'
    });
  }
};

module.exports = {
  getWholesaleSuppliers,
  getSuppliersByCategory,
  getSupplierById,
  getAllSuppliersAdmin,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
  deleteProductImage,
  reorderProductImages
};
