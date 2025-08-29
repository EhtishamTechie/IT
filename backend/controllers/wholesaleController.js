const WholesaleSupplier = require('../models/WholesaleSupplier');

// Get all wholesale categories and suppliers (Public)
const getWholesaleSuppliers = async (req, res) => {
  try {
    const suppliers = await WholesaleSupplier.find({ isActive: true })
      .sort({ categoryName: 1, displayOrder: 1, supplierName: 1 })
      .lean();

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

    const newSupplier = new WholesaleSupplier({
      categoryName: categoryName.trim(),
      categoryDescription: categoryDescription?.trim(),
      supplierName: supplierName.trim(),
      contactNumber: contactNumber.trim(),
      whatsappNumber: whatsappNumber.trim(),
      email: email?.trim(),
      address: address?.trim(),
      specialties: specialties || [],
      minimumOrderQuantity: minimumOrderQuantity?.trim(),
      deliveryAreas: deliveryAreas || [],
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
    console.error('Error adding supplier:', error);
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

module.exports = {
  getWholesaleSuppliers,
  getSuppliersByCategory,
  getAllSuppliersAdmin,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus
};
