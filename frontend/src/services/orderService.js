// Order Service - Complete Order Management for International Tijarat
import API from '../api.js';

class OrderService {
  // Create a new order
  static async createOrder(orderData) {
    try {
      // Use the main orders endpoint for both authenticated and guest users
      const endpoint = '/orders';
      
      
      const response = await API.post(endpoint, orderData);
      
      return response.data;
    } catch (error) {
      console.error('OrderService: Error creating order:', error);
      console.error('OrderService: Error response:', error.response?.data);
      console.error('OrderService: Error status:', error.response?.status);
      console.error('OrderService: Full error object:', JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  // Create order with payment receipt for advance payments
  static async createOrderWithReceipt(formData) {
    try {
      const endpoint = '/orders/with-receipt';
      
      const response = await API.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('OrderService: Error creating order with receipt:', error);
      console.error('OrderService: Error response:', error.response?.data);
      console.error('OrderService: Error status:', error.response?.status);
      throw error;
    }
  }

  // Get order by ID
  static async getOrderById(orderId) {
    try {
      // Use public confirmation endpoint for order confirmation page
      const response = await API.get(`/orders/confirmation/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // Get detailed order information for tracking/details view
  static async getOrderDetails(orderId, email = null) {
    try {
      const params = email ? { email } : {};
      const response = await API.get(`/orders/${orderId}/details`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }

  // Get user's order history with pagination
  static async getUserOrders(page = 1, limit = 10) {
    try {
      // Debug token information
      const token = localStorage.getItem('token');
      
      const response = await API.get('/orders/user/my-orders', {
        params: { page, limit }
      });
      
      // Check if response.data has the expected structure with new pagination object
      if (response.data && response.data.success) {
        const { orders, pagination } = response.data;
        return {
          orders: orders || [],
          pagination: pagination || {
            totalOrders: 0,
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
            pageSize: limit
          }
        };
      }
      return {
        orders: [],
        pagination: {
          totalOrders: 0,
          currentPage: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          pageSize: limit
        }
      };
    } catch (error) {
      console.error('OrderService: Error fetching user orders:', error);
      console.error('OrderService: Error response:', error.response?.data);
      console.error('OrderService: Error status:', error.response?.status);
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(orderId, status) {
    try {
      const response = await API.put(`/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Cancel order
  static async cancelOrder(orderId, reason) {
    try {
      const response = await API.post(`/orders/user/cancel/${orderId}`, { reason });
      return response.data;
    } catch (error) {
      console.error('OrderService: Error canceling order:', error);
      console.error('OrderService: Error response:', error.response?.data);
      throw error;
    }
  }

  // Check if order can be cancelled
  static canCancelOrder(order) {
    // Use unifiedStatus if available, otherwise fall back to status
    const status = (order.unifiedStatus || order.status || '').toLowerCase();
    
    // Orders can be cancelled if they are placed or processing (not shipped/delivered yet)
    const cancellableStatuses = ['placed', 'pending', 'processing', 'confirmed'];
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'rejected'];
    
    // Cannot cancel if already in non-cancellable state
    if (nonCancellableStatuses.includes(status)) {
      return false;
    }
    
    return cancellableStatuses.includes(status);
  }

  // Check if a mixed order can be cancelled (has any cancellable parts)
  static canCancelMixedOrder(order) {
    if (!order.hasSplitOrder || !order.statusParts || order.statusParts.length === 0) {
      return this.canCancelOrder(order);
    }
    
    // For mixed orders, check if any part can be cancelled
    return order.statusParts.some(part => {
      const status = (part.status || '').toLowerCase();
      const cancellableStatuses = ['placed', 'pending', 'processing', 'confirmed'];
      const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'rejected'];
      
      return cancellableStatuses.includes(status) && !nonCancellableStatuses.includes(status);
    });
  }

  // Get order type classification
  static getOrderType(order) {
    // First, check if order has explicit orderType field (newer orders)
    if (order.orderType && ['admin_only', 'vendor_only', 'mixed'].includes(order.orderType)) {
      return order.orderType;
    }
    
    // For split orders, check the parts first
    if (order.hasSplitOrder && order.statusParts && order.statusParts.length > 0) {
      const hasAdmin = order.statusParts.some(part => part.type === 'admin');
      const hasVendor = order.statusParts.some(part => part.type === 'vendor');
      
      if (hasAdmin && hasVendor) return 'mixed';
      if (hasVendor) return 'vendor_only';
      if (hasAdmin) return 'admin_only';
    }
    
    // Fallback to cart analysis for legacy orders
    if (order.cart && Array.isArray(order.cart) && order.cart.length > 0) {
      // Check if cart items have vendor assignments
      const hasVendorItems = order.cart.some(item => 
        item.vendor || item.assignedVendor || item.handledBy === 'vendor'
      );
      const hasAdminItems = order.cart.some(item => 
        !item.vendor && !item.assignedVendor && (!item.handledBy || item.handledBy === 'admin')
      );
      
      if (hasVendorItems && hasAdminItems) return 'mixed';
      if (hasVendorItems) return 'vendor_only';
      if (hasAdminItems) return 'admin_only';
    }
    
    // Default classification for orders without clear vendor assignment
    // Most legacy orders without vendor fields are admin_only
    return 'admin_only';
  }

  // Process payment (mock payment processing)
  static async processPayment(paymentData) {
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock payment gateway response
      const response = {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        paymentMethod: paymentData.method,
        amount: paymentData.amount,
        currency: 'USD',
        processedAt: new Date().toISOString()
      };
      
      return response;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Validate order data
  static validateOrderData(orderData) {
    const errors = [];

    // Validate customer info
    if (!orderData.customer) {
      errors.push('Customer information is required');
    } else {
      if (!orderData.customer.name) errors.push('Customer name is required');
      if (!orderData.customer.email) errors.push('Customer email is required');
      if (!orderData.customer.phone) errors.push('Customer phone is required');
    }

    // Validate shipping address
    if (!orderData.shippingAddress) {
      errors.push('Shipping address is required');
    } else {
      if (!orderData.shippingAddress.street) errors.push('Street address is required');
      if (!orderData.shippingAddress.city) errors.push('City is required');
      if (!orderData.shippingAddress.state) errors.push('State is required');
      if (!orderData.shippingAddress.zipCode) errors.push('ZIP code is required');
      if (!orderData.shippingAddress.country) errors.push('Country is required');
    }

    // Validate items
    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    } else {
      orderData.items.forEach((item, index) => {
        if (!item.productId) errors.push(`Item ${index + 1}: Product ID is required`);
        if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: Valid quantity is required`);
        if (!item.price || item.price <= 0) errors.push(`Item ${index + 1}: Valid price is required`);
      });
    }

    // Validate payment info
    if (!orderData.payment) {
      errors.push('Payment information is required');
    } else {
      if (!orderData.payment.method) errors.push('Payment method is required');
      if (!orderData.payment.amount || orderData.payment.amount <= 0) errors.push('Payment amount is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate order totals
  static calculateOrderTotals(items, shippingCost = 0, taxRate = 0.08) {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * taxRate;
    const shipping = shippingCost;
    const total = subtotal + tax + shipping;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      shipping: Number(shipping.toFixed(2)),
      total: Number(total.toFixed(2))
    };
  }

  // Format order for display
  static formatOrder(order) {
    // Get total from either order.totals.total or order.total (for backward compatibility)
    const total = order.totals?.total || order.total || 0;
    
    return {
      ...order,
      formattedTotal: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(total),
      formattedDate: new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      statusDisplay: this.getStatusDisplay(order.status)
    };
  }

  // Get unified order status for split orders
  static async getUnifiedOrderStatus(orderId) {
    try {
      // Use the customer split-details endpoint instead of admin endpoint
      const response = await API.get(`/orders/${orderId}/split-details`);
      
      if (response.data && response.data.success) {
        const { adminPart, vendorParts, overallStatus } = response.data.data;
        
        // Calculate unified status based on all parts
        let unifiedStatus = 'pending';
        const allParts = [];
        
        if (adminPart && adminPart.status) {
          allParts.push({ type: 'admin', status: adminPart.status, items: adminPart.items || [] });
        }
        
        if (vendorParts && Array.isArray(vendorParts)) {
          vendorParts.forEach(vp => {
            if (vp.status) {
              allParts.push({ type: 'vendor', status: vp.status, items: vp.items || [], vendor: vp.vendor });
            }
          });
        }
        
        if (allParts.length > 0) {
          // Use the overall status from backend or calculate
          unifiedStatus = overallStatus || this.calculateOverallStatus(allParts);
        }
        
        return {
          status: unifiedStatus,
          parts: allParts,
          hasSplitOrder: allParts.length > 1 || (adminPart && vendorParts && vendorParts.length > 0)
        };
      }
      
      // If split-details API succeeds but no data, fetch current order status
      const orderResponse = await API.get(`/orders/${orderId}`);
      const currentStatus = orderResponse.data?.status || null;
      return { 
        status: currentStatus, 
        parts: [], 
        hasSplitOrder: false 
      };
      
    } catch (error) {
      
      // ✅ NEW: Try to get current order status instead of returning null
      try {
        const orderResponse = await API.get(`/orders/${orderId}`);
        const currentStatus = orderResponse.data?.status || null;
        return { 
          status: currentStatus, 
          parts: [], 
          hasSplitOrder: false 
        };
      } catch (orderError) {
        return { status: null, parts: [], hasSplitOrder: false }; // Will fallback to original order status
      }
    }
  }
  
  // Calculate overall status from all parts
  static calculateOverallStatus(parts) {
    if (!parts || parts.length === 0) return 'pending';
    
    const statuses = parts.map(part => part.status);
    
    // If all parts are delivered
    if (statuses.every(status => status === 'delivered')) {
      return 'delivered';
    }
    
    // If any part is cancelled/rejected but others are not
    const rejectedCount = statuses.filter(status => ['rejected', 'cancelled'].includes(status)).length;
    const deliveredCount = statuses.filter(status => status === 'delivered').length;
    
    if (rejectedCount > 0 && (deliveredCount > 0 || statuses.some(status => !['rejected', 'cancelled'].includes(status)))) {
      return 'partially_cancelled';
    }
    
    // If all parts are cancelled/rejected
    if (statuses.every(status => ['rejected', 'cancelled'].includes(status))) {
      return 'cancelled';
    }
    
    // If all parts are shipped or delivered
    if (statuses.every(status => ['shipped', 'delivered'].includes(status))) {
      return 'shipped';
    }
    
    // If any part is processing
    if (statuses.some(status => status === 'processing')) {
      return 'processing';
    }
    
    // Default to pending
    return 'pending';
  }

  // Get user-friendly status display
  static getStatusDisplay(status) {
    const statusMap = {
      'Pending': { text: 'Order Placed', color: 'blue', icon: 'refresh' },
      'pending': { text: 'Order Placed', color: 'blue', icon: 'refresh' },
      'placed': { text: 'Order Placed', color: 'blue', icon: 'refresh' },
      'Confirmed': { text: 'Confirmed', color: 'green', icon: 'check' },
      'confirmed': { text: 'Confirmed', color: 'green', icon: 'check' },
      'processing': { text: 'Processing', color: 'orange', icon: 'cog' },
      'Shipped': { text: 'Shipped', color: 'purple', icon: 'truck' },
      'shipped': { text: 'Shipped', color: 'purple', icon: 'truck' },
      'Delivered': { text: 'Delivered', color: 'green', icon: 'package' },
      'delivered': { text: 'Delivered', color: 'green', icon: 'package' },
      'Rejected': { text: 'Cancelled', color: 'red', icon: 'x-circle' },
      'rejected': { text: 'Cancelled', color: 'red', icon: 'x-circle' },
      'Cancelled': { text: 'Cancelled', color: 'red', icon: 'x-circle' }, // Added uppercase version
      'cancelled': { text: 'Cancelled', color: 'red', icon: 'x-circle' },
      'partially_cancelled': { text: 'Partially Cancelled', color: 'yellow', icon: 'exclamation-triangle' },
      'refunded': { text: 'Refunded', color: 'gray', icon: 'currency-dollar' }
    };

    return statusMap[status] || { text: status, color: 'gray', icon: 'question-mark-circle' };
  }

  // Generate order number
  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `IT-${timestamp}-${random}`;
  }

  // Estimate delivery date
  static estimateDeliveryDate(shippingMethod = 'standard') {
    const today = new Date();
    const deliveryDays = {
      'standard': 5,
      'express': 2,
      'overnight': 1
    };

    const days = deliveryDays[shippingMethod] || 5;
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + days);

    return deliveryDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

export default OrderService;
