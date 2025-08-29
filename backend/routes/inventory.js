const express = require('express');
const router = express.Router();
const {
  getInventoryOverview,
  getInventoryItems,
  getInventoryItem,
  updateInventoryItem,
  adjustStock,
  addBatch,
  getStockMovements,
  getInventoryAlerts,
  acknowledgeAlert,
  getInventoryAnalytics,
  bulkStockUpdate
} = require('../controllers/inventoryController');

// Middleware to protect vendor routes
const { protectVendor } = require('../middleware/vendorAuth');

// Apply middleware to all routes
router.use(protectVendor);

// Inventory overview and analytics
router.get('/overview', getInventoryOverview);
router.get('/analytics', getInventoryAnalytics);

// Inventory items CRUD
router.get('/', getInventoryItems);
router.get('/:id', getInventoryItem);
router.put('/:id', updateInventoryItem);

// Stock management
router.post('/:id/adjust', adjustStock);
router.post('/bulk-update', bulkStockUpdate);

// Batch management
router.post('/:id/batches', addBatch);

// Stock movements
router.get('/:id/movements', getStockMovements);

// Alerts management
router.get('/alerts/list', getInventoryAlerts);
router.post('/:inventoryId/alerts/:alertId/acknowledge', acknowledgeAlert);

module.exports = router;
