/**
 * Order Status Resolver Utility
 * Handles proper status resolution for all order types
 */

const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');

/**
 * Resolve the actual status for an order based on its type and sub-orders
 */
async function resolveOrderStatus(order) {
  const startTime = Date.now();
  
  try {
    // Removed verbose logging - only essential logs remain

    // If this is a sub-order (has parentOrderId), we should not show it directly to customers
    if (order.parentOrderId) {
      return null; // Indicate this order should be filtered out
    }

    // Handle mixed orders with the old proven logic
    if (order.orderType === 'mixed' || order.isSplitOrder) {
      const result = await resolveMixedOrderStatus(order);
      return result;
    }

    // Handle admin-only and vendor-only orders with new logic
    const result = await resolveSimpleOrderStatus(order);
    const endTime = Date.now();
    console.log(`⚡ Simple order status resolved in ${endTime - startTime}ms for ${order.orderNumber}`);
    return result;

  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ Error resolving status for order ${order.orderNumber} after ${endTime - startTime}ms:`, {
      error: error.message,
      orderType: order.orderType,
      hasSubOrders: order.hasSubOrders,
      currentStatus: order.status
    });
    return {
      ...(order.toObject ? order.toObject() : order),
      resolvedStatus: order.status,
      statusSource: 'error-fallback',
      processingTime: endTime - startTime
    };
  }
}

/**
 * Resolve status for mixed orders using the old proven logic
 */
async function resolveMixedOrderStatus(order) {
  try {
    // Removed verbose logging - only essential logs remain
    
    // Get admin part
    const adminPart = await Order.findOne({
      parentOrderId: order._id,
      orderType: 'admin_only',
      partialOrderType: 'admin_part'
    });
    
    // Get vendor parts (forwarded orders) - check both VendorOrder and legacy Order collections
    const vendorParts = await VendorOrder.find({
      parentOrderId: order._id
      // Remove splitFromMixedOrder filter to find all vendor parts for this parent order
    });
    
    // Also check for legacy vendor orders in Order collection
    const legacyVendorParts = await Order.find({
      parentOrderId: order._id,
      orderType: { $in: ['vendor_only', 'vendor_part'] }
    });
    
    // Combine both types of vendor parts
    const allVendorParts = [...vendorParts, ...legacyVendorParts];
    
    console.log(`🔍 [MIXED ORDER STATUS] Vendor parts found: ${vendorParts.length} in VendorOrder, ${legacyVendorParts.length} legacy in Order`);
    allVendorParts.forEach((vp, index) => {
      console.log(`🔍 [MIXED ORDER STATUS] Vendor part ${index + 1}:`, {
        id: vp._id,
        orderNumber: vp.orderNumber,
        status: vp.status,
        vendorName: vp.vendorName || vp.vendor,
        isLegacy: !vp.vendorName, // VendorOrder has vendorName, Order doesn't
        splitFromMixedOrder: vp.splitFromMixedOrder
      });
    });
    
    console.log('🔍 [MIXED ORDER STATUS] Mixed order parts summary:', {
      adminPart: adminPart ? `${adminPart.orderNumber} (${adminPart.status})` : 'none',
      vendorParts: allVendorParts.length,
      vendorPartStatuses: allVendorParts.map(vp => `${vp.orderNumber} (${vp.status})`)
    });
    
    // 🚨 AUTO-FIX: Check for inconsistent state in mixed orders too
    const mainOrderCancelled = ['cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(order.status) || 
                               order.cancelled_by_customer === true || 
                               order.cancelled_by_user === true ||
                               order.isCancelled === true;
    const hasNonCancelledVendorParts = allVendorParts.some(vp => 
      !['cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(vp.status)
    );
    
    console.log(`🔍 [MIXED ORDER STATUS] Auto-fix check:`, {
      orderNumber: order.orderNumber,
      status: order.status,
      cancelled_by_customer: order.cancelled_by_customer,
      cancelled_by_user: order.cancelled_by_user,
      isCancelled: order.isCancelled,
      mainOrderCancelled: mainOrderCancelled,
      hasNonCancelledVendorParts: hasNonCancelledVendorParts
    });
    
    if (mainOrderCancelled && hasNonCancelledVendorParts) {
      console.log(`🚨 [MIXED ORDER STATUS] INCONSISTENT STATE DETECTED! Main order is cancelled but vendor parts are not cancelled`);
      console.log(`🔧 [MIXED ORDER STATUS] Auto-fixing vendor part statuses...`);
      
      // Fix the inconsistent vendor parts
      for (const vendorPart of allVendorParts) {
        if (!['cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(vendorPart.status)) {
          console.log(`🔧 [MIXED ORDER STATUS] Updating vendor part ${vendorPart.orderNumber} from ${vendorPart.status} to cancelled_by_customer`);
          
          try {
            // COMMISSION REVERSAL
            console.log(`💸 [MIXED ORDER STATUS] Checking commission reversal for vendor part ${vendorPart.orderNumber}`);
            console.log(`💸 [MIXED ORDER STATUS] Commission details:`, {
              commissionAmount: vendorPart.commissionAmount,
              commissionReversed: vendorPart.commissionReversed,
              vendor: vendorPart.vendor,
              totalAmount: vendorPart.totalAmount
            });
            
            if (vendorPart.commissionAmount > 0 && !vendorPart.commissionReversed) {
              console.log(`💸 [MIXED ORDER STATUS] Reversing commission: $${vendorPart.commissionAmount} for vendor ${vendorPart.vendor}`);
              
              const MonthlyCommission = require('../models/MonthlyCommission');
              const orderDate = new Date(vendorPart.createdAt);
              const parentOrderId = vendorPart.parentOrderId || vendorPart._id;
              
              console.log(`💸 [MIXED ORDER STATUS] Commission reversal details:`, {
                vendor: vendorPart.vendor,
                month: orderDate.getMonth() + 1,
                year: orderDate.getFullYear(),
                commissionAmount: vendorPart.commissionAmount,
                parentOrderId: parentOrderId,
                vendorOrderId: vendorPart._id
              });
              
              // Remove commission transaction and update totals
              const updateResult = await MonthlyCommission.findOneAndUpdate(
                { vendor: vendorPart.vendor, month: orderDate.getMonth() + 1, year: orderDate.getFullYear() },
                {
                  $pull: { 
                    transactions: { 
                      orderId: parentOrderId,
                      vendorOrderId: vendorPart._id
                    }
                  },
                  $inc: { 
                    totalCommission: -vendorPart.commissionAmount,
                    totalSales: -vendorPart.totalAmount,
                    totalOrders: -1
                  }
                },
                { new: true }
              );
              
              if (updateResult) {
                console.log(`✅ [MIXED ORDER STATUS] Commission reversed: $${vendorPart.commissionAmount} for vendor ${vendorPart.vendor}`);
                console.log(`✅ [MIXED ORDER STATUS] Updated commission record:`, {
                  vendor: updateResult.vendor,
                  totalCommission: updateResult.totalCommission,
                  totalSales: updateResult.totalSales,
                  totalOrders: updateResult.totalOrders
                });
              } else {
                console.log(`⚠️ [MIXED ORDER STATUS] No commission record found for vendor ${vendorPart.vendor}`);
              }
            } else if (vendorPart.commissionReversed) {
              console.log(`⚠️ [MIXED ORDER STATUS] Commission already reversed for vendor part ${vendorPart.orderNumber} - SKIPPING REVERSAL`);
            } else {
              console.log(`ℹ️ [MIXED ORDER STATUS] No commission to reverse for vendor part ${vendorPart.orderNumber} (amount: ${vendorPart.commissionAmount})`);
            }
            
            // Update vendor part status
            await VendorOrder.findByIdAndUpdate(vendorPart._id, {
              status: 'cancelled_by_customer',
              cancelledAt: new Date(),
              cancelledBy: 'system_sync',
              cancellationReason: 'Auto-synced with main order status',
              commissionReversed: true
            });
            
            // STOCK REVERSAL
            console.log(`📦 [MIXED ORDER STATUS] Checking stock reversal for vendor part ${vendorPart.orderNumber}`);
            try {
              const StockManager = require('../services/StockManager');
              const stockReleaseResult = await StockManager.releaseStock(vendorPart._id);
              console.log(`📦 [MIXED ORDER STATUS] Stock release result:`, stockReleaseResult);
            } catch (stockError) {
              console.error(`❌ [MIXED ORDER STATUS] Stock release failed for vendor part ${vendorPart.orderNumber}:`, stockError);
            }
            
            // Update the in-memory object for immediate calculation
            vendorPart.status = 'cancelled_by_customer';
            vendorPart.commissionReversed = true;
            console.log(`✅ [MIXED ORDER STATUS] Fixed vendor part ${vendorPart.orderNumber} status with commission and stock reversal`);
          } catch (error) {
            console.error(`❌ [MIXED ORDER STATUS] Failed to fix vendor part ${vendorPart.orderNumber}:`, error);
          }
        }
      }
    }
    
    // Determine if order has been split
    const actuallyHasParts = adminPart || allVendorParts.length > 0;
    console.log('🔍 [MIXED ORDER STATUS] Actually has parts:', actuallyHasParts);
    
    if (!actuallyHasParts) {
      // Order hasn't been split yet, use main order status
      console.log('📋 [MIXED ORDER STATUS] Order not split yet, using main order status:', order.status);
      return {
        ...(order.toObject ? order.toObject() : order),
        resolvedStatus: order.status || 'placed',
        statusSource: 'main-order-not-split',
        subOrderCount: 0,
        vendorOrderCount: 0,
        allSubStatuses: []
      };
    }
    
    // Order has been split, calculate from parts
    const allStatuses = [];
    console.log('🔍 [MIXED ORDER STATUS] Order has been split, calculating from parts...');
    
    // Add admin part status if exists
    if (adminPart && adminPart.status) {
      allStatuses.push(adminPart.status);
      console.log('📋 [MIXED ORDER STATUS] Added admin part status:', adminPart.status);
    }
    
    // Add vendor part statuses if they exist
    if (allVendorParts && allVendorParts.length > 0) {
      allVendorParts.forEach((vp, index) => {
        if (vp.status) {
          allStatuses.push(vp.status);
          console.log(`📋 [MIXED ORDER STATUS] Added vendor part ${index + 1} status:`, vp.status);
        }
      });
    }
    
    // Always check for vendor items that haven't been matched to any vendor part
    // BUT ONLY if there are NO vendor parts for this order at all
    // If vendor parts exist, they should represent all vendor items, so we don't double-count
    if (order.cart && order.cart.length > 0 && allVendorParts.length === 0) {
      console.log(`🔍 [MIXED ORDER STATUS] No vendor parts found, checking for unmatched vendor items in main cart`);
      const unmatchedVendorItems = order.cart.filter(item => {
        if (!item.vendor && !item.assignedVendor) {
          return false; // Not a vendor item
        }
        console.log(`🔍 [MIXED ORDER STATUS] Found vendor item in main cart: "${item.title}" - vendor: ${item.vendor}`);
        return true; // This is a vendor item that should be included since no vendor parts exist
      });
      
      if (unmatchedVendorItems.length > 0) {
        console.log(`⚠️ [MIXED ORDER STATUS] Found ${unmatchedVendorItems.length} vendor items in main cart (no vendor parts exist)`);
        // Add status for each vendor item from main cart
        unmatchedVendorItems.forEach(item => {
          const itemStatus = item.status || 'placed';
          allStatuses.push(itemStatus);
          console.log(`📋 [MIXED ORDER STATUS] Added vendor item from main cart "${item.title || item.productId?.title}" status:`, itemStatus);
        });
      } else {
        console.log(`✅ [MIXED ORDER STATUS] No vendor items found in main cart`);
      }
    } else if (allVendorParts.length > 0) {
      console.log(`✅ [MIXED ORDER STATUS] Vendor parts exist (${allVendorParts.length}), ignoring vendor items from main cart to avoid double-counting`);
    } else {
      console.log(`✅ [MIXED ORDER STATUS] No cart items to check`);
    }
    
    console.log('🔍 [MIXED ORDER STATUS] All collected statuses:', allStatuses);
    
    // 🚨 CRITICAL FIX: Check if ALL parts are cancelled - if so, order is cancelled
    const allCancelledStatuses = ['cancelled', 'cancelled_by_customer', 'cancelled_by_user', 'rejected'];
    const allAreCancelled = allStatuses.length > 0 && allStatuses.every(status => allCancelledStatuses.includes(status));
    
    if (allAreCancelled) {
      // If all parts are cancelled, determine the most specific cancellation reason
      const cancellationStatus = allStatuses.includes('cancelled_by_customer') 
        ? 'cancelled_by_customer' 
        : allStatuses.includes('cancelled_by_user')
        ? 'cancelled_by_user'
        : allStatuses.includes('rejected')
        ? 'rejected'
        : 'cancelled';
        
      console.log('🚫 [MIXED ORDER STATUS] All parts cancelled → using cancellation status:', cancellationStatus);
      
      const result = {
        ...(order.toObject ? order.toObject() : order),
        status: cancellationStatus,
        resolvedStatus: cancellationStatus,
        statusDisplay: cancellationStatus,
        unifiedStatus: cancellationStatus,
        statusSource: 'all-parts-cancelled',
        subOrderCount: (adminPart ? 1 : 0) + allVendorParts.length,
        vendorOrderCount: allVendorParts.length,
        allSubStatuses: allStatuses,
        canCustomerCancel: false,
        canAdminChange: cancellationStatus !== 'cancelled_by_customer'
      };
      
      return result;
    }
    
    // Filter out cancelled orders from status calculation for mixed fulfillment
    // Cancelled orders don't contribute to fulfillment, so we calculate based on active orders only
    const activeStatuses = allStatuses.filter(status => !allCancelledStatuses.includes(status));
    
    console.log('📊 [MIXED ORDER STATUS] Active statuses (excluding cancelled):', activeStatuses);
    console.log('📊 [MIXED ORDER STATUS] Starting priority-based calculation...');
    
    // Normalize status names for consistent comparison
    const normalizeStatus = (status) => {
      const statusMap = {
        // Admin statuses (capitalized)
        'Pending': 'placed',
        'Confirmed': 'processing', 
        'Shipped': 'shipped',
        'Delivered': 'delivered',
        'Cancelled': 'cancelled',
        
        // Vendor statuses (lowercase)
        'pending': 'placed',
        'accepted': 'processing',
        'shipped': 'shipped', 
        'delivered': 'delivered',
        'rejected': 'cancelled',
        
        // Already normalized
        'placed': 'placed',
        'processing': 'processing',
        'cancelled': 'cancelled'
      };
      return statusMap[status] || status.toLowerCase();
    };
    
    // Normalize all active statuses
    const normalizedStatuses = activeStatuses.map(normalizeStatus);
    console.log('📊 [MIXED ORDER STATUS] Normalized statuses:', normalizedStatuses);
    
    // Apply priority-based status calculation - FIXED LOGIC
    let calculatedStatus;
    
    // If no active orders (all cancelled), order should be cancelled
    if (normalizedStatuses.length === 0) {
      calculatedStatus = 'cancelled';
      console.log('🎯 [MIXED ORDER STATUS] All parts cancelled → CANCELLED');
    } else if (normalizedStatuses.every(status => status === 'delivered')) {
      calculatedStatus = 'delivered';
      console.log('🎯 [MIXED ORDER STATUS] All active parts delivered → DELIVERED');
    } else if (normalizedStatuses.every(status => ['delivered', 'shipped'].includes(status))) {
      calculatedStatus = 'shipped';
      console.log('🎯 [MIXED ORDER STATUS] All active parts shipped or delivered → SHIPPED');
    } else if (normalizedStatuses.every(status => ['delivered', 'shipped', 'processing'].includes(status))) {
      calculatedStatus = 'processing';
      console.log('🎯 [MIXED ORDER STATUS] All active parts processing or better → PROCESSING');
    } else {
      // Mixed active statuses - use the lowest status (most restrictive)
      if (normalizedStatuses.some(status => status === 'placed')) {
        calculatedStatus = 'placed';
        console.log('🎯 [MIXED ORDER STATUS] Some active parts still placed → PLACED');
      } else if (normalizedStatuses.some(status => status === 'processing')) {
        calculatedStatus = 'processing';
        console.log('🎯 [MIXED ORDER STATUS] Mixed active statuses with processing → PROCESSING');
      } else {
        calculatedStatus = 'placed';
        console.log('🎯 [MIXED ORDER STATUS] Default fallback → PLACED');
      }
    }
    
    console.log('✅ [MIXED ORDER STATUS] Final calculated status:', calculatedStatus);
    console.log('✅ [MIXED ORDER STATUS] Status details:', {
      orderNumber: order.orderNumber,
      originalStatus: order.status,
      resolvedStatus: calculatedStatus,
      statusSource: 'mixed-order-calculated',
      allSubStatuses: allStatuses,
      activeSubStatuses: activeStatuses,
      subOrderCount: (adminPart ? 1 : 0) + allVendorParts.length
    });

    const result = {
      ...(order.toObject ? order.toObject() : order),
      status: calculatedStatus,               // Consistent field name
      resolvedStatus: calculatedStatus,       // For backward compatibility
      statusDisplay: calculatedStatus,        // For frontend
      unifiedStatus: calculatedStatus,        // For mixed orders
      statusSource: 'mixed-order-calculated',
      subOrderCount: (adminPart ? 1 : 0) + allVendorParts.length,
      vendorOrderCount: allVendorParts.length,
      allSubStatuses: allStatuses,
      // Add cancel permissions for frontend
      canCustomerCancel: !['delivered', 'cancelled', 'cancelled_by_customer'].includes(calculatedStatus),
      canAdminChange: calculatedStatus !== 'cancelled_by_customer'
    };
    
    return result;

  } catch (error) {
    console.error(`❌ Error calculating mixed order status for ${order.orderNumber}:`, error);
    console.error('❌ Error details:', {
      orderType: order.orderType,
      isSplitOrder: order.isSplitOrder,
      hasParentOrderId: !!order.parentOrderId,
      currentStatus: order.status
    });
    return {
      ...(order.toObject ? order.toObject() : order),
      status: order.status || 'placed',                 // Consistent field name
      resolvedStatus: order.status || 'placed',         // For backward compatibility
      statusDisplay: order.status || 'placed',          // For frontend
      unifiedStatus: order.status || 'placed',          // For mixed orders
      statusSource: 'mixed-order-fallback',
      canCustomerCancel: true,
      canAdminChange: true,
      error: 'Status calculation failed'
    };
  }
}

/**
 * Resolve status for simple orders (admin-only, vendor-only) using new logic
 */
async function resolveSimpleOrderStatus(order) {
  console.log(`🔍 [STATUS RESOLVER] Starting resolveSimpleOrderStatus for ${order.orderNumber}`);
  console.log(`📋 [STATUS RESOLVER] Order details:`, {
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    _id: order._id
  });
  
  // Check if this order has sub-orders
  const subOrders = await Order.find({ 
    parentOrderId: order._id,
    $or: [
      { partialOrderType: 'admin_part' },
      { partialOrderType: 'vendor_part' }
    ]
  });

  const vendorOrders = await VendorOrder.find({ 
    parentOrderId: order._id 
  });

  console.log(`📊 [STATUS RESOLVER] Found ${subOrders.length} sub-orders and ${vendorOrders.length} vendor orders`);
  
  // Also check for vendor orders by parentOrderNumber
  const vendorOrdersByNumber = await VendorOrder.find({ 
    parentOrderNumber: order.orderNumber 
  });
  
  console.log(`📊 [STATUS RESOLVER] Found ${vendorOrdersByNumber.length} vendor orders by parentOrderNumber`);
  
  // Combine all vendor orders and remove duplicates
  const allVendorOrders = [...vendorOrders];
  vendorOrdersByNumber.forEach(vo => {
    if (!allVendorOrders.find(existing => existing._id.toString() === vo._id.toString())) {
      allVendorOrders.push(vo);
    }
  });
  
  console.log(`📊 [STATUS RESOLVER] Total unique vendor orders: ${allVendorOrders.length}`);
  
  if (allVendorOrders.length > 0) {
    console.log(`🏪 [STATUS RESOLVER] Vendor orders details:`);
    allVendorOrders.forEach((vo, index) => {
      console.log(`  ${index + 1}. ${vo.orderNumber}: status=${vo.status}, vendor=${vo.vendor}`);
    });
  }

  // If no sub-orders, return the order as-is
  if (subOrders.length === 0 && allVendorOrders.length === 0) {
    console.log(`✅ [STATUS RESOLVER] Order ${order.orderNumber} has no sub-orders, using direct status: ${order.status}`);
    return {
      ...(order.toObject ? order.toObject() : order),
      status: order.status,                 // Consistent field name
      resolvedStatus: order.status,         // For backward compatibility
      statusDisplay: order.status,          // For frontend
      unifiedStatus: order.status,          // For mixed orders
      statusSource: 'direct',
      // Add cancel permissions for frontend
      canCustomerCancel: !['delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(order.status),
      canAdminChange: !['cancelled_by_customer', 'cancelled_by_user'].includes(order.status)
    };
  }

  // Calculate unified status from sub-orders using simple logic for admin/vendor-only
  const allStatuses = [
    ...subOrders.map(sub => sub.status),
    ...allVendorOrders.map(vo => vo.status)
  ];

  console.log(`📋 [STATUS RESOLVER] All sub-order statuses: [${allStatuses.join(', ')}]`);
  console.log(`📋 [STATUS RESOLVER] Main order status: ${order.status}`);

  // CRITICAL FIX: Detect inconsistent state where main order is cancelled but vendor orders are not
  const mainOrderCancelled = ['cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(order.status) || 
                             order.cancelled_by_customer === true || 
                             order.cancelled_by_user === true ||
                             order.isCancelled === true;
  const hasNonCancelledVendorOrders = allVendorOrders.some(vo => 
    !['cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(vo.status)
  );
  
  console.log(`🔍 [STATUS RESOLVER] Cancellation check:`, {
    orderNumber: order.orderNumber,
    status: order.status,
    cancelled_by_customer: order.cancelled_by_customer,
    cancelled_by_user: order.cancelled_by_user,
    isCancelled: order.isCancelled,
    mainOrderCancelled: mainOrderCancelled,
    hasNonCancelledVendorOrders: hasNonCancelledVendorOrders
  });
  
  if (mainOrderCancelled && hasNonCancelledVendorOrders) {
    console.log(`🚨 [STATUS RESOLVER] INCONSISTENT STATE DETECTED! Main order is cancelled but vendor orders are not cancelled`);
    console.log(`🔧 [STATUS RESOLVER] Auto-fixing vendor order statuses to match main order...`);
    
    // Fix the inconsistent vendor orders
    for (const vendorOrder of allVendorOrders) {
      if (!['cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(vendorOrder.status)) {
        console.log(`🔧 [STATUS RESOLVER] Updating vendor order ${vendorOrder.orderNumber} from ${vendorOrder.status} to cancelled_by_customer`);
        
        try {
          // COMMISSION REVERSAL - Use same logic as mixed orders
          console.log(`💸 [STATUS RESOLVER] Checking commission reversal for vendor order ${vendorOrder.orderNumber}`);
          console.log(`💸 [STATUS RESOLVER] Commission details:`, {
            commissionAmount: vendorOrder.commissionAmount,
            commissionReversed: vendorOrder.commissionReversed,
            vendor: vendorOrder.vendor,
            totalAmount: vendorOrder.totalAmount
          });
          
          if (vendorOrder.commissionAmount > 0 && !vendorOrder.commissionReversed) {
            console.log(`💸 [STATUS RESOLVER] Reversing commission: $${vendorOrder.commissionAmount} for vendor ${vendorOrder.vendor}`);
            
            const MonthlyCommission = require('../models/MonthlyCommission');
            const orderDate = new Date(vendorOrder.createdAt);
            const parentOrderId = vendorOrder.parentOrderId || vendorOrder._id;
            
            console.log(`💸 [STATUS RESOLVER] Commission reversal details:`, {
              vendor: vendorOrder.vendor,
              month: orderDate.getMonth() + 1,
              year: orderDate.getFullYear(),
              commissionAmount: vendorOrder.commissionAmount,
              parentOrderId: parentOrderId,
              vendorOrderId: vendorOrder._id
            });
            
            // Remove commission transaction and update totals
            const updateResult = await MonthlyCommission.findOneAndUpdate(
              { vendor: vendorOrder.vendor, month: orderDate.getMonth() + 1, year: orderDate.getFullYear() },
              {
                $pull: { 
                  transactions: { 
                    orderId: parentOrderId,
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
              console.log(`✅ [STATUS RESOLVER] Commission reversed: $${vendorOrder.commissionAmount} for vendor ${vendorOrder.vendor}`);
              console.log(`✅ [STATUS RESOLVER] Updated commission record:`, {
                vendor: updateResult.vendor,
                totalCommission: updateResult.totalCommission,
                totalSales: updateResult.totalSales,
                totalOrders: updateResult.totalOrders
              });
            } else {
              console.log(`⚠️ [STATUS RESOLVER] No commission record found for vendor ${vendorOrder.vendor}`);
            }
          } else if (vendorOrder.commissionReversed) {
            console.log(`ℹ️ [STATUS RESOLVER] Commission already reversed for vendor order ${vendorOrder.orderNumber}`);
          } else {
            console.log(`ℹ️ [STATUS RESOLVER] No commission to reverse for vendor order ${vendorOrder.orderNumber} (amount: ${vendorOrder.commissionAmount})`);
          }
          
          // Update vendor order status with commission reversal flag
          await VendorOrder.findByIdAndUpdate(vendorOrder._id, {
            status: 'cancelled_by_customer',
            cancelledAt: new Date(),
            cancelledBy: 'system_sync',
            cancellationReason: 'Auto-synced with main order status',
            commissionReversed: true // Mark commission as reversed
          });
          
          // STOCK REVERSAL - Release reserved stock
          console.log(`📦 [STATUS RESOLVER] Checking stock reversal for vendor order ${vendorOrder.orderNumber}`);
          try {
            const StockManager = require('../services/StockManager');
            const stockReleaseResult = await StockManager.releaseStock(vendorOrder._id);
            console.log(`📦 [STATUS RESOLVER] Stock release result:`, stockReleaseResult);
          } catch (stockError) {
            console.error(`❌ [STATUS RESOLVER] Stock release failed for vendor order ${vendorOrder.orderNumber}:`, stockError);
          }
          
          // Update the in-memory object for immediate calculation
          vendorOrder.status = 'cancelled_by_customer';
          vendorOrder.commissionReversed = true;
          console.log(`✅ [STATUS RESOLVER] Fixed vendor order ${vendorOrder.orderNumber} status with commission reversal and stock release`);
        } catch (error) {
          console.error(`❌ [STATUS RESOLVER] Failed to fix vendor order ${vendorOrder.orderNumber}:`, error);
        }
      }
    }
    
    // Recalculate statuses after fixing
    const fixedStatuses = [
      ...subOrders.map(sub => sub.status),
      ...allVendorOrders.map(vo => vo.status)
    ];
    console.log(`🔧 [STATUS RESOLVER] Fixed statuses: [${fixedStatuses.join(', ')}]`);
    
    const unifiedStatus = calculateUnifiedStatus(fixedStatuses);
    console.log(`🎯 [STATUS RESOLVER] Calculated unified status after fix: ${unifiedStatus}`);
    
    return {
      ...(order.toObject ? order.toObject() : order),
      status: unifiedStatus,
      resolvedStatus: unifiedStatus,
      statusDisplay: unifiedStatus,
      unifiedStatus: unifiedStatus,
      statusSource: 'calculated-fixed',
      subOrderCount: subOrders.length,
      vendorOrderCount: allVendorOrders.length,
      allSubStatuses: fixedStatuses,
      canCustomerCancel: !['delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(unifiedStatus),
      canAdminChange: !['cancelled_by_customer', 'cancelled_by_user'].includes(unifiedStatus)
    };
  }

  const unifiedStatus = calculateUnifiedStatus(allStatuses);
  console.log(`🎯 [STATUS RESOLVER] Calculated unified status: ${unifiedStatus}`);
  console.log(`🔄 [STATUS RESOLVER] Status comparison: main=${order.status} vs unified=${unifiedStatus}`);

  return {
    ...(order.toObject ? order.toObject() : order),
    status: unifiedStatus,               // Consistent field name
    resolvedStatus: unifiedStatus,       // For backward compatibility
    statusDisplay: unifiedStatus,        // For frontend
    unifiedStatus: unifiedStatus,        // For mixed orders
    statusSource: 'calculated',
    subOrderCount: subOrders.length,
    vendorOrderCount: allVendorOrders.length,
    allSubStatuses: allStatuses,
    // Add cancel permissions for frontend
    canCustomerCancel: !['delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'].includes(unifiedStatus),
    canAdminChange: !['cancelled_by_customer', 'cancelled_by_user'].includes(unifiedStatus)
  };
}

/**
 * Calculate unified status from multiple sub-order statuses
 */
function calculateUnifiedStatus(statuses) {
  console.log(`🧮 [CALCULATE STATUS] Input statuses: [${statuses.join(', ')}]`);
  
  if (statuses.length === 0) {
    console.log(`🧮 [CALCULATE STATUS] No statuses provided, returning 'placed'`);
    return 'placed';
  }

  // CRITICAL FIX: If main order is cancelled but vendor orders are not,
  // this indicates an inconsistent state that needs correction
  console.log(`🧮 [CALCULATE STATUS] Checking for inconsistent cancellation state...`);

  // Priority-based status calculation - Handle all cancellation types
  const cancelledStatuses = ['cancelled', 'rejected', 'cancelled_by_customer', 'cancelled_by_user'];
  const allAreCancelled = statuses.every(status => cancelledStatuses.includes(status));
  
  console.log(`🧮 [CALCULATE STATUS] All are cancelled: ${allAreCancelled}`);
  
  if (allAreCancelled) {
    // Return the most specific cancellation reason found
    if (statuses.includes('cancelled_by_customer')) {
      console.log(`🧮 [CALCULATE STATUS] Found cancelled_by_customer, returning it`);
      return 'cancelled_by_customer';
    } else if (statuses.includes('cancelled_by_user')) {
      console.log(`🧮 [CALCULATE STATUS] Found cancelled_by_user, returning it`);
      return 'cancelled_by_user';
    } else if (statuses.includes('rejected')) {
      console.log(`🧮 [CALCULATE STATUS] Found rejected, returning it`);
      return 'rejected';
    } else {
      console.log(`🧮 [CALCULATE STATUS] Found generic cancelled, returning it`);
      return 'cancelled';
    }
  } else if (statuses.every(status => status === 'delivered')) {
    console.log(`🧮 [CALCULATE STATUS] All delivered, returning 'delivered'`);
    return 'delivered';
  } else if (statuses.every(status => ['shipped', 'delivered'].includes(status))) {
    console.log(`🧮 [CALCULATE STATUS] All shipped or delivered, returning 'shipped'`);
    return 'shipped';
  } else if (statuses.some(status => ['processing', 'confirmed'].includes(status))) {
    console.log(`🧮 [CALCULATE STATUS] Some processing, returning 'processing'`);
    return 'processing';
  } else if (statuses.some(status => status === 'placed')) {
    console.log(`🧮 [CALCULATE STATUS] Some placed, returning 'placed'`);
    return 'placed';
  }
  
  console.log(`🧮 [CALCULATE STATUS] No match, fallback to 'placed'`);
  return 'placed'; // Default fallback
}

/**
 * Get proper order for customer display
 * For sub-orders, return the parent order with resolved status
 */
async function getCustomerOrder(orderId) {
  try {
    let order = await Order.findById(orderId)
      .populate('cart.productId', 'title image price')
      .populate('cart.vendor', 'businessName');

    if (!order) {
      throw new Error('Order not found');
    }

    // If this is a sub-order, get the parent order instead
    if (order.parentOrderId) {
      console.log(`🔄 Order ${order.orderNumber} is a sub-order, fetching parent order`);
      const parentOrder = await Order.findById(order.parentOrderId)
        .populate('cart.productId', 'title image price')
        .populate('cart.vendor', 'businessName');
      
      if (parentOrder) {
        order = parentOrder;
      }
    }

    // Resolve the proper status
    const resolvedOrder = await resolveOrderStatus(order);
    return resolvedOrder;

  } catch (error) {
    console.error(`❌ Error getting customer order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Apply status mapping for frontend compatibility
 */
function mapStatusForFrontend(status) {
  const statusMapping = {
    'Pending': 'placed',
    'Confirmed': 'processing', 
    'Shipped': 'shipped',
    'Delivered': 'delivered',
    'Cancelled': 'cancelled'
  };
  
  return statusMapping[status] || status.toLowerCase();
}

module.exports = {
  resolveOrderStatus,
  calculateUnifiedStatus,
  getCustomerOrder,
  mapStatusForFrontend
};
