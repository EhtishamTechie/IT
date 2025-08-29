// Unified Order Status Service
// Single source of truth for order status across all components

class UnifiedOrderStatusService {
  constructor() {
    // Modern status definitions - single source of truth
    this.statusDefinitions = {
      'placed': {
        label: 'Order Placed',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Order has been placed and is awaiting processing',
        priority: 1
      },
      'processing': {
        label: 'Processing',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Order is being prepared',
        priority: 2
      },
      'shipped': {
        label: 'Shipped',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        description: 'Order is on the way',
        priority: 3
      },
      'delivered': {
        label: 'Delivered',
        color: 'bg-green-100 text-green-800 border-green-200',
        description: 'Order has been delivered successfully',
        priority: 4
      },
      'cancelled': {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-800 border-red-200',
        description: 'Order has been cancelled',
        priority: 0
      },
      // Vendor-specific statuses
      'accepted': {
        label: 'Accepted by Vendor',
        color: 'bg-green-100 text-green-800 border-green-200',
        description: 'Vendor has accepted the order',
        priority: 1.5
      },
      'rejected': {
        label: 'Rejected by Vendor',
        color: 'bg-red-100 text-red-800 border-red-200',
        description: 'Vendor has rejected the order',
        priority: 0
      }
    };
  }

  // Normalize legacy statuses to modern ones
  normalizeStatus(status) {
    if (!status) return 'placed';
    
    const statusLower = status.toLowerCase();
    
    // Legacy status mapping
    const legacyMap = {
      'pending': 'placed',
      'confirmed': 'processing',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'rejected': 'cancelled'
    };

    return legacyMap[statusLower] || statusLower;
  }

  // Get status information
  getStatusInfo(status) {
    const normalizedStatus = this.normalizeStatus(status);
    return this.statusDefinitions[normalizedStatus] || this.statusDefinitions['placed'];
  }

  // Calculate unified order status from multiple parts
  calculateUnifiedStatus(orderParts) {
    if (!orderParts || orderParts.length === 0) {
      return 'placed';
    }

    // Get all unique statuses
    const statuses = orderParts.map(part => this.normalizeStatus(part.status));
    const uniqueStatuses = [...new Set(statuses)];

    // If any part is cancelled, check if all are cancelled
    if (uniqueStatuses.includes('cancelled')) {
      const allCancelled = statuses.every(status => status === 'cancelled');
      if (allCancelled) return 'cancelled';
    }

    // If any part is delivered, check if all are delivered
    if (uniqueStatuses.includes('delivered')) {
      const allDelivered = statuses.every(status => status === 'delivered' || status === 'cancelled');
      if (allDelivered) return 'delivered';
    }

    // If any part is shipped
    if (uniqueStatuses.includes('shipped')) {
      return 'shipped';
    }

    // If any part is processing
    if (uniqueStatuses.includes('processing') || uniqueStatuses.includes('accepted')) {
      return 'processing';
    }

    // Default to placed
    return 'placed';
  }

  // Get order type display text
  getOrderTypeDisplay(order) {
    const hasAdminItems = order.adminItems && order.adminItems.length > 0;
    const hasVendorItems = order.vendorItems && order.vendorItems.length > 0;
    
    if (hasAdminItems && hasVendorItems) {
      return {
        type: 'mixed',
        display: 'Mixed Order',
        description: `${order.adminItems.length} admin item(s), ${order.vendorItems.length} vendor item(s)`
      };
    } else if (hasVendorItems) {
      return {
        type: 'vendor_only',
        display: 'Vendor Order',
        description: `${order.vendorItems.length} vendor item(s)`
      };
    } else {
      return {
        type: 'admin_only',
        display: 'Direct Order',
        description: `${order.adminItems?.length || order.cart?.length || 0} item(s)`
      };
    }
  }

  // Format order for display in any component
  formatOrderForDisplay(order) {
    const orderType = this.getOrderTypeDisplay(order);
    
    // Calculate unified status from all parts
    const parts = [];
    
    // Add admin part if exists
    if (order.adminItems && order.adminItems.length > 0) {
      parts.push({
        type: 'admin',
        status: this.normalizeStatus(order.status),
        items: order.adminItems
      });
    }
    
    // Add vendor parts if exist
    if (order.vendorBreakdown && Array.isArray(order.vendorBreakdown)) {
      order.vendorBreakdown.forEach(vendorData => {
        parts.push({
          type: 'vendor',
          vendor: vendorData.vendor,
          status: this.normalizeStatus(vendorData.status || order.status),
          items: vendorData.items
        });
      });
    } else if (order.vendorItems && order.vendorItems.length > 0) {
      parts.push({
        type: 'vendor',
        status: this.normalizeStatus(order.status),
        items: order.vendorItems
      });
    }

    const unifiedStatus = this.calculateUnifiedStatus(parts);
    const statusInfo = this.getStatusInfo(unifiedStatus);

    return {
      ...order,
      unifiedStatus,
      statusInfo,
      orderType,
      parts,
      displayStatus: statusInfo.label,
      statusColor: statusInfo.color,
      statusDescription: statusInfo.description
    };
  }
}

// Export singleton instance
const unifiedOrderStatusService = new UnifiedOrderStatusService();
export default unifiedOrderStatusService;
