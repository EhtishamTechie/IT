// Add this function to orderController.js

// Cancel individual items in a non-forwarded mixed order
const cancelOrderItems = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { itemIds, reason } = req.body; // Array of cart item IDs to cancel
    const tokenUser = req.user;

    if (!tokenUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get user email
    let userEmail = tokenUser.email;
    if (!userEmail) {
      const User = require('../models/User');
      const dbUser = await User.findById(tokenUser.userId).select('email');
      if (!dbUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      userEmail = dbUser.email;
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify ownership
    if (order.email !== userEmail) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own order items'
      });
    }

    // Check if order can be modified (not shipped/delivered)
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled'];
    if (nonCancellableStatuses.includes(order.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel items. Order has already been ${order.status?.toLowerCase()}.`
      });
    }

    // Check if order has been forwarded already
    const VendorOrder = require('../models/VendorOrder');
    const existingVendorOrders = await VendorOrder.find({ parentOrderId: orderId });
    if (existingVendorOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel items. Order has already been forwarded to vendors. Please use individual part cancellation instead.'
      });
    }

    console.log(`🚫 User ${userEmail} cancelling items ${itemIds.join(', ')} from order ${orderId}`);

    // Mark specific items as cancelled
    let cancelledItemsTotal = 0;
    const cancelledItems = [];

    order.cart = order.cart.map(item => {
      if (itemIds.includes(item._id.toString())) {
        // Cancel this item
        const itemTotal = item.price * item.quantity;
        cancelledItemsTotal += itemTotal;
        cancelledItems.push({
          productName: item.title,
          quantity: item.quantity,
          price: item.price,
          total: itemTotal,
          vendor: item.vendor || null
        });

        return {
          ...item,
          status: 'cancelled',
          cancelledBy: 'user',
          cancelledAt: new Date(),
          cancellationReason: reason || 'Cancelled by customer'
        };
      }
      return item;
    });

    // Update order total
    order.totalAmount = order.totalAmount - cancelledItemsTotal;

    // Check if all items are cancelled
    const remainingItems = order.cart.filter(item => item.status !== 'cancelled');
    if (remainingItems.length === 0) {
      order.status = 'cancelled';
      order.cancelledBy = 'user';
      order.cancelledAt = new Date();
      order.cancellationReason = reason || 'All items cancelled by customer';
    } else {
      // Order is partially cancelled
      order.status = 'partially_cancelled';
    }

    await order.save();

    // TODO: Send notification email about item cancellation

    console.log(`✅ Successfully cancelled ${cancelledItems.length} items from order ${order.orderNumber}`);

    res.json({
      success: true,
      message: `Successfully cancelled ${cancelledItems.length} items`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        cancelledItems,
        refundAmount: cancelledItemsTotal,
        remainingTotal: order.totalAmount,
        orderStatus: order.status
      }
    });

  } catch (error) {
    console.error('Error cancelling order items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order items',
      error: error.message
    });
  }
};
