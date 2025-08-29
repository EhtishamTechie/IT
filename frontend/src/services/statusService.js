// Status Service - Real-time status fetching and updates
import API from '../api.js';

class StatusService {
  // Get real-time status for a single order
  static async getOrderStatus(orderId) {
    try {
      const response = await API.get(`/status/${orderId}/status-history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order status:', error);
      throw error;
    }
  }

  // Get real-time status for multiple orders
  static async getMultipleOrderStatuses(orderIds) {
    try {
      const promises = orderIds.map(id => this.getOrderStatus(id));
      const results = await Promise.allSettled(promises);
      
      const statuses = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          statuses[orderIds[index]] = result.value;
        } else {
          console.error(`Failed to fetch status for order ${orderIds[index]}:`, result.reason);
          statuses[orderIds[index]] = null;
        }
      });
      
      return statuses;
    } catch (error) {
      console.error('Error fetching multiple order statuses:', error);
      throw error;
    }
  }

  // Update order status (admin)
  static async updateOrderStatus(orderId, status, reason = '') {
    try {
      const response = await API.put(`/status/${orderId}/status`, {
        status,
        reason,
        updatedBy: 'Admin Panel'
      });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Cancel order by customer with commission reversal
  static async cancelOrderByCustomer(orderId, reason) {
    try {
      const response = await API.put(`/status/${orderId}/cancel`, {
        reason,
        cancelledBy: 'customer'
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling order by customer:', error);
      throw error;
    }
  }

  // Check if order can be cancelled by customer
  static canCustomerCancelOrder(order) {
    if (!order) return false;
    
    const currentStatus = order.unifiedStatus || order.status || 'placed';
    const cancellableStatuses = ['placed', 'processing'];
    
    // For mixed orders, check if any parts can be cancelled
    if (order.isSplit && order.parts) {
      return order.parts.some(part => {
        const partStatus = part.status || part.unifiedStatus || 'placed';
        return cancellableStatuses.includes(partStatus);
      });
    }
    
    return cancellableStatuses.includes(currentStatus);
  }

  // Alias for backward compatibility (in case there are references to the old name)
  static canCustomerCancel(order) {
    return this.canCustomerCancelOrder(order);
  }

  // Check if order was cancelled by admin/vendor (no commission reversal)
  static isAdminVendorCancellation(order) {
    if (!order) return false;
    
    const currentStatus = order.unifiedStatus || order.status || 'placed';
    return currentStatus === 'cancelled' && !this.isCustomerCancellation(order);
  }

  // Check if order was cancelled by customer (with commission reversal)
  static isCustomerCancellation(order) {
    if (!order) return false;
    
    const currentStatus = order.unifiedStatus || order.status || 'placed';
    return ['cancelled_by_customer', 'cancelled_by_user'].includes(currentStatus);
  }

  // Get status display information
  static getStatusDisplay(status) {
    const statusMap = {
      'placed': { text: 'Placed', color: 'blue', icon: '📝' },
      'processing': { text: 'Processing', color: 'yellow', icon: '⚙️' },
      'shipped': { text: 'Shipped', color: 'indigo', icon: '🚚' },
      'delivered': { text: 'Delivered', color: 'green', icon: '✅' },
      'cancelled': { text: 'Cancelled', color: 'red', icon: '❌' },
      'cancelled_by_customer': { text: 'Cancelled by Customer', color: 'red', icon: '🚫' },
      'cancelled_by_user': { text: 'Cancelled by Customer', color: 'red', icon: '🚫' },
      'partially_cancelled': { text: 'Partially Cancelled', color: 'orange', icon: '⚠️' }
    };
    
    return statusMap[status] || { text: status, color: 'gray', icon: '❓' };
  }

  // Normalize status string (for backward compatibility)
  static normalizeStatus(status) {
    if (!status) return 'placed';
    
    const normalizedStatus = status.toLowerCase().trim();
    
    // Handle common variations
    const statusMap = {
      'pending': 'placed',
      'confirmed': 'processing',
      'preparing': 'processing',
      'in_transit': 'shipped',
      'shipped': 'shipped',
      'out_for_delivery': 'shipped',
      'delivered': 'delivered',
      'completed': 'delivered',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'cancelled_by_customer': 'cancelled_by_customer',
      'cancelled_by_user': 'cancelled_by_customer',
      'refunded': 'cancelled_by_customer'
    };
    
    return statusMap[normalizedStatus] || normalizedStatus;
  }

  // Calculate unified status from multiple parts (for mixed orders)
  static calculateUnifiedStatus(parts) {
    if (!parts || parts.length === 0) return 'placed';
    
    const statuses = parts.map(part => this.normalizeStatus(part.status || part.unifiedStatus || 'placed'));
    
    // If all cancelled, return cancelled
    if (statuses.every(status => status.includes('cancelled'))) {
      return 'cancelled_by_customer';
    }
    
    // If all delivered, return delivered
    if (statuses.every(status => status === 'delivered')) {
      return 'delivered';
    }
    
    // If all shipped, return shipped
    if (statuses.every(status => status === 'shipped')) {
      return 'shipped';
    }
    
    // If any delivered and any cancelled, return partially cancelled
    const hasDelivered = statuses.some(status => status === 'delivered');
    const hasCancelled = statuses.some(status => status.includes('cancelled'));
    
    if (hasDelivered && hasCancelled) {
      return 'partially_cancelled';
    }
    
    // If any shipped, return shipped
    if (statuses.some(status => status === 'shipped')) {
      return 'shipped';
    }
    
    // If any processing, return processing
    if (statuses.some(status => status === 'processing')) {
      return 'processing';
    }
    
    // Default to placed
    return 'placed';
  }

  // Get valid transitions for current status
  static async getValidTransitions(orderId) {
    try {
      const response = await API.get(`/status/${orderId}/valid-transitions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching valid transitions:', error);
      throw error;
    }
  }

  // Real-time status polling for order history/detail pages
  static startStatusPolling(orderIds, callback, interval = 30000) {
    const pollStatuses = async () => {
      try {
        const statuses = await this.getMultipleOrderStatuses(orderIds);
        callback(statuses);
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };

    // Initial fetch
    pollStatuses();

    // Set up interval
    const intervalId = setInterval(pollStatuses, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

export default StatusService;
