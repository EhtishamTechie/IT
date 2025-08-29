/**
 * Order Status Constants and Validation
 * Centralized status management for the entire system
 */

// Standard status values across the entire website
const ORDER_STATUSES = {
  PLACED: 'placed',           // When orders are created initially
  PROCESSING: 'processing',   // When orders are forwarded to vendors
  SHIPPED: 'shipped',         // When admin/vendors make them shipped
  DELIVERED: 'delivered',     // When admin/vendor make them delivered
  CANCELLED: 'cancelled',     // When admin/vendor make them cancelled
  CANCELLED_BY_CUSTOMER: 'cancelled_by_customer' // When order cancelled by customer
};

// Order types
const ORDER_TYPES = {
  ADMIN_ONLY: 'admin_only',
  VENDOR_ONLY: 'vendor_only',
  MIXED: 'mixed',
  LEGACY: 'legacy'
};

// Valid status transitions
const STATUS_TRANSITIONS = {
  [ORDER_STATUSES.PLACED]: [
    ORDER_STATUSES.PROCESSING, 
    ORDER_STATUSES.CANCELLED, 
    ORDER_STATUSES.CANCELLED_BY_CUSTOMER
  ],
  [ORDER_STATUSES.PROCESSING]: [
    ORDER_STATUSES.SHIPPED, 
    ORDER_STATUSES.CANCELLED, 
    ORDER_STATUSES.CANCELLED_BY_CUSTOMER
  ],
  [ORDER_STATUSES.SHIPPED]: [
    ORDER_STATUSES.DELIVERED, 
    ORDER_STATUSES.CANCELLED, 
    ORDER_STATUSES.CANCELLED_BY_CUSTOMER
  ],
  [ORDER_STATUSES.DELIVERED]: [], // Final state
  [ORDER_STATUSES.CANCELLED]: [], // Final state
  [ORDER_STATUSES.CANCELLED_BY_CUSTOMER]: [] // Final state
};

// Legacy status mapping
const LEGACY_STATUS_MAP = {
  'Pending': ORDER_STATUSES.PLACED,
  'Confirmed': ORDER_STATUSES.PROCESSING,
  'Shipped': ORDER_STATUSES.SHIPPED,
  'Delivered': ORDER_STATUSES.DELIVERED,
  'Cancelled': ORDER_STATUSES.CANCELLED
};

// Status priority for mixed order calculation
const STATUS_PRIORITY = {
  [ORDER_STATUSES.DELIVERED]: 5,
  [ORDER_STATUSES.SHIPPED]: 4,
  [ORDER_STATUSES.PROCESSING]: 3,
  [ORDER_STATUSES.PLACED]: 2,
  [ORDER_STATUSES.CANCELLED]: 1,
  [ORDER_STATUSES.CANCELLED_BY_CUSTOMER]: 1
};

/**
 * Validate if status transition is allowed
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Map legacy status to new format
 */
function mapLegacyStatus(status) {
  return LEGACY_STATUS_MAP[status] || status.toLowerCase();
}

/**
 * Calculate overall status for mixed orders based on your requirements
 */
function calculateMixedOrderStatus(subOrderStatuses) {
  if (!subOrderStatuses || subOrderStatuses.length === 0) {
    return ORDER_STATUSES.PLACED;
  }

  // Filter out cancelled orders for status calculation
  const uncancelledStatuses = subOrderStatuses.filter(status => 
    ![ORDER_STATUSES.CANCELLED, ORDER_STATUSES.CANCELLED_BY_CUSTOMER].includes(status)
  );

  // If all orders are cancelled
  if (uncancelledStatuses.length === 0) {
    return ORDER_STATUSES.CANCELLED;
  }

  // When all uncancelled orders became 1 step ahead of 'placed' means 'processing or above'
  if (uncancelledStatuses.every(status => 
    [ORDER_STATUSES.PROCESSING, ORDER_STATUSES.SHIPPED, ORDER_STATUSES.DELIVERED].includes(status)
  )) {
    // When all uncancelled status are ahead of processing means 'shipped'
    if (uncancelledStatuses.every(status => 
      [ORDER_STATUSES.SHIPPED, ORDER_STATUSES.DELIVERED].includes(status)
    )) {
      // When all sub orders becomes delivered
      if (uncancelledStatuses.every(status => status === ORDER_STATUSES.DELIVERED)) {
        return ORDER_STATUSES.DELIVERED;
      }
      return ORDER_STATUSES.SHIPPED;
    }
    return ORDER_STATUSES.PROCESSING;
  }

  // Default to placed if some orders are still in placed status
  return ORDER_STATUSES.PLACED;
}

/**
 * Check if order can be cancelled by customer
 */
function canCustomerCancelOrder(status) {
  return ![
    ORDER_STATUSES.DELIVERED, 
    ORDER_STATUSES.CANCELLED, 
    ORDER_STATUSES.CANCELLED_BY_CUSTOMER
  ].includes(status);
}

/**
 * Check if admin/vendor can change status
 */
function canChangeStatus(currentStatus, userRole = 'admin') {
  // Cannot change status if already cancelled by customer
  if (currentStatus === ORDER_STATUSES.CANCELLED_BY_CUSTOMER) {
    return false;
  }
  
  // Cannot change final statuses
  if ([ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED].includes(currentStatus)) {
    return userRole === 'admin'; // Only admin can change final statuses
  }
  
  return true;
}

module.exports = {
  ORDER_STATUSES,
  ORDER_TYPES,
  STATUS_TRANSITIONS,
  LEGACY_STATUS_MAP,
  STATUS_PRIORITY,
  isValidStatusTransition,
  mapLegacyStatus,
  calculateMixedOrderStatus,
  canCustomerCancelOrder,
  canChangeStatus
};
