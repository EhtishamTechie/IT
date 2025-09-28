const express = require('express');
const router = express.Router();
const {
  getNewsletterSubscriptions,
  exportNewsletterSubscriptions,
  deleteNewsletterSubscription,
  getNewsletterStats
} = require('../controllers/newsletterController');
const authAdmin = require('../middleware/authAdmin');

// Apply admin authentication to all routes
router.use(authAdmin);

// @route   GET /api/admin/newsletter/subscriptions
// @desc    Get all newsletter subscriptions with pagination
// @access  Private (Admin)
router.get('/subscriptions', getNewsletterSubscriptions);

// @route   GET /api/admin/newsletter/export
// @desc    Export newsletter subscriptions to CSV
// @access  Private (Admin)
router.get('/export', exportNewsletterSubscriptions);

// @route   GET /api/admin/newsletter/stats
// @desc    Get detailed newsletter statistics
// @access  Private (Admin)
router.get('/stats', getNewsletterStats);

// @route   DELETE /api/admin/newsletter/subscriptions/:id
// @desc    Delete newsletter subscription
// @access  Private (Admin)
router.delete('/subscriptions/:id', deleteNewsletterSubscription);

module.exports = router;