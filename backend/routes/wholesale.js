const express = require('express');
const router = express.Router();
const {
  getWholesaleSuppliers,
  getSuppliersByCategory,
  getAllSuppliersAdmin,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus
} = require('../controllers/wholesaleController');
const authAdmin = require('../middleware/authAdmin');
const { uploadWholesaleSupplierImage, handleUploadError } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/suppliers', getWholesaleSuppliers);
router.get('/suppliers/category/:categoryName', getSuppliersByCategory);

// Admin routes
router.get('/admin/suppliers', authAdmin, getAllSuppliersAdmin);
router.post('/admin/suppliers', authAdmin, uploadWholesaleSupplierImage, handleUploadError, addSupplier);
router.put('/admin/suppliers/:id', authAdmin, uploadWholesaleSupplierImage, handleUploadError, updateSupplier);
router.delete('/admin/suppliers/:id', authAdmin, deleteSupplier);
router.patch('/admin/suppliers/:id/toggle-status', authAdmin, toggleSupplierStatus);

module.exports = router;
