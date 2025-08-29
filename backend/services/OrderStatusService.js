/**
 * Simplified Order Status Management Service
 * Handles all status-related operations according to user requirements
 */

const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const { 
  ORDER_STATUSES, 
  ORDER_TYPES, 
  calculateMixedOrderStatus,
  mapLegacyStatus,
  canCustomerCancelOrder,
  canChangeStatus
} = require('../constants/orderStatus');

class OrderStatusService {
  
  /**
   * Get unified status for any order type
   * Implements the exact requirements specified by user
   */
  static async getOrderStatus(order) {
    try {
      console.log(`🔍 Getting status for order ${order.orderNumber} (${order.orderType})`);
      
      // Handle legacy status mapping
      let currentStatus = mapLegacyStatus(order.status || 'placed');
      
      // For simple orders (admin_only, vendor_only), return direct status
      if (order.orderType === ORDER_TYPES.ADMIN_ONLY || order.orderType === ORDER_TYPES.VENDOR_ONLY) {
        console.log(`✅ Simple order status: ${currentStatus}`);
        return {
          status: currentStatus,
          statusSource: 'direct',
          canCustomerCancel: canCustomerCancelOrder(currentStatus),
          canAdminChange: canChangeStatus(currentStatus, 'admin')
        };
      }
      
      // For mixed orders, calculate based on sub-order statuses
      if (order.orderType === ORDER_TYPES.MIXED) {
        const mixedStatus = await this.calculateMixedOrderStatus(order);
        console.log(`✅ Mixed order status: ${mixedStatus.status}`);
        return mixedStatus;
      }
      
      // Fallback for legacy orders
      console.log(`✅ Legacy order status: ${currentStatus}`);
      return {
        status: currentStatus,
        statusSource: 'legacy',
        canCustomerCancel: canCustomerCancelOrder(currentStatus),
        canAdminChange: canChangeStatus(currentStatus, 'admin')
      };
      
    } catch (error) {
      console.error(`❌ Error getting status for order ${order.orderNumber}:`, error);
      return {
        status: ORDER_STATUSES.PLACED,
        statusSource: 'error',
        canCustomerCancel: true,
        canAdminChange: true
      };
    }
  }
  
  /**
   * Calculate mixed order status based on user requirements:
   * - When all uncancelled orders are 1 step ahead of 'placed' → 'processing'
   * - When all uncancelled are ahead of processing → 'shipped'  
   * - When all sub orders are delivered → 'delivered'
   * - When all are cancelled → 'cancelled'
   */
  static async calculateMixedOrderStatus(order) {
    try {
      // Get admin part
      const adminPart = await Order.findOne({
        parentOrderId: order._id,
        partialOrderType: 'admin_part'
      });
      
      // Get vendor parts from VendorOrder collection
      const vendorParts = await VendorOrder.find({
        parentOrderId: order._id,
        splitFromMixedOrder: true
      });
      
      console.log(`📊 Mixed order parts - Admin: ${adminPart ? adminPart.status : 'none'}, Vendors: ${vendorParts.length}`);
      
      // If order hasn't been split yet, use main order status
      if (!adminPart && vendorParts.length === 0) {
        const directStatus = mapLegacyStatus(order.status || 'placed');
        return {
          status: directStatus,
          statusSource: 'main-order-not-split',
          canCustomerCancel: canCustomerCancelOrder(directStatus),
          canAdminChange: canChangeStatus(directStatus, 'admin'),
          subOrderStatuses: []
        };
      }
      
      // Collect all sub-order statuses
      const subOrderStatuses = [];
      
      if (adminPart) {
        subOrderStatuses.push(mapLegacyStatus(adminPart.status));
      }
      
      vendorParts.forEach(vp => {
        subOrderStatuses.push(mapLegacyStatus(vp.status));
      });
      
      console.log(`📋 Sub-order statuses: [${subOrderStatuses.join(', ')}]`);
      
      // Calculate overall status using user's requirements
      const overallStatus = calculateMixedOrderStatus(subOrderStatuses);
      
      console.log(`🎯 Calculated overall status: ${overallStatus}`);
      
      return {
        status: overallStatus,
        statusSource: 'mixed-calculated',
        canCustomerCancel: canCustomerCancelOrder(overallStatus),
        canAdminChange: canChangeStatus(overallStatus, 'admin'),
        subOrderStatuses,
        adminPartStatus: adminPart ? mapLegacyStatus(adminPart.status) : null,
        vendorPartStatuses: vendorParts.map(vp => ({
          vendorId: vp.vendor,
          status: mapLegacyStatus(vp.status)
        }))
      };
      
    } catch (error) {
      console.error(`❌ Error calculating mixed order status:`, error);
      return {
        status: ORDER_STATUSES.PLACED,
        statusSource: 'mixed-error',
        canCustomerCancel: true,
        canAdminChange: true,
        subOrderStatuses: []
      };
    }
  }
  
  /**
   * Get customer-facing orders (filters out sub-orders)
   */
  static async getCustomerOrders(userEmail, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      // Get only main orders (no parentOrderId) for customer
      const orders = await Order.find({
        email: userEmail,
        parentOrderId: { $exists: false } // Only main orders
      })
        .populate('cart.productId', 'title image price')
        .populate('cart.vendor', 'businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      console.log(`📋 Found ${orders.length} main orders for customer ${userEmail}`);
      
      // Process each order with status resolution
      const processedOrders = [];
      
      for (const order of orders) {
        const statusInfo = await this.getOrderStatus(order);
        
        processedOrders.push({
          ...order,
          status: statusInfo.status,
          statusSource: statusInfo.statusSource,
          canCustomerCancel: statusInfo.canCustomerCancel,
          canAdminChange: statusInfo.canAdminChange,
          // For frontend compatibility
          unifiedStatus: statusInfo.status,
          statusDisplay: statusInfo.status
        });
      }
      
      // Get total count
      const totalOrders = await Order.countDocuments({
        email: userEmail,
        parentOrderId: { $exists: false }
      });
      
      return {
        success: true,
        orders: processedOrders,
        totalOrders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit)
      };
      
    } catch (error) {
      console.error(`❌ Error getting customer orders:`, error);
      throw error;
    }
  }
  
  /**
   * Get admin orders with proper categorization
   */
  static async getAdminOrders(type, filters = {}) {
    try {
      let query = {};
      
      if (type === 'admin_orders') {
        // Show admin_only orders + admin parts of mixed orders
        query.$or = [
          { orderType: ORDER_TYPES.ADMIN_ONLY },
          { partialOrderType: 'admin_part' }
        ];
      } else if (type === 'vendor_orders') {
        // Show vendor_only orders + vendor parts of mixed orders  
        query.$or = [
          { orderType: ORDER_TYPES.VENDOR_ONLY },
          { partialOrderType: 'vendor_part' }
        ];
      }
      
      // Apply additional filters
      if (filters.status) {
        query.status = filters.status;
      }
      
      const orders = await Order.find(query)
        .populate('cart.productId', 'title image price')
        .populate('cart.vendor', 'businessName')
        .sort({ createdAt: -1 })
        .lean();
      
      console.log(`📋 Found ${orders.length} ${type} for admin`);
      
      return {
        success: true,
        orders,
        type
      };
      
    } catch (error) {
      console.error(`❌ Error getting admin orders:`, error);
      throw error;
    }
  }
}

module.exports = OrderStatusService;
