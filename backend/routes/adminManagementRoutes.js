const express = require('express');
const router = express.Router();
const {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  resetAdminPassword,
  deleteAdmin
} = require('../controllers/adminManagementController');
const authAdmin = require('../middleware/authAdmin');

// Apply admin authentication middleware to all routes
router.use(authAdmin);

// GET /api/admin/management - Get all admin users
router.get('/', getAllAdmins);

// POST /api/admin/management - Create new admin user
router.post('/', createAdmin);

// PUT /api/admin/management/:id - Update admin user
router.put('/:id', updateAdmin);

// PUT /api/admin/management/:id/reset-password - Reset admin password
router.put('/:id/reset-password', resetAdminPassword);

// DELETE /api/admin/management/:id - Delete admin user
router.delete('/:id', deleteAdmin);

module.exports = router;
