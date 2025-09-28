const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterStats
} = require('../controllers/newsletterController');

// Email validation middleware
const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim()
];

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', validateEmail, subscribeToNewsletter);

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', validateEmail, unsubscribeFromNewsletter);

// @route   GET /api/newsletter/stats
// @desc    Get newsletter statistics
// @access  Public (basic stats only)
router.get('/stats', getNewsletterStats);

module.exports = router;