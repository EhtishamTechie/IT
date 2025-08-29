const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const CommissionService = require('../services/CommissionService');
const mongoose = require('mongoose');

// @desc    Process mixed order using unified item-level system (NO SPLITTING)
// @route   POST /api/admin/orders/:orderId/process-unified
// @access  Private (Admin)
const processUnifiedOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const adminId = req.admin?.id || req.user?.id;

    console.log(`🔄 Processing unified order: ${orderId}`);

    // Get the order
    const order = await Order.findById(orderId)
      .populate('cart.productId')
      .populate('cart.vendor');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('📋 Order details:', {
      id: orderId,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalItems: order.cart.length
    });

    // Allow processing if order is pending or processing
    const allowedStatuses = ['pending', 'processing', 'placed'];
    if (!allowedStatuses.includes(order.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot process order with status "${order.status}". Order must be pending, placed, or processing.`
      });
    }

    // Categorize items by handler (admin vs vendor)
    const adminItems = [];
    const vendorItems = {};
    const vendorBreakdown = new Map();

    order.cart.forEach((item, index) => {
      // Add enhanced item structure if not exists
      if (!item.handledBy) {
        item.handledBy = item.vendor ? 'vendor' : 'admin';
        item.assignedVendor = item.vendor?._id || null;
        // Initialize item tracking fields if not present
        item.status = item.status || 'placed';
        item.statusHistory = item.statusHistory || [];
      }

      if (item.handledBy === 'vendor' && item.vendor?._id) {
        // Vendor item
        const vendorId = item.vendor._id.toString();
        
        if (!vendorItems[vendorId]) {
          vendorItems[vendorId] = [];
        }
        vendorItems[vendorId].push(item);

        if (!vendorBreakdown.has(vendorId)) {
          vendorBreakdown.set(vendorId, {
            vendor: item.vendor,
            items: [],
            subtotal: 0,
            itemCount: 0
          });
        }
        
        const breakdown = vendorBreakdown.get(vendorId);
        breakdown.items.push(item);
        breakdown.subtotal += item.price * item.quantity;
        breakdown.itemCount += item.quantity;
      } else {
        // Admin item
        adminItems.push(item);
      }
    });

    try {
      const results = {
        orderId: orderId,
        orderNumber: order.orderNumber,
        updated: {
          adminItems: [],
          vendorOrders: [],
        },
        summary: {
          adminItems: adminItems.length,
          vendorOrders: Object.keys(vendorItems).length,
          totalItems: order.cart.length
        }
      };

      // 1. Create admin order and update admin items to processing status
      if (adminItems.length > 0) {
        // Create a separate admin order for tracking in "My Orders"
        const adminSubtotal = adminItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const adminOrder = new Order({
          orderNumber: `${order.orderNumber}-ADMIN`,
          name: order.name,
          email: order.email,
          phone: order.phone,
          address: order.address,
          city: order.city,
          cart: adminItems.map(item => ({
            productId: item.productId._id || item.productId,
            title: item.productId?.title || item.title,
            price: item.price,
            quantity: item.quantity,
            image: item.productId?.image || item.image,
            mainCategory: Array.isArray(item.productId?.mainCategory) 
              ? item.productId.mainCategory[0] || '' 
              : (item.productId?.mainCategory || item.mainCategory || ''),
            subCategory: Array.isArray(item.productId?.subCategory) 
              ? item.productId.subCategory[0] || '' 
              : (item.productId?.subCategory || item.subCategory || '')
          })),
          totalAmount: adminSubtotal,
          paymentMethod: order.paymentMethod,
          orderType: 'admin_only',
          status: 'processing',
          parentOrderId: order._id,
          isPartialOrder: true,
          partialOrderType: 'admin_part',
          splitFromMixedOrder: true,
          createdAt: new Date()
        });

        await adminOrder.save();
        console.log(`✅ Created admin order: ${adminOrder.orderNumber}`);

        // Update admin items status in original order
        adminItems.forEach(item => {
          item.status = 'processing';
          item.statusHistory.push({
            status: 'processing',
            updatedAt: new Date(),
            updatedBy: 'admin',
            notes: 'Admin items moved to processing and split to admin order'
          });
        });

        results.updated.adminItems = adminItems.map(item => ({
          productId: item.productId._id,
          title: item.productId?.title || item.title,
          status: item.status,
          handledBy: item.handledBy,
          adminOrderId: adminOrder._id,
          adminOrderNumber: adminOrder.orderNumber
        }));

        console.log(`✅ Updated ${adminItems.length} admin items to processing`);
      }

      // 2. Create VendorOrder documents and update item statuses
      for (const [vendorId, items] of Object.entries(vendorItems)) {
        const vendorInfo = vendorBreakdown.get(vendorId);
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create VendorOrder (for vendor notification system)
        const vendorOrder = new VendorOrder({
          orderNumber: `${order.orderNumber}-V${vendorId.slice(-4)}`,
          parentOrderId: order._id, // Fixed: using correct field name
          vendor: new mongoose.Types.ObjectId(vendorId), // Fixed: using correct field name
          customer: {
            name: order.customerName || order.name || 'N/A',
            email: order.email || order.customerEmail || 'noreply@example.com',
            phone: order.phone || order.customerPhone || 'N/A',
            address: order.address || order.customerAddress || 'N/A',
            city: order.city || order.customerCity || 'N/A'
          },
          items: items.map(item => ({
            productId: item.productId._id || item.productId,
            title: item.productId?.title || item.title || 'Product',
            price: item.price || 0,
            quantity: item.quantity || 1,
            itemTotal: (item.price || 0) * (item.quantity || 1),
            image: item.productId?.image || item.image || '',
            // Fix: Convert arrays to strings for mainCategory and subCategory
            mainCategory: Array.isArray(item.productId?.mainCategory) 
              ? item.productId.mainCategory[0] || '' 
              : (item.productId?.mainCategory || item.mainCategory || ''),
            subCategory: Array.isArray(item.productId?.subCategory) 
              ? item.productId.subCategory[0] || '' 
              : (item.productId?.subCategory || item.subCategory || '')
          })),
          totalAmount: subtotal,
          status: 'processing',
          splitFromMixedOrder: true,
          createdAt: new Date(),
        });

        await vendorOrder.save();

        // Initialize commission tracking for this vendor order
        try {
          await CommissionService.updateMonthlyCommission(
            vendorId, 
            vendorOrder._id, 
            subtotal
          );
          console.log(`✅ Commission tracking initialized for vendor ${vendorId}, amount: $${subtotal}`);
        } catch (commissionError) {
          console.error('⚠️ Failed to initialize commission tracking:', commissionError);
          // Don't fail the order processing, just log the error
        }

        // Update items in main order to show they're forwarded to vendor
        items.forEach(item => {
          item.status = 'processing';
          item.statusHistory.push({
            status: 'processing',
            updatedAt: new Date(),
            updatedBy: 'admin',
            notes: `Forwarded to vendor: ${vendorInfo.vendor.businessName}`
          });
        });

        results.updated.vendorOrders.push({
          vendorOrderId: vendorOrder._id,
          orderNumber: vendorOrder.orderNumber,
          vendorName: vendorInfo.vendor.businessName,
          items: items.length,
          subtotal: subtotal
        });

        console.log(`✅ Created vendor order: ${vendorOrder.orderNumber} for ${vendorInfo.vendor.businessName}`);
      }

      // 3. Update the main order status and save all changes
      order.status = 'processing'; // Unified status
      // DON'T change orderType - maintain original classification!
      // order.orderType = 'mixed'; // ❌ This was the bug - changing vendor_only to mixed
      order.lastUpdated = new Date();
      order.processedBy = adminId;
      order.processedAt = new Date();

      await order.save();

      console.log(`✅ Unified order processing completed for ${order.orderNumber}`);

      res.status(200).json({
        success: true,
        message: `Order processed successfully using unified system`,
        data: results
      });

    } catch (saveError) {
      console.error('❌ Error saving unified order changes:', saveError);
      res.status(500).json({
        success: false,
        message: 'Failed to save order changes',
        error: saveError.message
      });
    }

  } catch (error) {
    console.error('❌ Error processing unified order:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing order',
      error: error.message
    });
  }
};

// @desc    Get unified order processing status
// @route   GET /api/admin/orders/:orderId/unified-status
// @access  Private (Admin)
const getUnifiedOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('cart.productId')
      .populate('cart.vendor');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Categorize items for status display
    const itemsStatus = {
      adminItems: order.cart.filter(item => 
        !item.vendor || item.handledBy === 'admin'
      ).map(item => ({
        productTitle: item.productId?.title || item.title,
        status: item.status || 'placed',
        handledBy: 'admin',
        lastUpdate: item.statusHistory?.slice(-1)[0]?.updatedAt || order.createdAt
      })),
      
      vendorItems: order.cart.filter(item => 
        item.vendor && item.handledBy === 'vendor'
      ).map(item => ({
        productTitle: item.productId?.title || item.title,
        status: item.status || 'placed',
        handledBy: 'vendor',
        vendorName: item.vendor?.businessName,
        lastUpdate: item.statusHistory?.slice(-1)[0]?.updatedAt || order.createdAt
      }))
    };

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        overallStatus: order.status,
        itemsBreakdown: itemsStatus,
        summary: {
          totalItems: order.cart.length,
          adminItems: itemsStatus.adminItems.length,
          vendorItems: itemsStatus.vendorItems.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting unified order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting order status',
      error: error.message
    });
  }
};

module.exports = {
  processUnifiedOrder,
  getUnifiedOrderStatus
};
