// Simplified Vendor Order Status Controller
// Clean, unified approach like admin panel

const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const OrderStatusCalculator = require('../utils/orderStatusCalculator');
const Audit = require('../models/Audit');

// Import email function from utils (same as other controllers)
const nodemailer = require('nodemailer');

// @desc    Update vendor order status (SIMPLIFIED)
// @route   PUT /api/vendors/orders/:id/status
// @access  Private (Vendor)
const updateVendorOrderStatus = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const orderId = req.params.id;
    const { status, notes } = req.body;

    console.log(`🔄 Vendor ${vendorId} updating order ${orderId} to status: ${status}`);

    // Validate status
    const validStatuses = ['processing', 'shipped', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Use: ${validStatuses.join(', ')}`
      });
    }

    // Try to find as VendorOrder first, then as regular Order
    let order = await VendorOrder.findById(orderId);
    let isVendorOrder = true;
    
    if (!order) {
      order = await Order.findById(orderId).populate('cart.assignedVendor');
      isVendorOrder = false;
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`🔍 Order found: ${order._id}`);
    console.log(`📋 Order type check: isVendorOrder = ${isVendorOrder}`);
    console.log(`🏪 Checking vendor access for vendor: ${vendorId}`);

    // Verify vendor access
    if (isVendorOrder) {
      // For VendorOrder documents
      const orderVendorId = order.vendorId || order.vendor;
      console.log(`📦 VendorOrder - orderVendorId:`, orderVendorId);
      console.log(`🔄 VendorOrder - comparison: ${orderVendorId ? orderVendorId.toString() : 'undefined'} vs ${vendorId}`);
      console.log(`🔄 VendorOrder - strict equality: ${orderVendorId ? orderVendorId.toString() === vendorId : false}`);
      console.log(`🔄 VendorOrder - types: orderVendorId type = ${typeof (orderVendorId ? orderVendorId.toString() : undefined)}, vendorId type = ${typeof vendorId}`);
      
      const orderVendorString = orderVendorId ? orderVendorId.toString() : null;
      const vendorString = vendorId ? vendorId.toString() : null;
      
      if (!orderVendorString || orderVendorString !== vendorString) {
        console.log(`❌ VendorOrder access denied - orderVendorString: '${orderVendorString}', vendorString: '${vendorString}'`);
        return res.status(403).json({
          success: false,
          message: 'Access denied - not your order'
        });
      }
      
      console.log(`✅ VendorOrder access granted!`);
    } else {
      // For regular Order documents - check if vendor has items
      console.log(`📋 Regular Order - checking cart items`);
      console.log(`🛒 Cart length: ${order.cart ? order.cart.length : 0}`);
      
      const vendorItems = order.cart.filter(item => {
        const itemVendor = item.assignedVendor || item.vendor;
        console.log(`📦 Item: ${item.title || item.productId} - Vendor: ${itemVendor} (type: ${typeof itemVendor})`);
        return itemVendor && itemVendor.toString() === vendorId;
      });
      
      console.log(`✅ Found ${vendorItems.length} items for this vendor`);
      
      if (vendorItems.length === 0) {
        console.log(`❌ Regular Order access denied - no items assigned to vendor`);
        return res.status(403).json({
          success: false,
          message: 'No items assigned to you in this order'
        });
      }
    }

    const oldStatus = order.status;
    
    // AUTO-ACCEPT LOGIC: When vendor changes from pending to any other status
    if (oldStatus === 'pending' && status !== 'pending') {
      console.log(`✅ Auto-accepting order ${orderId} as vendor starts processing`);
    }

    // Update the order status
    order.status = status;
    order.statusUpdatedAt = new Date();
    order.vendorNotes = notes || `Status updated to ${status}`;
    
    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: status,
      updatedAt: new Date(),
      updatedBy: vendorId,
      updatedByType: 'vendor',
      notes: notes || `Status updated to ${status}`
    });

    await order.save();

    // Update parent order if this is a vendor part of mixed order
    if (!isVendorOrder && order.parentOrderId) {
      await updateParentOrderStatus(order.parentOrderId);
    }

    // Log audit event
    await Audit.logOrderStatusChange(
      orderId,
      oldStatus,
      status,
      vendorId,
      'vendor',
      `Vendor updated order status: ${notes || 'No additional notes'}`,
      { orderType: isVendorOrder ? 'vendor_order' : 'legacy_order' }
    );

    // Send customer notification for shipped/delivered
    if (status === 'shipped' || status === 'delivered') {
      try {
        await sendCustomerNotification(order, status);
      } catch (emailError) {
        console.log('📧 Email notification failed:', emailError.message);
        // Don't fail the entire operation for email issues
      }
    }

    console.log(`✅ Order ${orderId} status updated from ${oldStatus} to ${status}`);

    res.json({
      success: true,
      message: `Order status updated to ${status} successfully`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName || order.name,
        updatedAt: order.statusUpdatedAt
      }
    });

  } catch (error) {
    console.error('❌ Update vendor order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to update parent order status for mixed orders
const updateParentOrderStatus = async (parentOrderId) => {
  try {
    const parentOrder = await Order.findById(parentOrderId);
    if (!parentOrder) return;

    // Find all child parts
    const childParts = await Order.find({ parentOrderId: parentOrderId });
    const vendorOrders = await VendorOrder.find({ parentOrderId: parentOrderId });
    
    // Collect all statuses
    const allStatuses = [
      ...childParts.map(part => part.status),
      ...vendorOrders.map(order => order.status)
    ];

    // Calculate new parent status
    let newParentStatus = 'processing'; // Default
    
    if (allStatuses.every(status => status === 'delivered')) {
      newParentStatus = 'delivered';
    } else if (allStatuses.some(status => status === 'shipped')) {
      newParentStatus = 'shipped';
    } else if (allStatuses.every(status => ['processing', 'shipped', 'delivered'].includes(status))) {
      newParentStatus = 'processing';
    }

    // Update parent order
    parentOrder.status = newParentStatus;
    parentOrder.statusUpdatedAt = new Date();
    await parentOrder.save();

    console.log(`✅ Updated parent order ${parentOrderId} status to ${newParentStatus}`);
  } catch (error) {
    console.error('❌ Error updating parent order status:', error);
  }
};

// Simple email notification function
const sendCustomerNotification = async (order, status) => {
  try {
    console.log(`📧 Would send ${status} notification for order ${order.orderNumber}`);
    // For now, just log - implement actual email later if needed
    return true;
  } catch (error) {
    console.error('Email notification error:', error);
    throw error;
  }
};

module.exports = {
  updateVendorOrderStatus
};
