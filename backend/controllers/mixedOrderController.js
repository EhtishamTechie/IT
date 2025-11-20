const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const { resolveOrderStatus, mapStatusForFrontend } = require('../utils/orderStatusResolver');

// Helper function to construct proper image URL
const constructImageUrl = (item) => {
  // Try different image sources in order of preference
  let imagePath = null;
  
  if (item.productId?.images && item.productId.images.length > 0) {
    imagePath = item.productId.images[0];
  } else if (item.productId?.image) {
    imagePath = item.productId.image;
  } else if (item.image) {
    imagePath = item.image;
  }
  
  
  if (!imagePath) return null;

  // Ensure the path starts with uploads/ if it's not already a full URL
  if (!imagePath.startsWith('http') && !imagePath.startsWith('uploads/')) {
    imagePath = `uploads/${imagePath}`;
  }

  // console.log('🖼️ Final image path:', imagePath); // Commented out to reduce logs
  return imagePath;
};
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const mongoose = require('mongoose');

// @desc    Split mixed order and forward to respective parties
// @route   POST /api/admin/orders/:orderId/split-and-forward
// @access  Private (Admin)
const splitAndForwardMixedOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const adminId = req.admin?.id || req.user?.id;

    console.log(`🔄 Splitting mixed order: ${orderId}`);

    // Get the original mixed order first
    const originalOrder = await Order.findById(orderId)
      .populate('cart.productId')
      .populate('cart.vendor');

    console.log('📋 Order details:', {
      id: orderId,
      orderNumber: originalOrder?.orderNumber,
      orderType: originalOrder?.orderType,
      status: originalOrder?.status,
      isSplitOrder: originalOrder?.isSplitOrder
    });

    if (!originalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (originalOrder.orderType !== 'mixed') {
      return res.status(400).json({
        success: false,
        message: 'Only mixed orders can be split'
      });
    }

    // Allow splitting if order is placed or processing (case insensitive)
    const allowedStatuses = ['placed', 'pending', 'processing'];
    if (!allowedStatuses.includes(originalOrder.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Cannot split order with status "${originalOrder.status}". Order must be placed, pending, or processing.`,
        currentStatus: originalOrder.status,
        allowedStatuses: allowedStatuses
      });
    }

    // Check if order has already been split
    if (originalOrder.isSplitOrder) {
      return res.status(400).json({
        success: false,
        message: 'Order has already been split'
      });
    }

    // Separate items by vendor and admin
    const adminItems = [];
    const vendorItems = {};
    const vendorBreakdown = new Map();

    originalOrder.cart.forEach(item => {
      if (item.vendor && item.vendor._id) {
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

    // Remove transaction logic for standalone MongoDB
    try {
      const results = {
        originalOrderId: orderId,
        adminOrder: null,
        vendorOrders: [],
        summary: {
          adminItems: adminItems.length,
          vendorOrders: Object.keys(vendorItems).length,
          totalItems: originalOrder.cart.length
        }
      };

      // 1. Create admin-only order if there are admin items
      if (adminItems.length > 0) {
        const adminSubtotal = adminItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const adminOrder = new Order({
          orderNumber: `${originalOrder.orderNumber}-ADMIN`,
          customerName: originalOrder.customerName,
          name: originalOrder.name,
          email: originalOrder.email,
          phone: originalOrder.phone,
          address: originalOrder.address,
          city: originalOrder.city,
          cart: adminItems,
          totalAmount: adminSubtotal,
          paymentMethod: originalOrder.paymentMethod,
          orderType: 'admin_only',
          status: 'processing', // Changed from 'Pending' to 'processing'
          parentOrderId: originalOrder._id,
          isPartialOrder: true,
          partialOrderType: 'admin_part',
          createdAt: new Date(),
          splitFromMixedOrder: true
        });

        await adminOrder.save();
        results.adminOrder = {
          orderId: adminOrder._id,
          orderNumber: adminOrder.orderNumber,
          items: adminItems.length,
          subtotal: adminSubtotal
        };

        console.log(`✅ Created admin order: ${adminOrder.orderNumber}`);
      }

      // 2. Create vendor orders for each vendor
      for (const [vendorId, items] of Object.entries(vendorItems)) {
        const vendorInfo = vendorBreakdown.get(vendorId);
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create VendorOrder
        const vendorOrder = new VendorOrder({
          orderNumber: `${originalOrder.orderNumber}-V${vendorId.slice(-4)}`,
          parentOrderId: originalOrder._id,
          vendor: vendorId,
          customer: {
            name: originalOrder.customerName || originalOrder.name,
            email: originalOrder.email,
            phone: originalOrder.phone,
            address: originalOrder.address,
            city: originalOrder.city
          },
          items: items.map(item => ({
            productId: item.productId._id,
            title: item.productId.title,
            productName: item.productId.title, // Add both for compatibility
            quantity: item.quantity,
            price: item.price,
            image: item.productId.image
          })),
          totalAmount: subtotal,
          status: 'pending',
          paymentStatus: 'paid',
          createdAt: new Date(),
          splitFromMixedOrder: true
        });

        await vendorOrder.save();

        results.vendorOrders.push({
          vendorOrderId: vendorOrder._id,
          vendorId: vendorId,
          vendorName: vendorInfo.vendor.businessName,
          orderNumber: vendorOrder.orderNumber,
          items: items.length,
          subtotal: subtotal
        });

        console.log(`✅ Created vendor order: ${vendorOrder.orderNumber} for ${vendorInfo.vendor.businessName}`);
      }

      // 3. Update original order status to indicate it's been split
      await Order.findByIdAndUpdate(
        orderId,
        {
          status: 'processing', // Keep as processing to indicate it's being handled
          orderSplitStatus: 'split_completed',
          splitAt: new Date(),
          splitBy: adminId,
          isSplitOrder: true
        }
      );

      console.log(`🎉 Mixed order ${originalOrder.orderNumber} successfully split!`);

      res.status(200).json({
        success: true,
        message: 'Mixed order successfully split and forwarded',
        data: results
      });

    } catch (error) {
      console.error('❌ Error splitting mixed order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to split mixed order',
        error: error.message
      });
    }
  } catch (error) {
    console.error('❌ Error splitting mixed order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to split mixed order',
      error: error.message
    });
  }
};

// @desc    Get split order details for customer tracking
// @route   GET /api/orders/:orderId/split-details
// @access  Public (Customer can track their order)
const getSplitOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id; // Support both parameter names

    // Get the main order
    let mainOrder = await Order.findById(orderId)
      .populate('cart.productId')
      .populate('cart.vendor')
      .populate('cart.assignedVendor');
    if (!mainOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('📧 [PAYMENT RECEIPT DEBUG] Order payment fields:', {
      orderId: mainOrder._id,
      orderNumber: mainOrder.orderNumber,
      paymentMethod: mainOrder.paymentMethod,
      paymentReceipt: mainOrder.paymentReceipt,
      hasPaymentReceipt: !!mainOrder.paymentReceipt
    });

    // Calculate shipping cost for older orders that don't have it stored
    console.log('🚢 [SPLIT-DETAILS SHIPPING DEBUG] Order shipping data:', {
      orderId: mainOrder._id,
      orderNumber: mainOrder.orderNumber,
      storedShippingCost: mainOrder.shippingCost,
      storedTotalAmount: mainOrder.totalAmount,
      cartItems: mainOrder.cart?.length || 0,
      hasCartData: !!(mainOrder.cart && mainOrder.cart.length > 0)
    });

    // Ensure shipping cost is properly calculated for display
    if ((!mainOrder.shippingCost || mainOrder.shippingCost === 0) && mainOrder.cart && mainOrder.cart.length > 0) {
      console.log('🚢 [SPLIT-DETAILS] Calculating missing shipping cost for order:', mainOrder.orderNumber);
      
      // Calculate shipping costs from cart items
      const shippingCosts = mainOrder.cart
        .map(item => {
          const productShipping = item.productId?.shipping || item.shipping || 0;
          return Number(productShipping);
        })
        .filter(cost => !isNaN(cost) && cost > 0);

      console.log('🚢 [SPLIT-DETAILS] Item shipping costs:', shippingCosts);

      if (shippingCosts.length > 0) {
        const maxShippingCost = Math.max(...shippingCosts);
        
        // Check if order qualifies for free shipping (10,000 or more)
        const subtotal = mainOrder.cart.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);

        console.log('🚢 [SPLIT-DETAILS] Subtotal calculation:', {
          subtotal,
          maxShippingCost,
          qualifiesForFreeShipping: subtotal >= 10000
        });

        if (subtotal >= 10000) {
          mainOrder.shippingCost = 0; // Free shipping
          console.log('🚢 [SPLIT-DETAILS] Applied free shipping (subtotal >= 10000)');
        } else {
          mainOrder.shippingCost = maxShippingCost;
          console.log('🚢 [SPLIT-DETAILS] Applied max shipping cost:', maxShippingCost);
        }

        // Update totalAmount to include shipping if it doesn't already
        const calculatedTotal = subtotal + mainOrder.shippingCost;
        if (Math.abs(mainOrder.totalAmount - calculatedTotal) > 1) { // Allow for small rounding differences
          console.log('🚢 [SPLIT-DETAILS] Updating totalAmount:', {
            originalTotal: mainOrder.totalAmount,
            calculatedTotal: calculatedTotal,
            subtotal: subtotal,
            shipping: mainOrder.shippingCost
          });
          mainOrder.totalAmount = calculatedTotal;
        }
      }
    }

    console.log('🚢 [SPLIT-DETAILS] Final order totals:', {
      orderNumber: mainOrder.orderNumber,
      shippingCost: mainOrder.shippingCost,
      totalAmount: mainOrder.totalAmount
    });

    console.log('�📋 Main order details:', {
      orderNumber: mainOrder.orderNumber,
      orderType: mainOrder.orderType,
      isSplitOrder: mainOrder.isSplitOrder,
      cartItems: mainOrder.cart?.length || 0,
      status: mainOrder.status,
      cancelled_by_customer: mainOrder.cancelled_by_customer,
      isCancelled: mainOrder.isCancelled,
      _id: mainOrder._id
    });

    // Use robust status resolver to get correct status
    let resolvedOrder;
    console.log(`🔍 [SPLIT DETAILS] About to resolve status for order ${mainOrder.orderNumber} with status: ${mainOrder.status}`);
    
    try {
      resolvedOrder = await resolveOrderStatus(mainOrder);
      
      console.log(`🔍 [SPLIT DETAILS] Status resolution result:`, {
        orderNumber: mainOrder.orderNumber,
        originalStatus: mainOrder.status,
        resolvedStatus: resolvedOrder?.resolvedStatus,
        statusSource: resolvedOrder?.statusSource,
        isNull: resolvedOrder === null
      });
      
      // If resolveOrderStatus returns null (sub-order that should be hidden), 
      // we still need to show it in split-details for customer tracking
      if (resolvedOrder === null) {
        console.log(`🔍 [SPLIT DETAILS] Resolved order is null, using fallback`);
        resolvedOrder = {
          ...mainOrder,
          resolvedStatus: mainOrder.status || 'placed',
          statusSource: 'sub-order'
        };
      }
    } catch (error) {
      console.error('❌ [SPLIT DETAILS] Error resolving order status:', error);
      // Fallback to original order
      resolvedOrder = {
        ...mainOrder,
        resolvedStatus: mainOrder.status || 'placed',
        statusSource: 'fallback'
      };
    }
    
    const mappedStatus = mapStatusForFrontend(resolvedOrder.resolvedStatus);
    
    console.log('🔍 Split-details status resolution for', mainOrder.orderNumber, ':', {
      'original status': mainOrder.status,
      'resolved status': resolvedOrder.resolvedStatus,
      'mapped status': mappedStatus,
      'status source': resolvedOrder.statusSource
    });

    // If this is an admin part order, get the parent order as the main order
    if (mainOrder.partialOrderType === 'admin_part' && mainOrder.parentOrderId) {
      const parentOrder = await Order.findById(mainOrder.parentOrderId);
      if (parentOrder) {
        // For admin part orders, return the resolved status
        const responseData = {
          mainOrder: {
            orderNumber: mainOrder.orderNumber,
            status: mappedStatus, // Use resolved and mapped status
            totalAmount: mainOrder.totalAmount,
            shippingCost: mainOrder.shippingCost, // Include shipping cost
            createdAt: mainOrder.createdAt,
            isSplit: false, // Treat admin part as non-split for display
            customerName: parentOrder.customerName || parentOrder.name,
            email: parentOrder.email,
            phone: parentOrder.phone,
            address: parentOrder.address,
            city: parentOrder.city,
            paymentMethod: parentOrder.paymentMethod,
            paymentReceipt: parentOrder.paymentReceipt
          },
          parts: [],
          isSplit: false,
          originalItems: (mainOrder.cart || []).map(item => ({
            productName: item.productId?.title || item.title,
            quantity: item.quantity,
            selectedSize: item.selectedSize || null,
            price: item.price,
            image: item.productId?.image || item.image,
            subtotal: item.price * item.quantity
          }))
        };

        return res.status(200).json({
          success: true,
          data: responseData
        });
      }
    }

    // Handle different order types
    if (mainOrder.orderType === 'admin_only') {
      console.log('📦 Processing admin-only order');
      
      // Check if this is a sub-order (has parentOrderId)
      let displayOrder = mainOrder;
      let displayStatus = mappedStatus;
      
      if (mainOrder.parentOrderId) {
        // This is a sub-order, get the parent order and resolve its status
        const parentOrder = await Order.findById(mainOrder.parentOrderId);
        if (parentOrder) {
          try {
            const resolvedParent = await resolveOrderStatus(parentOrder);
            if (resolvedParent && resolvedParent.resolvedStatus) {
              displayOrder = parentOrder;
              displayStatus = mapStatusForFrontend(resolvedParent.resolvedStatus);
              console.log(`📊 Using resolved parent order status: ${parentOrder.status} → ${displayStatus} (${resolvedParent.statusSource})`);
            } else {
              // Fallback to parent order status
              displayStatus = mapStatusForFrontend(parentOrder.status || 'placed');
              console.log(`📊 Using fallback parent order status: ${parentOrder.status} → ${displayStatus}`);
            }
          } catch (error) {
            console.error('Error resolving parent order status:', error);
            displayStatus = mapStatusForFrontend(parentOrder.status || 'placed');
          }
        }
      }
      
      // For admin-only orders, use the calculated status
      const responseData = {
        mainOrder: {
          orderNumber: displayOrder.orderNumber,
          status: displayStatus, // Use calculated display status
          totalAmount: displayOrder.totalAmount,
          shippingCost: displayOrder.shippingCost, // Include shipping cost
          createdAt: displayOrder.createdAt,
          isSplit: false,
          customerName: displayOrder.customerName || displayOrder.name,
          email: displayOrder.email,
          phone: displayOrder.phone,
          address: displayOrder.address,
          city: displayOrder.city,
          paymentMethod: displayOrder.paymentMethod,
          paymentReceipt: displayOrder.paymentReceipt
        },
        parts: [],
        isSplit: false,
        originalItems: (mainOrder.cart || []).map(item => ({
          productName: item.productId?.title || item.title || 'Unknown Product',
          quantity: item.quantity,
          selectedSize: item.selectedSize || null,
          price: item.price,
          image: constructImageUrl(item),
          subtotal: item.price * item.quantity,
          status: displayStatus, // Use the resolved display status for all items
          vendor: item.vendor || item.assignedVendor || null // ✅ Include vendor information
        }))
      };

      return res.status(200).json({
        success: true,
        data: responseData
      });
    }

    if (mainOrder.orderType === 'vendor_only') {
      console.log('🏪 Processing vendor-only order');
      
      // Check if this is a sub-order (has parentOrderId)
      let displayOrder = mainOrder;
      let displayStatus = mappedStatus;
      
      if (mainOrder.parentOrderId) {
        // This is a sub-order, get the parent order and resolve its status
        const parentOrder = await Order.findById(mainOrder.parentOrderId);
        if (parentOrder) {
          try {
            const resolvedParent = await resolveOrderStatus(parentOrder);
            if (resolvedParent && resolvedParent.resolvedStatus) {
              displayOrder = parentOrder;
              displayStatus = mapStatusForFrontend(resolvedParent.resolvedStatus);
              console.log(`📊 Using resolved parent order status: ${parentOrder.status} → ${displayStatus} (${resolvedParent.statusSource})`);
            } else {
              // Fallback to parent order status
              displayStatus = mapStatusForFrontend(parentOrder.status || 'placed');
              console.log(`📊 Using fallback parent order status: ${parentOrder.status} → ${displayStatus}`);
            }
          } catch (error) {
            console.error('Error resolving parent order status:', error);
            displayStatus = mapStatusForFrontend(parentOrder.status || 'placed');
          }
        }
      } else {
        // Check for vendor order status if no parent
        const vendorOrder = await VendorOrder.findOne({ parentOrderId: orderId });
        if (vendorOrder) {
          displayStatus = mapStatusForFrontend(vendorOrder.status || 'placed');
          console.log(`📊 Using vendor order status: ${vendorOrder.status} → ${displayStatus}`);
        }
      }
      
      const responseData = {
        mainOrder: {
          orderNumber: displayOrder.orderNumber,
          status: displayStatus, // Use calculated display status
          totalAmount: displayOrder.totalAmount,
          shippingCost: displayOrder.shippingCost, // Include shipping cost
          createdAt: displayOrder.createdAt,
          isSplit: false,
          customerName: displayOrder.customerName || displayOrder.name,
          email: displayOrder.email,
          phone: displayOrder.phone,
          address: displayOrder.address,
          city: displayOrder.city,
          paymentMethod: displayOrder.paymentMethod,
          paymentReceipt: displayOrder.paymentReceipt
        },
        parts: [],
        isSplit: false,
        originalItems: (mainOrder.cart || []).map(item => ({
          productName: item.productId?.title || item.title || 'Unknown Product',
          quantity: item.quantity,
          selectedSize: item.selectedSize || null,
          price: item.price,
          image: constructImageUrl(item),
          subtotal: item.price * item.quantity,
          status: displayStatus, // Use the resolved display status for all items
          vendor: item.vendor || item.assignedVendor || null // ✅ Include vendor information
        }))
      };

      return res.status(200).json({
        success: true,
        data: responseData
      });
    }

    // For mixed orders, check for parts even if isSplitOrder is false (for backwards compatibility)
    let adminPart = null;
    let adminPartOrder = null;
    let vendorParts = [];
    let overallStatus = mainOrder.status; // Use the main order's status as overall status

    // Get admin part
    adminPartOrder = await Order.findOne({
      parentOrderId: orderId,
      orderType: 'admin_only',
      partialOrderType: 'admin_part'
    }).populate('cart.productId');

    if (adminPartOrder) {
      adminPart = {
        status: adminPartOrder.status,
        items: adminPartOrder.cart.map(item => ({
          productName: item.productId?.title || item.title || 'Unknown Product',
          quantity: item.quantity,
          price: item.price,
          image: constructImageUrl(item),
          subtotal: item.price * item.quantity
        }))
      };
    }

    // Get vendor parts with better debugging and deduplication
    // console.log('🔍 Searching for vendor parts with parentOrderId:', orderId);
    
    // Look for vendor parts in VendorOrder collection (new approach)
    const vendorPartOrders = await VendorOrder.find({
      parentOrderId: orderId
    }).populate('vendor', 'businessName email phone');
    
    // console.log('🔍 Found VendorOrder parts:', vendorPartOrders.length);
    
    // ALSO look for legacy Order vendor parts (both collections might have parts)
    const vendorPartOrdersLegacy = await Order.find({
      parentOrderId: orderId,
      orderType: 'vendor_only',
      partialOrderType: 'vendor_part'
    }).populate('vendor', 'businessName email phone').populate('cart.productId');
    
    // console.log('🔍 Found Order vendor parts (legacy):', vendorPartOrdersLegacy.length);
    
    // Combine vendor parts from BOTH collections to ensure we don't miss any
    const allVendorPartsRaw = [...vendorPartOrders, ...vendorPartOrdersLegacy];
    
    // Deduplicate vendor parts by vendor + order number (same logical vendor part can exist in both collections)
    const seenVendorParts = new Set();
    const allVendorParts = allVendorPartsRaw.filter(vendorPart => {
      const vendorId = vendorPart.vendor?._id || vendorPart.vendorId;
      const orderNumber = vendorPart.orderNumber;
      const uniqueKey = `${vendorId}-${orderNumber}`;
      
      if (seenVendorParts.has(uniqueKey)) {
        // Skipping duplicate vendor part
        return false;
      }
      seenVendorParts.add(uniqueKey);
      // Removed verbose vendor part keeping logs
      return true;
    });
    
    // console.log('🔍 Total vendor parts found (before dedup):', allVendorPartsRaw.length);
    // console.log('🔍 Total vendor parts found (after dedup):', allVendorParts.length);
    // Removed verbose vendor parts details logging to reduce noise

    vendorParts = allVendorParts
      .filter(vendorPart => {
        // More lenient filtering - include all vendor parts that have valid data
        const hasVendorData = vendorPart.vendor || vendorPart.vendorId || vendorPart.vendorName;
        const hasItemData = vendorPart.items || vendorPart.cart;
        const isValid = hasVendorData && hasItemData;
        
        // Removed verbose filtering logs to reduce noise
        
        return isValid;
      })
      .map(vendorPart => {
        // Removed verbose mapping logs to reduce noise
        
        // Handle both VendorOrder and Order schemas
        if (vendorPart.items) {
          // VendorOrder schema
          const result = {
            _id: vendorPart._id,
            status: vendorPart.status,
            vendorName: vendorPart.vendor?.businessName || vendorPart.vendorName || 'Unknown Vendor',
            vendor: {
              businessName: vendorPart.vendor?.businessName || vendorPart.vendorName || 'Unknown Vendor',
              email: vendorPart.vendor?.email || '',
              phone: vendorPart.vendor?.phone || ''
            },
            items: vendorPart.items.map(item => ({
              productName: item.productName || item.title,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              subtotal: item.price * item.quantity
            }))
          };
          console.log('✅ Mapped VendorOrder part:', result.vendorName);
          return result;
        } else {
          // Order schema (legacy vendor parts)
          const result = {
            _id: vendorPart._id,
            status: vendorPart.status,
            vendorName: vendorPart.vendor?.businessName || 'Unknown Vendor',
            vendor: {
              businessName: vendorPart.vendor?.businessName || 'Unknown Vendor',
              email: vendorPart.vendor?.email || '',
              phone: vendorPart.vendor?.phone || ''
            },
            items: (vendorPart.cart || []).map(item => ({
              productName: item.productId?.title || item.title || 'Unknown Product',
              quantity: item.quantity,
              price: item.price,
              image: constructImageUrl(item),
              subtotal: item.price * item.quantity
            }))
          };
          console.log('✅ Mapped Order part:', result.vendorName);
          return result;
        }
      });

    // Determine if order is actually split (has parts) regardless of flag
    const actuallyHasParts = adminPart || vendorParts.length > 0;

    // Calculate overall status based on all parts
    const calculateOverallStatus = () => {
      // For mixed orders that have been forwarded to vendors, check vendor order statuses
      if (vendorParts.length > 0) {
        console.log('✅ Mixed order with vendor parts - calculating unified status');
        
        const allStatuses = [];
        
        // Add admin part status if exists
        if (adminPart) {
          allStatuses.push(adminPart.status);
        }
        
        // Add vendor part statuses  
        vendorParts.forEach(part => {
          allStatuses.push(part.status);
        });

        console.log('🔍 Status calculation debug for mixed order with vendor parts:', {
          allStatuses,
          adminPart: adminPart?.status,
          vendorStatuses: vendorParts.map(p => p.status)
        });

        // Filter out cancelled orders from calculation (they don't affect fulfillment)
        const activeStatuses = allStatuses.filter(status => 
          !['cancelled', 'cancelled_by_customer', 'cancelled_by_user', 'rejected'].includes(status)
        );

        console.log('🔍 Active statuses (excluding cancelled):', activeStatuses);

        // If no active orders (all cancelled), order should be cancelled
        if (activeStatuses.length === 0) {
          console.log('✅ Calculated status: cancelled (all parts cancelled)');
          return 'cancelled';
        }

        // Apply priority-based status logic for active parts (highest priority wins)
        if (activeStatuses.every(status => status === 'delivered')) {
          console.log('✅ Calculated status: delivered (all active parts delivered)');
          return 'delivered';
        }
        if (activeStatuses.every(status => ['shipped', 'delivered'].includes(status))) {
          console.log('✅ Calculated status: shipped (all active parts shipped or delivered)');
          return 'shipped';
        }
        if (activeStatuses.every(status => ['processing', 'shipped', 'delivered'].includes(status))) {
          console.log('✅ Calculated status: processing (all active parts processing or better)');
          return 'processing';
        }
        
        // Mixed statuses - use the lowest (most restrictive) active status
        if (activeStatuses.some(status => status === 'placed')) {
          console.log('✅ Calculated status: placed (some active parts still placed)');
          return 'placed';
        }
        
        console.log('✅ Calculated status: fallback to placed (default)');
        return 'placed'; // Default fallback
      }
      
      // For all non-split orders, use the actual main order status
      console.log('✅ Non-split order - using actual main order status:', mainOrder.status);
      return mainOrder.status; // Use actual order status
    };

    // Calculate the correct overall status for mixed orders
    const calculatedOverallStatus = actuallyHasParts ? calculateOverallStatus() : mappedStatus;
    console.log('✅ [SPLIT-DETAILS] Final overall status:', {
      actuallyHasParts,
      calculatedStatus: calculatedOverallStatus,
      rawDBStatus: mainOrder.status,
      resolvedStatus: mappedStatus,
      statusSource: actuallyHasParts ? 'calculated-from-parts' : 'status-resolver'
    });

    // Format parts for frontend compatibility
    const parts = [];
    
    // Add admin part
    if (adminPart) {
      parts.push({
        id: adminPartOrder._id, // Add the admin order ID for cancellation
        type: 'admin',
        orderNumber: `${mainOrder.orderNumber}-ADMIN`,
        status: adminPart.status,
        isCancellable: ['placed', 'processing', 'confirmed'].includes(adminPart.status?.toLowerCase()),
        subtotal: adminPart.items.reduce((sum, item) => sum + item.subtotal, 0),
        items: adminPart.items.map((item, index) => {
          // Find the corresponding cart item from the main order to get its status
          const originalCartItem = mainOrder.cart.find(cartItem => 
            (cartItem.productId?._id?.toString() === item.productName || 
             cartItem.productId?.title === item.productName ||
             cartItem.title === item.productName) &&
            cartItem.quantity === item.quantity &&
            cartItem.price === item.price
          );
          
          return {
            productName: item.productName,
            quantity: item.quantity,
            selectedSize: originalCartItem?.selectedSize || item.selectedSize || null,
            price: item.price,
            image: item.image,
            subtotal: item.subtotal,
            status: originalCartItem?.status || adminPart.status || 'processing' // Use individual item status if available
          };
        })
      });
    }

    // Add vendor parts
    vendorParts.forEach(vendorPart => {
      console.log('🔄 Adding vendor part to response:', {
        id: vendorPart._id,
        vendorName: vendorPart.vendorName,
        status: vendorPart.status,
        itemCount: vendorPart.items?.length || 0
      });
      
      parts.push({
        id: vendorPart._id, // Add the vendor order ID for cancellation
        type: 'vendor',
        orderNumber: `${mainOrder.orderNumber}-V${vendorPart.vendorName?.slice(0,4) || 'VNDR'}`,
        status: vendorPart.status,
        isCancellable: ['placed', 'processing', 'accepted'].includes(vendorPart.status?.toLowerCase()),
        vendorName: vendorPart.vendorName,
        vendorContact: {
          email: vendorPart.vendor?.email || '',
          phone: vendorPart.vendor?.phone || ''
        },
        subtotal: vendorPart.items.reduce((sum, item) => sum + item.subtotal, 0),
        items: vendorPart.items.map((item, index) => {
          // Find the corresponding cart item from the main order to get its status
          const originalCartItem = mainOrder.cart.find(cartItem => 
            (cartItem.productId?._id?.toString() === item.productName || 
             cartItem.productId?.title === item.productName ||
             cartItem.title === item.productName) &&
            cartItem.quantity === item.quantity &&
            cartItem.price === item.price
          );
          
          return {
            productName: item.productName,
            quantity: item.quantity,
            selectedSize: originalCartItem?.selectedSize || item.selectedSize || null,
            price: item.price,
            image: item.image,
            subtotal: item.subtotal,
            status: originalCartItem?.status || vendorPart.status || 'processing' // Use individual item status if available
          };
        })
      });
    });

    // Format response to match OrderTracking.jsx expectations
    const responseData = {
      mainOrder: {
        orderNumber: mainOrder.orderNumber,
        status: calculatedOverallStatus,
        totalAmount: mainOrder.totalAmount,
        shippingCost: mainOrder.shippingCost, // Include shipping cost
        createdAt: mainOrder.createdAt,
        isSplit: actuallyHasParts, // Use actual parts detection instead of flag
        // Add customer details for non-split orders
        customerName: mainOrder.customerName || mainOrder.name,
        email: mainOrder.email,
        phone: mainOrder.phone,
        address: mainOrder.address,
        city: mainOrder.city,
        paymentMethod: mainOrder.paymentMethod,
        paymentReceipt: mainOrder.paymentReceipt
      },
      parts: parts,
      isSplit: actuallyHasParts, // Use actual parts detection instead of flag
      // Always include the original items from the main order for display
      originalItems: (mainOrder.cart || []).map(item => {
        // For mixed orders, we should show sub-order level status, not individual item status
        let itemActualStatus = item.status || 'placed'; // Default to item's original status
        let itemVendor = null;
        const itemName = item.productId?.title || item.title || 'Unknown Product';
        
        // console.log(`🔍 Processing item: "${itemName}" (qty: ${item.quantity}, price: ${item.price})`);
        
        // Check if this item belongs to admin part (no vendor assigned)
        const isAdminItem = !item.vendor && !item.assignedVendor;
        
        if (isAdminItem && adminPart) {
          // This is an admin item - use admin part status
          itemActualStatus = adminPart.status;
          // console.log(`🔍 Item "${itemName}" is admin item, using admin part status: ${adminPart.status}`);
        } else {
          // This might be a vendor item - try to match with vendor parts
          for (const vendorPart of vendorParts) {
            // console.log(`🔍 Checking vendor part: ${vendorPart.vendor?.businessName} (status: ${vendorPart.status})`);
            // console.log(`🔍 Vendor part items:`, vendorPart.items.map(vi => `${vi.productName || vi.title || 'unnamed'} (qty: ${vi.quantity}, price: ${vi.price})`));
            
            const matchingVendorItem = vendorPart.items.find(vItem => {
              // Try multiple matching strategies
              const vendorItemName = vItem.productName || vItem.title || '';
              const priceMatch = vItem.price === item.price;
              const quantityMatch = vItem.quantity === item.quantity;
              
              // Strategy 1: Exact name match
              const nameMatch = vendorItemName === itemName;
              
              // Strategy 2: If vendor item name is undefined/empty, match by price + quantity
              const fallbackMatch = (!vendorItemName || vendorItemName === 'undefined') && priceMatch && quantityMatch;
              
              const matches = (nameMatch && priceMatch && quantityMatch) || fallbackMatch;
              
              // console.log(`🔍 Comparing "${vendorItemName}" vs "${itemName}" (price: ${vItem.price}=${item.price}, qty: ${vItem.quantity}=${item.quantity}): ${matches}`);
              return matches;
            });
            
            if (matchingVendorItem) {
              itemActualStatus = vendorPart.status; // Use vendor part status
              itemVendor = vendorPart.vendor?.businessName;
              console.log(`✅ Item "${itemName}" matched to vendor part "${vendorPart.vendor?.businessName}" with status: ${vendorPart.status}`);
              break;
            }
          }
          
          // If no vendor part found but this item has a vendor assigned, it hasn't been forwarded yet
          if (!itemVendor && (item.vendor || item.assignedVendor)) {
            // Keep original item status (likely 'placed') until vendor part is created
            itemActualStatus = item.status || 'placed';
            console.log(`🔍 Item "${itemName}" has vendor assigned but no vendor part found, keeping original status: ${itemActualStatus}`);
          }
        }
        
        return {
          productName: item.productId?.title || item.title || 'Unknown Product',
          quantity: item.quantity,
          selectedSize: item.selectedSize || null,
          price: item.price,
          image: constructImageUrl(item),
          subtotal: item.price * item.quantity,
          status: itemActualStatus, // Use the determined sub-order status
          vendor: itemVendor || item.vendor || item.assignedVendor || null,
          isAdminItem: isAdminItem // ✅ Flag to identify admin vs vendor items
        };
      })
    };

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error getting split order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order details',
      error: error.message
    });
  }
};

// ALL STATUS-RELATED FUNCTIONS REMOVED FOR CLEAN REBUILD
// updateParentOrderStatus function removed - status propagation disabled

module.exports = {
  splitAndForwardMixedOrder,
  getSplitOrderDetails
  // updateParentOrderStatus removed - status changes disabled
};
