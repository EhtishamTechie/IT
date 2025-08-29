import API from '../api';

const inventoryService = {
  // Get inventory overview
  getOverview: () => {
    return API.get('/vendors/inventory/overview');
  },

  // Get inventory items with filters and pagination
  getInventoryItems: (params = {}) => {
    return API.get('/vendors/inventory', { params });
  },

  // Get single inventory item
  getInventoryItem: (id) => {
    return API.get(`/vendors/inventory/${id}`);
  },

  // Update inventory item
  updateInventoryItem: (id, data) => {
    return API.put(`/vendors/inventory/${id}`, data);
  },

  // Adjust stock levels
  adjustStock: (id, adjustmentData) => {
    return API.post(`/vendors/inventory/${id}/adjust`, adjustmentData);
  },

  // Bulk stock update
  bulkStockUpdate: (updates) => {
    return API.post('/vendors/inventory/bulk-update', { updates });
  },

  // Add new batch
  addBatch: (id, batchData) => {
    return API.post(`/vendors/inventory/${id}/batches`, batchData);
  },

  // Get stock movements history
  getStockMovements: (id, params = {}) => {
    return API.get(`/vendors/inventory/${id}/movements`, { params });
  },

  // Get inventory alerts
  getAlerts: (acknowledged = false) => {
    return API.get('/vendors/inventory/alerts/list', { 
      params: { acknowledged: acknowledged.toString() } 
    });
  },

  // Acknowledge alert
  acknowledgeAlert: (inventoryId, alertId) => {
    return API.post(`/vendors/inventory/${inventoryId}/alerts/${alertId}/acknowledge`);
  },

  // Get inventory analytics
  getAnalytics: (period = 30) => {
    return API.get('/vendors/inventory/analytics', { 
      params: { period: period.toString() } 
    });
  },

  // Create inventory for new product
  createInventoryItem: (productId, initialData = {}) => {
    return API.post('/vendors/inventory', {
      product: productId,
      currentStock: 0,
      lowStockThreshold: 10,
      reorderPoint: 20,
      reorderQuantity: 50,
      ...initialData
    });
  },

  // Delete inventory item
  deleteInventoryItem: (id) => {
    return API.delete(`/vendors/inventory/${id}`);
  },

  // Reserve stock for order
  reserveStock: (id, quantity, orderId) => {
    return API.post(`/vendors/inventory/${id}/reserve`, {
      quantity,
      orderId
    });
  },

  // Release reserved stock
  releaseReservedStock: (id, quantity, reason) => {
    return API.post(`/vendors/inventory/${id}/release`, {
      quantity,
      reason
    });
  },

  // Confirm sale and remove from stock
  confirmSale: (id, quantity, orderId) => {
    return API.post(`/vendors/inventory/${id}/confirm-sale`, {
      quantity,
      orderId
    });
  },

  // Update forecast data
  updateForecast: (id, forecastData) => {
    return API.put(`/vendors/inventory/${id}/forecast`, forecastData);
  },

  // Get low stock items
  getLowStockItems: () => {
    return API.get('/vendors/inventory', {
      params: {
        lowStock: true,
        limit: 100
      }
    });
  },

  // Get out of stock items
  getOutOfStockItems: () => {
    return API.get('/vendors/inventory', {
      params: {
        outOfStock: true,
        limit: 100
      }
    });
  },

  // Get items needing reorder
  getReorderItems: () => {
    return API.get('/vendors/inventory/reorder-needed');
  },

  // Export inventory data
  exportInventory: (format = 'csv', filters = {}) => {
    return API.get('/vendors/inventory/export', {
      params: {
        format,
        ...filters
      },
      responseType: 'blob'
    });
  },

  // Import inventory data
  importInventory: (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });

    return API.post('/vendors/inventory/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Sync inventory with product changes
  syncWithProduct: (productId) => {
    return API.post(`/vendors/inventory/sync-product/${productId}`);
  },

  // Calculate inventory valuation
  calculateValuation: (method = 'fifo') => {
    return API.post('/vendors/inventory/calculate-valuation', { method });
  }
};

export default inventoryService;
