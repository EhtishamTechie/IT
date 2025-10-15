const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const MonthlyCommission = require('../models/MonthlyCommission');
const Audit = require('../models/Audit');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const OrderStatusCalculator = require('../utils/orderStatusCalculator');
const CommissionConfig = require('../config/commission');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'internationaltijarat.com@gmail.com',
    pass: process.env.EMAIL_PASS || 'ehzq rwnf qjdd rfbs'
  }
});

// @desc    Get orders with categorization
// @route   GET /api/admin/orders/
// @access  Private (Admin)
const getOrdersWithCategorization = async (req, res) => {
  console.log('🔍 [ADMIN ORDERS] getOrdersWithCategorization called');
  console.log('🔍 [ADMIN ORDERS] Query params:', req.query);
  
  try {
    const { 
      type, 
      status, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      if (status === 'cancelled_by_user') {
        // Special filter for user cancellations
        query.status = 'cancelled';
        query.cancelledBy = 'user';
      } else if (status === 'cancelled') {
        // Admin cancellations (no cancelledBy or cancelledBy !== 'user')
        query.status = 'cancelled';
        query.$or = [
          { cancelledBy: { $exists: false } },
          { cancelledBy: { $ne: 'user' } }
        ];
      } else {
        // Standard status filtering
        query.status = status;
      }
    }
    
    if (type) {
      if (type === 'vendor_orders') {
        // Show vendor orders - vendor_only main orders and vendor_part sub-orders
        query.$or = [
          { 
            orderType: 'vendor_only',
            parentOrderId: { $exists: false } // Only main vendor orders, not sub-orders
          },
          { 
            partialOrderType: 'vendor_part' // Vendor parts from mixed orders
          }
        ];
      } else if (type === 'admin_orders') {
        // Show admin_only orders and admin_part orders, including legacy orders without vendor items
        // BUT exclude sub-orders (orders with parentOrderId) to avoid duplicates
        query.$or = [
          { 
            orderType: 'admin_only',
            parentOrderId: { $exists: false } // Only main admin orders
          },
          { 
            partialOrderType: 'admin_part',
            parentOrderId: { $exists: false } // Only main admin parts  
          },
          // Include legacy orders that have NO vendor items (admin-only)
          { 
            orderType: { $in: ['legacy', null] },
            $nor: [{ 'cart.vendor': { $exists: true, $ne: null } }],
            parentOrderId: { $exists: false } // Only main legacy orders
          }
        ];
      } else {
        query.orderType = type;
      }
    }

    console.log('🔍 [ADMIN PANEL] Admin Orders Query:', JSON.stringify(query, null, 2));
    console.log(`📊 [ADMIN PANEL] Query type: ${type}, status: ${status}`);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders with population
    let orders = await Order.find(query)
      .populate('cart.productId', 'title image price vendor')
      .populate('cart.vendor', 'businessName email')
      .populate('vendorOrders')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out duplicate vendor orders if we're showing vendor_orders
    if (type === 'vendor_orders') {
      const filteredOrders = [];
      const processedParentIds = new Set();
      
      for (const order of orders) {
        // If this is a vendor_only order, check if it has vendor_part sub-orders
        if (order.orderType === 'vendor_only' && !order.partialOrderType) {
          // Check if there are vendor_part sub-orders for this order
          const hasVendorParts = await Order.exists({
            parentOrderId: order._id,
            partialOrderType: 'vendor_part'
          });
          
          if (hasVendorParts) {
            // Skip this vendor_only order as its vendor_part sub-orders will be shown instead
            console.log(`⏭️ Skipping vendor_only order ${order.orderNumber} - has vendor_part sub-orders`);
            continue;
          }
        }
        
        // If this is a vendor_part order, mark its parent as processed
        if (order.partialOrderType === 'vendor_part' && order.parentOrderId) {
          processedParentIds.add(order.parentOrderId.toString());
        }
        
        filteredOrders.push(order);
      }
      
      orders = filteredOrders;
      console.log(`📊 Filtered vendor orders: ${orders.length} remaining after duplicate removal`);
    }

    // Count total orders (adjust for vendor orders filtering)
    let totalOrders = await Order.countDocuments(query);
    
    if (type === 'vendor_orders') {
      // For vendor orders, we need to count:
      // 1. vendor_only orders that don't have vendor_part sub-orders
      // 2. vendor_part sub-orders (these are the split parts from mixed orders)
      
      // First, count vendor_part orders (split parts from mixed orders)
      const vendorPartCount = await Order.countDocuments({
        ...query,
        partialOrderType: 'vendor_part'
      });
      
      // Count vendor_only orders that don't have vendor_part sub-orders
      const vendorOnlyOrders = await Order.find({
        ...query,
        orderType: 'vendor_only',
        parentOrderId: { $exists: false }
      }).select('_id');
      
      let vendorOnlyWithoutPartsCount = 0;
      for (const order of vendorOnlyOrders) {
        const hasVendorParts = await Order.exists({
          parentOrderId: order._id,
          partialOrderType: 'vendor_part'
        });
        if (!hasVendorParts) {
          vendorOnlyWithoutPartsCount++;
        }
      }
      
      totalOrders = vendorPartCount + vendorOnlyWithoutPartsCount;
      console.log(`📊 Vendor orders count: ${vendorPartCount} vendor parts + ${vendorOnlyWithoutPartsCount} vendor-only = ${totalOrders} total`);
    }
    
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Categorize orders and add vendor breakdown
    const categorizedOrders = await Promise.all(orders.map(async (order) => {
      const adminItems = [];
      const vendorItems = [];
      const vendorBreakdown = new Map();

      order.cart.forEach(item => {
        if (item.vendor) {
          vendorItems.push(item);
          const vendorId = item.vendor._id.toString();
          if (!vendorBreakdown.has(vendorId)) {
            vendorBreakdown.set(vendorId, {
              vendor: item.vendor,
              items: [],
              subtotal: 0,
              commissionAmount: 0 // Will be calculated after subtotal
            });
          }
          vendorBreakdown.get(vendorId).items.push(item);
          vendorBreakdown.get(vendorId).subtotal += item.price * item.quantity;
        } else {
          adminItems.push(item);
        }
      });

      // Calculate commission for each vendor breakdown
      vendorBreakdown.forEach((breakdown, vendorId) => {
        breakdown.commissionAmount = CommissionConfig.calculateCommission(breakdown.subtotal);
      });

      // Auto-categorize if not already set
      let orderType = order.orderType;
      let needsDbUpdate = false;
      
      if (orderType === 'legacy' || !orderType) {
        if (adminItems.length > 0 && vendorItems.length > 0) {
          orderType = 'mixed';
        } else if (vendorItems.length > 0) {
          orderType = 'vendor_only';
        } else {
          orderType = 'admin_only';
        }
        needsDbUpdate = true;
      }

      // Update database if orderType was auto-categorized
      if (needsDbUpdate) {
        try {
          await Order.findByIdAndUpdate(order._id, { 
            orderType: orderType,
            paymentStatus: order.paymentStatus || 'pending',
            completionDetails: order.completionDetails || {
              adminCompleted: adminItems.length === 0,
              vendorCompletions: new Map()
            },
            vendorOrders: order.vendorOrders || []
          });
          console.log(`✅ Auto-updated order ${order._id} orderType to: ${orderType}`);
        } catch (updateError) {
          console.error(`❌ Failed to update order ${order._id}:`, updateError);
        }
      }

      return {
        ...order.toObject(),
        orderType,
        // Apply status mapping for consistency with other endpoints
        status: (() => {
          let mappedStatus = order.status || 'placed'; // Default to 'placed' instead of 'Pending'
          
          // Apply status mapping for legacy status names
          if (mappedStatus) {
            const statusMap = {
              'Pending': 'placed',
              'Confirmed': 'processing',
              'Shipped': 'shipped',
              'Delivered': 'delivered',
              'Cancelled': 'cancelled'  // Keep cancelled as cancelled
            };
            mappedStatus = statusMap[mappedStatus] || mappedStatus.toLowerCase();
          }
          
          return mappedStatus;
        })(),
        adminItems,
        vendorItems,
        vendorBreakdown: Array.from(vendorBreakdown.values()),
        needsForwarding: (() => {
          const hasVendorItems = vendorItems.length > 0;
          const isForwarded = order.isForwardedToVendors === true; // Explicit true check for existing orders
          const needsForwarding = hasVendorItems && !isForwarded;
          
          console.log(`🔍 Order ${order.orderNumber}: hasVendorItems=${hasVendorItems}, isForwardedToVendors=${order.isForwardedToVendors}, needsForwarding=${needsForwarding}`);
          
          return needsForwarding;
        })()
      };
    }));

    // Get summary statistics
    const summary = {
      totalOrders,
      adminOnly: categorizedOrders.filter(o => o.orderType === 'admin_only').length,
      vendorOnly: categorizedOrders.filter(o => o.orderType === 'vendor_only').length,
      mixed: categorizedOrders.filter(o => o.orderType === 'mixed').length,
      needsForwarding: categorizedOrders.filter(o => o.needsForwarding).length
    };

    // Add detailed logging for debugging
    console.log(`📊 [ADMIN PANEL] Returning ${categorizedOrders.length} categorized orders`);
    categorizedOrders.forEach(order => {
      console.log(`📋 [ADMIN PANEL] Returning order ${order.orderNumber}: type=${order.orderType}, status=${order.status}, parentId=${order.parentOrderId || 'none'}`);
    });

    res.json({
      success: true,
      data: {
        orders: categorizedOrders,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// @desc    Forward order to vendors  
// @route   POST /api/admin/orders/:orderId/forward
// @access  Private (Admin)
const forwardOrderToVendors = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { vendorIds, adminNotes } = req.body;
    const adminId = req.user?.id || req.user?.userId;

    console.log('📋 Forward Order Request:', {
      orderId,
      vendorIds,
      adminNotes,
      adminId
    });

    // Get the vendor sub-order (from "Vendor Orders" tab)
    const vendorSubOrder = await Order.findById(orderId)
      .populate('cart.productId')
      .populate('vendor', 'businessName email');

    if (!vendorSubOrder) {
      return res.status(404).json({
        success: false,
        message: 'Vendor order not found'
      });
    }

    // PREVENTION: Block forwarding if order was cancelled by customer
    if (vendorSubOrder.status === 'cancelled_by_customer') {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward orders that were cancelled by customer. Customer cancellations are final.',
        data: {
          currentStatus: vendorSubOrder.status,
          orderNumber: vendorSubOrder.orderNumber,
          reason: 'Customer cancelled orders cannot be forwarded to vendors'
        }
      });
    }

    if (vendorSubOrder.orderType !== 'vendor_only' && vendorSubOrder.partialOrderType !== 'vendor_part') {
      return res.status(400).json({
        success: false,
        message: 'This is not a vendor order. Only vendor_only orders and vendor parts of mixed orders can be forwarded to vendors.',
        orderDetails: {
          orderType: vendorSubOrder.orderType,
          partialOrderType: vendorSubOrder.partialOrderType,
          orderNumber: vendorSubOrder.orderNumber
        }
      });
    }

    // Get vendor information - handle case where vendor might not be populated
    let vendor;
    if (vendorSubOrder.vendor && vendorSubOrder.vendor._id) {
      vendor = vendorSubOrder.vendor;
    } else if (vendorSubOrder.vendor) {
      // If vendor is just an ID, fetch the vendor details
      const Vendor = require('../models/Vendor');
      const User = require('../models/User');
      vendor = await Vendor.findById(vendorSubOrder.vendor) || await User.findById(vendorSubOrder.vendor);
    } else {
      // Try to get vendor from the cart items
      const vendorId = vendorSubOrder.cart?.[0]?.vendor;
      if (vendorId) {
        const Vendor = require('../models/Vendor');
        const User = require('../models/User');
        vendor = await Vendor.findById(vendorId) || await User.findById(vendorId);
      }
    }

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor information not found for this order'
      });
    }

    console.log('📦 Vendor sub-order found:', {
      orderNumber: vendorSubOrder.orderNumber,
      vendor: vendor.businessName || vendor.name,
      cartItems: vendorSubOrder.cart?.length || 0
    });

    // Calculate commission using dynamic rate from config
    const CommissionConfig = require('../config/commission');
    const totalAmount = vendorSubOrder.totalAmount;
    const commissionAmount = totalAmount * CommissionConfig.VENDOR_COMMISSION_RATE;
    
    console.log(`💰 Commission calculation: $${totalAmount} × ${CommissionConfig.VENDOR_COMMISSION_RATE} = $${commissionAmount.toFixed(2)}`);
    console.log(`📊 Using commission rate: ${CommissionConfig.COMMISSION_PERCENTAGE}%`);

    // 1. Create VendorOrder document for vendor dashboard
    const VendorOrder = require('../models/VendorOrder');
    
    const vendorOrder = new VendorOrder({
      parentOrderId: vendorSubOrder.parentOrderId || vendorSubOrder._id, // Use parentOrderId if available, otherwise use the order's own ID
      orderNumber: vendorSubOrder.orderNumber,
      vendor: vendor._id,
      customer: {
        name: vendorSubOrder.name,
        email: vendorSubOrder.email,
        phone: vendorSubOrder.phone,
        address: vendorSubOrder.address,
        city: vendorSubOrder.city
      },
      items: vendorSubOrder.cart.map(item => ({
        productId: item.productId._id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        itemTotal: item.price * item.quantity,
        image: item.image,
        mainCategory: item.mainCategory,
        subCategory: item.subCategory
      })),
      totalAmount,
      commissionAmount,
      status: 'processing', // Start as processing when forwarded to vendor
      forwardedAt: new Date(),
      isForwardedByAdmin: true,
      adminNotes
    });

    await vendorOrder.save();

    // 2. Update vendor sub-order status to 'processing'
    const updatedOrder = await Order.findByIdAndUpdate(orderId, {
      status: 'processing',
      orderStatus: 'processing',
      forwardedAt: new Date(),
      isForwardedToVendor: true,
      commissionAmount,
      adminNotes,
      vendorOrderId: vendorOrder._id // Link to VendorOrder document
    }, { new: true });

    // Send email notification for admin forwarding order to processing
    if (updatedOrder && updatedOrder.email) {
      try {
        const { emailService } = require('../services/emailService');
        await emailService.sendOrderStatusUpdate(updatedOrder.email, updatedOrder, 'processing', vendorSubOrder.status);
        console.log(`📧 [EMAIL] Admin forwarded order status update email sent for ${updatedOrder.orderNumber}: ${vendorSubOrder.status} → processing`);
      } catch (emailError) {
        console.error('❌ [EMAIL] Failed to send admin forwarded order status update email:', emailError);
        // Don't fail the operation if email fails
      }
    }

    // 3. Update commission tracking
    console.log(`💰 COMMISSION TRACKING - Adding commission for forwarded order`);
    console.log(`📊 Commission Details:`, {
      vendorId: vendor._id,
      totalAmount: totalAmount,
      commissionAmount: commissionAmount,
      parentOrderId: vendorSubOrder.parentOrderId || vendorSubOrder._id,
      vendorOrderId: vendorOrder._id
    });
    
    try {
      if (MonthlyCommission && MonthlyCommission.updateMonthlyCommission) {
        const commissionResult = await MonthlyCommission.updateMonthlyCommission(
          vendor._id,
          totalAmount,
          commissionAmount,
          vendorSubOrder.parentOrderId || vendorSubOrder._id, // Use parentOrderId if available, otherwise use the order's own ID
          vendorOrder._id
        );
        
        console.log(`✅ Commission tracking updated successfully:`, {
          vendorId: vendor._id,
          newTotalCommission: commissionResult?.totalCommission,
          newTotalSales: commissionResult?.totalSales,
          newTotalOrders: commissionResult?.totalOrders
        });
      } else {
        console.log(`⚠️ MonthlyCommission.updateMonthlyCommission method not available`);
      }
    } catch (commissionError) {
      console.error('❌ Commission tracking error:', commissionError);
    }

    // 4. Send notification email to vendor
    try {
      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">New Order Forwarded</h2>
          <p>A new order has been forwarded to you for processing:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>Order Number:</strong> ${vendorOrder.orderNumber}<br>
            <strong>Customer:</strong> ${vendorOrder.customer.name}<br>
            <strong>Total Amount:</strong> $${totalAmount.toFixed(2)}<br>
            <strong>Commission:</strong> $${commissionAmount.toFixed(2)}<br>
            ${adminNotes ? `<strong>Admin Notes:</strong> ${adminNotes}<br>` : ''}
          </div>
          <p>Please log in to your vendor dashboard to process this order.</p>
        </div>
      `;

      const { emailService } = require('../services/emailService');
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: vendor.email,
        subject: `New Order Forwarded - ${vendorOrder.orderNumber}`,
        html: emailTemplate
      });
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    // 5. Log audit event
    try {
      if (Audit && Audit.logAdminAction) {
        await Audit.logAdminAction(
          'vendor_order',
          vendorOrder._id,
          'forward',
          adminId,
          `Order forwarded to vendor: ${vendor.businessName || vendor.name}`,
          { status: 'placed' },
          { status: 'processing', totalAmount, commissionAmount },
          { orderNumber: vendorOrder.orderNumber, adminNotes }
        );
      }
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }

    console.log('✅ Order successfully forwarded to vendor:', {
      orderNumber: vendorOrder.orderNumber,
      vendor: vendor.businessName || vendor.name,
      totalAmount,
      commissionAmount
    });

    res.json({
      success: true,
      message: `Order successfully forwarded to ${vendor.businessName || vendor.name}`,
      data: {
        vendorOrder: vendorOrder._id,
        orderNumber: vendorOrder.orderNumber,
        totalAmount,
        commissionAmount
      }
    });

  } catch (error) {
    console.error('❌ Error forwarding order to vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forward order to vendors',
      error: error.message
    });
  }
};

/**
 * Update parent order status based on sub-order statuses
 */
async function updateParentOrderStatus(parentOrderId) {
  try {
    console.log(`🔄 [UPDATE PARENT STATUS] Starting for parent order: ${parentOrderId}`);
    
    // Get the parent order
    const parentOrder = await Order.findById(parentOrderId);
    if (!parentOrder) {
      console.log(`⚠️ [UPDATE PARENT STATUS] Parent order not found: ${parentOrderId}`);
      return;
    }

    console.log(`🔍 [UPDATE PARENT STATUS] Parent order found:`, {
      orderNumber: parentOrder.orderNumber,
      currentStatus: parentOrder.status,
      orderType: parentOrder.orderType,
      isSplitOrder: parentOrder.isSplitOrder
    });

    // Get all sub-orders (admin parts and vendor parts)
    const adminParts = await Order.find({ 
      parentOrderId: parentOrderId, 
      partialOrderType: 'admin_part' 
    });
    
    const vendorParts = await Order.find({ 
      parentOrderId: parentOrderId, 
      partialOrderType: 'vendor_part' 
    });

    const vendorOrders = await VendorOrder.find({ 
      parentOrderId: parentOrderId 
    });

    console.log(`🔍 [UPDATE PARENT STATUS] Sub-orders found:`, {
      adminParts: adminParts.length,
      vendorParts: vendorParts.length,
      vendorOrders: vendorOrders.length
    });

    // Log each admin part
    adminParts.forEach((part, index) => {
      console.log(`📋 [UPDATE PARENT STATUS] Admin part ${index + 1}:`, {
        id: part._id,
        orderNumber: part.orderNumber,
        status: part.status,
        partialOrderType: part.partialOrderType
      });
    });

    // Log each vendor part
    vendorParts.forEach((part, index) => {
      console.log(`📋 [UPDATE PARENT STATUS] Vendor part ${index + 1}:`, {
        id: part._id,
        orderNumber: part.orderNumber,
        status: part.status,
        partialOrderType: part.partialOrderType
      });
    });

    // Log each vendor order
    vendorOrders.forEach((vo, index) => {
      console.log(`📋 [UPDATE PARENT STATUS] Vendor order ${index + 1}:`, {
        id: vo._id,
        orderNumber: vo.orderNumber,
        status: vo.status,
        vendorName: vo.vendorName
      });
    });

    // Collect all statuses
    const allStatuses = [
      ...adminParts.map(part => part.status),
      ...vendorParts.map(part => part.status),
      ...vendorOrders.map(vo => vo.status)
    ];

    console.log(`📊 [UPDATE PARENT STATUS] All collected statuses for parent ${parentOrderId}:`, allStatuses);

    if (allStatuses.length === 0) {
      console.log(`⚠️ [UPDATE PARENT STATUS] No sub-orders found for parent ${parentOrderId}`);
      return;
    }

    // Calculate new parent status using the same logic as mixed orders
    let newParentStatus = 'placed'; // Default

    console.log(`🎯 [UPDATE PARENT STATUS] Starting priority calculation...`);
    
    // Priority-based status calculation
    if (allStatuses.every(status => ['cancelled', 'rejected'].includes(status))) {
      newParentStatus = 'cancelled';
      console.log(`🎯 [UPDATE PARENT STATUS] All parts cancelled → CANCELLED`);
    } else if (allStatuses.every(status => status === 'delivered')) {
      newParentStatus = 'delivered';
      console.log(`🎯 [UPDATE PARENT STATUS] All parts delivered → DELIVERED`);
    } else if (allStatuses.every(status => ['shipped', 'delivered'].includes(status))) {
      newParentStatus = 'shipped';
      console.log(`🎯 [UPDATE PARENT STATUS] All parts shipped/delivered → SHIPPED`);
    } else if (allStatuses.some(status => ['processing', 'confirmed'].includes(status))) {
      newParentStatus = 'processing';
    } else if (allStatuses.some(status => status === 'placed')) {
      newParentStatus = 'placed';
    }

    // Update parent order status
    const oldParentStatus = parentOrder.status;
    if (oldParentStatus !== newParentStatus) {
      await Order.findByIdAndUpdate(parentOrderId, {
        status: newParentStatus,
        lastStatusUpdate: new Date(),
        statusUpdateReason: 'Updated based on sub-order statuses'
      });
      
      console.log(`✅ Parent order ${parentOrderId} status updated: ${oldParentStatus} → ${newParentStatus}`);

      // Send email notification for parent order status change
      if (parentOrder.email) {
        try {
          const { emailService } = require('../services/emailService');
          const updatedParentOrder = await Order.findById(parentOrderId); // Get updated order
          await emailService.sendOrderStatusUpdate(parentOrder.email, updatedParentOrder, newParentStatus, oldParentStatus);
          console.log(`📧 [EMAIL] Parent order status update email sent for ${parentOrder.orderNumber}: ${oldParentStatus} → ${newParentStatus}`);
        } catch (emailError) {
          console.error('❌ [EMAIL] Failed to send parent order status update email:', emailError);
          // Don't fail the operation if email fails
        }
      }
    } else {
      console.log(`ℹ️ Parent order ${parentOrderId} status unchanged: ${newParentStatus}`);
    }

  } catch (error) {
    console.error(`❌ Error updating parent order status for ${parentOrderId}:`, error);
  }
}

/**
 * Create vendor order and update references
 */
async function createVendorOrder(mainOrder, vendorId, vendorItems, adminId) {
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }
    
    // Calculate total amount including shipping
    const itemsTotal = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate shipping for vendor items (find maximum shipping cost)
    const shippingCosts = vendorItems.map(item => parseFloat(item.shipping) || 0);
    const vendorShipping = Math.max(...shippingCosts, 0);
    
    // Apply free shipping rule for orders >= $10,000
    const finalShipping = itemsTotal >= 10000 ? 0 : vendorShipping;
    
    const totalAmount = itemsTotal + finalShipping;
    const commissionAmount = CommissionConfig.calculateCommission(totalAmount); // 20% commission on total including shipping
    
    console.log(`💰 Vendor Order Calculation:`, {
      itemsTotal: itemsTotal.toFixed(2),
      shipping: finalShipping.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2)
    });
    
    const vendorOrder = new VendorOrder({
      parentOrderId: mainOrder._id,
      orderNumber: `${mainOrder.orderNumber}-${vendor.businessName.substring(0, 3).toUpperCase()}`,
      vendor: vendorId,
      customer: {
        name: mainOrder.name,
        email: mainOrder.email,
        phone: mainOrder.phone,
        address: mainOrder.address,
        city: mainOrder.city
      },
      items: vendorItems.map(item => ({
        productId: item.productId,
        title: item.title,
        price: item.price,
        shipping: item.shipping || 0,
        quantity: item.quantity,
        itemTotal: item.price * item.quantity,
        image: item.image,
        mainCategory: item.mainCategory,
        subCategory: item.subCategory
      })),
      shippingCost: finalShipping,
      totalAmount: totalAmount,
      commissionAmount: commissionAmount,
      status: 'placed', // Changed from 'pending'
      forwardedAt: new Date()
    });
    
    await vendorOrder.save();
    
    // Add vendor order reference to main order
    mainOrder.vendorOrders.push(vendorOrder._id);
    
    // Send vendor notification
    await sendVendorNotification(vendor, vendorOrder, mainOrder);
    
    console.log(`✅ Created vendor order: ${vendorOrder.orderNumber} for ${vendor.businessName}`);
    return vendorOrder;
    
  } catch (error) {
    console.error(`❌ Error creating vendor order for vendor ${vendorId}:`, error);
    throw error;
  }
}

/**
 * Send customer notification
 */
async function sendCustomerNotification(order, action, notes) {
  try {
    const subject = action === 'approved' 
      ? `Order Approved - ${order.orderNumber}`
      : `Order Update - ${order.orderNumber}`;
      
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${action === 'approved' ? '#28a745' : '#dc3545'};">
          Order ${action === 'approved' ? 'Approved' : 'Update'}
        </h2>
        <p>Dear ${order.name},</p>
        <p>Your order <strong>${order.orderNumber}</strong> has been ${action}.</p>
        ${notes ? `<p><strong>Additional Information:</strong> ${notes}</p>` : ''}
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Order Summary:</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Status:</strong> ${order.orderStatus}</p>
          <p><strong>Total Amount:</strong> $${order.totalAmount?.toFixed(2) || 'N/A'}</p>
        </div>
        <p>You can track your order status anytime by visiting our website.</p>
        <p>Thank you for your business!</p>
      </div>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'internationaltijarat.com@gmail.com',
      to: order.email,
      subject: subject,
      html: html
    });
    
  } catch (emailError) {
    console.error('Failed to send customer notification:', emailError);
  }
}

/**
 * Send vendor notification
 */
async function sendVendorNotification(vendor, vendorOrder, mainOrder) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">New Order Forwarded</h2>
        <p>Dear ${vendor.businessName},</p>
        <p>A new order has been forwarded to you for processing:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Order Details:</h3>
          <p><strong>Order Number:</strong> ${vendorOrder.orderNumber}</p>
          <p><strong>Customer:</strong> ${mainOrder.name}</p>
          <p><strong>Total Amount:</strong> $${vendorOrder.totalAmount?.toFixed(2)}</p>
          <p><strong>Commission:</strong> $${vendorOrder.commissionAmount?.toFixed(2)}</p>
        </div>
        
        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4>Items:</h4>
          ${vendorOrder.items.map(item => `
            <p>• ${item.title} - Qty: ${item.quantity} - $${item.price}</p>
          `).join('')}
        </div>
        
        <p>Please log in to your vendor dashboard to accept or reject this order.</p>
      </div>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'internationaltijarat.com@gmail.com',
      to: vendor.email,
      subject: `New Order Forwarded - ${vendorOrder.orderNumber}`,
      html: html
    });
    
  } catch (emailError) {
    console.error('Failed to send vendor notification:', emailError);
  }
}

// @desc    Get commission summary
// @route   GET /api/admin/commissions/
// @access  Private (Admin)
const getCommissionSummary = async (req, res) => {
  try {
    const { vendor, month, year } = req.query;

    // Build query for monthly commissions
    const query = {};
    if (vendor) query.vendor = vendor;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    // Get monthly commission data with pagination for performance
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500); // Max 500 records
    const skip = (page - 1) * limit;
    
    const commissions = await MonthlyCommission.find(query)
      .populate('vendor', 'businessName email')
      .sort({ year: -1, month: -1 })
      .limit(limit)
      .skip(skip);

    // Get summary statistics
    const summary = {
      totalVendors: await MonthlyCommission.distinct('vendor').countDocuments(),
      totalCommission: commissions.reduce((sum, c) => sum + c.totalCommission, 0),
      paidCommission: commissions.reduce((sum, c) => sum + c.paidCommission, 0),
      pendingCommission: commissions.reduce((sum, c) => sum + c.pendingCommission, 0),
      totalOrders: commissions.reduce((sum, c) => sum + c.totalOrders, 0)
    };

    res.json({
      success: true,
      data: {
        commissions,
        summary,
        filters: { vendor, month, year }
      }
    });

  } catch (error) {
    console.error('Get commission summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commission summary',
      error: error.message
    });
  }
};

// @desc    Force recategorize all orders
// @route   POST /api/admin/orders/recategorize
// @access  Private (Admin)
const recategorizeAllOrders = async (req, res) => {
  try {
    console.log('🔧 Starting manual recategorization of all orders...');
    
    // Find orders that need recategorization with safety limit
    const ordersToFix = await Order.find({
      $or: [
        { orderType: { $exists: false } },
        { orderType: null },
        { orderType: 'legacy' },
        { orderType: '' }
      ]
    }).limit(1000); // Process in batches to prevent memory overflow

    console.log(`📊 Found ${ordersToFix.length} orders to recategorize`);

    let fixedCount = 0;
    const results = [];
    
    for (const order of ordersToFix) {
      try {
        // Analyze cart items to determine vendor status
        let adminItems = 0;
        let vendorItems = 0;
        
        for (const item of order.cart || []) {
          if (item.vendor) {
            vendorItems++;
          } else {
            adminItems++;
          }
        }
        
        // Determine order type
        let orderType;
        if (adminItems > 0 && vendorItems > 0) {
          orderType = 'mixed';
        } else if (vendorItems > 0) {
          orderType = 'vendor_only';
        } else {
          orderType = 'admin_only';
        }
        
        // Update the order
        await Order.findByIdAndUpdate(order._id, { 
          orderType: orderType,
          paymentStatus: order.paymentStatus || 'pending',
          completionDetails: order.completionDetails || {
            adminCompleted: adminItems === 0,
            vendorCompletions: new Map()
          },
          vendorOrders: order.vendorOrders || []
        });
        
        fixedCount++;
        results.push({
          orderId: order._id,
          previousType: order.orderType,
          newType: orderType,
          adminItems,
          vendorItems
        });
        
      } catch (orderError) {
        console.error(`❌ Error fixing order ${order._id}:`, orderError.message);
        results.push({
          orderId: order._id,
          error: orderError.message
        });
      }
    }
    
    console.log(`✅ Successfully recategorized ${fixedCount} out of ${ordersToFix.length} orders`);
    
    // Get updated summary
    const summary = await Order.aggregate([
      {
        $group: {
          _id: '$orderType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      message: `Successfully recategorized ${fixedCount} orders`,
      results,
      summary: summary.reduce((acc, item) => {
        acc[item._id || 'undefined'] = item.count;
        return acc;
      }, {})
    });
    
  } catch (error) {
    console.error('❌ Error recategorizing orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recategorize orders',
      error: error.message
    });
  }
};

// @desc    Check and update orders where all vendors have accepted
// @route   POST /api/admin/orders/check-vendor-statuses
// @access  Private (Admin)
const checkVendorOrderStatuses = async (req, res) => {
  try {
    console.log('🔍 Starting vendor status check...');
    
    // Get processing orders with safety limit
    const processingOrders = await Order.find({ 
      status: 'processing' 
    })
    .sort({ createdAt: -1 })
    .limit(500); // Safety limit to prevent memory overflow
    
    console.log(`📦 Found ${processingOrders.length} processing orders to check`);
    
    let updatedOrders = 0;
    const results = [];
    
    for (const order of processingOrders) {
      console.log(`\n🔍 Checking ${order.orderNumber}...`);
      
      // Find all vendor orders for this main order
      const vendorOrders = await VendorOrder.find({ 
        parentOrderId: order._id 
      });
      
      console.log(`   Found ${vendorOrders.length} vendor orders`);
      
      if (vendorOrders.length === 0) {
        results.push({
          orderNumber: order.orderNumber,
          status: 'no_vendor_orders',
          message: 'No vendor orders found - might be legacy order'
        });
        continue;
      }
      
      // Check if all vendor orders are accepted or if any are rejected
      const allAccepted = vendorOrders.every(vo => vo.status === 'accepted');
      const anyRejected = vendorOrders.some(vo => vo.status === 'rejected');
      const acceptedCount = vendorOrders.filter(vo => vo.status === 'accepted').length;
      const pendingCount = vendorOrders.filter(vo => vo.status === 'pending').length;
      const rejectedCount = vendorOrders.filter(vo => vo.status === 'rejected').length;
      
      console.log(`   ✅ Accepted: ${acceptedCount}, ⏳ Pending: ${pendingCount}, ❌ Rejected: ${rejectedCount}`);
      
      if (anyRejected) {
        console.log(`   🚫 Vendor(s) rejected - updating main order to cancelled`);
        
        // Find the first rejected vendor order to get rejection details
        const rejectedVendorOrder = vendorOrders.find(vo => vo.status === 'rejected');
        
        await Order.findByIdAndUpdate(order._id, {
          $set: { 
            status: 'cancelled',
            cancelledBy: 'vendor',
            cancelledAt: new Date(),
            cancellationReason: `Order rejected by vendor: ${rejectedVendorOrder.vendorNotes || 'No reason provided'}`
          }
        });
        
        updatedOrders++;
        results.push({
          orderNumber: order.orderNumber,
          status: 'updated_to_cancelled',
          vendorCount: vendorOrders.length,
          rejectedCount,
          message: `${rejectedCount} vendor(s) rejected - updated to cancelled`
        });
        
        console.log(`   🚫 Updated ${order.orderNumber} to cancelled due to vendor rejection`);
      } else if (allAccepted) {
        console.log(`   🔧 All vendors accepted - updating main order to shipped`);
        
        await Order.findByIdAndUpdate(order._id, {
          $set: { status: 'shipped' }
        });
        
        updatedOrders++;
        results.push({
          orderNumber: order.orderNumber,
          status: 'updated_to_shipped',
          vendorCount: vendorOrders.length,
          message: 'All vendors accepted - updated to shipped'
        });
        
        console.log(`   ✅ Updated ${order.orderNumber} to shipped`);
      } else {
        results.push({
          orderNumber: order.orderNumber,
          status: 'still_pending',
          vendorCount: vendorOrders.length,
          acceptedCount,
          pendingCount,
          rejectedCount,
          message: `Still waiting for ${pendingCount} vendors to accept`
        });
        
        console.log(`   ⏳ Still waiting for ${pendingCount} vendors to accept`);
      }
    }
    
    console.log(`\n🏁 Updated ${updatedOrders} orders (shipped/cancelled based on vendor responses)`);
    
    res.json({
      success: true,
      message: `Checked ${processingOrders.length} processing orders`,
      checkedOrders: processingOrders.length,
      updatedOrders,
      results
    });
    
  } catch (error) {
    console.error('❌ Error checking vendor order statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check vendor order statuses',
      error: error.message
    });
  }
};

// @desc    Get admin-handled orders for "My Orders" tab
// @route   GET /api/admin/orders/my-orders
// @access  Private (Admin)
const getAdminOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query for admin orders - Show correct orders without duplicates
    let query;
    
    // First, get all admin sub-orders (parts of mixed orders) to find their parent IDs
    const adminSubOrders = await Order.find({
      partialOrderType: 'admin_part'
    }).select('parentOrderId').lean();
    
    const parentIdsWithAdminParts = adminSubOrders.map(sub => sub.parentOrderId);
    
    query = {
      $or: [
        // Admin parts of mixed orders (show these with -A suffix)
        { 
          partialOrderType: 'admin_part'
        },
        // Main admin-only orders that DON'T have admin sub-orders (avoid duplicates)
        { 
          orderType: 'admin_only',
          parentOrderId: { $exists: false },
          _id: { $nin: parentIdsWithAdminParts } // Exclude parents that have admin parts
        },
        // Include legacy orders that have NO vendor items (admin-only)
        { 
          orderType: { $in: ['legacy', null] },
          parentOrderId: { $exists: false },
          'cart': { $not: { $elemMatch: { vendor: { $exists: true, $ne: null } } } },
          _id: { $nin: parentIdsWithAdminParts } // Exclude parents that have admin parts
        }
      ]
    };
    
    console.log('📋 My Orders Query:', JSON.stringify(query, null, 2));
    
    if (status) {
      if (status === 'cancelled_by_user') {
        // Special filter for user cancellations
        query.status = 'cancelled';
        query.cancelledBy = 'user';
      } else if (status === 'cancelled') {
        // Admin cancellations (no cancelledBy or cancelledBy !== 'user')
        query.status = 'cancelled';
        query.$and = [
          query.$or ? { $or: query.$or } : {},
          {
            $or: [
              { cancelledBy: { $exists: false } },
              { cancelledBy: { $ne: 'user' } }
            ]
          }
        ];
        delete query.$or; // Remove the original $or since we're using $and now
      } else {
        // Standard status filtering
        query.status = status;
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get admin orders
    const adminOrders = await Order.find(query)
      .populate('cart.productId', 'title image price')
      .populate('parentOrderId', 'orderNumber customerName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`📊 Found ${adminOrders.length} admin orders matching query`);

    // Count total orders
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Format orders for frontend
    const formattedOrders = adminOrders.map(order => {
      // Debug: Log order shipping data
      console.log(`🚢 [ORDER DEBUG] Order ${order.orderNumber}:`, {
        storedTotalAmount: order.totalAmount,
        storedShippingCost: order.shippingCost,
        cartItems: order.cart?.length || 0
      });
      
      // Calculate shipping cost for ALL orders (old and new)
      let calculatedShippingCost = 0;
      let cartTotal = 0;
      
      if (order.cart && order.cart.length > 0) {
        // Calculate cart subtotal
        cartTotal = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Find maximum shipping cost among all items
        const shippingCosts = order.cart.map(item => {
          const productShipping = item.productId?.shipping || item.shipping || 0;
          return Number(productShipping);
        }).filter(cost => cost > 0);
        
        if (shippingCosts.length > 0) {
          const maxShipping = Math.max(...shippingCosts);
          
          // Apply free shipping threshold (10,000 PKR)
          if (cartTotal < 10000) {
            calculatedShippingCost = maxShipping;
          }
        }
      }
      
      // Determine final values
      let finalTotalAmount;
      let finalShippingCost;
      
      // If order has stored shippingCost > 0, use stored values
      if (order.shippingCost && order.shippingCost > 0) {
        finalTotalAmount = order.totalAmount;
        finalShippingCost = order.shippingCost;
        console.log(`🚢 [ORDER DEBUG] Using stored shipping for ${order.orderNumber}`);
      } else {
        // For old orders or orders without shipping cost, recalculate
        finalShippingCost = calculatedShippingCost;
        finalTotalAmount = cartTotal + calculatedShippingCost;
        console.log(`🚢 [ORDER DEBUG] Calculated shipping for ${order.orderNumber}:`, {
          cartTotal,
          calculatedShippingCost,
          finalTotalAmount,
          storedTotal: order.totalAmount
        });
      }
      
      console.log(`🚢 [ORDER DEBUG] Final values for ${order.orderNumber}:`, {
        finalTotalAmount,
        finalShippingCost
      });
      
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        parentOrderNumber: order.parentOrderId?.orderNumber,
        customerName: order.name || order.customerName,
        customerEmail: order.email,
        status: order.status,
        totalAmount: finalTotalAmount, // Corrected total including shipping
        shippingCost: finalShippingCost, // Calculated or stored shipping cost
        itemCount: order.cart.length,
        type: order.partialOrderType === 'admin_part' ? 'Mixed Order Part' : 'Admin Only',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paymentMethod: order.paymentMethod,
        paymentReceipt: order.paymentReceipt,
        // Include cart for revenue calculation compatibility
        cart: order.cart,
        items: order.cart.map(item => ({
          productId: item.productId?._id,
          productName: item.productId?.title || item.title,
          quantity: item.quantity,
          price: item.price,
          image: item.productId?.image || item.image
        }))
      };
    });

    console.log(`📋 Retrieved ${formattedOrders.length} admin orders (page ${page})`);

    res.json({
      success: true,
      orders: formattedOrders, // Direct access for frontend compatibility
      data: {
        orders: formattedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        summary: {
          totalAdminOrders: totalOrders,
          pendingOrders: formattedOrders.filter(o => o.status === 'placed').length,
          processingOrders: formattedOrders.filter(o => o.status === 'processing').length,
          shippedOrders: formattedOrders.filter(o => o.status === 'shipped').length,
          deliveredOrders: formattedOrders.filter(o => o.status === 'delivered').length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching admin orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin orders',
      error: error.message
    });
  }
};

// Simple admin order action using the new 6-status system
const handleSimpleAdminAction = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, status, newStatus, reason } = req.body;
    const adminId = req.user?.id || req.user?.userId;

    console.log('⚡ Simple Admin Action:', { 
      orderId, 
      action, 
      status,
      newStatus, 
      reason, 
      adminId,
      user: req.user
    });

    // Map actions to status updates
    const actionToStatus = {
      'confirm': 'processing',
      'process': 'processing', 
      'ship': 'shipped',
      'deliver': 'delivered',
      'cancel': 'cancelled',
      'updateStatus': newStatus || status // Direct status update
    };

    let targetStatus = newStatus || status || actionToStatus[action];
    
    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action or status provided'
      });
    }

    // Validate status
    const validStatuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${targetStatus}. Valid statuses: ${validStatuses.join(', ')}`
      });
    }

    // Find and update the order directly
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // 🚫 PREVENT STATUS CHANGES IF CUSTOMER CANCELLED THE ORDER
    const customerCancelledStatuses = ['cancelled_by_customer', 'cancelled_by_user'];
    if (customerCancelledStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of order that was cancelled by customer. Current status: ${order.status}`,
        currentStatus: order.status,
        cancelledBy: order.cancelledBy,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason
      });
    }

    const oldStatus = order.status;
    
    // Update order status
    order.status = targetStatus;
    order.statusUpdatedAt = new Date();
    
    // Set deliveredAt timestamp when order is marked as delivered
    if (targetStatus === 'delivered' && oldStatus !== 'delivered') {
      order.deliveredAt = new Date();
      console.log(`📦 Order ${order.orderNumber || order._id} marked as delivered at ${order.deliveredAt.toISOString()}`);
    }
    
    // 📦 RESTORE STOCK IF ADMIN CANCELS THE ORDER
    if (targetStatus === 'cancelled' && oldStatus !== 'cancelled') {
      console.log('📦 Admin cancelled order - restoring stock...');
      
      // Import StockManager
      const StockManager = require('../services/StockManager');
      
      // Restore stock for all items in the order
      if (order.cart && order.cart.length > 0) {
        for (const item of order.cart) {
          if (item.productId) {
            try {
              await StockManager.restoreStock(item.productId, item.quantity);
              console.log(`📈 Stock restored for ${item.title}: +${item.quantity}`);
            } catch (stockError) {
              console.error(`Error restoring stock for product ${item.productId}:`, stockError);
            }
          }
        }
      }
      
      // Set cancellation metadata
      order.cancelledBy = 'admin';
      order.cancelledAt = new Date();
      order.cancellationReason = reason || 'Cancelled by admin';
    }
    
    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: targetStatus,
      updatedAt: new Date(),
      updatedBy: adminId,
      updatedByType: 'admin',
      notes: reason || `Admin ${action}`
    });

    await order.save();

    // ✅ NEW: Update parent order status if this is a sub-order
    if (order.parentOrderId) {
      console.log(`🔄 Updating parent order status for: ${order.parentOrderId}`);
      await updateParentOrderStatus(order.parentOrderId);
    }

    // Log audit event
    await Audit.logOrderStatusChange(
      orderId,
      oldStatus,
      targetStatus,
      adminId,
      'admin',
      reason || `Admin ${action}`,
      { actionType: action }
    );

    console.log(`✅ Order ${orderId} status updated from ${oldStatus} to ${targetStatus} by admin`);

    res.json({
      success: true,
      message: `Order ${action} successfully`,
      data: {
        orderId,
        action,
        oldStatus,
        newStatus: targetStatus,
        updatedBy: 'admin'
      }
    });

  } catch (error) {
    console.error('❌ Admin action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process admin action',
      error: error.message
    });
  }
};

module.exports = {
  getOrdersWithCategorization,
  forwardOrderToVendors,
  handleSimpleAdminAction, // NEW: Simple admin actions using 6-status system
  getCommissionSummary,
  recategorizeAllOrders,
  checkVendorOrderStatuses,
  getAdminOrders
};
