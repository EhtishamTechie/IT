const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const MonthlyCommission = require('../models/MonthlyCommission');

// Valid status transitions for the 6-status system
const VALID_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'];

// Status transition rules
const STATUS_TRANSITIONS = {
  placed: ['processing', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'],
  processing: ['shipped', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'],
  shipped: ['delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'],
  delivered: [], // Final status - no transitions allowed
  cancelled: [], // Final status - no transitions allowed
  cancelled_by_customer: [], // Final status - no transitions allowed
  cancelled_by_user: [] // Final status - no transitions allowed
};

// @desc    Update order status (Simple 6-status system)
// @route   PUT /api/orders/:orderId/status
// @access  Private (Admin/Vendor based on permissions)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason, updatedBy, vendorId } = req.body;

    console.log(`🔄 Simple status update request:`, {
      orderId,
      newStatus: status,
      updatedBy: updatedBy || req.user?.role || req.admin?.role || req.vendor?.businessName,
      isVendorRequest: !!vendorId,
      vendorId: vendorId || 'N/A',
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

    // Validate status
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Find the order - For vendor updates, prioritize VendorOrder collection
    let order;
    let isVendorOrder = false;
    
    // If this is a vendor making the update, check VendorOrder collection first
    if (req.vendor) {
      order = await VendorOrder.findById(orderId);
      if (order) {
        isVendorOrder = true;
      }
    }
    
    // If not found in VendorOrder or not a vendor request, check Order collection
    if (!order) {
      order = await Order.findById(orderId);
      isVendorOrder = false;
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if transition is allowed
    const currentStatus = order.status || 'placed';
    
    // PREVENTION: Block admin/vendor status changes after customer cancellation
    if (currentStatus === 'cancelled_by_customer' && status !== 'cancelled_by_customer') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of orders cancelled by customer. Customer cancellations are final.',
        data: {
          currentStatus,
          requestedStatus: status,
          reason: 'Customer cancelled orders cannot be modified'
        }
      });
    }
    
    if (!STATUS_TRANSITIONS[currentStatus]?.includes(status) && currentStatus !== status) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${currentStatus}' to '${status}'. Allowed transitions: ${STATUS_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`
      });
    }

    // Handle commission reversal for customer cancellations (only for orders with vendor items and appropriate status)
    if (status === 'cancelled_by_customer' && currentStatus !== 'cancelled_by_customer') {
      // Check if this order has vendor items before reversing commissions
      const hasVendorItems = isVendorOrder || 
        (order.cart && order.cart.some(item => item.vendor)) ||
        (order.items && order.items.some(item => item.vendor));
      
      if (hasVendorItems) {
        // Commission should only be reversed if order has progressed beyond 'placed' status
        // At 'placed' status, no commission has been paid yet
        const statusesWithCommission = ['processing', 'shipped', 'delivered'];
        
        if (statusesWithCommission.includes(currentStatus)) {
          console.log(`💰 [COMMISSION] Order ${orderId} has vendor items and status '${currentStatus}', processing commission reversal`);
          await reverseCommissions(orderId, order);
        } else {
          console.log(`ℹ️ [COMMISSION] Order ${orderId} has vendor items but status '${currentStatus}' - no commission to reverse (commission not yet paid)`);
        }
      } else {
        console.log(`ℹ️ [COMMISSION] Order ${orderId} is admin-only (no vendor items), skipping commission reversal`);
      }
    }

    // STOCK REVERSAL - Handle stock reversal for admin/vendor cancellations (status = 'cancelled')
    if (status === 'cancelled' && currentStatus !== 'cancelled') {
      const cancelledBy = req.admin ? 'admin' : req.vendor ? 'vendor' : 'system';
      console.log(`📦 [${cancelledBy.toUpperCase()} CANCEL] Releasing stock for order ${orderId}`);
      console.log(`📋 [${cancelledBy.toUpperCase()} CANCEL] Order type: ${isVendorOrder ? 'VendorOrder' : 'Order'}`);
      console.log(`📋 [${cancelledBy.toUpperCase()} CANCEL] Items count: ${isVendorOrder ? order.items?.length || 0 : order.cart?.length || 0}`);
      
      try {
        const StockManager = require('../services/StockManager');
        
        // For vendor orders, we need to release stock based on the items in the VendorOrder
        if (isVendorOrder && order.items && order.items.length > 0) {
          console.log(`📦 [VENDOR CANCEL] Processing vendor order items for stock release`);
          for (const item of order.items) {
            if (item.productId) {
              try {
                await StockManager.restoreStock(item.productId, item.quantity);
                console.log(`📈 [VENDOR CANCEL] Stock restored for ${item.title}: +${item.quantity}`);
              } catch (itemStockError) {
                console.error(`❌ [VENDOR CANCEL] Failed to restore stock for item ${item.productId}:`, itemStockError);
              }
            }
          }
          console.log(`✅ [VENDOR CANCEL] Completed stock restoration for all ${order.items.length} items`);
        } else {
          // For regular orders, use the existing releaseStock method
          const stockReleaseResult = await StockManager.releaseStock(order._id);
          console.log(`📦 [ADMIN/VENDOR CANCEL] Stock release result:`, stockReleaseResult);
        }
      } catch (stockError) {
        console.error(`❌ [${cancelledBy.toUpperCase()} CANCEL] Stock release failed for order ${orderId}:`, stockError);
        // Don't fail the operation, but log the error
      }
    }

    // Simple direct status update
    const updateData = {
      status,
      lastStatusUpdate: new Date(),
      $push: {
        statusHistory: {
          status,
          updatedBy: updatedBy || req.user?.name || req.admin?.name || req.vendor?.businessName || 'System',
          reason: reason || 'Status update',
          timestamp: new Date(),
          userRole: req.user?.role || req.admin?.role || (req.vendor ? 'vendor' : 'system')
        }
      }
    };

    // Set deliveredAt timestamp when order is marked as delivered
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      console.log(`📦 Order ${orderId} marked as delivered at ${updateData.deliveredAt.toISOString()}`);
    }

    let updatedOrder;
    if (isVendorOrder) {
      updatedOrder = await VendorOrder.findByIdAndUpdate(orderId, updateData, { new: true });
      
      // SYNC: Also update the corresponding Order document if it exists
      // Find Order document that links to this VendorOrder
      const linkedOrder = await Order.findOne({ vendorOrderId: orderId });
      if (linkedOrder) {
        await Order.findByIdAndUpdate(linkedOrder._id, {
          status,
          lastStatusUpdate: new Date(),
          $push: {
            statusHistory: {
              status,
              updatedBy: `Vendor Sync: ${updatedBy || req.vendor?.businessName || 'Vendor'}`,
              reason: `Synced from VendorOrder: ${reason || 'Vendor status update'}`,
              timestamp: new Date(),
              userRole: 'vendor-sync'
            }
          }
        });
        console.log(`🔄 Synced status to linked Order document: ${linkedOrder._id}`);
      }
    } else {
      updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
    }

    console.log(`✅ [STATUS UPDATE] ${isVendorOrder ? 'VendorOrder' : 'Order'} ${orderId} status updated: ${currentStatus} → ${status}`);
    console.log(`📋 [STATUS UPDATE] Updated order details: ${JSON.stringify({
      orderNumber: updatedOrder.orderNumber,
      orderType: updatedOrder.orderType,
      parentOrderId: updatedOrder.parentOrderId || 'none',
      newStatus: status,
      isSubOrder: !!updatedOrder.parentOrderId
    }, null, 2)}`);

    // Send email notification for status updates (asynchronous)
    if (currentStatus !== status) {
      setImmediate(async () => {
        // Determine customer email based on order type
        let customerEmail = null;
        if (isVendorOrder && updatedOrder.customer && updatedOrder.customer.email) {
          customerEmail = updatedOrder.customer.email;
        } else if (!isVendorOrder && updatedOrder.email) {
          customerEmail = updatedOrder.email;
        }
        
        if (customerEmail) {
          try {
            const { emailService } = require('../services/emailService');
            await emailService.sendOrderStatusUpdate(customerEmail, updatedOrder, status, currentStatus);
            console.log(`📧 [EMAIL] Order status update email sent for ${updatedOrder.orderNumber}: ${currentStatus} → ${status}`);
          } catch (emailError) {
            console.error('❌ [EMAIL] Failed to send order status update email:', emailError);
            // Don't fail the operation if email fails
          }
        } else {
          console.log(`⚠️ [EMAIL] No customer email found for ${isVendorOrder ? 'VendorOrder' : 'Order'} ${updatedOrder.orderNumber}`);
        }
      });
    }

    // If this is a sub-order (has parentOrderId), recalculate parent order status (asynchronous)
    if (updatedOrder.parentOrderId) {
      console.log(`🔄 Recalculating parent order status for parent: ${updatedOrder.parentOrderId}`);
      setImmediate(async () => {
        try {
          await recalculateParentOrderStatus(updatedOrder.parentOrderId);
        } catch (parentError) {
          console.error(`❌ Failed to recalculate parent order status:`, parentError);
          // Don't fail the main operation, just log the error
        }
      });
    }

    // Invalidate order caches to ensure fresh data in order history (asynchronous)
    setImmediate(async () => {
      try {
        const cacheInvalidator = require('../utils/cacheInvalidator');
        await cacheInvalidator.invalidateOrders();
        console.log('🔄 Order caches invalidated after status update');
      } catch (cacheError) {
        console.error('❌ Failed to invalidate order caches:', cacheError);
        // Don't fail the operation, just log the error
      }
    });

    res.json({
      success: true,
      message: `Order status updated to '${status}'`,
      data: {
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        previousStatus: currentStatus,
        newStatus: status,
        lastStatusUpdate: updatedOrder.lastStatusUpdate
      }
    });

  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// @desc    Reverse commissions for customer cancellation with enhanced logging
// @access  Internal function
const reverseCommissions = async (orderId, order) => {
  try {
    console.log(`� COMMISSION REVERSAL STARTING for order: ${orderId}`);
    console.log(`📋 Order details:`, {
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      orderType: order.orderType,
      cartItems: order.cart?.length || 0,
      orderCollection: order.constructor.modelName
    });

    // For mixed orders that have been forwarded, check for VendorOrder records
    const VendorOrder = require('../models/VendorOrder');
    
    // Try multiple query approaches
    console.log(`🔍 Searching for VendorOrders with parentOrderId: ${orderId}`);
    const vendorOrdersByParent = await VendorOrder.find({ parentOrderId: orderId });
    
    console.log(`🔍 Searching for VendorOrders with _id: ${orderId}`);  
    const vendorOrderById = await VendorOrder.findById(orderId);
    
    console.log(`📊 Query results:`, {
      byParentOrderId: vendorOrdersByParent.length,
      byDirectId: vendorOrderById ? 1 : 0
    });
    
    let vendorOrders = [];
    
    if (vendorOrdersByParent.length > 0) {
      vendorOrders = vendorOrdersByParent;
      console.log(`✅ Using parentOrderId search results: ${vendorOrders.length} orders`);
    } else if (vendorOrderById) {
      vendorOrders = [vendorOrderById];
      console.log(`✅ Using direct ID search result: 1 order`);
    }
    
    console.log(`🔍 Final vendor orders count: ${vendorOrders.length}`);
    
    if (vendorOrders.length > 0) {
      // Handle forwarded mixed order - reverse commissions from VendorOrder records
      console.log(`📦 Processing forwarded mixed order commission reversal`);
      
      for (const vendorOrder of vendorOrders) {
        if (vendorOrder.commissionAmount > 0) {
          const orderDate = new Date(vendorOrder.createdAt);
          const month = orderDate.getMonth() + 1;
          const year = orderDate.getFullYear();
          
          console.log(`� Reversing VendorOrder commission: ${vendorOrder.orderNumber} - $${vendorOrder.commissionAmount}`);
          
          try {
            const updateResult = await MonthlyCommission.findOneAndUpdate(
              { vendor: vendorOrder.vendor, month, year },
              {
                $pull: { 
                  transactions: { 
                    orderId: vendorOrder.parentOrderId || vendorOrder._id,
                    vendorOrderId: vendorOrder._id
                  }
                },
                $inc: {
                  totalCommission: -vendorOrder.commissionAmount,
                  totalSales: -vendorOrder.totalAmount,
                  totalOrders: -1
                }
              },
              { new: true }
            );
            
            if (updateResult) {
              console.log(`✅ Commission reversed for vendor ${vendorOrder.vendor}: -$${vendorOrder.commissionAmount}`);
              
              // Mark this vendor order as having commission reversed
              await VendorOrder.findByIdAndUpdate(vendorOrder._id, {
                commissionReversed: true,
                commissionReversedAt: new Date()
              });
              console.log(`✅ Marked vendor order ${vendorOrder.orderNumber} as commission reversed`);
            } else {
              console.warn(`⚠️ No commission record found for vendor ${vendorOrder.vendor} in ${month}/${year}`);
            }
          } catch (vendorError) {
            console.error(`❌ Error reversing commission for vendor order ${vendorOrder._id}:`, vendorError);
          }
        } else {
          console.log(`ℹ️ No commission to reverse for vendor order ${vendorOrder.orderNumber} (amount: $0)`);
        }
      }
    } else {
      // Handle non-forwarded order - use original cart-based logic
      console.log(`📦 Processing non-forwarded order commission reversal`);
      
      // Get current commission rate from config
      const CommissionConfig = require('../config/commission');
      const commissionRate = CommissionConfig.VENDOR_COMMISSION_RATE;
      console.log(`💰 Using commission rate: ${commissionRate} (${CommissionConfig.COMMISSION_PERCENTAGE}%)`);
      
      const orderDate = new Date(order.createdAt);
      const month = orderDate.getMonth() + 1;
      const year = orderDate.getFullYear();

      // Find vendors involved in this order
      const vendorsInOrder = order.cart
        .filter(item => item.vendor)
        .map(item => item.vendor.toString())
        .filter((vendor, index, self) => self.indexOf(vendor) === index); // Remove duplicates

      console.log(`🏪 Found ${vendorsInOrder.length} unique vendors in cart`);

      // Reverse commission for each vendor
      for (const vendorId of vendorsInOrder) {
        try {
          // Calculate vendor-specific commission
          const vendorItems = order.cart.filter(item => 
            item.vendor && item.vendor.toString() === vendorId
          );
          const vendorRevenue = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const vendorCommission = vendorRevenue * commissionRate;

          console.log(`💰 Vendor ${vendorId}: Revenue: $${vendorRevenue}, Commission to reverse: $${vendorCommission}`);

          if (vendorCommission > 0) {
            // Update monthly commission record
            const updateResult = await MonthlyCommission.findOneAndUpdate(
              { vendor: vendorId, month, year },
              {
                $pull: { 
                  transactions: { 
                    orderId: orderId
                  }
                },
                $inc: {
                  totalCommission: -vendorCommission,
                  totalSales: -vendorRevenue,
                  totalOrders: -1
                }
              },
              { upsert: false, new: true }
            );

            if (updateResult) {
              console.log(`💸 Commission reversed for vendor ${vendorId}: -$${vendorCommission.toFixed(2)}`);
              console.log(`📊 Updated totals - Commission: $${updateResult.totalCommission}, Revenue: $${updateResult.totalRevenue}`);
            } else {
              console.warn(`⚠️ No commission record found for vendor ${vendorId} in ${month}/${year}`);
            }
          } else {
            console.log(`ℹ️ No commission to reverse for vendor ${vendorId} (amount: $0)`);
          }
        } catch (vendorError) {
          console.error(`❌ Error reversing commission for vendor ${vendorId}:`, vendorError);
          // Continue with other vendors
        }
      }
    }

    console.log(`✅ Commission reversal completed for order ${orderId}`);

  } catch (error) {
    console.error('❌ Commission reversal error:', error);
    // Don't throw error - status update should still succeed
  }
};

// @desc    Customer cancellation with commission reversal
// @route   PUT /api/status/:orderId/cancel
// @access  Private (Customer)
const cancelCustomerOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const userEmail = req.user?.email;

    console.log(`🚫 Customer cancellation request:`, {
      orderId,
      userId,
      userEmail,
      reason
    });

    // Find the order and verify ownership
    // Support both ObjectId and orderNumber
    let order;
    
    // Try finding by ObjectId first (for direct ID references)
    if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(orderId);
      
      // Also check VendorOrder collection
      if (!order) {
        order = await VendorOrder.findById(orderId);
      }
    } else {
      // Find by orderNumber (for order numbers like ORD-111409406)
      order = await Order.findOne({ orderNumber: orderId });
      
      // Also check VendorOrder collection for order number
      if (!order) {
        order = await VendorOrder.findOne({ orderNumber: orderId });
      }
      
      // For vendor-only orders, also check by parentOrderNumber
      if (!order) {
        order = await VendorOrder.findOne({ parentOrderNumber: orderId });
      }
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify customer owns this order (check multiple possible fields)
    const orderUserId = order.customer?.toString() || order.userId?.toString();
    const orderEmail = order.email;
    
    const isOwner = (userId && orderUserId === userId) || 
                   (userEmail && orderEmail === userEmail);
    
    if (!isOwner) {
      console.log('❌ Authorization failed:', { 
        orderUserId, 
        userId, 
        orderEmail, 
        userEmail 
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    const currentStatus = order.status || 'placed';
    if (['shipped', 'delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status '${currentStatus}'`
      });
    }

    // Reverse commissions before updating status (only for orders with vendor items and appropriate status)
    const isVendorOrder = order.constructor.modelName === 'VendorOrder';
    const hasVendorItems = isVendorOrder || 
      (order.cart && order.cart.some(item => item.vendor)) ||
      (order.items && order.items.some(item => item.vendor));
    
    let commissionWasReversed = false;
    
    if (hasVendorItems) {
      const currentStatus = order.status || 'placed';
      
      // Commission should only be reversed if order has progressed beyond 'placed' status
      // At 'placed' status, no commission has been paid yet
      const statusesWithCommission = ['processing', 'shipped', 'delivered'];
      
      if (statusesWithCommission.includes(currentStatus)) {
        console.log(`🔧 [CANCEL ORDER] Order ${orderId} has vendor items and status '${currentStatus}', processing commission reversal`);
        await reverseCommissions(order._id, order);
        commissionWasReversed = true;
        console.log(`✅ [CANCEL ORDER] Commission reversal completed for order ${orderId}`);
      } else {
        console.log(`ℹ️ [CANCEL ORDER] Order ${orderId} has vendor items but status '${currentStatus}' - no commission to reverse (commission not yet paid)`);
      }
    } else {
      console.log(`ℹ️ [CANCEL ORDER] Order ${orderId} is admin-only (no vendor items), skipping commission reversal`);
    }

    // Update status to cancelled_by_customer
    const updateData = {
      status: 'cancelled_by_customer',
      lastStatusUpdate: new Date(),
      cancelledAt: new Date(),
      cancellationReason: reason || 'Cancelled by customer',
      cancelledBy: 'customer',
      commissionReversed: commissionWasReversed, // Only mark as reversed if commission was actually processed
      $push: {
        statusHistory: {
          status: 'cancelled_by_customer',
          updatedBy: req.user?.name || req.user?.email || 'Customer',
          reason: reason || 'Cancelled by customer',
          timestamp: new Date(),
          userRole: 'customer'
        }
      }
    };

    // STOCK REVERSAL - Release reserved stock
    console.log(`📦 [CANCEL ORDER] Releasing stock for order ${orderId}`);
    try {
      const StockManager = require('../services/StockManager');
      const stockReleaseResult = await StockManager.releaseStock(order._id);
      console.log(`📦 [CANCEL ORDER] Stock release result:`, stockReleaseResult);
    } catch (stockError) {
      console.error(`❌ [CANCEL ORDER] Stock release failed for order ${orderId}:`, stockError);
    }

    // Update both collections if needed
    if (order.constructor.modelName === 'VendorOrder') {
      await VendorOrder.findByIdAndUpdate(order._id, updateData);
      
      // Also update the main Order document for vendor-only orders
      const parentOrder = await Order.findOne({ 
        $or: [
          { orderNumber: order.parentOrderNumber },
          { _id: order.parentOrderId }
        ]
      });
      if (parentOrder) {
        await Order.findByIdAndUpdate(parentOrder._id, updateData);
        console.log(`✅ Updated parent order ${parentOrder.orderNumber} status to cancelled_by_customer`);
      }
    } else {
      await Order.findByIdAndUpdate(order._id, updateData);
      
      // For vendor-only orders, also update all associated VendorOrders
      const associatedVendorOrders = await VendorOrder.find({
        $or: [
          { parentOrderId: order._id },
          { parentOrderNumber: order.orderNumber }
        ]
      });
      
      console.log(`🔍 Found ${associatedVendorOrders.length} associated vendor orders for ${order.orderNumber}`);
      
      for (const vendorOrder of associatedVendorOrders) {
        try {
          await VendorOrder.findByIdAndUpdate(vendorOrder._id, updateData);
          console.log(`✅ Updated vendor order ${vendorOrder.orderNumber} status to cancelled_by_customer`);
        } catch (vendorUpdateError) {
          console.error(`❌ Failed to update vendor order ${vendorOrder.orderNumber}:`, vendorUpdateError);
        }
      }

      // CRITICAL: Also update sub-orders (child orders) that have this order as parent
      const subOrders = await Order.find({
        parentOrderId: order._id
      });
      
      console.log(`🔍 Found ${subOrders.length} sub-orders for ${order.orderNumber}`);
      
      for (const subOrder of subOrders) {
        try {
          await Order.findByIdAndUpdate(subOrder._id, updateData);
          console.log(`✅ Updated sub-order ${subOrder.orderNumber} status to cancelled_by_customer`);
        } catch (subOrderUpdateError) {
          console.error(`❌ Failed to update sub-order ${subOrder.orderNumber}:`, subOrderUpdateError);
        }
      }
    }

    console.log(`✅ Order ${orderId} cancelled by customer${commissionWasReversed ? ' (commission reversed)' : hasVendorItems ? ' (no commission to reverse)' : ' (admin-only)'}`);

    // Invalidate order caches to ensure fresh data in order history (asynchronous)
    setImmediate(async () => {
      try {
        const cacheInvalidator = require('../utils/cacheInvalidator');
        await cacheInvalidator.invalidateOrders();
        console.log('🔄 Order caches invalidated after customer cancellation');
      } catch (cacheError) {
        console.error('❌ Failed to invalidate order caches after cancellation:', cacheError);
        // Don't fail the operation, just log the error
      }
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully.',
      data: {
        orderId,
        orderNumber: order.orderNumber,
        newStatus: 'cancelled_by_customer',
        cancelledAt: new Date(),
        commissionReversed: commissionWasReversed
      }
    });

  } catch (error) {
    console.error('❌ Customer cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
};

// @desc    Get order status history with VendorOrder priority
// @route   GET /api/status/:orderId/status-history
// @access  Private
const getOrderStatusHistory = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Try VendorOrder first for real-time status
    let order = await VendorOrder.findById(orderId).select('statusHistory status orderNumber');
    let isVendorOrder = true;
    
    // If not found in VendorOrder, check Order collection
    if (!order) {
      order = await Order.findById(orderId).select('statusHistory status orderNumber');
      isVendorOrder = false;
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`📊 Fetching status for ${isVendorOrder ? 'VendorOrder' : 'Order'} ${orderId}`);

    res.json({
      success: true,
      data: {
        orderId,
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        statusHistory: order.statusHistory || [],
        source: isVendorOrder ? 'VendorOrder' : 'Order'
      }
    });

  } catch (error) {
    console.error('❌ Get status history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching status history',
      error: error.message
    });
  }
};

// @desc    Get valid status transitions for current status with VendorOrder priority
// @route   GET /api/status/:orderId/valid-transitions
// @access  Private
const getValidTransitions = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Try VendorOrder first for real-time status
    let order = await VendorOrder.findById(orderId).select('status orderNumber');
    let isVendorOrder = true;
    
    // If not found in VendorOrder, check Order collection
    if (!order) {
      order = await Order.findById(orderId).select('status orderNumber');
      isVendorOrder = false;
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = order.status || 'placed';
    const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    console.log(`📊 Valid transitions for ${isVendorOrder ? 'VendorOrder' : 'Order'} ${orderId}: ${currentStatus} → [${validTransitions.join(', ')}]`);

    res.json({
      success: true,
      data: {
        orderId,
        orderNumber: order.orderNumber,
        currentStatus,
        validTransitions,
        allStatuses: VALID_STATUSES,
        source: isVendorOrder ? 'VendorOrder' : 'Order'
      }
    });

  } catch (error) {
    console.error('❌ Get valid transitions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching valid transitions',
      error: error.message
    });
  }
};

// Helper function to recalculate parent order status when sub-order status changes
const recalculateParentOrderStatus = async (parentOrderId) => {
  try {
    console.log(`🔄 [PARENT STATUS RECALC] Starting for parent order: ${parentOrderId}`);
    
    // Get the parent order
    const parentOrder = await Order.findById(parentOrderId);
    if (!parentOrder) {
      console.warn(`⚠️ [PARENT STATUS RECALC] Parent order not found: ${parentOrderId}`);
      return;
    }
    
    console.log(`📋 [PARENT STATUS RECALC] Parent order found: ${parentOrder.orderNumber} (${parentOrder.orderType})`);
    
    // Get all sub-orders for this parent
    const subOrders = await Order.find({ 
      parentOrderId: parentOrderId 
    }).select('status orderType partialOrderType');
    
    console.log(`📊 [PARENT STATUS RECALC] Found ${subOrders.length} sub-orders`);
    
    // Collect all sub-order statuses
    const allStatuses = subOrders.map(sub => {
      console.log(`  - Sub-order: ${sub.orderType}/${sub.partialOrderType} → ${sub.status}`);
      return sub.status;
    });
    
    if (allStatuses.length === 0) {
      console.log(`⚠️ [PARENT STATUS RECALC] No sub-orders found, keeping parent status unchanged`);
      return;
    }
    
    // Filter out cancelled orders from status calculation
    // Cancelled orders don't contribute to fulfillment, so we calculate based on active orders only
    const activeStatuses = allStatuses.filter(status => 
      !['cancelled', 'cancelled_by_customer', 'cancelled_by_user', 'rejected'].includes(status)
    );
    
    console.log(`📊 [PARENT STATUS RECALC] All statuses: [${allStatuses.join(', ')}]`);
    console.log(`📊 [PARENT STATUS RECALC] Active statuses (excluding cancelled): [${activeStatuses.join(', ')}]`);
    
    // Calculate new parent status using the same logic as mixed order resolver
    let newParentStatus;
    
    // If no active orders (all cancelled), determine the specific cancellation type
    if (activeStatuses.length === 0) {
      // All sub-orders are cancelled - determine the most specific cancellation reason
      if (allStatuses.every(status => status === 'cancelled_by_customer')) {
        newParentStatus = 'cancelled_by_customer';
        console.log('🎯 [PARENT STATUS RECALC] All sub-orders cancelled by customer → CANCELLED_BY_CUSTOMER');
      } else if (allStatuses.includes('cancelled_by_customer')) {
        newParentStatus = 'cancelled_by_customer';
        console.log('🎯 [PARENT STATUS RECALC] Some sub-orders cancelled by customer → CANCELLED_BY_CUSTOMER');
      } else if (allStatuses.every(status => status === 'cancelled_by_user')) {
        newParentStatus = 'cancelled_by_user';
        console.log('🎯 [PARENT STATUS RECALC] All sub-orders cancelled by user → CANCELLED_BY_USER');
      } else {
        newParentStatus = 'cancelled';
        console.log('🎯 [PARENT STATUS RECALC] All sub-orders cancelled (mixed types) → CANCELLED');
      }
    } else if (activeStatuses.every(status => status === 'delivered')) {
      newParentStatus = 'delivered';
      console.log('🎯 [PARENT STATUS RECALC] All active parts delivered → DELIVERED');
    } else if (activeStatuses.every(status => ['delivered', 'shipped'].includes(status))) {
      newParentStatus = 'shipped';
      console.log('🎯 [PARENT STATUS RECALC] All active parts shipped or delivered → SHIPPED');
    } else if (activeStatuses.every(status => ['delivered', 'shipped', 'processing'].includes(status))) {
      newParentStatus = 'processing';
      console.log('🎯 [PARENT STATUS RECALC] All active parts processing or better → PROCESSING');
    } else {
      // Mixed active statuses - use the lowest status (most restrictive)
      if (activeStatuses.some(status => status === 'placed')) {
        newParentStatus = 'placed';
        console.log('🎯 [PARENT STATUS RECALC] Some active parts still placed → PLACED');
      } else if (activeStatuses.some(status => status === 'processing')) {
        newParentStatus = 'processing';
        console.log('🎯 [PARENT STATUS RECALC] Mixed active statuses with processing → PROCESSING');
      } else {
        newParentStatus = 'placed';
        console.log('🎯 [PARENT STATUS RECALC] Default fallback → PLACED');
      }
    }
    
    console.log(`📊 [PARENT STATUS RECALC] Calculated new parent status: ${newParentStatus}`);
    console.log(`📊 [PARENT STATUS RECALC] Current parent status: ${parentOrder.status}`);
    
    // Update parent order status if it changed
    if (parentOrder.status !== newParentStatus) {
      await Order.findByIdAndUpdate(parentOrderId, {
        status: newParentStatus,
        $push: {
          statusHistory: {
            status: newParentStatus,
            updatedBy: 'System Auto-Calculation',
            reason: `Recalculated from sub-order statuses: [${allStatuses.join(', ')}]`,
            timestamp: new Date(),
            userRole: 'system'
          }
        }
      });
      
      console.log(`✅ [PARENT STATUS RECALC] Parent order ${parentOrder.orderNumber} status updated: ${parentOrder.status} → ${newParentStatus}`);
      
      // Invalidate order caches to ensure fresh data in order history (asynchronous)
      setImmediate(async () => {
        try {
          const cacheInvalidator = require('../utils/cacheInvalidator');
          await cacheInvalidator.invalidateOrders();
          console.log('🔄 [PARENT STATUS RECALC] Order caches invalidated after parent status update');
        } catch (cacheError) {
          console.error('❌ [PARENT STATUS RECALC] Failed to invalidate order caches:', cacheError);
          // Don't fail the operation, just log the error
        }
      });
    } else {
      console.log(`ℹ️ [PARENT STATUS RECALC] Parent order status unchanged: ${newParentStatus}`);
    }
    
  } catch (error) {
    console.error(`❌ [PARENT STATUS RECALC] Error:`, error);
    throw error;
  }
};

module.exports = {
  updateOrderStatus,
  cancelCustomerOrder,
  getOrderStatusHistory,
  getValidTransitions,
  reverseCommissions,
  recalculateParentOrderStatus
};
