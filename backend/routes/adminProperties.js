const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/authAdmin');
const {
  getAllProperties,
  getPropertyForReview,
  approveProperty,
  rejectProperty,
  updatePropertyStatus,
  deleteProperty,
  getPropertyStatistics
} = require('../controllers/adminPropertyController');

// All routes require admin authentication
router.use(authAdmin);

// Get all properties for admin management
router.get('/', getAllProperties);

// Get property statistics for dashboard
router.get('/statistics', getPropertyStatistics);

// Get specific property for review
router.get('/:id', getPropertyForReview);

// Approve property
router.patch('/:id/approve', approveProperty);

// Reject property
router.patch('/:id/reject', rejectProperty);

// Update property status (general)
router.patch('/:id/status', updatePropertyStatus);

// Delete property
router.delete('/:id', deleteProperty);

module.exports = router;
