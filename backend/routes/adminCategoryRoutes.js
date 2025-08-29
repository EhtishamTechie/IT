const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const adminCategoryController = require('../controllers/adminCategoryController');

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

// Admin Category Routes
router.get('/', adminCategoryController.getAdminCategories);
router.get('/main', adminCategoryController.getAdminMainCategories);
router.get('/:id', adminCategoryController.getAdminCategoryById);
router.get('/:parentId/subcategories', adminCategoryController.getAdminSubcategories);

router.post('/', adminCategoryController.addAdminCategory);
router.put('/:id', adminCategoryController.updateAdminCategory);
router.delete('/:id', adminCategoryController.deleteAdminCategory);

module.exports = router;
