const Product = require('../models/Product');
const Order = require('../models/Order');

class StockManager {
  
  /**
   * Check if products are available in stock
   * @param {Array} cartItems - Array of {productId, quantity}
   * @returns {Object} - {success: boolean, message: string, unavailable: Array}
   */
  static async checkStockAvailability(cartItems) {
    try {
      const unavailableItems = [];
      const stockChecks = [];

      for (const item of cartItems) {
        console.log(`🔍 Checking product: ${item.productId}`);
        const product = await Product.findById(item.productId);
        
        if (!product) {
          console.log(`❌ Product not found in database: ${item.productId}`);
          unavailableItems.push({
            productId: item.productId,
            reason: 'Product not found'
          });
          continue;
        }
        
        console.log(`✅ Product found: ${product.title} (Stock: ${product.stock}, Active: ${product.isActive})`)

        if (!product.isActive) {
          unavailableItems.push({
            productId: item.productId,
            title: product.title,
            reason: 'Product is no longer available'
          });
          continue;
        }

        if (product.stock < item.quantity) {
          unavailableItems.push({
            productId: item.productId,
            title: product.title,
            requested: item.quantity,
            available: product.stock,
            reason: `Insufficient stock. Only ${product.stock} available`
          });
          continue;
        }

        stockChecks.push({
          productId: item.productId,
          title: product.title,
          quantity: item.quantity,
          available: product.stock
        });
      }

      return {
        success: unavailableItems.length === 0,
        available: stockChecks,
        unavailable: unavailableItems,
        message: unavailableItems.length === 0 
          ? 'All items are available' 
          : `${unavailableItems.length} items are unavailable`
      };

    } catch (error) {
      console.error('Error checking stock availability:', error);
      return {
        success: false,
        message: 'Error checking stock availability',
        error: error.message
      };
    }
  }

  /**
   * Reserve stock when order is placed (decrease stock)
   * @param {Array} cartItems - Array of {productId, quantity}
   * @param {String} orderId - Order ID for tracking
   * @returns {Object} - {success: boolean, message: string}
   */
  static async reserveStock(cartItems, orderId) {
    try {
      console.log(`📦 Reserving stock for order: ${orderId}`);
      console.log(`📦 Cart items received:`, JSON.stringify(cartItems, null, 2));
      
      // First check availability for all items
      const stockCheck = await this.checkStockAvailability(cartItems);
      if (!stockCheck.success) {
        return {
          success: false,
          message: stockCheck.message,
          error: 'Stock not available'
        };
      }
      
      // Reserve stock for each item (without transactions for development)
      for (const item of cartItems) {
        console.log(`📦 Processing item: ${item.productId} (quantity: ${item.quantity})`);
        
        const product = await Product.findById(item.productId);
        
        if (!product) {
          console.log(`❌ Product not found: ${item.productId}`);
          throw new Error(`Product ${item.productId} not found`);
        }

        console.log(`📦 Product found: ${product.title} (current stock: ${product.stock})`);

        if (product.stock < item.quantity) {
          console.log(`❌ Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`);
          throw new Error(`Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        // Store original stock for logging
        const originalStock = product.stock;
        
        // Decrease stock
        product.stock -= item.quantity;
        product.soldCount = (product.soldCount || 0) + item.quantity;
        
        // Save only the modified fields to avoid validation errors on other fields
        await product.save({ validateModifiedOnly: true });
        
        console.log(`📉 ${product.title}: Stock reduced by ${item.quantity} (${originalStock} → ${product.stock})`);
      }
      
      return {
        success: true,
        message: 'Stock reserved successfully'
      };

    } catch (error) {
      console.error('Error reserving stock:', error);
      
      return {
        success: false,
        message: 'Failed to reserve stock',
        error: error.message
      };
    }
  }

  /**
   * Release stock when order is cancelled (increase stock)
   * @param {String} orderId - Order ID
   * @returns {Object} - {success: boolean, message: string}
   */
  static async releaseStock(orderId) {
    try {
      console.log(`📦 Releasing stock for cancelled order: ${orderId}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      for (const item of order.cart) {
        if (!item.productId) {
          console.warn(`⚠️ No productId found for item: ${item.title}`);
          continue;
        }

        const product = await Product.findById(item.productId);
        
        if (!product) {
          console.warn(`⚠️ Product ${item.productId} not found during stock release`);
          continue;
        }

        // Increase stock back
        product.stock += item.quantity;
        product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
        
        // Save only the modified fields to avoid validation errors on other fields
        await product.save({ validateModifiedOnly: true });
        
        console.log(`📈 ${product.title}: Stock increased by ${item.quantity} (${product.stock - item.quantity} → ${product.stock})`);
      }
      
      return {
        success: true,
        message: 'Stock released successfully'
      };

    } catch (error) {
      console.error('Error releasing stock:', error);
      
      return {
        success: false,
        message: 'Failed to release stock',
        error: error.message
      };
    }
  }

  /**
   * Restore stock for individual items when cancelling parts of an order
   * @param {String} productId - Product ID
   * @param {Number} quantity - Quantity to restore
   * @returns {Object} - {success: boolean, message: string}
   */
  static async restoreStock(productId, quantity) {
    try {
      console.log(`📦 Restoring stock for product: ${productId}, quantity: ${quantity}`);
      
      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`⚠️ Product ${productId} not found during stock restoration`);
        return {
          success: false,
          message: 'Product not found'
        };
      }

      // Increase stock back
      product.stock += quantity;
      product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
      
      // Save only the modified fields to avoid validation errors on other fields
      await product.save({ validateModifiedOnly: true });
      
      console.log(`📈 ${product.title}: Stock increased by ${quantity} (${product.stock - quantity} → ${product.stock})`);
      
      return {
        success: true,
        message: 'Stock restored successfully'
      };

    } catch (error) {
      console.error('Error restoring stock:', error);
      
      return {
        success: false,
        message: 'Failed to restore stock',
        error: error.message
      };
    }
  }

  /**
   * Update product stock (admin function)
   * @param {String} productId - Product ID
   * @param {Number} newStock - New stock quantity
   * @returns {Object} - {success: boolean, message: string}
   */
  static async updateStock(productId, newStock) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      const oldStock = product.stock;
      product.stock = newStock;
      // Save only the modified fields to avoid validation errors on other fields
      await product.save({ validateModifiedOnly: true });

      console.log(`📊 ${product.title}: Stock updated (${oldStock} → ${newStock})`);

      return {
        success: true,
        message: `Stock updated from ${oldStock} to ${newStock}`,
        product: {
          id: product._id,
          title: product.title,
          oldStock,
          newStock
        }
      };

    } catch (error) {
      console.error('Error updating stock:', error);
      
      return {
        success: false,
        message: 'Failed to update stock',
        error: error.message
      };
    }
  }

  /**
   * Get low stock products (stock <= threshold)
   * @param {Number} threshold - Stock threshold (default: 5)
   * @returns {Array} - Array of low stock products
   */
  static async getLowStockProducts(threshold = 5) {
    try {
      const lowStockProducts = await Product.find({
        stock: { $lte: threshold },
        isActive: true
      }).select('title stock mainCategory subCategory');

      return {
        success: true,
        products: lowStockProducts,
        count: lowStockProducts.length
      };

    } catch (error) {
      console.error('Error getting low stock products:', error);
      
      return {
        success: false,
        message: 'Failed to get low stock products',
        error: error.message
      };
    }
  }

  /**
   * Get stock summary for dashboard
   * @returns {Object} - Stock statistics
   */
  static async getStockSummary() {
    try {
      const totalProducts = await Product.countDocuments({ isActive: true });
      const outOfStock = await Product.countDocuments({ stock: 0, isActive: true });
      const lowStock = await Product.countDocuments({ stock: { $lte: 5, $gt: 0 }, isActive: true });
      const inStock = await Product.countDocuments({ stock: { $gt: 5 }, isActive: true });

      return {
        success: true,
        summary: {
          totalProducts,
          inStock,
          lowStock,
          outOfStock,
          stockPercentage: Math.round((inStock / totalProducts) * 100)
        }
      };

    } catch (error) {
      console.error('Error getting stock summary:', error);
      
      return {
        success: false,
        message: 'Failed to get stock summary',
        error: error.message
      };
    }
  }
}

module.exports = StockManager;
