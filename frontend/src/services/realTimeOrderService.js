import { getApiUrl } from '../config';
class RealTimeOrderService {
  constructor() {
    this.listeners = new Map();
    this.pollingIntervals = new Map();
  }

  // Subscribe to real-time status updates for an order
  subscribeToOrderUpdates(orderId, callback, pollingInterval = 5000) {
    
    // Clear existing subscription if any
    this.unsubscribeFromOrderUpdates(orderId);
    
    // Store the callback
    this.listeners.set(orderId, callback);
    
    // Start polling for updates
    const intervalId = setInterval(async () => {
      try {
        await this.checkForStatusUpdate(orderId);
      } catch (error) {
        console.error(`❌ RealTimeOrderService: Error checking status for order ${orderId}:`, error);
      }
    }, pollingInterval);
    
    this.pollingIntervals.set(orderId, intervalId);
    
    // Initial check
    this.checkForStatusUpdate(orderId);
  }

  // Unsubscribe from order updates
  unsubscribeFromOrderUpdates(orderId) {
    
    // Clear polling interval
    if (this.pollingIntervals.has(orderId)) {
      clearInterval(this.pollingIntervals.get(orderId));
      this.pollingIntervals.delete(orderId);
    }
    
    // Remove listener
    this.listeners.delete(orderId);
  }

  // Check for status update and notify listener
  async checkForStatusUpdate(orderId) {
    try {
      // Use customer split-details endpoint with authentication  
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(getApiUrl(`/orders/${orderId}/split-details`), {
        headers
      });
      
      if (response.ok) {
        const orderData = await response.json();
        const callback = this.listeners.get(orderId);
        
        if (callback && orderData.data) {
          // Calculate unified status from the latest data
          let unifiedStatus = orderData.data.mainOrder?.status || 'placed';
          
          if (orderData.data.isSplit && orderData.data.parts) {
            // For split orders, calculate unified status from all parts
            const partStatuses = orderData.data.parts.map(part => part.status || 'placed');
            unifiedStatus = this.calculateUnifiedStatus(partStatuses);
          }
          
          // Prepare order data for callback
          const updatedOrder = {
            ...orderData.data.mainOrder,
            unifiedStatus,
            isSplit: orderData.data.isSplit,
            parts: orderData.data.parts || [],
            lastUpdated: new Date().toISOString()
          };
          
          callback(updatedOrder);
        }
      }
    } catch (error) {
      console.error(`❌ RealTimeOrderService: Failed to check status for order ${orderId}:`, error);
    }
  }

  // Calculate unified status from multiple parts (same logic as backend)
  calculateUnifiedStatus(statuses) {
    const normalizedStatuses = statuses.map(status => {
      const statusMap = {
        'Pending': 'placed',
        'Confirmed': 'processing',
        'Shipped': 'shipped',
        'Delivered': 'delivered',
        'Cancelled': 'cancelled'
      };
      return statusMap[status] || status.toLowerCase();
    });

    // If all parts have the same status
    const uniqueStatuses = [...new Set(normalizedStatuses)];
    if (uniqueStatuses.length === 1) {
      return uniqueStatuses[0];
    }

    // Priority-based status calculation
    const statusPriority = {
      'delivered': 5,
      'shipped': 4,
      'processing': 3,
      'placed': 2,
      'cancelled': 1
    };

    // Return the highest priority status
    return normalizedStatuses.reduce((highest, current) => {
      return (statusPriority[current] || 0) > (statusPriority[highest] || 0) ? current : highest;
    });
  }

  // Subscribe to updates for multiple orders (for order history page)
  subscribeToMultipleOrders(orderIds, callback, pollingInterval = 10000) {
    
    // Clear existing subscriptions
    this.unsubscribeFromMultipleOrders();
    
    // Store the callback for bulk updates
    this.listeners.set('bulk_update', callback);
    
    // Start polling for bulk updates
    const intervalId = setInterval(async () => {
      try {
        await this.checkForBulkStatusUpdates(orderIds);
      } catch (error) {
        console.error(`❌ RealTimeOrderService: Error checking bulk status updates:`, error);
      }
    }, pollingInterval);
    
    this.pollingIntervals.set('bulk_update', intervalId);
    
    // Initial check
    this.checkForBulkStatusUpdates(orderIds);
  }

  // Unsubscribe from bulk order updates
  unsubscribeFromMultipleOrders() {
    this.unsubscribeFromOrderUpdates('bulk_update');
  }

  // Check for status updates on multiple orders
  async checkForBulkStatusUpdates(orderIds) {
    try {
      // Check each order for updates
      const updatePromises = orderIds.map(async (orderId) => {
        try {
          // Use customer split-details endpoint with authentication  
          const token = localStorage.getItem('token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          
          const response = await fetch(getApiUrl(`/orders/${orderId}/split-details`), {
            headers
          });
          
          if (response.ok) {
            const orderData = await response.json();
            
            if (orderData.data) {
              let unifiedStatus = orderData.data.mainOrder?.status || 'placed';
              
              if (orderData.data.isSplit && orderData.data.parts) {
                const partStatuses = orderData.data.parts.map(part => part.status || 'placed');
                unifiedStatus = this.calculateUnifiedStatus(partStatuses);
              }
              
              return {
                orderId,
                unifiedStatus,
                isSplit: orderData.data.isSplit,
                parts: orderData.data.parts || [],
                lastUpdated: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          console.error(`❌ RealTimeOrderService: Failed to check status for order ${orderId}:`, error);
        }
        
        return null;
      });
      
      const updates = await Promise.all(updatePromises);
      const validUpdates = updates.filter(update => update !== null);
      
      if (validUpdates.length > 0) {
        const callback = this.listeners.get('bulk_update');
        if (callback) {
          callback(validUpdates);
        }
      }
    } catch (error) {
      console.error(`❌ RealTimeOrderService: Failed bulk status check:`, error);
    }
  }

  // Clean up all subscriptions
  cleanup() {
    
    // Clear all intervals
    for (const intervalId of this.pollingIntervals.values()) {
      clearInterval(intervalId);
    }
    
    // Clear all data
    this.pollingIntervals.clear();
    this.listeners.clear();
  }
}

// Export singleton instance
export default new RealTimeOrderService();
