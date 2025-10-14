/**
 * Analytics utility for tracking events with Google Tag Manager
 * Works with your existing GTM-GA4 setup
 */

// Check if GTM dataLayer is available
const isDataLayerAvailable = () => {
  return typeof window !== 'undefined' && window.dataLayer;
};

/**
 * Track page views for SPA navigation
 * @param {string} pagePath - The page path
 * @param {string} pageTitle - The page title
 */
export const trackPageView = (pagePath, pageTitle) => {
  try {
    if (isDataLayerAvailable()) {
      window.dataLayer.push({
        event: 'page_view',
        page_path: pagePath,
        page_title: pageTitle,
        page_location: window.location.href
      });
      console.log(`📊 GTM: Page view tracked - ${pageTitle} (${pagePath})`);
    } else {
      console.warn('⚠️ GTM dataLayer not available');
    }
  } catch (error) {
    console.error('❌ GTM: Error tracking page view:', error);
  }
};

/**
 * Track e-commerce events
 * @param {string} eventName - Event name (view_item, add_to_cart, purchase, etc.)
 * @param {Object} eventData - Event data
 */
export const trackEcommerceEvent = (eventName, eventData) => {
  try {
    if (isDataLayerAvailable()) {
      window.dataLayer.push({
        event: eventName,
        ecommerce: eventData
      });
      console.log(`📊 GTM: E-commerce event tracked - ${eventName}`, eventData);
    } else {
      console.warn('⚠️ GTM dataLayer not available');
    }
  } catch (error) {
    console.error('❌ GTM: Error tracking e-commerce event:', error);
  }
};

/**
 * Track product view
 * @param {Object} product - Product data
 */
export const trackProductView = (product) => {
  trackEcommerceEvent('view_item', {
    currency: 'USD',
    value: product.price,
    items: [{
      item_id: product._id,
      item_name: product.title,
      category: product.mainCategory,
      price: product.price,
      quantity: 1
    }]
  });
};

/**
 * Track add to cart
 * @param {Object} product - Product data
 * @param {number} quantity - Quantity added
 */
export const trackAddToCart = (product, quantity = 1) => {
  trackEcommerceEvent('add_to_cart', {
    currency: 'USD',
    value: product.price * quantity,
    items: [{
      item_id: product._id,
      item_name: product.title,
      category: product.mainCategory,
      price: product.price,
      quantity: quantity
    }]
  });
};

/**
 * Track custom events via GTM dataLayer
 * @param {string} eventName - Event name
 * @param {Object} parameters - Event parameters
 */
export const trackCustomEvent = (eventName, parameters = {}) => {
  try {
    if (isDataLayerAvailable()) {
      window.dataLayer.push({
        event: eventName,
        ...parameters
      });
      console.log(`📊 GTM: Custom event tracked - ${eventName}`, parameters);
    } else {
      console.warn('⚠️ GTM dataLayer not available');
    }
  } catch (error) {
    console.error('❌ GTM: Error tracking custom event:', error);
  }
};

/**
 * Debug function to check GTM setup
 */
export const debugAnalytics = () => {
  console.log('🔍 GTM Analytics Debug Info:');
  console.log('DataLayer Available:', isDataLayerAvailable());
  console.log('Current URL:', window.location.href);
  
  if (isDataLayerAvailable()) {
    console.log('DataLayer contents:', window.dataLayer);
    
    // Test event
    window.dataLayer.push({
      event: 'debug_test',
      debug_info: 'GTM connection test'
    });
    console.log('✅ Test event pushed to dataLayer');
  }
};