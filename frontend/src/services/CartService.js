import API from '../api';

class CartService {
  // Get user's cart
  static async getCart() {
    try {
      const response = await API.get('/cart');
      return {
        success: true,
        cart: response.data.cart
      };
    } catch (error) {
      console.error('Error getting cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get cart'
      };
    }
  }

  // Add item to cart
  static async addToCart(productId, quantity = 1) {
    try {
      const response = await API.post('/cart/add', {
        productId,
        quantity
      });
      return {
        success: true,
        cart: response.data.cart,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add item to cart'
      };
    }
  }

  // Update item quantity in cart
  static async updateCartItem(productId, quantity) {
    try {
      const response = await API.put('/cart/update', {
        productId,
        quantity
      });
      return {
        success: true,
        cart: response.data.cart,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update cart item'
      };
    }
  }

  // Remove item from cart
  static async removeFromCart(productId) {
    try {
      const response = await API.delete(`/cart/remove/${productId}`);
      return {
        success: true,
        cart: response.data.cart,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove item from cart'
      };
    }
  }

  // Clear entire cart
  static async clearCart() {
    try {
      const response = await API.delete('/cart/clear');
      return {
        success: true,
        cart: response.data.cart,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to clear cart'
      };
    }
  }
}

export default CartService;
