const express = require('express');
const router = express.Router();

const {
  getVendorCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/vendorCategoryController');

const { protectVendor } = require('../middleware/vendorAuth');

// Apply vendor authentication to all routes
router.use(protectVendor);
// Note: Removed requireApprovedVendor to allow all authenticated vendors to manage categories

// @route   GET /api/vendors/categories
// @desc    Get all vendor categories
// @access  Private (Vendor)
router.get('/', getVendorCategories);

// @route   POST /api/vendors/categories
// @desc    Create new category
// @access  Private (Vendor)
router.post('/', createCategory);

// @route   PUT /api/vendors/categories/:id
// @desc    Update category
// @access  Private (Vendor)
router.put('/:id', updateCategory);

// @route   DELETE /api/vendors/categories/:id
// @desc    Delete category
// @access  Private (Vendor)
router.delete('/:id', deleteCategory);

module.exports = router;
