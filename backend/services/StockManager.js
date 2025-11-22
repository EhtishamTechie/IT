const Product = require('../models/Product');
const Order = require('../models/Order');

class StockManager {
  
  /**
   * Check if products are available in stock
   * @param {Array} cartItems - Array of {productId, quantity, selectedSize}
   * @returns {Object} - {success: boolean, message: string, unavailable: Array}
   */
  static async checkStockAvailability(cartItems) {
    try {
      const unavailableItems = [];
      const stockChecks = [];

      for (const item of cartItems) {
        console.log(`🔍 Checking product: ${item.productId}, size: ${item.selectedSize || 'N/A'}`);
        const product = await Product.findById(item.productId);
        
        if (!product) {
          console.log(`❌ Product not found in database: ${item.productId}`);
          unavailableItems.push({
            productId: item.productId,
            reason: 'Product not found'
          });
          continue;
        }
        
        console.log(`✅ Product found: ${product.title} (Stock: ${product.stock}, Active: ${product.isActive}, HasSizes: ${product.hasSizes})`)

        if (!product.isActive) {
          unavailableItems.push({
            productId: item.productId,
            title: product.title,
            reason: 'Product is no longer available'
          });
          continue;
        }

        // Check size-specific stock if product has sizes
        if (product.hasSizes && item.selectedSize) {
          const sizeStock = product.sizeStock?.get?.(item.selectedSize) || product.sizeStock?.[item.selectedSize] || 0;
          console.log(`📏 Size stock check for ${item.selectedSize}: ${sizeStock}`);
          
          if (sizeStock < item.quantity) {
            unavailableItems.push({
              productId: item.productId,
              title: product.title,
              size: item.selectedSize,
              requested: item.quantity,
              available: sizeStock,
              reason: `Insufficient stock for size ${item.selectedSize}. Only ${sizeStock} available`
            });
            continue;
          }
        } else {
          // Regular stock check for products without sizes
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
        }

        stockChecks.push({
          productId: item.productId,
          title: product.title,
          quantity: item.quantity,
          size: item.selectedSize,
          available: product.hasSizes && item.selectedSize 
            ? (product.sizeStock?.get?.(item.selectedSize) || product.sizeStock?.[item.selectedSize] || 0)
            : product.stock
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
   * @param {Array} cartItems - Array of {productId, quantity, selectedSize}
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
        console.log(`📦 Processing item: ${item.productId} (quantity: ${item.quantity}, size: ${item.selectedSize || 'N/A'})`);
        
        const product = await Product.findById(item.productId);
        
        if (!product) {
          console.log(`❌ Product not found: ${item.productId}`);
          throw new Error(`Product ${item.productId} not found`);
        }

        console.log(`📦 Product found: ${product.title} (current stock: ${product.stock}, hasSizes: ${product.hasSizes})`);

        // Handle size-specific stock
        if (product.hasSizes && item.selectedSize) {
          const sizeStock = product.sizeStock?.get?.(item.selectedSize) || product.sizeStock?.[item.selectedSize] || 0;
          
          if (sizeStock < item.quantity) {
            console.log(`❌ Insufficient stock for ${product.title} size ${item.selectedSize}. Available: ${sizeStock}, Requested: ${item.quantity}`);
            throw new Error(`Insufficient stock for ${product.title} size ${item.selectedSize}. Available: ${sizeStock}, Requested: ${item.quantity}`);
          }

          // Store original stock for logging
          const originalSizeStock = sizeStock;
          
          // Decrease size-specific stock
          if (!product.sizeStock) {
            product.sizeStock = new Map();
          }
          product.sizeStock.set(item.selectedSize, sizeStock - item.quantity);
          product.soldCount = (product.soldCount || 0) + item.quantity;
          
          // Save only the modified fields to avoid validation errors on other fields
          await product.save({ validateModifiedOnly: true });
          
          console.log(`📉 ${product.title} (${item.selectedSize}): Stock reduced by ${item.quantity} (${originalSizeStock} → ${sizeStock - item.quantity})`);
        } else {
          // Regular stock management for products without sizes
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

        // Handle size-specific stock release
        if (product.hasSizes && item.selectedSize) {
          const currentSizeStock = product.sizeStock?.get?.(item.selectedSize) || product.sizeStock?.[item.selectedSize] || 0;
          
          if (!product.sizeStock) {
            product.sizeStock = new Map();
          }
          product.sizeStock.set(item.selectedSize, currentSizeStock + item.quantity);
          product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
          
          // Save only the modified fields to avoid validation errors on other fields
          await product.save({ validateModifiedOnly: true });
          
          console.log(`📈 ${product.title} (${item.selectedSize}): Stock increased by ${item.quantity} (${currentSizeStock} → ${currentSizeStock + item.quantity})`);
        } else {
          // Regular stock release for products without sizes
          product.stock += item.quantity;
          product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
          
          // Save only the modified fields to avoid validation errors on other fields
          await product.save({ validateModifiedOnly: true });
          
          console.log(`📈 ${product.title}: Stock increased by ${item.quantity} (${product.stock - item.quantity} → ${product.stock})`);
        }
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
   * @param {String} selectedSize - Size to restore (optional)
   * @returns {Object} - {success: boolean, message: string}
   */
  static async restoreStock(productId, quantity, selectedSize = null) {
    try {
      console.log(`📦 Restoring stock for product: ${productId}, quantity: ${quantity}, size: ${selectedSize || 'N/A'}`);
      
      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`⚠️ Product ${productId} not found during stock restoration`);
        return {
          success: false,
          message: 'Product not found'
        };
      }

      // Handle size-specific stock restoration
      if (product.hasSizes && selectedSize) {
        const currentSizeStock = product.sizeStock?.get?.(selectedSize) || product.sizeStock?.[selectedSize] || 0;
        
        if (!product.sizeStock) {
          product.sizeStock = new Map();
        }
        product.sizeStock.set(selectedSize, currentSizeStock + quantity);
        product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
        
        // Save only the modified fields to avoid validation errors on other fields
        await product.save({ validateModifiedOnly: true });
        
        console.log(`📈 ${product.title} (${selectedSize}): Stock increased by ${quantity} (${currentSizeStock} → ${currentSizeStock + quantity})`);
      } else {
        // Regular stock restoration for products without sizes
        product.stock += quantity;
        product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
        
        // Save only the modified fields to avoid validation errors on other fields
        await product.save({ validateModifiedOnly: true });
        
        console.log(`📈 ${product.title}: Stock increased by ${quantity} (${product.stock - quantity} → ${product.stock})`);
      }
      
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
