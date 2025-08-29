/**
 * Cart Analysis Utility for Order Type Detection
 * Analyzes cart items to determine order type and provide user notifications
 */

/**
 * Analyze cart items to determine order type and provide breakdown
 * @param {Array} cartItems - Array of cart items
 * @returns {Object} - Analysis result with order type, breakdown, and notification data
 */
export const analyzeCart = (cartItems) => {
  if (!cartItems || cartItems.length === 0) {
    return {
      type: 'empty',
      adminItems: [],
      vendorGroups: [],
      totalVendors: 0,
      notification: null
    };
  }

  const adminItems = [];
  const vendorGroups = {};
  
  // Categorize items by handler (admin vs vendor)
  cartItems.forEach(item => {
    
    const productData = item.productData || item;
    
    
    // FIXED: Check vendor info correctly from cart structure
    const hasVendor = productData.vendor && productData.vendor._id;
    
    
    if (!hasVendor || productData.handledBy === 'admin') {
      // Admin handled item
      adminItems.push({
        ...item,
        handlerType: 'admin',
        handlerName: 'International Tijarat'
      });
    } else {
      // Vendor handled item
      const vendorId = productData.vendor._id || 'unknown-vendor';
      const vendorName = productData.vendor.businessName || 'Unknown Vendor';
      
      
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendorId,
          vendorName,
          items: []
        };
      }
      
      vendorGroups[vendorId].items.push({
        ...item,
        handlerType: 'vendor',
        handlerName: vendorName
      });
    }
  });

  // Determine order type
  let orderType = 'admin_only';
  const vendorGroupArray = Object.values(vendorGroups);
  const totalVendors = vendorGroupArray.length;

  if (adminItems.length > 0 && totalVendors > 0) {
    orderType = 'mixed';
  } else if (totalVendors === 1) {
    orderType = 'vendor_only';
  } else if (totalVendors > 1) {
    orderType = 'mixed';
  }


  // Generate notification for mixed orders
  let notification = null;
  if (orderType === 'mixed') {
    notification = {
      type: 'mixed_order',
      title: '📦 Multi-Vendor Order Notice',
      message: 'Your order contains items from different suppliers and will be handled as follows:',
      breakdown: [
        ...(adminItems.length > 0 ? [{
          icon: '🏢',
          text: `${adminItems.length} items handled by our warehouse`,
          color: 'blue'
        }] : []),
        ...vendorGroupArray.map(group => ({
          icon: '🏪',
          text: `${group.items.length} items from ${group.vendorName}`,
          color: 'purple'
        }))
      ],
      warning: '⚠️ Important: Items may be shipped separately and arrive at different times. You\'ll receive tracking information for each shipment.',
      buttonText: orderType === 'mixed' ? 'Place Multi-Vendor Order' : 'Place Order'
    };
  }

  const result = {
    type: orderType,
    adminItems,
    vendorGroups: vendorGroupArray,
    totalVendors,
    notification
  };

  
  return result;
};

/**
 * Check if user should be notified about mixed delivery times
 * @param {Object} cartAnalysis - Result from analyzeCart
 * @returns {Boolean} - Whether to show delivery notification
 */
export const shouldShowDeliveryNotification = (cartAnalysis) => {
  return cartAnalysis.type === 'mixed' && cartAnalysis.totalVendors > 0;
};

/**
 * Generate delivery time estimate message
 * @param {Object} cartAnalysis - Result from analyzeCart
 * @returns {String} - Delivery estimate message
 */
export const generateDeliveryEstimate = (cartAnalysis) => {
  if (cartAnalysis.type === 'admin_only') {
    return 'Standard delivery: 3-5 business days';
  } else if (cartAnalysis.type === 'vendor_only') {
    return 'Vendor delivery: 5-7 business days';
  } else if (cartAnalysis.type === 'mixed') {
    return 'Mixed delivery: Items will arrive at different times (3-7 business days)';
  }
  return 'Delivery time will be confirmed after order placement';
};

/**
 * Get order type display name
 * @param {String} orderType - Order type from analysis
 * @returns {String} - Human readable order type
 */
export const getOrderTypeDisplayName = (orderType) => {
  switch (orderType) {
    case 'admin_only': return 'Warehouse Order';
    case 'vendor_only': return 'Vendor Order';
    case 'mixed': return 'Multi-Vendor Order';
    default: return 'Standard Order';
  }
};

export default {
  analyzeCart,
  shouldShowDeliveryNotification, 
  generateDeliveryEstimate,
  getOrderTypeDisplayName
};
