const express = require('express');
const router = express.Router();
const { getDashboardStats, calculateRevenueFromDeliveredOrders } = require('../controllers/adminStatsController');
const authAdmin = require('../middleware/authAdmin');

// Get dashboard statistics (admin only) - Fixed route path
router.get('/stats', authAdmin, getDashboardStats);

// Get revenue from delivered orders (admin only) - NEW ENDPOINT  
router.get('/revenue', authAdmin, calculateRevenueFromDeliveredOrders);

module.exports = router;
