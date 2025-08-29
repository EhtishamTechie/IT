const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get inventory overview for vendor
const getInventoryOverview = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    
    // Get inventory summary
    const summary = await Inventory.getInventorySummary(vendorId);
    
    // Get recent stock movements
    const recentMovements = await Inventory.find({ vendor: vendorId })
      .populate('product', 'name sku images')
      .sort({ lastStockUpdate: -1 })
      .limit(10)
      .select('product currentStock stockStatus lastStockUpdate stockMovements')
      .lean();
    
    // Get low stock alerts
    const lowStockItems = await Inventory.getLowStockItems(vendorId);
    
    // Get items needing reorder
    const reorderItems = await Inventory.getReorderItems(vendorId);
    
    // Get pending alerts
    const pendingAlerts = await Inventory.find({
      vendor: vendorId,
      'alerts.acknowledged': false
    }).populate('product', 'name sku');
    
    const alerts = pendingAlerts.reduce((acc, item) => {
      const unacknowledgedAlerts = item.alerts.filter(alert => !alert.acknowledged);
      return acc.concat(unacknowledgedAlerts.map(alert => ({
        ...alert.toObject(),
        productName: item.product.name,
        productSku: item.product.sku,
        inventoryId: item._id
      })));
    }, []);

    res.json({
      success: true,
      data: {
        summary,
        recentMovements,
        lowStockItems,
        reorderItems,
        alerts: alerts.slice(0, 20) // Limit to 20 most recent alerts
      }
    });
  } catch (error) {
    console.error('Error getting inventory overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory overview',
      error: error.message
    });
  }
};

// Get all inventory items for vendor
const getInventoryItems = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'lastStockUpdate',
      sortOrder = 'desc',
      lowStock,
      outOfStock
    } = req.query;

    // Build query
    const query = { vendor: vendorId };
    
    // Apply filters
    if (status && status !== 'all') {
      query.stockStatus = status;
    }
    
    if (lowStock === 'true') {
      query.stockStatus = 'low_stock';
    }
    
    if (outOfStock === 'true') {
      query.stockStatus = 'out_of_stock';
    }

    // Search functionality
    let searchQuery = {};
    if (search) {
      const productIds = await Product.find({
        vendor: vendorId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      }).distinct('_id');
      
      searchQuery.product = { $in: productIds };
    }

    const finalQuery = { ...query, ...searchQuery };

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [items, totalItems] = await Promise.all([
      Inventory.find(finalQuery)
        .populate('product', 'name sku images price category')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Inventory.countDocuments(finalQuery)
    ]);

    const totalPages = Math.ceil(totalItems / parseInt(limit));

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory items',
      error: error.message
    });
  }
};

// Get single inventory item
const getInventoryItem = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;

    const inventory = await Inventory.findOne({
      _id: id,
      vendor: vendorId
    }).populate('product', 'name sku images price category description');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Error getting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory item',
      error: error.message
    });
  }
};

// Update inventory item
const updateInventoryItem = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;
    const updateData = req.body;

    // Find inventory item
    const inventory = await Inventory.findOne({
      _id: id,
      vendor: vendorId
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Store old values for tracking changes
    const oldStock = inventory.currentStock;
    const oldReserved = inventory.reservedStock;

    // Update fields
    Object.assign(inventory, updateData);

    // Track stock changes
    if (oldStock !== inventory.currentStock) {
      const difference = inventory.currentStock - oldStock;
      await inventory.addStockMovement({
        type: 'adjustment',
        quantity: difference,
        reason: 'Manual stock adjustment',
        performedBy: req.vendor.id,
        notes: `Stock updated from ${oldStock} to ${inventory.currentStock}`
      });
    }

    await inventory.save();

    // Check for alerts
    await checkAndCreateAlerts(inventory);

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: inventory
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item',
      error: error.message
    });
  }
};

// Adjust stock levels
const adjustStock = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;
    const { adjustment, reason, type = 'adjustment' } = req.body;

    if (!adjustment || adjustment === 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment amount is required and cannot be zero'
      });
    }

    const inventory = await Inventory.findOne({
      _id: id,
      vendor: vendorId
    }).populate('product', 'name sku');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check for negative stock
    if (inventory.currentStock + adjustment < 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment would result in negative stock'
      });
    }

    // Apply adjustment
    await inventory.addStock(adjustment, type, reason, { adjustmentId: new mongoose.Types.ObjectId() });

    // Check for alerts
    await checkAndCreateAlerts(inventory);

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        productName: inventory.product.name,
        previousStock: inventory.currentStock - adjustment,
        newStock: inventory.currentStock,
        adjustment
      }
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust stock',
      error: error.message
    });
  }
};

// Add new batch
const addBatch = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;
    const batchData = req.body;

    const inventory = await Inventory.findOne({
      _id: id,
      vendor: vendorId
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Add batch info
    inventory.batchInfo.push({
      ...batchData,
      status: 'active'
    });

    // Update stock if specified
    if (batchData.quantity) {
      await inventory.addStock(
        batchData.quantity,
        'purchase',
        `New batch added: ${batchData.batchNumber}`,
        { batchNumber: batchData.batchNumber }
      );
    }

    await inventory.save();

    res.json({
      success: true,
      message: 'Batch added successfully',
      data: inventory.batchInfo[inventory.batchInfo.length - 1]
    });
  } catch (error) {
    console.error('Error adding batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add batch',
      error: error.message
    });
  }
};

// Get stock movements history
const getStockMovements = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const inventory = await Inventory.findOne({
      _id: id,
      vendor: vendorId
    }).populate('product', 'name sku');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Get paginated movements
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const movements = inventory.stockMovements
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(skip, skip + parseInt(limit));

    const totalMovements = inventory.stockMovements.length;
    const totalPages = Math.ceil(totalMovements / parseInt(limit));

    res.json({
      success: true,
      data: {
        productName: inventory.product.name,
        productSku: inventory.product.sku,
        movements,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalMovements,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting stock movements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stock movements',
      error: error.message
    });
  }
};

// Get inventory alerts
const getInventoryAlerts = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { acknowledged = 'false' } = req.query;

    const query = {
      vendor: vendorId,
      'alerts.acknowledged': acknowledged === 'true'
    };

    const inventoryItems = await Inventory.find(query)
      .populate('product', 'name sku images')
      .select('product alerts')
      .lean();

    const alerts = inventoryItems.reduce((acc, item) => {
      const filteredAlerts = item.alerts.filter(
        alert => alert.acknowledged === (acknowledged === 'true')
      );
      
      return acc.concat(filteredAlerts.map(alert => ({
        ...alert,
        productName: item.product.name,
        productSku: item.product.sku,
        productImage: item.product.images?.[0],
        inventoryId: item._id
      })));
    }, []);

    // Sort by creation date (most recent first)
    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting inventory alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory alerts',
      error: error.message
    });
  }
};

// Acknowledge alert
const acknowledgeAlert = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { inventoryId, alertId } = req.params;

    const inventory = await Inventory.findOne({
      _id: inventoryId,
      vendor: vendorId
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await inventory.acknowledgeAlert(alertId, vendorId);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message
    });
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Stock movement analytics
    const movementAnalytics = await Inventory.aggregate([
      {
        $match: {
          vendor: mongoose.Types.ObjectId(vendorId),
          'stockMovements.timestamp': { $gte: startDate }
        }
      },
      { $unwind: '$stockMovements' },
      {
        $match: {
          'stockMovements.timestamp': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$stockMovements.type',
          totalQuantity: { $sum: { $abs: '$stockMovements.quantity' } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Stock status distribution
    const statusDistribution = await Inventory.aggregate([
      { $match: { vendor: mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$stockStatus',
          count: { $sum: 1 },
          totalStock: { $sum: '$currentStock' }
        }
      }
    ]);

    // Top products by stock value
    const topValueProducts = await Inventory.aggregate([
      { $match: { vendor: mongoose.Types.ObjectId(vendorId) } },
      {
        $addFields: {
          stockValue: {
            $multiply: [
              '$currentStock',
              { $ifNull: ['$averageCostPrice', '$costPrice', 0] }
            ]
          }
        }
      },
      { $sort: { stockValue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          productSku: '$product.sku',
          currentStock: 1,
          stockValue: 1,
          stockStatus: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        movementAnalytics,
        statusDistribution,
        topValueProducts,
        period: parseInt(period)
      }
    });
  } catch (error) {
    console.error('Error getting inventory analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory analytics',
      error: error.message
    });
  }
};

// Bulk stock update
const bulkStockUpdate = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { updates } = req.body; // Array of { inventoryId, newStock, reason }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { inventoryId, newStock, reason = 'Bulk stock update' } = update;

        const inventory = await Inventory.findOne({
          _id: inventoryId,
          vendor: vendorId
        });

        if (!inventory) {
          errors.push({
            inventoryId,
            error: 'Inventory item not found'
          });
          continue;
        }

        const oldStock = inventory.currentStock;
        const adjustment = newStock - oldStock;

        if (adjustment !== 0) {
          await inventory.addStock(adjustment, 'adjustment', reason);
          await checkAndCreateAlerts(inventory);
        }

        results.push({
          inventoryId,
          previousStock: oldStock,
          newStock: inventory.currentStock,
          adjustment
        });
      } catch (error) {
        errors.push({
          inventoryId: update.inventoryId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        successful: results,
        failed: errors,
        totalProcessed: updates.length,
        successCount: results.length,
        errorCount: errors.length
      }
    });
  } catch (error) {
    console.error('Error in bulk stock update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk stock update',
      error: error.message
    });
  }
};

// Helper function to check and create alerts
const checkAndCreateAlerts = async (inventory) => {
  try {
    // Check for low stock alert
    if (inventory.stockStatus === 'low_stock') {
      await inventory.createAlert(
        'low_stock',
        `Stock is running low: ${inventory.currentStock} units remaining`,
        'medium'
      );
    }

    // Check for out of stock alert
    if (inventory.stockStatus === 'out_of_stock') {
      await inventory.createAlert(
        'out_of_stock',
        'Product is out of stock',
        'high'
      );
    }

    // Check for reorder alert
    if (inventory.shouldReorder()) {
      await inventory.createAlert(
        'reorder_needed',
        `Reorder needed: Stock (${inventory.availableStock}) below reorder point (${inventory.reorderPoint})`,
        'medium'
      );
    }

    // Check for expired batches
    const expiredBatches = inventory.batchInfo.filter(batch => 
      batch.expiryDate && 
      batch.expiryDate < new Date() && 
      batch.status === 'active'
    );

    if (expiredBatches.length > 0) {
      await inventory.createAlert(
        'expired_batch',
        `${expiredBatches.length} batch(es) have expired`,
        'high'
      );
    }
  } catch (error) {
    console.error('Error checking alerts:', error);
  }
};

module.exports = {
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
};
