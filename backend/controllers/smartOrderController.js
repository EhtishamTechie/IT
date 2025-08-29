const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');

// @desc    Handle smart mixed order cancellation logic
// @route   POST /api/admin/orders/:orderId/handle-vendor-rejection
// @access  Private (Admin)
const handleVendorRejection = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { vendorOrderId, rejectionReason } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    console.log(`🔄 Handling vendor rejection for order: ${orderId}, vendorOrder: ${vendorOrderId}`);

    // Get the main order
    const mainOrder = await Order.findById(orderId);
    if (!mainOrder) {
      return res.status(404).json({
        success: false,
        message: 'Main order not found'
      });
    }

    // Get the vendor order being rejected
    const vendorOrder = await VendorOrder.findById(vendorOrderId);
    if (!vendorOrder) {
      return res.status(404).json({
        success: false,
        message: 'Vendor order not found'
      });
    }

    // Update the vendor order status to rejected
    vendorOrder.status = 'rejected';
    vendorOrder.rejectionReason = rejectionReason;
    vendorOrder.rejectedAt = new Date();
    await vendorOrder.save();

    // Get all vendor orders for this parent order
    const allVendorOrders = await VendorOrder.find({ parentOrderId: orderId });
    
    // Check if there are any active (non-rejected, non-cancelled) vendor orders
    const activeVendorOrders = allVendorOrders.filter(vo => 
      !['rejected', 'cancelled'].includes(vo.status)
    );

    // Check if there's an admin part (split order with admin items)
    const adminPart = await Order.findOne({ 
      parentOrderId: orderId, 
      orderType: 'admin_only',
      splitFromMixedOrder: true 
    });

    const hasActiveAdminPart = adminPart && !['rejected', 'cancelled'].includes(adminPart.status);

    // Determine overall order status based on remaining active parts
    let newMainOrderStatus;
    let statusReason;

    if (activeVendorOrders.length === 0 && !hasActiveAdminPart) {
      // All parts are rejected/cancelled - mark main order as cancelled
      newMainOrderStatus = 'Cancelled';
      statusReason = 'All order parts were rejected or cancelled';
    } else if (activeVendorOrders.length > 0 || hasActiveAdminPart) {
      // Some parts are still active - keep processing
      newMainOrderStatus = 'processing';
      statusReason = `Vendor ${vendorOrder.orderNumber} rejected, but other parts are still active`;
    } else {
      // Fallback
      newMainOrderStatus = 'processing';
      statusReason = 'Order status evaluation completed';
    }

    // Update main order status
    await Order.findByIdAndUpdate(orderId, {
      status: newMainOrderStatus,
      lastStatusUpdate: new Date(),
      statusUpdateReason: statusReason,
      updatedBy: adminId
    });

    // Prepare response data
    const responseData = {
      mainOrderId: orderId,
      mainOrderStatus: newMainOrderStatus,
      rejectedVendorOrder: {
        id: vendorOrderId,
        orderNumber: vendorOrder.orderNumber,
        rejectionReason
      },
      remainingParts: {
        activeVendorOrders: activeVendorOrders.length,
        hasAdminPart: hasActiveAdminPart,
        totalVendorOrders: allVendorOrders.length
      },
      statusReason
    };

    console.log(`✅ Vendor rejection handled:`, responseData);

    res.status(200).json({
      success: true,
      message: `Vendor order rejected. ${statusReason}`,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error handling vendor rejection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle vendor rejection',
      error: error.message
    });
  }
};

// @desc    Get smart order status summary for mixed orders
// @route   GET /api/admin/orders/:orderId/status-summary
// @access  Private (Admin)
const getOrderStatusSummary = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get main order
    const mainOrder = await Order.findById(orderId);
    if (!mainOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    let summary = {
      mainOrder: {
        id: mainOrder._id,
        orderNumber: mainOrder.orderNumber,
        status: mainOrder.status,
        orderType: mainOrder.orderType,
        isSplitOrder: mainOrder.isSplitOrder || false,
        totalAmount: mainOrder.totalAmount,
        createdAt: mainOrder.createdAt
      },
      parts: [],
      overallStatus: mainOrder.status
    };

    // If it's a split order, get all parts
    if (mainOrder.isSplitOrder) {
      // Get admin part
      const adminPart = await Order.findOne({
        parentOrderId: orderId,
        orderType: 'admin_only',
        splitFromMixedOrder: true
      });

      if (adminPart) {
        summary.parts.push({
          type: 'admin',
          id: adminPart._id,
          orderNumber: adminPart.orderNumber,
          status: adminPart.status,
          items: adminPart.cart?.length || 0,
          amount: adminPart.totalAmount || 0
        });
      }

      // Get vendor parts
      const vendorOrders = await VendorOrder.find({ parentOrderId: orderId })
        .populate('vendor', 'businessName email');

      vendorOrders.forEach(vo => {
        summary.parts.push({
          type: 'vendor',
          id: vo._id,
          orderNumber: vo.orderNumber,
          status: vo.status,
          vendor: {
            id: vo.vendor._id,
            name: vo.vendor.businessName,
            email: vo.vendor.email
          },
          items: vo.items?.length || 0,
          amount: vo.totalAmount || 0,
          trackingNumber: vo.trackingNumber,
          rejectionReason: vo.rejectionReason
        });
      });

      // Calculate overall status for split orders
      const allStatuses = summary.parts.map(part => part.status);
      
      if (allStatuses.every(status => status === 'delivered')) {
        summary.overallStatus = 'delivered';
      } else if (allStatuses.every(status => ['cancelled', 'rejected'].includes(status))) {
        summary.overallStatus = 'cancelled';
      } else if (allStatuses.some(status => ['cancelled', 'rejected'].includes(status))) {
        summary.overallStatus = 'partially_cancelled';
      } else if (allStatuses.every(status => ['shipped', 'delivered'].includes(status))) {
        summary.overallStatus = 'shipping';
      } else if (allStatuses.some(status => ['processing', 'confirmed'].includes(status))) {
        summary.overallStatus = 'processing';
      } else {
        summary.overallStatus = 'pending';
      }
    }

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Error getting order status summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order status summary',
      error: error.message
    });
  }
};

// @desc    Handle smart admin action for mixed/split orders
// @route   PUT /api/admin/orders/:orderId/smart-admin-action
// @access  Private (Admin)
const handleSmartAdminAction = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, notes } = req.body; // action: 'approve', 'reject', 'ship', 'deliver'
    const adminId = req.admin?.id || req.user?.id;

    console.log(`🔧 Smart admin action for order: ${orderId}, action: ${action}`);

    // Get the main order
    const mainOrder = await Order.findById(orderId);
    if (!mainOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if this is a split order (has vendor orders associated)
    const vendorOrders = await VendorOrder.find({ parentOrderId: orderId });
    const hasSplitOrders = vendorOrders.length > 0;

    // Check if there's an admin-only part of a split order
    const adminOnlyPart = await Order.findOne({ 
      parentOrderId: orderId, 
      orderType: 'admin_only',
      splitFromMixedOrder: true 
    });

    let updatedOrder;
    let newStatus;

    // Determine what to update based on order type
    if (hasSplitOrders || adminOnlyPart) {
      // This is a mixed order - update the admin part only
      console.log(`🔧 Handling admin action for mixed order`);
      
      // Map actions to statuses
      const statusMap = {
        'approve': 'confirmed',
        'reject': 'rejected',
        'ship': 'shipped',
        'deliver': 'delivered',
        'process': 'processing'
      };

      newStatus = statusMap[action] || action;

      if (adminOnlyPart) {
        // Check if order was cancelled by user - prevent admin changes
        if (adminOnlyPart.status === 'Cancelled' && adminOnlyPart.cancelledBy === 'user') {
          return res.status(403).json({
            success: false,
            message: 'Cannot modify order status. This order part was cancelled by the customer.'
          });
        }
        
        // Update the separate admin part
        updatedOrder = await Order.findByIdAndUpdate(adminOnlyPart._id, {
          status: newStatus,
          adminNotes: notes,
          lastStatusUpdate: new Date(),
          updatedBy: adminId
        }, { new: true });
        
        console.log(`✅ Updated admin part ${adminOnlyPart._id} to status: ${newStatus}`);
        
        // Update parent order status if this is an admin part
        if (adminOnlyPart.parentOrderId) {
          const { updateParentOrderStatus } = require('./mixedOrderController');
          await updateParentOrderStatus(adminOnlyPart.parentOrderId);
        }
        
      } else {
        // Update admin portion tracking in main order
        await Order.findByIdAndUpdate(orderId, {
          adminStatus: newStatus,
          adminNotes: notes,
          lastStatusUpdate: new Date(),
          updatedBy: adminId,
          'completionDetails.adminCompleted': ['confirmed', 'shipped', 'delivered'].includes(newStatus),
          'completionDetails.adminRejected': newStatus === 'rejected'
        });
        
        console.log(`✅ Updated admin status in main order to: ${newStatus}`);
      }

      // Calculate overall order status
      const allVendorOrders = await VendorOrder.find({ parentOrderId: orderId });
      const adminStatus = adminOnlyPart ? newStatus : (await Order.findById(orderId)).adminStatus || newStatus;
      
      const allStatuses = [adminStatus, ...allVendorOrders.map(vo => vo.status)];
      let overallStatus;

      if (allStatuses.every(status => status === 'delivered')) {
        overallStatus = 'delivered';
      } else if (allStatuses.every(status => ['cancelled', 'rejected'].includes(status))) {
        overallStatus = 'cancelled';
      } else if (allStatuses.some(status => ['cancelled', 'rejected'].includes(status))) {
        overallStatus = 'partially_cancelled';
      } else if (allStatuses.every(status => ['shipped', 'delivered'].includes(status))) {
        overallStatus = 'shipped';
      } else if (allStatuses.some(status => ['processing', 'confirmed'].includes(status))) {
        overallStatus = 'processing';
      } else {
        overallStatus = 'pending';
      }

      // Update main order overall status
      await Order.findByIdAndUpdate(orderId, {
        status: overallStatus,
        lastStatusUpdate: new Date(),
        statusUpdateReason: `Admin ${action}ed admin portion, overall status calculated`,
        updatedBy: adminId
      });

      updatedOrder = await Order.findById(orderId);
      
    } else {
      // This is a regular admin-only order - update normally
      console.log(`🔧 Handling admin action for admin-only order`);
      
      const statusMap = {
        'approve': 'confirmed',
        'reject': 'rejected',
        'ship': 'shipped',
        'deliver': 'delivered',
        'process': 'processing'
      };

      newStatus = statusMap[action] || action;

      updatedOrder = await Order.findByIdAndUpdate(orderId, {
        status: newStatus,
        adminNotes: notes,
        lastStatusUpdate: new Date(),
        updatedBy: adminId
      }, { new: true });
    }

    const responseData = {
      orderId,
      action,
      newStatus,
      overallStatus: updatedOrder.status,
      isMixedOrder: hasSplitOrders || !!adminOnlyPart,
      vendorOrderCount: vendorOrders.length,
      adminNotes: notes
    };

    console.log(`✅ Smart admin action completed:`, responseData);

    res.status(200).json({
      success: true,
      message: `Order ${action}ed successfully`,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error handling smart admin action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process admin action',
      error: error.message
    });
  }
};

module.exports = {
  handleVendorRejection,
  getOrderStatusSummary,
  handleSmartAdminAction
};
