const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

class CacheInvalidator {
  
  // Invalidate product-related caches
  static async invalidateProducts() {
    try {
      // Use proper cache key patterns
      await cacheService.clearPattern('cache:/products*');
      await cacheService.clearPattern('cache:/categories*');
      await cacheService.clearPattern('cache:/*'); // Clear all cache as products affect many pages
      logger.debug('Product caches invalidated');
    } catch (error) {
      logger.error('Error invalidating product caches:', error);
    }
  }

  // Invalidate user-related caches
  static async invalidateUsers() {
    try {
      await cacheService.clearPattern('cache:/api/admin/users*');
      logger.debug('User caches invalidated');
    } catch (error) {
      logger.error('Error invalidating user caches:', error);
    }
  }

  // Invalidate order-related caches
  static async invalidateOrders() {
    try {
      await cacheService.clearPattern('cache:/api/orders*');
      await cacheService.clearPattern('cache:/api/admin/orders*');
      await cacheService.clearPattern('cache:/api/vendors/orders*');
      logger.debug('Order caches invalidated');
    } catch (error) {
      logger.error('Error invalidating order caches:', error);
    }
  }

  // Invalidate vendor-related caches
  static async invalidateVendors() {
    try {
      await cacheService.clearPattern('cache:/api/vendors*');
      await cacheService.clearPattern('cache:/api/admin/vendors*');
      logger.debug('Vendor caches invalidated');
    } catch (error) {
      logger.error('Error invalidating vendor caches:', error);
    }
  }

  // Invalidate analytics caches
  static async invalidateAnalytics() {
    try {
      await cacheService.clearPattern('cache:/api/admin/stats*');
      await cacheService.clearPattern('cache:/api/vendors/analytics*');
      logger.debug('Analytics caches invalidated');
    } catch (error) {
      logger.error('Error invalidating analytics caches:', error);
    }
  }

  // Invalidate specific item cache
  static async invalidateItem(type, id) {
    try {
      await cacheService.del(`cache:/api/${type}/${id}`);
      logger.debug(`${type} cache invalidated for ID: ${id}`);
    } catch (error) {
      logger.error(`Error invalidating ${type} cache:`, error);
    }
  }

  // Clear all caches (use sparingly)
  static async clearAllCaches() {
    try {
      await cacheService.clearPattern('cache:*');
      logger.info('All caches cleared');
    } catch (error) {
      logger.error('Error clearing all caches:', error);
    }
  }
}

module.exports = CacheInvalidator;
