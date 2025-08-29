// Payment routes
const express = require('express');
const router = express.Router();
const {
  storePayment,
  getPaymentHistory,
  getAllPayments,
  processRefund,
  getRefunds,
  getPaymentAnalytics
} = require('../controllers/paymentController');

// Store payment record
router.post('/', storePayment);

// Get payment history for a user
router.get('/history/:userId', getPaymentHistory);

// Get all payments (admin only)
router.get('/all', getAllPayments);

// Process refund
router.post('/refund', processRefund);

// Get refunds
router.get('/refunds', getRefunds);

// Get payment analytics
router.get('/analytics', getPaymentAnalytics);

module.exports = router;
