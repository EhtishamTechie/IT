const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/wholesaleController');
const authAdmin = require('../middleware/authAdmin');
const { uploadWholesaleSupplierImage, uploadWholesaleSupplierProductImages, uploadWholesaleSupplierAllImages, handleUploadError } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/suppliers', getWholesaleSuppliers);
router.get('/suppliers/category/:categoryName', getSuppliersByCategory);
router.get('/supplier/:id', getSupplierById);

// Admin routes
router.get('/admin/suppliers', authAdmin, getAllSuppliersAdmin);
router.post('/admin/suppliers', authAdmin, uploadWholesaleSupplierAllImages, handleUploadError, addSupplier);
router.put('/admin/suppliers/:id', authAdmin, uploadWholesaleSupplierAllImages, handleUploadError, updateSupplier);
router.delete('/admin/suppliers/:id', authAdmin, deleteSupplier);
router.patch('/admin/suppliers/:id/toggle-status', authAdmin, toggleSupplierStatus);
router.delete('/admin/suppliers/:id/images/:imageId', authAdmin, deleteProductImage);
router.patch('/admin/suppliers/:id/images/reorder', authAdmin, reorderProductImages);

module.exports = router;
