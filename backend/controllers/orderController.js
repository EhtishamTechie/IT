const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const StockManager = require('../services/StockManager');
const CommissionService = require('../services/CommissionService');
const OrderStatusCalculator = require('../utils/orderStatusCalculator');
const { resolveOrderStatus, getCustomerOrder, mapStatusForFrontend } = require('../utils/orderStatusResolver');
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

const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'internationaltijarat.com@gmail.com',
      to,
      subject,
      text
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// Create new order with stock management
const createOrder = async (req, res) => {
  // Set a timeout handler for Vercel
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ Order creation timeout - operation taking too long');
      return res.status(504).json({
        success: false,
        message: 'Order creation timeout - please try again',
        error: 'TIMEOUT'
      });
    }
  }, 55000); // 55 seconds to be under Vercel's 60s limit

  try {
    // Handle FormData for advance payments with receipts
    let orderData;
    if (req.body.orderData) {
      // Parse JSON orderData from FormData
      orderData = JSON.parse(req.body.orderData);
    } else {
      // Use req.body directly for regular orders
      orderData = req.body;
    }

    const {
      userId,
      customerInfo,
      items,
      shippingAddress,
      shippingInfo,
      paymentInfo,
      paymentMethod,
      totalAmount,
      totals,
      discountAmount = 0,
      taxAmount = 0,
      shippingCost = 0,
      notes,
      // Advance Payment Fields
      selectedPaymentAccount,
      advancePaymentAmount
    } = orderData;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: 'Customer information is required'
      });
    }

    // CHECK STOCK AVAILABILITY FIRST
    const stockCheck = await StockManager.checkStockAvailability(items);
    if (!stockCheck.success) {
      return res.status(400).json({
        success: false,
        message: 'Stock availability issue',
        unavailableItems: stockCheck.unavailable
      });
    }

    // Validate products and calculate total
    let calculatedTotal = 0;
    const orderItems = [];
    const shippingCosts = []; // Track shipping costs from each product

    for (const item of items) {
      const product = await Product.findById(item.productId).populate('vendor', 'businessName email');
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }

      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;

      // Add shipping cost from product
      const productShipping = product.shipping || 0;
      if (productShipping > 0) {
        shippingCosts.push(productShipping);
      }

      orderItems.push({
        productId: product._id,  // ADD productId for stock tracking
        product: product._id,
        vendor: product.vendor ? product.vendor._id : null, // Add vendor reference
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        itemTotal: itemTotal,
        total: itemTotal,
        image: product.image,
        shipping: productShipping, // Add shipping field to order items
        mainCategory: Array.isArray(product.mainCategory) ? product.mainCategory[0] : product.mainCategory,
        subCategory: Array.isArray(product.subCategory) ? (product.subCategory[0] || '') : product.subCategory,
        status: 'placed', // Changed from 'pending' to match enum
        commissionAmount: 0 // Commission will be calculated when admin forwards to vendors
      });
    }

    // Calculate shipping cost (maximum shipping cost from all products)
    let calculatedShippingCost = 0;
    if (shippingCosts.length > 0) {
      calculatedShippingCost = Math.max(...shippingCosts);
      
      // Apply free shipping rule for orders >= 10,000
      if (calculatedTotal >= 10000) {
        calculatedShippingCost = 0;
      }
    }

    console.log('🚢 [ORDER CREATION] Shipping calculation:', {
      cartTotal: calculatedTotal,
      shippingCosts,
      maxShipping: calculatedShippingCost,
      freeShippingApplied: calculatedTotal >= 10000
    });

    // CATEGORIZE ORDER TYPE
    const adminItems = orderItems.filter(item => !item.vendor);
    const vendorItems = orderItems.filter(item => item.vendor);
    
    let orderType;
    if (adminItems.length > 0 && vendorItems.length > 0) {
      orderType = 'mixed';
    } else if (vendorItems.length > 0) {
      orderType = 'vendor_only';
    } else {
      orderType = 'admin_only';
    }

    // Calculate total commission
    const totalCommission = 0; // Commission will be calculated when admin forwards to vendors

    // Create order with enhanced item tracking
    const enhancedOrderItems = OrderStatusCalculator.initializeItemStatuses(orderItems);
    
    // Extract payment method from paymentInfo or direct field
    const finalPaymentMethod = paymentInfo?.method || paymentMethod;
    const finalShippingInfo = shippingInfo || shippingAddress;
    const finalTotals = totals || { total: totalAmount };

    const order = new Order({
      orderNumber: generateOrderNumber(),
      // Customer info fields (matching Order model)
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      address: finalShippingInfo?.street || finalShippingInfo?.address || customerInfo.address,
      city: finalShippingInfo?.city || customerInfo.city,
      cart: enhancedOrderItems, // Use enhanced items with status tracking
      paymentMethod: finalPaymentMethod,
      status: 'placed', // Changed from 'Pending' to match new status system
      orderStatus: 'placed', // New optimized status field
      paymentProof: req.file && finalPaymentMethod !== 'advance_payment' ? req.file.path : undefined,
      
      // Advance Payment Fields
      selectedPaymentAccount: paymentInfo?.selectedPaymentAccount || selectedPaymentAccount || null,
      paymentReceipt: (finalPaymentMethod === 'advance_payment' && req.file) ? req.file.path : null,
      advancePaymentAmount: paymentInfo?.advancePaymentAmount || advancePaymentAmount || 0,
      paymentVerified: paymentInfo?.paymentVerified || false,
      
      // NEW MULTI-VENDOR FIELDS
      orderType: orderType,
      shippingCost: calculatedShippingCost, // Store calculated shipping cost
      totalAmount: finalTotals.total || (calculatedTotal + taxAmount + calculatedShippingCost - discountAmount),
      paymentStatus: finalPaymentMethod === 'advance_payment' ? 'pending_verification' : 'pending',
      adminNotes: notes,
      completionDetails: {
        adminCompleted: adminItems.length === 0, // Auto-complete if no admin items
        vendorCompletions: new Map()
      },
      vendorOrders: [] // Will be populated when orders are forwarded
    });

    await order.save();

    // Send order confirmation email
    try {
      const { emailService } = require('../services/emailService');
      await emailService.sendOrderConfirmation(order.email, order);
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail the order creation if email fails
    }

    // RESERVE STOCK using StockManager
    const stockReservation = await StockManager.reserveStock(items, order._id);
    if (!stockReservation.success) {
      // If stock reservation fails, delete the order
      await Order.findByIdAndDelete(order._id);
      return res.status(400).json({
        success: false,
        message: 'Failed to reserve stock',
        error: stockReservation.error
      });
    }

    console.log(`✅ Order ${order.orderNumber} created and stock reserved`);

    // AUTO-SPLIT ORDER INTO SUB-ORDERS AT CHECKOUT
    // ONLY split mixed orders according to requirements
    let subOrdersCreated = [];
    
    if (orderType === 'mixed') {
      // Group vendor items by vendor
      const vendorGroups = {};
      vendorItems.forEach(item => {
        const vendorId = item.vendor.toString();
        if (!vendorGroups[vendorId]) {
          vendorGroups[vendorId] = [];
        }
        vendorGroups[vendorId].push(item);
      });

      // Create vendor sub-orders for each vendor (these will appear in "Vendor Orders" tab)
      for (const [vendorId, items] of Object.entries(vendorGroups)) {
        try {
          const vendorOrderTotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
          
          const vendorSubOrder = new Order({
            orderNumber: `${order.orderNumber}-V${vendorId.slice(-4)}`,
            parentOrderId: order._id,
            name: order.name,
            email: order.email,
            phone: order.phone,
            address: order.address,
            city: order.city,
            cart: items,
            paymentMethod: order.paymentMethod,
            status: 'placed',
            orderStatus: 'placed',
            orderType: 'vendor_only',
            partialOrderType: 'vendor_part',
            totalAmount: vendorOrderTotal,
            paymentStatus: 'pending',
            vendor: vendorId,
            isSubOrder: true,
            commissionAmount: 0 // Will be calculated when admin forwards
          });

          await vendorSubOrder.save();
          subOrdersCreated.push(vendorSubOrder._id);
          
          console.log(`✅ Vendor sub-order ${vendorSubOrder.orderNumber} created for vendor ${vendorId}`);
        } catch (vendorOrderError) {
          console.error(`❌ Failed to create vendor sub-order for vendor ${vendorId}:`, vendorOrderError);
        }
      }
    }

    // Create admin sub-order if there are admin items (these will appear in "My Orders" tab)
    if (adminItems.length > 0) {
      try {
        const adminOrderTotal = adminItems.reduce((sum, item) => sum + item.itemTotal, 0);
        
        const adminSubOrder = new Order({
          orderNumber: `${order.orderNumber}-A`,
          parentOrderId: order._id,
          name: order.name,
          email: order.email,
          phone: order.phone,
          address: order.address,
          city: order.city,
          cart: adminItems,
          paymentMethod: order.paymentMethod,
          status: 'placed',
          orderStatus: 'placed',
          orderType: 'admin_only',
          partialOrderType: 'admin_part',
          totalAmount: adminOrderTotal,
          paymentStatus: 'pending',
          isSubOrder: true
        });

        await adminSubOrder.save();
        subOrdersCreated.push(adminSubOrder._id);
        
        console.log(`✅ Admin sub-order ${adminSubOrder.orderNumber} created`);
      } catch (adminOrderError) {
        console.error(`❌ Failed to create admin sub-order:`, adminOrderError);
      }
    }

    // Update main order with sub-order references and mixed order flag
    if (subOrdersCreated.length > 0) {
      await Order.findByIdAndUpdate(order._id, {
        subOrders: subOrdersCreated,
        isParentOrder: true,
        isSplitOrder: true // Mark as split for mixed orders
      });
    }

    // Send confirmation email to customer
    await sendEmail(
      order.email,
      'Order Confirmation',
      `Dear ${order.name}, your order #${order.orderNumber} has been received and is being processed.`
    );

    // Send notification emails to vendors for their products
    const vendorNotifications = new Map();
    
    // Group products by vendor
    for (const item of orderItems) {
      if (item.vendor) {
        if (!vendorNotifications.has(item.vendor.toString())) {
          vendorNotifications.set(item.vendor.toString(), []);
        }
        vendorNotifications.get(item.vendor.toString()).push({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        });
      }
    }

    // Send email to each vendor
    for (const [vendorId, vendorItems] of vendorNotifications) {
      try {
        const vendor = await Vendor.findById(vendorId);
        if (vendor && vendor.email) {
          const itemsList = vendorItems.map(item => 
            `- ${item.title} (Qty: ${item.quantity}, Price: $${item.price})`
          ).join('\n');
          
          await sendEmail(
            vendor.email,
            `New Order Received - ${order.orderNumber}`,
            `Dear ${vendor.businessName},

You have received a new order!

Order Number: ${order.orderNumber}
Customer: ${order.name}
Items from your store:
${itemsList}

Please log in to your vendor dashboard to manage this order.

Best regards,
International Tijarat Team`
          );
        }
      } catch (emailError) {
        console.error(`Failed to send vendor notification to ${vendorId}:`, emailError);
      }
    }

    // Populate order details for response
    const populatedOrder = await Order.findById(order._id)
      .populate('cart.productId', 'title image price vendor')
      .populate('cart.vendor', 'businessName email');

    // Log the final creation success with details
    console.log(`✅ Order creation process completed:`, {
      orderNumber: populatedOrder.orderNumber,
      orderType: populatedOrder.orderType,
      totalAmount: populatedOrder.totalAmount,
      itemCount: populatedOrder.cart.length,
      hasSubOrders: populatedOrder.hasSubOrders,
      splitOrdersCreated: subOrdersCreated.length,
      commissionAmount: populatedOrder.totalCommission
    });

    // Clear the timeout since we're successful
    clearTimeout(timeout);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder
    });
  } catch (error) {
    // Clear the timeout on error too
    clearTimeout(timeout);
    console.error('❌ Error in order creation process:', {
      errorMessage: error.message,
      errorStack: error.stack,
      orderData: {
        hasCustomerInfo: !!(req.body.name || req.body.customerData?.name),
        hasCart: !!(req.body.cart || req.body.customerData?.cart),
        cartLength: (req.body.cart || req.body.customerData?.cart)?.length || 0
      },
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
      errorCode: 'ORDER_CREATION_FAILED'
    });
  }
};

// Legacy addOrder function for compatibility
const addOrder = async (req, res) => {
  try {
    console.log('📦 Creating new order...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Handle both old and new data formats
    let name, email, phone, address, city, paymentMethod, cart;
    
    // Check if it's the new format (with customerInfo, shippingInfo, etc.)
    if (req.body.customerInfo && req.body.shippingInfo) {
      console.log('📋 Processing new data format...');
      name = req.body.customerInfo.name;
      email = req.body.customerInfo.email;
      phone = req.body.customerInfo.phone;
      address = req.body.shippingInfo.street;
      city = req.body.shippingInfo.city;
      paymentMethod = req.body.paymentInfo.method;
      cart = req.body.items; // items array from new format
    } else {
      console.log('📋 Processing legacy data format...');
      // Legacy format
      ({ name, email, phone, address, city, paymentMethod } = req.body);
      cart = typeof req.body.cart === 'string' ? JSON.parse(req.body.cart) : req.body.cart;
    }

    console.log('🔍 Parsed data:', { name, email, phone, address, city, paymentMethod, cartLength: cart?.length });

    if (!name || !email || !phone || !address || !city || !paymentMethod || !cart?.length) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields',
        received: { name: !!name, email: !!email, phone: !!phone, address: !!address, city: !!city, paymentMethod: !!paymentMethod, cartLength: cart?.length }
      });
    }

    // Map cart items to include productId (handle both formats)
    const cartItems = [];
    let calculatedTotal = 0;
    
    for (const item of cart) {
      // Find the actual product to get vendor info and calculate commission
      let product = null;
      const productId = item.productId || item.id || item._id;
      
      if (productId) {
        try {
          product = await Product.findById(productId).populate('vendor', 'businessName email');
        } catch (productError) {
          console.warn(`Could not find product ${productId}:`, productError);
        }
      }
      
      const itemTotal = item.price * item.quantity;
      calculatedTotal += itemTotal;
      
      cartItems.push({
        productId: productId,
        product: productId,
        vendor: product?.vendor ? product.vendor._id : null, // Add vendor reference
        title: item.name || item.title,
        price: item.price,
        quantity: item.quantity,
        itemTotal: itemTotal,
        image: item.image,
        mainCategory: item.mainCategory,
        subCategory: item.subCategory,
        status: 'placed', // Changed from 'pending' to match enum
        commissionAmount: 0 // Commission will be calculated when admin forwards to vendors
      });
    }

    // CATEGORIZE ORDER TYPE
    const adminItems = cartItems.filter(item => !item.vendor);
    const vendorItems = cartItems.filter(item => item.vendor);
    
    let orderType;
    if (adminItems.length > 0 && vendorItems.length > 0) {
      orderType = 'mixed';
    } else if (vendorItems.length > 0) {
      orderType = 'vendor_only';
    } else {
      orderType = 'admin_only';
    }

    console.log(`🏷️ Order categorized as: ${orderType}`);
    console.log(`📊 Admin items: ${adminItems.length}, Vendor items: ${vendorItems.length}`);

    console.log('🛒 Cart items:', cartItems);

    // Map payment method to backend format
    let mappedPaymentMethod = paymentMethod;
    if (paymentMethod === 'cash') mappedPaymentMethod = 'cash_on_delivery';
    else if (paymentMethod === 'bank') mappedPaymentMethod = 'Bank Transfer';
    else if (paymentMethod === 'jazzcash') mappedPaymentMethod = 'JazzCash';
    else if (paymentMethod === 'easypaisa') mappedPaymentMethod = 'EasyPaisa';

    // Create order with enhanced item tracking
    const enhancedCartItems = OrderStatusCalculator.initializeItemStatuses(cartItems);

    const order = new Order({
      orderNumber: generateOrderNumber(),
      name,
      email,
      phone,
      address,
      city,
      paymentMethod: mappedPaymentMethod,
      cart: enhancedCartItems, // Use enhanced items with status tracking
      status: 'placed', // Changed from 'Pending' to match new status system
      orderStatus: 'placed', // New optimized status field
      paymentProof: req.file ? req.file.path : undefined,
      // NEW MULTI-VENDOR FIELDS
      orderType: orderType,
      totalAmount: calculatedTotal,
      paymentStatus: 'pending',
      completionDetails: {
        adminCompleted: adminItems.length === 0, // Auto-complete if no admin items
        vendorCompletions: new Map()
      },
      vendorOrders: [] // Will be populated when orders are forwarded
    });

    console.log('💾 Saving order to database...');
    const savedOrder = await order.save();
    console.log('✅ Order saved successfully:', savedOrder._id);
    
    // RESERVE STOCK using StockManager
    console.log('📦 Reserving stock for order items...');
    const stockItems = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));
    
    console.log('📋 Stock items to reserve:', JSON.stringify(stockItems, null, 2));
    
    const stockReservation = await StockManager.reserveStock(stockItems, savedOrder._id);
    if (!stockReservation.success) {
      console.log('❌ Stock reservation failed, deleting order');
      console.log('❌ Stock reservation error:', stockReservation);
      // If stock reservation fails, delete the order
      await Order.findByIdAndDelete(savedOrder._id);
      return res.status(400).json({
        success: false,
        message: 'Failed to reserve stock',
        error: stockReservation.error,
        details: stockReservation.details
      });
    }
    
    console.log('✅ Stock reserved successfully for order:', savedOrder._id);
    
    // AUTO-SPLIT ORDER INTO SUB-ORDERS FOR LEGACY PATH (Path 2)
    // ONLY split mixed orders - vendor_only and admin_only should remain as single orders
    let legacySubOrdersCreated = [];
    
    if (orderType === 'mixed') {
      console.log('🔄 Creating vendor sub-orders for mixed order splitting...');
      
      // Group vendor items by vendor
      const vendorGroups = {};
      vendorItems.forEach(item => {
        const vendorId = item.vendor.toString();
        if (!vendorGroups[vendorId]) {
          vendorGroups[vendorId] = [];
        }
        vendorGroups[vendorId].push(item);
      });

      // Create vendor sub-orders for each vendor
      for (const [vendorId, items] of Object.entries(vendorGroups)) {
        try {
          const vendorOrderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          const vendorSubOrder = new Order({
            orderNumber: `${savedOrder.orderNumber}-V${vendorId.slice(-4)}`,
            parentOrderId: savedOrder._id,
            name: savedOrder.name,
            email: savedOrder.email,
            phone: savedOrder.phone,
            address: savedOrder.address,
            city: savedOrder.city,
            cart: items,
            paymentMethod: savedOrder.paymentMethod,
            status: 'placed',
            orderStatus: 'placed',
            orderType: 'vendor_only',
            partialOrderType: 'vendor_part',
            totalAmount: vendorOrderTotal,
            paymentStatus: 'pending',
            vendor: vendorId,
            isSubOrder: true,
            commissionAmount: 0
          });

          await vendorSubOrder.save();
          legacySubOrdersCreated.push(vendorSubOrder._id);
          
          console.log(`✅ Vendor sub-order ${vendorSubOrder.orderNumber} created for vendor ${vendorId}`);
        } catch (vendorOrderError) {
          console.error(`❌ Failed to create vendor sub-order for vendor ${vendorId}:`, vendorOrderError);
        }
      }
    }

    // Create admin sub-order ONLY for mixed orders that have admin items
    // For admin_only and vendor_only orders, all items should remain in the main order without splitting
    if (adminItems.length > 0 && orderType === 'mixed') {
      console.log('🏢 Creating admin sub-order for mixed order splitting...');
      
      try {
        const adminOrderTotal = adminItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const adminSubOrder = new Order({
          orderNumber: `${savedOrder.orderNumber}-A`,
          parentOrderId: savedOrder._id,
          name: savedOrder.name,
          email: savedOrder.email,
          phone: savedOrder.phone,
          address: savedOrder.address,
          city: savedOrder.city,
          cart: adminItems,
          paymentMethod: savedOrder.paymentMethod,
          status: 'placed',
          orderStatus: 'placed',
          orderType: 'admin_only',
          partialOrderType: 'admin_part',
          totalAmount: adminOrderTotal,
          paymentStatus: 'pending',
          isSubOrder: true
        });

        await adminSubOrder.save();
        legacySubOrdersCreated.push(adminSubOrder._id);
        
        console.log(`✅ Admin sub-order ${adminSubOrder.orderNumber} created`);
      } catch (adminOrderError) {
        console.error(`❌ Failed to create admin sub-order:`, adminOrderError);
      }
    }

    // Update main order with sub-order references
    if (legacySubOrdersCreated.length > 0) {
      await Order.findByIdAndUpdate(savedOrder._id, {
        subOrders: legacySubOrdersCreated,
        isParentOrder: true
      });
      console.log(`✅ Legacy path: Updated main order ${savedOrder.orderNumber} with ${legacySubOrdersCreated.length} sub-orders`);
    }
    
    // DISABLED: Old vendor order creation logic (causing duplication)
    /*
    // CREATE VENDOR ORDERS FOR VENDOR/MIXED ORDERS
    if (orderType === 'vendor_only' || orderType === 'mixed') {
      try {
        console.log('🏪 Creating vendor orders...');
        const VendorOrder = require('../models/VendorOrder');
        
        // Group vendor items by vendor
        const vendorGroups = {};
        vendorItems.forEach(item => {
          const vendorId = item.vendor.toString();
          if (!vendorGroups[vendorId]) {
            vendorGroups[vendorId] = {
              vendor: item.vendor,
              items: []
            };
          }
          vendorGroups[vendorId].items.push(item);
        });

        console.log(`📊 Creating vendor orders for ${Object.keys(vendorGroups).length} vendors`);

        // Create vendor order for each vendor
        const vendorOrderPromises = Object.values(vendorGroups).map(async (group) => {
          const vendorOrderNumber = `VO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const groupTotal = group.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const commissionAmount = 0; // Commission will be calculated when admin forwards to vendors
          
          // CREATE VENDORORDER (for vendor dashboard)
          const vendorOrder = new VendorOrder({
            orderNumber: vendorOrderNumber,
            originalOrder: savedOrder._id,
            parentOrderId: savedOrder._id, // Add required parentOrderId
            vendor: group.vendor,
            customer: { // Use 'customer' not 'customerInfo'
              name,
              email,
              phone,
              address,
              city
            },
            items: group.items,
            totalAmount: groupTotal,
            status: 'placed', // Changed from 'pending'
            commission: {
              rate: 0, // Commission will be calculated when admin forwards
              amount: 0
            }
          });
          
          const savedVendorOrder = await vendorOrder.save();
          
          // CREATE SEPARATE ORDER DOCUMENT (for admin interface)
          // Fix status for vendor items (change 'pending' to 'placed')
          const vendorItemsWithCorrectStatus = group.items.map(item => ({
            ...item,
            status: 'placed' // Fix the status to match enum
          }));
          
          const vendorOrderForAdmin = new Order({
            orderNumber: `ADM-${vendorOrderNumber}`, // Different prefix for admin view
            name,
            email,
            phone,
            address,
            city,
            paymentMethod: mappedPaymentMethod,
            cart: vendorItemsWithCorrectStatus, // Use corrected vendor items
            status: 'placed', // Changed from 'Pending'
            orderStatus: 'placed',
            orderType: 'vendor_only',
            partialOrderType: 'vendor_part', // Mark as vendor part of mixed order
            parentOrderId: savedOrder._id, // Link to parent mixed order
            vendorOrderId: savedVendorOrder._id, // Link to VendorOrder
            vendor: group.vendor, // Add vendor reference
            totalAmount: groupTotal,
            paymentStatus: 'pending',
            isSplitOrder: false, // This is a part, not the parent
            isPartialOrder: true, // This is part of a split order
            splitFromMixedOrder: true
          });
          
          const savedAdminVendorOrder = await vendorOrderForAdmin.save();
          console.log(`✅ Created vendor order ${savedVendorOrder._id} and admin order ${savedAdminVendorOrder._id} for vendor ${group.vendor}`);
          
          return savedVendorOrder;
        });

        const createdVendorOrders = await Promise.all(vendorOrderPromises);
        
        // Update the main order with vendor order references
        savedOrder.vendorOrders = createdVendorOrders.map(vo => vo._id);
        await savedOrder.save();

        console.log(`✅ Created ${createdVendorOrders.length} vendor orders for order ${savedOrder._id}`);
      } catch (vendorOrderError) {
        console.error('❌ Error creating vendor orders:', vendorOrderError);
        // Continue - main order still created successfully
      }
    }

    // STEP 1: CREATE ADMIN ORDER FOR MIXED ORDERS (Auto-split implementation)
    if (orderType === 'mixed' && adminItems.length > 0) {
      try {
        console.log('🏢 Creating admin order for mixed order admin items...');
        
        const adminOrderNumber = `AO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const adminTotal = adminItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Fix status for admin items (change 'pending' to 'placed')
        const adminItemsWithCorrectStatus = adminItems.map(item => ({
          ...item,
          status: 'placed' // Fix the status to match enum
        }));
        
        const adminOrder = new Order({
          orderNumber: adminOrderNumber,
          name,
          email,
          phone,
          address,
          city,
          paymentMethod: mappedPaymentMethod,
          cart: adminItemsWithCorrectStatus, // Use corrected admin items
          status: 'placed', // Changed from 'Pending'
          orderStatus: 'placed',
          orderType: 'admin_only',
          partialOrderType: 'admin_part', // Mark as admin part of mixed order
          parentOrderId: savedOrder._id, // Link to parent mixed order
          totalAmount: adminTotal,
          paymentStatus: 'pending',
          isSplitOrder: false, // This is a part, not the parent
          isPartialOrder: true, // This is part of a split order
          splitFromMixedOrder: true
        });

        const savedAdminOrder = await adminOrder.save();
        console.log(`✅ Created admin order ${savedAdminOrder._id} for admin items in mixed order`);
        console.log(`📊 Admin order total: $${adminTotal}, Items: ${adminItems.length}`);

      } catch (adminOrderError) {
        console.error('❌ Error creating admin order:', adminOrderError);
        // Continue - main order still created successfully
      }
    }

    // Mark parent order as split if we created both vendor and admin orders
    if (orderType === 'mixed') {
      try {
        savedOrder.isSplitOrder = true;
        savedOrder.orderSplitStatus = 'split_completed';
        await savedOrder.save();
        console.log(`✅ Marked parent order ${savedOrder._id} as split (mixed order auto-split completed)`);
      } catch (splitMarkError) {
        console.error('❌ Error marking order as split:', splitMarkError);
      }
    }
    */
    // END OF DISABLED DUPLICATE SECTION
    
    // Send confirmation email
    try {
      const { emailService } = require('../services/emailService');
      await emailService.sendOrderConfirmation(email, savedOrder);
      console.log('📧 Confirmation email sent');
    } catch (emailError) {
      console.log('⚠️ Email sending failed:', emailError.message);
    }
    
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: savedOrder,
      orderNumber: savedOrder._id
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create order',
      error: error.message 
    });
  }
};

// Get all orders with filtering and pagination
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
        case 'amount-high':
          sortOption = { totalAmount: -1 };
          break;
        case 'amount-low':
          sortOption = { totalAmount: 1 };
          break;
        case 'status':
          sortOption = { status: 1 };
          break;
      }
    }

    const orders = await Order.find(filter)
      .populate('cart.productId', 'title image price')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    // Add basic categorization for compatibility
    const categorizedOrders = orders.map(order => {
      if (!order.orderType || order.orderType === 'legacy') {
        const adminItems = order.cart?.filter(item => !item.vendor) || [];
        const vendorItems = order.cart?.filter(item => item.vendor) || [];
        
        let orderType;
        if (adminItems.length > 0 && vendorItems.length > 0) {
          orderType = 'mixed';
        } else if (vendorItems.length > 0) {
          orderType = 'vendor_only';
        } else {
          orderType = 'admin_only';
        }
        
        return { ...order, orderType };
      }
      return order;
    });

    const totalOrders = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders: categorizedOrders,
      totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      hasNextPage: page < Math.ceil(totalOrders / limit),
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    console.log('🔍 Fetching order by ID:', req.params.id);
    const identifier = req.params.id;
    let order;

    // First try to find by ObjectId if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      console.log('📋 Searching by ObjectId...');
      order = await Order.findById(identifier);
    }
    
    // If not found and the identifier looks like an order number, search by order number
    if (!order && (identifier.startsWith('ORD-') || identifier.length > 24)) {
      console.log('📋 Searching by order number...');
      order = await Order.findOne({ orderNumber: identifier });
    }
    
    console.log('📦 Order found:', !!order);

    if (!order) {
      console.log('❌ Order not found with identifier:', identifier);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Return the order with current status
    console.log('✅ Order retrieved successfully, status:', order.status);
    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Legacy confirmOrder function
const confirmOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, { status: "Confirmed" }, { new: true });
    if (!updated) return res.status(404).json({ message: "Order not found" });

    const customerEmail = updated.customerInfo?.email;
    const customerName = updated.customerInfo?.name;
    
    if (customerEmail && customerName) {
      await sendEmail(customerEmail, 'Order Confirmed', `Dear ${customerName}, your order has been confirmed.`);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled (not shipped or delivered)
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'cancelled_by_customer', 'rejected'];
    if (nonCancellableStatuses.includes(order.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}. Order has already been processed.`,
        currentStatus: order.status
      });
    }

    console.log(`🚫 Cancelling order ${orderId} with reason: ${reason || 'No reason provided'}`);

    // Restore product stock using StockManager
    if (order.cart && order.cart.length > 0) {
      console.log('📦 Restoring stock for cancelled order...');
      for (const item of order.cart) {
        if (item.productId) {
          try {
            // Restore stock
            await Product.findByIdAndUpdate(
              item.productId,
              { 
                $inc: { 
                  stock: item.quantity,
                  soldCount: -item.quantity
                }
              }
            );
            console.log(`📈 Stock restored for ${item.title}: +${item.quantity}`);
          } catch (stockError) {
            console.error(`Error restoring stock for product ${item.productId}:`, stockError);
          }
        }
      }
    }

    // REVERSE COMMISSION TRACKING for vendor items when admin cancels order
    if (order.vendorOrders && order.vendorOrders.length > 0) {
      console.log('💸 Reversing commissions for admin-cancelled order...');
      const VendorOrder = require('../models/VendorOrder');
      const MonthlyCommission = require('../models/MonthlyCommission');
      
      for (const vendorOrderId of order.vendorOrders) {
        try {
          const vendorOrder = await VendorOrder.findById(vendorOrderId);
          if (vendorOrder && vendorOrder.commissionAmount > 0) {
            const orderDate = new Date(vendorOrder.createdAt);
            
            console.log(`💸 Reversing commission for vendor ${vendorOrder.vendor}: $${vendorOrder.commissionAmount}`);
            
            await MonthlyCommission.findOneAndUpdate(
              { vendor: vendorOrder.vendor, month: orderDate.getMonth() + 1, year: orderDate.getFullYear() },
              {
                $pull: { orders: vendorOrder._id },
                $inc: { 
                  totalCommission: -vendorOrder.commissionAmount,
                  totalRevenue: -vendorOrder.totalAmount,
                  totalOrders: -1,
                  pendingToAdmin: -vendorOrder.commissionAmount
                }
              }
            );
            
            // Also update the vendor order status to cancelled
            vendorOrder.status = 'cancelled';
            vendorOrder.cancelledBy = 'admin';
            vendorOrder.cancelledAt = new Date();
            vendorOrder.cancellationReason = reason || 'Parent order cancelled by admin';
            await vendorOrder.save();
            
            console.log(`✅ Commission reversed for vendor order ${vendorOrder._id}`);
          }
        } catch (commissionError) {
          console.error(`❌ Error reversing commission for vendor order ${vendorOrderId}:`, commissionError);
        }
      }
    }

    // Update order status
    order.status = 'Rejected';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by admin';
    await order.save();

    // Send cancellation email to customer
    if (order.email) {
      await sendEmail(
        order.email,
        'Order Cancelled - International Tijarat',
        `Dear ${order.name},\n\nYour order #${order._id} has been cancelled.\n\nReason: ${reason || 'No reason provided'}\n\nIf you have any questions, please contact our customer service.\n\nBest regards,\nInternational Tijarat`
      );
      console.log('📧 Cancellation email sent to customer');
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Get order statistics for dashboard
const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Shipped'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get monthly revenue for the last 12 months
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) },
          status: { $nin: ['Cancelled', 'Rejected'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        averageOrderValue: 0
      },
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  // Add timeout handling for Vercel
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ getUserOrders timeout - operation taking too long');
      return res.status(504).json({
        success: false,
        message: 'Request timeout - please try again',
        error: 'TIMEOUT'
      });
    }
  }, 50000); // 50 seconds to be under Vercel's 60s limit

  try {
    console.log('📧 [ORDER HISTORY] getUserOrders endpoint called');
    console.log('📧 [ORDER HISTORY] Request params:', req.params);
    console.log('📧 [ORDER HISTORY] Request query:', req.query);
    
    // Get user from token (added by authenticateToken middleware)
    const tokenUser = req.user;
    
    if (!tokenUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('📧 getUserOrders - Token user:', { 
      userId: tokenUser.userId, 
      email: tokenUser.email, 
      hasEmail: !!tokenUser.email 
    });

    // Handle both old tokens (userId only) and new tokens (userId + email)
    let userEmail = tokenUser.email;
    
    if (!userEmail) {
      console.log('📧 getUserOrders - Email not in token, fetching from database...');
      // Fetch user email from database for old tokens
      const User = require('../models/User');
      const dbUser = await User.findById(tokenUser.userId).select('email');
      
      if (!dbUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      userEmail = dbUser.email;
      console.log('📧 getUserOrders - Email fetched from database:', userEmail);
    }

    console.log('📧 getUserOrders - Looking for orders with email:', userEmail);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalOrders = await Order.countDocuments({
      email: userEmail,
      parentOrderId: { $exists: false }
    });

    // Find main orders for this user (exclude sub-orders) with proper pagination
    const allUserOrders = await Order.find({ 
      email: userEmail,
      parentOrderId: { $exists: false } // Only show main orders to customers
    })
      .populate('cart.productId', 'title image price')
      .populate('cart.assignedVendor', 'businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit) // Only fetch what we need for the current page
      .lean();

    console.log(`📋 [ORDER HISTORY] Found ${allUserOrders.length} main orders for user email "${userEmail}"`);
    
    // Log each order's basic details for debugging
    allUserOrders.forEach(order => {
      console.log(`📋 [ORDER HISTORY] Order ${order.orderNumber}: type=${order.orderType}, status=${order.status}, hasSubOrders=${!!order.subOrders?.length}`);
    });

    // Process orders using the robust status resolver
    // Process the paginated orders using the robust status resolver
    const processedOrders = [];
    
    for (const order of allUserOrders) {
      try {
        console.log(`🔍 [ORDER HISTORY] Processing order ${order.orderNumber} (${order.orderType})`);
        
        const resolvedOrder = await resolveOrderStatus(order);
        
        // Skip sub-orders (should not happen with our query, but extra safety)
        if (resolvedOrder === null) {
          console.log(`⏭️ [ORDER HISTORY] Skipping sub-order ${order.orderNumber}`);
          continue;
        }

        console.log(`✅ [ORDER HISTORY] Resolved order ${order.orderNumber}: ${order.status} → ${resolvedOrder.status || resolvedOrder.resolvedStatus}`);

        // Apply status mapping for frontend compatibility
        const mappedStatus = mapStatusForFrontend(resolvedOrder.resolvedStatus);
        
        const processedOrder = {
          ...resolvedOrder,
          status: mappedStatus,
          statusDisplay: mappedStatus,
          unifiedStatus: mappedStatus
        };

        console.log(`✅ Processed order ${order.orderNumber}: ${order.status} → ${mappedStatus} (${resolvedOrder.statusSource})`);
        processedOrders.push(processedOrder);
        
      } catch (error) {
        console.error(`❌ Error processing order ${order.orderNumber}:`, error);
        // Fallback: include order with original status
        processedOrders.push({
          ...order,
          status: mapStatusForFrontend(order.status || 'placed'),
          statusDisplay: mapStatusForFrontend(order.status || 'placed'),
          unifiedStatus: mapStatusForFrontend(order.status || 'placed'),
          statusSource: 'fallback'
        });
      }
    }

    console.log(`📊 Processed ${processedOrders.length} orders for page ${page} out of ${totalOrders} total orders`);

    // Clear the timeout since we're successful
    clearTimeout(timeout);

    // Send response with pagination metadata
    res.json({
      success: true,
      orders: processedOrders, // Already paginated from database query
      pagination: {
        totalOrders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        pageSize: limit,
        hasNextPage: skip + limit < totalOrders,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    // Clear the timeout on error too
    clearTimeout(timeout);
    
    console.error('❌ getUserOrders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user orders',
      error: error.message
    });
  }
};

// User cancel their own order
const cancelUserOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;
    const tokenUser = req.user;

    if (!tokenUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get user email (handle both old and new token formats)
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

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if the order belongs to this user
    if (order.email !== userEmail) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own orders'
      });
    }

    // Check if order can be cancelled (not shipped or delivered)
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'cancelled_by_customer', 'rejected'];
    if (nonCancellableStatuses.includes(order.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. Your order has already been ${order.status?.toLowerCase()}.`,
        currentStatus: order.status
      });
    }

    console.log(`🚫 User ${userEmail} cancelling their order ${orderId}`);

    // Restore product stock
    if (order.cart && order.cart.length > 0) {
      console.log('📦 Restoring stock for user-cancelled order...');
      for (const item of order.cart) {
        if (item.productId) {
          try {
            await Product.findByIdAndUpdate(
              item.productId,
              { 
                $inc: { 
                  stock: item.quantity,
                  soldCount: -item.quantity
                }
              }
            );
            console.log(`📈 Stock restored for ${item.title}: +${item.quantity}`);
          } catch (stockError) {
            console.error(`Error restoring stock for product ${item.productId}:`, stockError);
          }
        }
      }
    }

    // REVERSE COMMISSION TRACKING for vendor items in this order
    if (order.vendorOrders && order.vendorOrders.length > 0) {
      console.log('💸 Reversing commissions for cancelled order...');
      const VendorOrder = require('../models/VendorOrder');
      const MonthlyCommission = require('../models/MonthlyCommission');
      
      for (const vendorOrderId of order.vendorOrders) {
        try {
          const vendorOrder = await VendorOrder.findById(vendorOrderId);
          if (vendorOrder && vendorOrder.commissionAmount > 0) {
            const orderDate = new Date(vendorOrder.createdAt);
            
            console.log(`💸 Reversing commission for vendor ${vendorOrder.vendor}: $${vendorOrder.commissionAmount}`);
            
            await MonthlyCommission.findOneAndUpdate(
              { vendor: vendorOrder.vendor, month: orderDate.getMonth() + 1, year: orderDate.getFullYear() },
              {
                $pull: { orders: vendorOrder._id },
                $inc: { 
                  totalCommission: -vendorOrder.commissionAmount,
                  totalRevenue: -vendorOrder.totalAmount,
                  totalOrders: -1,
                  pendingToAdmin: -vendorOrder.commissionAmount
                }
              }
            );
            
            // Also update the vendor order status to cancelled
            vendorOrder.status = 'cancelled';
            vendorOrder.cancelledBy = 'user';
            vendorOrder.cancelledAt = new Date();
            vendorOrder.cancellationReason = reason || 'Parent order cancelled by customer';
            await vendorOrder.save();
            
            console.log(`✅ Commission reversed for vendor order ${vendorOrder._id}`);
          }
        } catch (commissionError) {
          console.error(`❌ Error reversing commission for vendor order ${vendorOrderId}:`, commissionError);
        }
      }
    }

    // Update order status
    order.status = 'cancelled'; // Use lowercase for consistency
    order.orderStatus = 'cancelled'; // Add orderStatus field for consistency
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by customer';
    order.cancelledBy = 'user';
    await order.save();

    // Send confirmation email
    if (order.email) {
      await sendEmail(
        order.email,
        'Order Cancellation Confirmed - International Tijarat',
        `Dear ${order.name},\n\nYour order #${order._id} has been successfully cancelled as requested.\n\nReason: ${reason || 'Cancelled by customer'}\n\nIf you placed this order by mistake or have any questions, please contact our customer service.\n\nBest regards,\nInternational Tijarat`
      );
      console.log('📧 Cancellation confirmation email sent to customer');
    }

    res.json({
      success: true,
      message: 'Your order has been cancelled successfully',
      order: {
        _id: order._id,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason
      }
    });
  } catch (error) {
    console.error('Error cancelling user order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Helper function to generate order number
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp.slice(-6)}${random}`;
}

// @desc    Get detailed order information for customer tracking
// @route   GET /api/orders/:id/details
// @access  Public (with order ownership verification)
const getOrderDetails = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { email } = req.query; // Optional email verification for public access
    
    console.log(`🔍 [ORDER DETAILS] Getting order details for: ${orderId}`);

    // Find the order with populated data
    const order = await Order.findById(orderId)
      .populate('cart.productId', 'title image price description')
      .populate('cart.assignedVendor', 'businessName email')
      .populate('vendorOrders')
      .lean();

    if (!order) {
      console.log(`❌ [ORDER DETAILS] Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`📋 [ORDER DETAILS] Found order ${order.orderNumber}: type=${order.orderType}, status=${order.status}, hasSubOrders=${!!order.subOrders?.length}`);

    // If email is provided, verify ownership (for public access)
    if (email && order.email !== email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate current status using the same logic as split-details endpoint
    // Prioritize order.status (actual current status) over order.orderStatus (legacy field)
    let currentStatus = order.status || order.orderStatus || 'Pending';
    
    // Always apply status mapping for legacy status names
    if (currentStatus) {
      const statusMap = {
        'Pending': 'placed',
        'Confirmed': 'processing',
        'Shipped': 'shipped',
        'Delivered': 'delivered',
        'Cancelled': 'cancelled'
      };
      currentStatus = statusMap[currentStatus] || currentStatus.toLowerCase();
    }
    
    // Use the status resolver for consistent status calculation
    let resolvedOrderData;
    try {
      console.log(`🔍 [ORDER DETAILS] Resolving status for order ${order.orderNumber}...`);
      resolvedOrderData = await resolveOrderStatus(order);
      
      if (resolvedOrderData) {
        currentStatus = resolvedOrderData.status || resolvedOrderData.resolvedStatus;
        console.log(`✅ [ORDER DETAILS] Resolved status using orderStatusResolver: ${order.status} → ${currentStatus}`);
      }
    } catch (resolverError) {
      console.warn('⚠️ [ORDER DETAILS] Status resolver failed, using fallback logic:', resolverError);
      
      // Fallback: manual status calculation for mixed orders
      if (order.orderType === 'mixed' || order.isSplitOrder) {
        try {
          console.log('🔍 Calculating unified status for mixed order:', order.orderNumber);
          
          // Get admin part
          const adminPart = await Order.findOne({
            parentOrderId: order._id,
            orderType: 'admin_only',
            partialOrderType: 'admin_part'
          });
          
          // Get vendor parts
          const VendorOrder = require('../models/VendorOrder');
          const vendorParts = await VendorOrder.find({
            parentOrderId: order._id,
            splitFromMixedOrder: true
          });
          
          const allStatuses = [];
          
          if (adminPart && adminPart.status) {
            allStatuses.push(adminPart.status);
          }
          
          if (vendorParts && vendorParts.length > 0) {
            vendorParts.forEach(vp => {
              if (vp.status) {
                allStatuses.push(vp.status);
              }
            });
          }
          
          if (allStatuses.length > 0) {
            console.log('📊 Mixed order sub-statuses:', allStatuses);
            
            // Apply the same unified status calculation logic as the split-details endpoint
            if (allStatuses.every(status => status === 'delivered')) {
              currentStatus = 'delivered';
            } else if (allStatuses.some(status => status === 'shipped')) {
              currentStatus = 'shipped';
            } else if (allStatuses.some(status => ['processing'].includes(status))) {
              currentStatus = 'processing';
            } else if (allStatuses.every(status => ['cancelled', 'rejected'].includes(status))) {
              currentStatus = 'cancelled';
            } else if (allStatuses.some(status => status === 'placed')) {
              currentStatus = 'placed';
            }
            
            console.log('✅ Calculated unified status for mixed order:', currentStatus);
          }
        } catch (error) {
          console.warn('⚠️ Could not calculate unified status for mixed order:', error);
          // Continue with the original status
        }
      }
    }
    
    console.log('🔍 Order status fields for order', order.orderNumber, ':', {
      'order.status': order.status,
      'order.orderStatus': order.orderStatus,
      'selected currentStatus': currentStatus,
      'applied mapping': !order.orderStatus && order.status ? 'yes' : 'no'
    });

    // Log detailed cart items status for debugging
    console.log('🛒 Cart items status breakdown:');
    (order.cart || []).forEach((item, i) => {
      console.log(`  Item ${i+1}: ${item.name || item.title || 'Unknown'}`);
      console.log(`    - item.status: ${item.status}`);
      console.log(`    - item.vendor: ${item.vendor}`);
      console.log(`    - item.assignedVendor: ${item.assignedVendor}`);
      console.log(`    - item.handledBy: ${item.handledBy}`);
      console.log(`    - raw item:`, {
        name: item.name || item.title,
        status: item.status,
        vendor: item.vendor,
        handledBy: item.handledBy
      });
    });
    
    // Calculate what the overall status should be based on item statuses
    const itemStatuses = (order.cart || []).map(item => item.status || 'placed');
    console.log('📊 Individual item statuses:', itemStatuses);
    
    const statusCounts = itemStatuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    console.log('📈 Status distribution:', statusCounts);
    
    // Prepare detailed response
    const orderDetails = {
      // Basic order information
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      
      // Customer information
      customer: {
        name: order.name,
        email: order.email,
        phone: order.phone,
        address: order.address,
        city: order.city,
        postalCode: order.postalCode
      },
      
      // Order status information
      status: currentStatus, // Use mapped status instead of raw
      orderStatus: currentStatus,
      statusDisplay: currentStatus,
      forwardedToVendors: order.forwardedToVendors || false, // Add forwarding status
      
      // Payment information
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus || 'pending',
      paymentReceipt: order.paymentReceipt, // Add payment receipt path
      
      // Order items with detailed status
      items: (order.cart || []).map(item => {
        // Construct full image URL
        const imageUrl = item.image || item.productId?.image;
        // Don't construct full URLs in the backend, just return the relative path
        const fullImageUrl = imageUrl ? 
          (imageUrl.startsWith('http') ? imageUrl : imageUrl) : 
          null;
          
        return {
          _id: item._id,
          productId: item.productId?._id,
          title: item.title || item.productId?.title,
          image: fullImageUrl,
          price: item.price || item.productId?.price,
          quantity: item.quantity,
          itemTotal: (item.price || 0) * (item.quantity || 0),
          
          // Item status information
          status: item.status || 'placed',
          handledBy: item.handledBy || 'admin',
          assignedVendor: item.assignedVendor ? {
            _id: item.assignedVendor._id,
            name: item.assignedVendor.businessName
          } : null,
          
          // Tracking information
          trackingNumber: item.trackingNumber,
          carrier: item.carrier,
          estimatedDelivery: item.estimatedDelivery,
          
          // Status history
          statusHistory: item.statusHistory || []
        };
      }),
      
      // Order totals
      subtotal: order.subtotal,
      shippingCost: order.shippingCost || 0,
      tax: order.tax || 0,
      totalAmount: order.totalAmount || order.cart?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
      
      // Additional information
      orderType: order.orderType || 'mixed',
      notes: order.notes,
      adminNotes: order.adminNotes
    };

    console.log(`✅ Order details prepared for ${order.orderNumber}`);

    res.json({
      success: true,
      data: orderDetails
    });

  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
};

// User cancel vendor part of mixed order
const cancelVendorPart = async (req, res) => {
  try {
    const vendorOrderId = req.params.vendorOrderId;
    const { reason } = req.body;
    const tokenUser = req.user;

    console.log(`🚫 CANCEL VENDOR PART REQUEST - Starting cancellation process`);
    console.log(`📋 Request Details:`, {
      vendorOrderId,
      reason,
      userInfo: {
        id: tokenUser?.id || tokenUser?.userId,
        email: tokenUser?.email
      }
    });

    if (!tokenUser) {
      console.log(`❌ User not authenticated`);
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

    console.log(`🚫 User ${userEmail} cancelling vendor part ${vendorOrderId}`);

    // Try to find vendor order in both VendorOrder and Order collections
    const VendorOrder = require('../models/VendorOrder');
    let vendorOrder = await VendorOrder.findById(vendorOrderId);
    let isLegacyOrder = false;
    
    console.log(`🔍 Looking for VendorOrder with ID: ${vendorOrderId}`);
    
    if (!vendorOrder) {
      console.log(`📦 VendorOrder not found, checking legacy Order collection...`);
      // Check if it's a legacy vendor part stored as Order
      vendorOrder = await Order.findById(vendorOrderId);
      if (vendorOrder && vendorOrder.partialOrderType === 'vendor_part') {
        isLegacyOrder = true;
        console.log(`📦 Found legacy vendor part: ${vendorOrder.orderNumber}`);
      }
    } else {
      console.log(`📦 Found VendorOrder: ${vendorOrder.orderNumber}`);
    }
    
    if (!vendorOrder) {
      console.log(`❌ No vendor order found with ID: ${vendorOrderId}`);
      return res.status(404).json({
        success: false,
        message: 'Vendor order not found'
      });
    }
    
    console.log(`📊 Vendor Order Details:`, {
      id: vendorOrder._id,
      orderNumber: vendorOrder.orderNumber,
      status: vendorOrder.status,
      totalAmount: vendorOrder.totalAmount,
      commissionAmount: vendorOrder.commissionAmount,
      vendor: vendorOrder.vendor,
      parentOrderId: vendorOrder.parentOrderId,
      isLegacyOrder: isLegacyOrder
    });

    // Get the parent order to verify ownership
    const parentOrder = await Order.findById(vendorOrder.parentOrderId);
    if (!parentOrder || parentOrder.email !== userEmail) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own order parts'
      });
    }

    // Check if vendor order can be cancelled
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'rejected'];
    if (nonCancellableStatuses.includes(vendorOrder.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel vendor part. It has already been ${vendorOrder.status?.toLowerCase()}.`,
        currentStatus: vendorOrder.status
      });
    }

    console.log(`🚫 User ${userEmail} cancelling vendor part ${vendorOrderId}`);

    // Restore stock for cancelled vendor part
    console.log('📦 Restoring stock for cancelled vendor part...');
    
    if (isLegacyOrder) {
      // Legacy order structure - items are in cart array
      for (const item of vendorOrder.cart || []) {
        await StockManager.restoreStock(item.productId || item.product, item.quantity);
        console.log(`📈 Stock restored for ${item.title}: +${item.quantity}`);
      }
    } else {
      // VendorOrder structure - items are in items array
      for (const item of vendorOrder.items || []) {
        await StockManager.restoreStock(item.productId, item.quantity);
        console.log(`📈 Stock restored for ${item.productName || item.title}: +${item.quantity}`);
      }
    }

    // ROBUST COMMISSION REVERSAL - Check if order should have commission
    console.log(`🔍 COMMISSION REVERSAL DEBUG - Starting analysis for order ${vendorOrder._id}`);
    console.log(`📊 Commission Debug Info:`, {
      commissionAmount: vendorOrder.commissionAmount,
      commissionReversed: vendorOrder.commissionReversed,
      totalAmount: vendorOrder.totalAmount,
      vendor: vendorOrder.vendor,
      orderNumber: vendorOrder.orderNumber,
      isForwardedByAdmin: vendorOrder.isForwardedByAdmin,
      forwardedAt: vendorOrder.forwardedAt,
      status: vendorOrder.status,
      isLegacyOrder: isLegacyOrder,
      createdAt: vendorOrder.createdAt
    });
    
    // Calculate what the commission SHOULD be using same logic as commission calculation
    const CommissionConfig = require('../config/commission');
    let shouldHaveCommission = 0;
    
    // Check if commission has already been reversed using dedicated flag
    if (vendorOrder.commissionReversed === true) {
      console.log(`ℹ️ Commission already reversed - commissionReversed flag is true`);
      shouldHaveCommission = 0;
    } else if (vendorOrder.commissionAmount && vendorOrder.commissionAmount > 0) {
      // Explicit commission amount
      shouldHaveCommission = vendorOrder.commissionAmount;
      console.log(`💰 Using explicit commission amount: $${shouldHaveCommission}`);
    } else if (vendorOrder.isForwardedByAdmin || vendorOrder.forwardedAt) {
      // Calculate commission for forwarded orders
      shouldHaveCommission = vendorOrder.totalAmount * CommissionConfig.VENDOR_COMMISSION_RATE;
      console.log(`📈 Calculating commission for forwarded order: $${vendorOrder.totalAmount} * ${CommissionConfig.VENDOR_COMMISSION_RATE} = $${shouldHaveCommission}`);
    } else {
      // Not forwarded, no commission
      console.log(`ℹ️ Order not forwarded - no commission to reverse`);
      shouldHaveCommission = 0;
    }
    
    if (shouldHaveCommission > 0) {
      // Check if commission should be reversed based on order status
      // Commission should only be reversed if order has progressed beyond 'placed' status
      const currentStatus = vendorOrder.status?.toLowerCase() || 'placed';
      const statusesWithCommission = ['processing', 'accepted', 'shipped', 'delivered'];
      
      if (statusesWithCommission.includes(currentStatus)) {
        console.log(`✅ Commission should be reversed: $${shouldHaveCommission} (status: ${currentStatus}) - proceeding with reversal`);
      } else {
        console.log(`ℹ️ Order status '${currentStatus}' - commission not yet paid, skipping reversal`);
        shouldHaveCommission = 0; // Don't reverse commission for orders in 'placed' status
      }
    }
    
    if (shouldHaveCommission > 0) {
      
      const MonthlyCommission = require('../models/MonthlyCommission');
      const orderDate = new Date(vendorOrder.createdAt);
      
      console.log(`💸 Reversing commission for vendor order: $${shouldHaveCommission}`);
      
      // Get vendor ID - handle both VendorOrder and legacy Order schemas
      const vendorId = isLegacyOrder ? vendorOrder.vendor : vendorOrder.vendor;
      console.log(`🏪 Vendor ID for reversal: ${vendorId}`);
      
      if (vendorId) {
        // Remove the transaction from the transactions array and update totals
        // The transaction was created with parentOrderId as orderId and vendorOrder._id as vendorOrderId
        const parentOrderId = vendorOrder.parentOrderId || vendorOrder._id;
        
        console.log(`🔍 Looking for transaction with orderId: ${parentOrderId} and vendorOrderId: ${vendorOrder._id}`);
        console.log(`📅 Commission record search: vendor=${vendorId}, month=${orderDate.getMonth() + 1}, year=${orderDate.getFullYear()}`);
        
        // First, check if the commission record exists
        const existingRecord = await MonthlyCommission.findOne({
          vendor: vendorId, 
          month: orderDate.getMonth() + 1, 
          year: orderDate.getFullYear()
        });
        
        if (existingRecord) {
          console.log(`📋 Found existing commission record:`, {
            totalCommission: existingRecord.totalCommission,
            totalSales: existingRecord.totalSales,
            totalOrders: existingRecord.totalOrders,
            transactionCount: existingRecord.transactions.length
          });
          
          // Check if transaction exists before reversal
          const targetTransaction = existingRecord.transactions.find(t => 
            t.orderId?.toString() === parentOrderId.toString() &&
            t.vendorOrderId?.toString() === vendorOrder._id.toString()
          );
          
          if (targetTransaction) {
            console.log(`🎯 Found target transaction to remove:`, {
              orderId: targetTransaction.orderId,
              vendorOrderId: targetTransaction.vendorOrderId,
              amount: targetTransaction.amount,
              date: targetTransaction.date
            });
          } else {
            console.log(`⚠️ Target transaction NOT found! Looking for:`, {
              expectedOrderId: parentOrderId.toString(),
              expectedVendorOrderId: vendorOrder._id.toString(),
              availableTransactions: existingRecord.transactions.map(t => ({
                orderId: t.orderId?.toString(),
                vendorOrderId: t.vendorOrderId?.toString(),
                amount: t.amount
              }))
            });
          }
        } else {
          console.log(`❌ No commission record found for vendor ${vendorId} in ${orderDate.getMonth() + 1}/${orderDate.getFullYear()}`);
        }
        
        // Use calculated shouldHaveCommission for accurate reversal
        const updateResult = await MonthlyCommission.findOneAndUpdate(
          { vendor: vendorId, month: orderDate.getMonth() + 1, year: orderDate.getFullYear() },
          {
            $pull: { 
              transactions: { 
                orderId: parentOrderId,
                vendorOrderId: vendorOrder._id
              }
            },
            $inc: { 
              totalCommission: -shouldHaveCommission,
              totalSales: -vendorOrder.totalAmount,
              totalOrders: -1
            }
          },
          { new: true }
        );
        
        if (updateResult) {
          console.log(`✅ Commission reversed: $${shouldHaveCommission} for vendor ${vendorId}`);
          console.log(`📊 Updated commission totals: $${updateResult.totalCommission}, pending: $${updateResult.pendingCommission}`);
          
          // Log the transaction removal details
          const remainingTransactions = updateResult.transactions.length;
          console.log(`📋 Transactions after reversal: ${remainingTransactions}`);
          
          // Verify the transaction was actually removed
          const verifyTransaction = updateResult.transactions.find(t => 
            t.orderId?.toString() === parentOrderId.toString() &&
            t.vendorOrderId?.toString() === vendorOrder._id.toString()
          );
          
          if (verifyTransaction) {
            console.log(`❌ ERROR: Transaction still exists after removal attempt!`);
          } else {
            console.log(`✅ Transaction successfully removed from commission record`);
          }
          
          // CRITICAL: Mark commission as reversed using dedicated flag
          vendorOrder.commissionReversed = true;
          console.log(`� VendorOrder commission marked as reversed`);
        } else {
          console.log(`⚠️ No commission record found for vendor ${vendorId} in ${orderDate.getMonth() + 1}/${orderDate.getFullYear()}`);
        }
      } else {
        console.log(`⚠️ No vendor ID found for commission reversal`);
      }
    } else {
      console.log(`ℹ️ No commission to reverse - shouldHaveCommission is $${shouldHaveCommission}`);
    }

    // Update vendor order status
    console.log(`🔄 Updating vendor order status to 'cancelled_by_customer'`);
    vendorOrder.status = 'cancelled_by_customer'; // Use specific status for customer cancellations
    vendorOrder.cancelledAt = new Date();
    vendorOrder.cancellationReason = reason || 'Cancelled by customer';
    vendorOrder.cancelledBy = 'user'; // Track who cancelled it
    await vendorOrder.save();
    
    console.log(`✅ Vendor order status updated successfully:`, {
      orderId: vendorOrder._id,
      newStatus: vendorOrder.status,
      cancelledAt: vendorOrder.cancelledAt
    });

    // Update parent order status after vendor part cancellation
    if (vendorOrder.parentOrderId) {
      console.log(`🔄 Updating parent order status after vendor part cancellation`);
      try {
        const { recalculateParentOrderStatus } = require('./simpleStatusController');
        await recalculateParentOrderStatus(vendorOrder.parentOrderId);
        console.log(`✅ Parent order status recalculated after vendor part cancellation`);
      } catch (parentStatusError) {
        console.error(`❌ Failed to update parent order status:`, parentStatusError);
        // Don't fail the operation, just log the error
      }
    }

    // Send confirmation email
    if (parentOrder.email) {
      await sendEmail(
        parentOrder.email,
        'Order Part Cancelled - International Tijarat',
        `Dear ${parentOrder.name},\n\nThe vendor part of your order #${parentOrder.orderNumber} has been cancelled as requested.\n\nReason: ${reason || 'Cancelled by customer'}\n\nVendor Order ID: ${vendorOrder._id}\n\nIf you have any questions, please contact our customer service.\n\nBest regards,\nInternational Tijarat`
      );
      console.log('📧 Vendor part cancellation confirmation email sent');
    }

    console.log(`✅ CANCEL VENDOR PART COMPLETED successfully for order ${vendorOrderId}`);
    
    // Invalidate order caches to ensure fresh data in order history (asynchronous)
    setImmediate(async () => {
      try {
        const cacheInvalidator = require('../utils/cacheInvalidator');
        await cacheInvalidator.invalidateOrders();
        console.log('🔄 Order caches invalidated after vendor part cancellation');
      } catch (cacheError) {
        console.error('❌ Failed to invalidate order caches after vendor part cancellation:', cacheError);
        // Don't fail the operation, just log the error
      }
    });
    
    res.json({
      success: true,
      message: 'Vendor order part cancelled successfully',
      vendorOrder: {
        _id: vendorOrder._id,
        status: vendorOrder.status,
        cancelledAt: vendorOrder.cancelledAt,
        cancellationReason: vendorOrder.cancellationReason
      }
    });

  } catch (error) {
    console.error('❌ CANCEL VENDOR PART ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel vendor part',
      error: error.message
    });
  }
};

// User cancel admin part of mixed order
const cancelAdminPart = async (req, res) => {
  try {
    const adminOrderId = req.params.adminOrderId;
    const { reason } = req.body;
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

    const adminOrder = await Order.findById(adminOrderId);
    
    if (!adminOrder) {
      return res.status(404).json({
        success: false,
        message: 'Admin order not found'
      });
    }

    // Verify this is an admin part order and user owns it
    if (adminOrder.orderType !== 'admin_only' || adminOrder.partialOrderType !== 'admin_part') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin order part'
      });
    }

    // Check ownership through parent order
    let parentOrder;
    if (adminOrder.parentOrderId) {
      parentOrder = await Order.findById(adminOrder.parentOrderId);
      if (!parentOrder || parentOrder.email !== userEmail) {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel your own order parts'
        });
      }
    } else {
      // Direct admin order
      if (adminOrder.email !== userEmail) {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel your own order parts'
        });
      }
    }

    // Check if admin order can be cancelled
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'rejected'];
    if (nonCancellableStatuses.includes(adminOrder.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel admin part. It has already been ${adminOrder.status?.toLowerCase()}.`,
        currentStatus: adminOrder.status
      });
    }

    console.log(`🚫 User ${userEmail} cancelling admin part ${adminOrderId}`);

    // Restore stock for admin order items
    if (adminOrder.cart && adminOrder.cart.length > 0) {
      console.log('📦 Restoring stock for cancelled admin part...');
      for (const item of adminOrder.cart) {
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

    // Update admin order status
    adminOrder.status = 'cancelled_by_customer'; // Use specific status for customer cancellations
    adminOrder.cancelledAt = new Date();
    adminOrder.cancellationReason = reason || 'Cancelled by customer';
    adminOrder.cancelledBy = 'user';
    await adminOrder.save();

    // Parent order status update disabled during cleanup
    // if (adminOrder.parentOrderId) {
    //   const { updateParentOrderStatus } = require('./mixedOrderController');
    //   await updateParentOrderStatus(adminOrder.parentOrderId);
    // }

    // Send confirmation email
    const orderForEmail = parentOrder || adminOrder;
    if (orderForEmail.email) {
      await sendEmail(
        orderForEmail.email,
        'Order Part Cancelled - International Tijarat',
        `Dear ${orderForEmail.name},\n\nThe admin part of your order #${orderForEmail.orderNumber} has been cancelled as requested.\n\nReason: ${reason || 'Cancelled by customer'}\n\nAdmin Order ID: ${adminOrder._id}\n\nIf you have any questions, please contact our customer service.\n\nBest regards,\nInternational Tijarat`
      );
      console.log('📧 Admin part cancellation confirmation email sent');
    }

    res.json({
      success: true,
      message: 'Admin order part cancelled successfully',
      adminOrder: {
        _id: adminOrder._id,
        status: adminOrder.status,
        cancelledAt: adminOrder.cancelledAt,
        cancellationReason: adminOrder.cancellationReason
      }
    });

  } catch (error) {
    console.error('Error cancelling admin part:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel admin part',
      error: error.message
    });
  }
};

// Cancel specific items in an order (for non-forwarded mixed orders)
const cancelOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemsToCancel } = req.body; // Array of item IDs to cancel

    console.log('🚫 Cancelling specific items:', { orderId, itemsToCancel });

    // Filter out null/undefined item IDs
    const validItemsToCancel = (itemsToCancel || []).filter(id => id !== null && id !== undefined);
    
    if (validItemsToCancel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid item IDs provided for cancellation'
      });
    }

    const order = await Order.findById(orderId).populate('cart.productId').populate('cart.assignedVendor');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is already forwarded
    if (order.forwardedToVendors) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel individual items from forwarded orders. Use vendor-specific cancellation instead.'
      });
    }

    // Mark specified items as cancelled
    order.cart = order.cart.map(item => {
      if (validItemsToCancel.includes(item._id.toString())) {
        return {
          ...item.toObject(),
          status: 'cancelled',
          cancelledAt: new Date()
        };
      }
      return item;
    });

    // Recalculate order status and amounts
    const activeItems = order.cart.filter(item => item.status !== 'cancelled');
    const cancelledItems = order.cart.filter(item => item.status === 'cancelled');

    if (activeItems.length === 0) {
      // All items cancelled - cancel entire order
      order.status = 'cancelled';
      order.orderStatus = 'cancelled'; // Add orderStatus field for consistency
      order.cancelledAt = new Date();
    } else {
      // Partial cancellation - update amounts
      const newTotalAmount = activeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      order.totalAmount = newTotalAmount + order.shippingCost + order.taxAmount - order.discountAmount;
      order.status = 'partial_cancelled';
      order.orderStatus = 'partial_cancelled'; // Add orderStatus field for consistency
    }

    await order.save();

    // Restore stock for cancelled items
    for (const itemId of itemsToCancel) {
      const cancelledItem = order.cart.find(item => item._id.toString() === itemId);
      if (cancelledItem && cancelledItem.productId) {
        await StockManager.restoreStock(cancelledItem.productId._id, cancelledItem.quantity);
      }
    }

    console.log('✅ Items cancelled successfully:', {
      totalItems: order.cart.length,
      cancelledCount: cancelledItems.length,
      activeCount: activeItems.length,
      newStatus: order.status
    });

    res.json({
      success: true,
      message: `Successfully cancelled ${itemsToCancel.length} item(s)`,
      order: {
        _id: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        activeItems: activeItems.length,
        cancelledItems: cancelledItems.length
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

module.exports = {
  createOrder,
  addOrder, // Legacy compatibility
  getAllOrders,
  getOrderById,
  getOrderDetails, // New: Detailed order info for tracking
  // updateOrderStatus, // REMOVED - Status changing disabled
  confirmOrder, // Legacy compatibility
  cancelOrder,
  cancelUserOrder, // New: User can cancel their own orders
  cancelVendorPart, // New: User can cancel vendor parts
  cancelAdminPart, // New: User can cancel admin parts
  cancelOrderItems, // New: Cancel specific items before forwarding
  getOrderStats,
  getUserOrders
};
