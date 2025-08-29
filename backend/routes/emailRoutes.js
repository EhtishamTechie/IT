// Email routes
const express = require('express');
const router = express.Router();
const {
  sendEmail,
  getEmailHistory,
  getAllEmails,
  markEmailAsRead,
  getEmailAnalytics,
  resendEmail
} = require('../controllers/emailController');

// Send email
router.post('/send', sendEmail);

// Get email history for a user
router.get('/history/:userId', getEmailHistory);

// Get all emails (admin only)
router.get('/all', getAllEmails);

// Mark email as read
router.patch('/:emailId/read', markEmailAsRead);

// Get email analytics
router.get('/analytics', getEmailAnalytics);

// Resend email
router.post('/:emailId/resend', resendEmail);

module.exports = router;
