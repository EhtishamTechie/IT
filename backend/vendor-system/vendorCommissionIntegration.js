/**
 * Order Commission Integration Helper
 * 
 * This file provides utility functions to integrate the vendor commission system
 * with your existing order processing workflow.
 * 
 * Add these functions to your existing order controller to automatically
 * calculate and create commission records when orders are completed.
 */

const { calculateCommission } = require('../controllers/vendorCommissionController');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

/**
 * Process commissions for an order
 * Call this function when an order is marked as completed/delivered
 * 
 * @param {string} orderId - The order ID
 * @returns {Promise<Array>} Array of created commission records
 */
async function processOrderCommissions(orderId) {
  try {
    const Order = require('../models/Order'); // Adjust path as needed
    
    // Get the order with populated product details
    const order = await Order.findById(orderId).populate('items.product');
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Group items by vendor
    const vendorGroups = {};
    
    for (const item of order.items) {
      if (item.product && item.product.vendor) {
        const vendorId = item.product.vendor.toString();
        
        if (!vendorGroups[vendorId]) {
          vendorGroups[vendorId] = [];
        }
        
        vendorGroups[vendorId].push(item);
      }
    }

    // Create commission records for each vendor
    const commissionRecords = [];
    
    for (const vendorId of Object.keys(vendorGroups)) {
      try {
        const commission = await calculateCommission(orderId, vendorId);
        if (commission) {
          commissionRecords.push(commission);
        }
      } catch (error) {
        console.error(`Error creating commission for vendor ${vendorId}:`, error);
      }
    }

    console.log(`Created ${commissionRecords.length} commission records for order ${orderId}`);
    return commissionRecords;

  } catch (error) {
    console.error('Error processing order commissions:', error);
    throw error;
  }
}

/**
 * Update vendor statistics after order completion
 * 
 * @param {string} orderId - The order ID
 * @param {string} vendorId - The vendor ID
 * @param {number} orderTotal - Total amount for this vendor in the order
 */
async function updateVendorOrderStats(orderId, vendorId, orderTotal) {
  try {
    await Vendor.findByIdAndUpdate(vendorId, {
      $inc: {
        'stats.totalOrders': 1,
        'stats.totalRevenue': orderTotal
      }
    });

    console.log(`Updated vendor ${vendorId} stats for order ${orderId}`);
  } catch (error) {
    console.error('Error updating vendor stats:', error);
    throw error;
  }
}

/**
 * Add this to your existing order controller's order completion handler
 * 
 * Example integration in your orderController.js:
 */
const exampleOrderCompletionHandler = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Your existing order completion logic here...
    
    // Add commission processing
    const commissions = await processOrderCommissions(orderId);
    
    res.json({
      success: true,
      message: 'Order completed successfully',
      data: {
        orderId,
        commissions: commissions.length
      }
    });

  } catch (error) {
    console.error('Order completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing order',
      error: error.message
    });
  }
};

/**
 * Webhook-style function for order status updates
 * Call this whenever an order status changes
 * 
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New order status
 * @param {string} oldStatus - Previous order status
 */
async function handleOrderStatusChange(orderId, newStatus, oldStatus) {
  try {
    // Process commissions when order is completed/delivered
    if (newStatus === 'completed' || newStatus === 'delivered') {
      await processOrderCommissions(orderId);
    }

    // You can add more status-based logic here
    console.log(`Order ${orderId} status changed from ${oldStatus} to ${newStatus}`);

  } catch (error) {
    console.error('Error handling order status change:', error);
  }
}

/**
 * Get vendor earnings summary for an order
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Vendor earnings summary
 */
async function getOrderVendorEarnings(orderId) {
  try {
    const Commission = require('../models/Commission');
    
    const commissions = await Commission.find({ order: orderId })
      .populate('vendor', 'businessName email');

    const summary = {
      totalVendors: commissions.length,
      totalCommissions: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      totalVendorEarnings: commissions.reduce((sum, c) => sum + c.vendorEarnings, 0),
      vendors: commissions.map(c => ({
        vendorId: c.vendor._id,
        businessName: c.vendor.businessName,
        orderTotal: c.orderTotal,
        commissionAmount: c.commissionAmount,
        vendorEarnings: c.vendorEarnings,
        commissionRate: c.commissionRate
      }))
    };

    return summary;

  } catch (error) {
    console.error('Error getting order vendor earnings:', error);
    throw error;
  }
}

module.exports = {
  processOrderCommissions,
  updateVendorOrderStats,
  handleOrderStatusChange,
  getOrderVendorEarnings,
  exampleOrderCompletionHandler
};

/**
 * Integration Instructions:
 * 
 * 1. In your existing orderController.js, import this helper:
 *    const { processOrderCommissions, handleOrderStatusChange } = require('./vendorCommissionIntegration');
 * 
 * 2. Add commission processing to your order completion endpoint:
 *    // After marking order as completed
 *    await processOrderCommissions(orderId);
 * 
 * 3. Add status change handler to your order update endpoint:
 *    // After updating order status
 *    await handleOrderStatusChange(orderId, newStatus, oldStatus);
 * 
 * 4. Optional: Add vendor earnings endpoint to get order breakdown:
 *    router.get('/orders/:id/vendor-earnings', async (req, res) => {
 *      const earnings = await getOrderVendorEarnings(req.params.id);
 *      res.json({ success: true, data: earnings });
 *    });
 */
