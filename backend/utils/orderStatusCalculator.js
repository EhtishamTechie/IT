// Order Status Calculator Utility
// Calculates overall order status based on item statuses

/**
 * Calculate overall order status from item statuses
 * Status Flow: placed → processing → shipped → delivered
 * @param {Array} items - Array of order items with status property
 * @returns {String} - Overall order status
 */
function calculateOrderStatus(items) {
  if (!items || items.length === 0) {
    return 'placed';
  }
  
  const statuses = items.map(item => item.status || item.itemStatus || 'placed');
  
  // If all items are delivered
  if (statuses.every(status => status === 'delivered')) {
    return 'delivered';
  }
  
  // If all items are either shipped or delivered (no processing items left)
  if (statuses.every(status => ['shipped', 'delivered'].includes(status))) {
    return 'shipped';
  }
  
  // If any item is processing
  if (statuses.some(status => status === 'processing')) {
    return 'processing';
  }
  
  // Default to placed
  return 'placed';
}

/**
 * Update item status and recalculate order status
 * @param {Object} order - MongoDB order document
 * @param {String} itemId - Item ID to update
 * @param {String} newStatus - New status for the item
 * @param {Object} updateInfo - Additional update information
 * @returns {Object} - Updated order with new statuses
 */
async function updateItemStatus(order, itemId, newStatus, updateInfo = {}) {
  // Find the item to update
  const item = order.cart.id(itemId);
  if (!item) {
    throw new Error('Item not found in order');
  }
  
  // Store old status for history
  const oldStatus = item.status;
  
  // Update item status
  item.status = newStatus;
  
  // Add tracking information if provided
  if (updateInfo.trackingNumber) {
    item.trackingNumber = updateInfo.trackingNumber;
  }
  if (updateInfo.estimatedDelivery) {
    item.estimatedDelivery = updateInfo.estimatedDelivery;
  }
  
  // Add to status history
  item.statusHistory.push({
    status: newStatus,
    updatedAt: new Date(),
    updatedBy: updateInfo.updatedBy || 'system',
    updatedByType: updateInfo.updatedByType || 'system',
    notes: updateInfo.notes || `Status updated from ${oldStatus} to ${newStatus}`
  });
  
  // Recalculate overall order status
  order.orderStatus = calculateOrderStatus(order.cart);
  
  // Update legacy status field for backward compatibility
  order.status = mapToLegacyStatus(order.orderStatus);
  
  return order;
}

/**
 * Map new status to legacy status for backward compatibility
 * @param {String} newStatus - New 4-status system status
 * @returns {String} - Legacy status
 */
function mapToLegacyStatus(newStatus) {
  const statusMap = {
    'placed': 'Pending',
    'processing': 'Confirmed', 
    'shipped': 'Shipped',
    'delivered': 'Delivered'
  };
  
  return statusMap[newStatus] || 'Pending';
}

/**
 * Map legacy status to new status
 * @param {String} legacyStatus - Legacy status
 * @returns {String} - New 4-status system status
 */
function mapFromLegacyStatus(legacyStatus) {
  const statusMap = {
    'Pending': 'placed',
    'Confirmed': 'processing',
    'Shipped': 'shipped', 
    'Delivered': 'delivered',
    'Cancelled': 'placed', // Reset cancelled orders to placed
    'Rejected': 'placed'   // Reset rejected orders to placed
  };
  
  return statusMap[legacyStatus] || 'placed';
}

/**
 * Initialize item statuses for a new order
 * @param {Array} cartItems - Cart items from order placement
 * @returns {Array} - Cart items with initialized statuses
 */
function initializeItemStatuses(cartItems) {
  return cartItems.map(item => ({
    ...item,
    status: 'placed',
    handledBy: item.vendor ? 'vendor' : 'admin',
    assignedVendor: item.vendor || null,
    statusHistory: [{
      status: 'placed',
      updatedAt: new Date(),
      updatedBy: 'system',
      updatedByType: 'system',
      notes: 'Order placed successfully'
    }]
  }));
}

/**
 * Get items assigned to a specific vendor
 * @param {Object} order - Order document
 * @param {String} vendorId - Vendor ID
 * @returns {Array} - Items assigned to the vendor
 */
function getVendorItems(order, vendorId) {
  return order.cart.filter(item => 
    item.assignedVendor && item.assignedVendor.toString() === vendorId.toString()
  );
}

/**
 * Get admin-handled items
 * @param {Object} order - Order document
 * @returns {Array} - Items handled by admin
 */
function getAdminItems(order) {
  return order.cart.filter(item => item.handledBy === 'admin');
}

/**
 * Check if order can be updated to processing (admin approval)
 * @param {Object} order - Order document
 * @returns {Boolean} - Whether order can be processed
 */
function canProcessOrder(order) {
  return order.orderStatus === 'placed';
}

/**
 * Check if item can be shipped
 * @param {Object} item - Order item
 * @returns {Boolean} - Whether item can be shipped
 */
function canShipItem(item) {
  return item.status === 'processing';
}

/**
 * Check if item can be delivered
 * @param {Object} item - Order item
 * @returns {Boolean} - Whether item can be delivered
 */
function canDeliverItem(item) {
  return item.status === 'shipped';
}

module.exports = {
  calculateOrderStatus,
  updateItemStatus,
  mapToLegacyStatus,
  mapFromLegacyStatus,
  initializeItemStatuses,
  getVendorItems,
  getAdminItems,
  canProcessOrder,
  canShipItem,
  canDeliverItem
};
