const express = require('express');
const publicRouter = express.Router();
const adminRouter = express.Router();
const {
  submitContact,
  getAllContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats
} = require('../controllers/contactController');
const authAdmin = require('../middleware/authAdmin');

// Public routes
publicRouter.post('/submit', submitContact);

// Admin routes (these will be mounted at /api/admin/contacts)
adminRouter.use(authAdmin); // Apply admin auth to all admin routes
adminRouter.get('/', getAllContacts);
adminRouter.get('/stats', getContactStats);
adminRouter.get('/:id', getContact);
adminRouter.patch('/:id', updateContact);
adminRouter.delete('/:id', deleteContact);

// Export both routers
module.exports = publicRouter;
module.exports.adminRouter = adminRouter;
