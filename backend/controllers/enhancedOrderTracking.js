const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const OrderStatusCalculator = require('../utils/orderStatusCalculator');

/**
 * Enhanced Order Tracking API with 4-status system
 * Provides comprehensive order status information for customers
 */

// @desc    Get detailed order status for customer tracking
// @route   GET /api/orders/:orderNumber/track
// @access  Public (with order number)
const trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query; // Optional email verification

    console.log(`🔍 Tracking order: ${orderNumber}`);

    const order = await Order.findOne({ orderNumber })
      .populate('cart.assignedVendor', 'businessName email')
      .populate('vendorOrders');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify email if provided
    if (email && order.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Email verification failed'
      });
    }

    // Calculate current status
    const currentStatus = OrderStatusCalculator.calculateOrderStatus(order.cart);
    
    // Get status breakdown by category
    const adminItems = OrderStatusCalculator.getAdminItems(order);
    const vendorItems = order.cart.filter(item => item.handledBy === 'vendor');
    
    // Group vendor items by vendor
    const vendorGroups = {};
    vendorItems.forEach(item => {
      if (item.assignedVendor) {
        const vendorId = item.assignedVendor._id.toString();
        const vendorName = item.assignedVendor.businessName;
        
        if (!vendorGroups[vendorId]) {
          vendorGroups[vendorId] = {
            vendor: {
              id: vendorId,
              name: vendorName
            },
            items: [],
            status: 'placed'
          };
        }
        
        vendorGroups[vendorId].items.push({
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          status: item.status,
          trackingNumber: item.trackingNumber,
          carrier: item.carrier
        });
      }
    });

    // Calculate vendor group statuses
    Object.keys(vendorGroups).forEach(vendorId => {
      const group = vendorGroups[vendorId];
      group.status = OrderStatusCalculator.calculateOrderStatus(group.items);
    });

    // Create timeline
    const timeline = createOrderTimeline(order);

    // Prepare tracking response
    const trackingData = {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      currentStatus: currentStatus,
      legacyStatus: order.status,
      orderType: order.orderType,
      
      customer: {
        name: order.name,
        email: email ? order.email : `${order.email.substring(0, 3)}***@${order.email.split('@')[1]}`,
        phone: order.phone ? `${order.phone.substring(0, 3)}****${order.phone.substring(order.phone.length - 2)}` : null
      },
      
      shipping: {
        address: order.address,
        city: order.city,
        postalCode: order.postalCode
      },
      
      items: {
        total: order.cart.length,
        admin: {
          count: adminItems.length,
          status: adminItems.length > 0 ? OrderStatusCalculator.calculateOrderStatus(adminItems) : null,
          items: adminItems.map(item => ({
            productId: item.productId,
            title: item.title,
            quantity: item.quantity,
            status: item.status
          }))
        },
        vendors: Object.values(vendorGroups)
      },
      
      timeline: timeline,
      
      totals: {
        subtotal: order.subtotal || 0,
        shippingCost: order.shippingCost || 0,
        tax: order.tax || 0,
        totalAmount: order.totalAmount || 0
      }
    };

    res.json({
      success: true,
      data: trackingData
    });

  } catch (error) {
    console.error('❌ Order tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order tracking information',
      error: error.message
    });
  }
};

// @desc    Get simplified order status (for quick checks)
// @route   GET /api/orders/:orderNumber/status
// @access  Public
const getOrderStatus = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber }).select('orderNumber orderStatus status createdAt');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.orderStatus || 'placed',
        legacyStatus: order.status,
        orderDate: order.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Get order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order status',
      error: error.message
    });
  }
};

/**
 * Create order timeline from status history
 */
function createOrderTimeline(order) {
  const timeline = [];
  
  // Add order placement
  timeline.push({
    status: 'placed',
    title: 'Order Placed',
    description: 'Your order has been successfully placed',
    timestamp: order.createdAt,
    completed: true
  });

  // Check for processing status
  const hasProcessingItems = order.cart.some(item => 
    item.status === 'processing' || item.status === 'shipped' || item.status === 'delivered'
  );
  
  if (hasProcessingItems) {
    timeline.push({
      status: 'processing',
      title: 'Order Processing',
      description: 'Your order is being processed',
      timestamp: findFirstStatusChange(order, 'processing'),
      completed: true
    });
  }

  // Check for shipped status
  const hasShippedItems = order.cart.some(item => 
    item.status === 'shipped' || item.status === 'delivered'
  );
  
  if (hasShippedItems) {
    timeline.push({
      status: 'shipped',
      title: 'Order Shipped',
      description: 'Your order has been shipped',
      timestamp: findFirstStatusChange(order, 'shipped'),
      completed: true
    });
  }

  // Check for delivered status
  const hasDeliveredItems = order.cart.some(item => item.status === 'delivered');
  
  if (hasDeliveredItems) {
    timeline.push({
      status: 'delivered',
      title: 'Order Delivered',
      description: 'Your order has been delivered',
      timestamp: findFirstStatusChange(order, 'delivered'),
      completed: true
    });
  } else {
    // Add expected delivery as future step
    timeline.push({
      status: 'delivered',
      title: 'Order Delivered',
      description: 'Your order will be delivered soon',
      timestamp: null,
      completed: false,
      expected: true
    });
  }

  return timeline.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
}

/**
 * Find first occurrence of status change in order history
 */
function findFirstStatusChange(order, targetStatus) {
  let earliestDate = null;
  
  order.cart.forEach(item => {
    if (item.statusHistory && Array.isArray(item.statusHistory)) {
      const statusEntry = item.statusHistory.find(entry => entry.status === targetStatus);
      if (statusEntry && statusEntry.updatedAt) {
        if (!earliestDate || new Date(statusEntry.updatedAt) < new Date(earliestDate)) {
          earliestDate = statusEntry.updatedAt;
        }
      }
    }
  });
  
  return earliestDate;
}

module.exports = {
  trackOrder,
  getOrderStatus
};
