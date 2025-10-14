// Cart Context for global cart state management
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import CartService from '../services/CartService';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

// Cart actions
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_CART: 'LOAD_CART',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Cart reducer
const cartReducer = (state, action) => {
  console.log('CartReducer called with action:', action.type, action.payload);
  console.log('Current state:', state);
  
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const existingItem = state.items.find(item => item._id === action.payload._id);
      console.log('Existing item found:', existingItem);
      
      if (existingItem) {
        const newState = {
          ...state,
          items: state.items.map(item =>
            item._id === action.payload._id
              ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
              : item
          )
        };
        console.log('Updated existing item, new state:', newState);
        return newState;
      }
      
      // Ensure product data is properly structured
    const productData = {
      ...action.payload,
      _id: action.payload._id,
      title: action.payload.title,
      price: action.payload.price,
      shipping: action.payload.shipping || 0, // Include shipping field
      image: action.payload.image || (action.payload.images?.[0] || null), // Primary image first, then fallback
      stock: action.payload.stock || 100,
      quantity: action.payload.quantity || 1
    };

    const newState = {
      ...state,
      items: [...state.items, productData]
    };
    console.log('Added new item with data:', productData);
      return newState;
    }
    
    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item._id !== action.payload)
      };
    
    case CART_ACTIONS.UPDATE_QUANTITY:
      return {
        ...state,
        items: state.items.map(item =>
          item._id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item
        ).filter(item => item.quantity > 0)
      };
    
    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: []
      };
    
    case CART_ACTIONS.LOAD_CART:
      return {
        ...state,
        items: action.payload || [],
        loading: false,
        error: null
      };
    
    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case CART_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    default:
      return state;
  }
};

// Initial cart state
const initialCartState = {
  items: [],
  loading: false,
  error: null
};

// Create cart context
const CartContext = createContext();

  // Cart provider component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  // Load cart from backend when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCartFromBackend();
    } else {
      // Clear cart when user logs out
      dispatch({ type: CART_ACTIONS.CLEAR_CART });
    }
  }, [isAuthenticated, user]);

  // Load cart from backend
  const loadCartFromBackend = async () => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      const result = await CartService.getCart();
      
      if (result.success) {
        
        dispatch({ 
          type: CART_ACTIONS.LOAD_CART, 
          payload: result.cart.items || [] 
        });
      } else {
        console.error('Failed to load cart:', result.error);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Cart actions
  const addToCart = async (product, quantity = 1) => {
    console.log('CartContext addToCart called with:', product._id, quantity);
    console.log('Current state.items:', state.items);
    console.log('IsAuthenticated:', isAuthenticated);
    
    // Check if user is authenticated first
    if (!isAuthenticated) {
      showError('You should login first', { 
        title: 'Login Required',
        duration: 3000 
      });
      return { success: false, error: 'Authentication required' };
    }
    
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      const result = await CartService.addToCart(product._id, quantity);
      if (result.success) {
        console.log('Backend cart result:', result.cart.items);
        dispatch({ 
          type: CART_ACTIONS.LOAD_CART, 
          payload: result.cart.items 
        });
        
        // Show success notification
        showSuccess(
          `${product.title || product.name} ${quantity > 1 ? `(x${quantity})` : ''} added to cart!`,
          { title: 'Added to Cart' }
        );
        
        return { success: true };
      } else {
        // Check if it's an authentication error
        if (result.error && (result.error.includes('token') || result.error.includes('auth') || result.error.includes('login'))) {
          showError('You should login first', { 
            title: 'Login Required',
            duration: 3000 
          });
        } else {
          showError(result.error || 'Failed to add item to cart');
        }
        
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Cart add error:', error);
      
      // Check if it's an authentication error (401 status)
      if (error.response?.status === 401) {
        showError('You should login first', { 
          title: 'Login Required',
          duration: 3000 
        });
        return { success: false, error: 'Authentication required' };
      }
      
      const errorMessage = 'Failed to add item to cart';
      
      // Show error notification
      showError(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const removeFromCart = async (productId) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      if (!isAuthenticated) {
        // For non-authenticated users, use local state
        dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: productId });
        return;
      }
      
      const result = await CartService.removeFromCart(productId);
      if (result.success) {
        dispatch({ 
          type: CART_ACTIONS.LOAD_CART, 
          payload: result.cart.items 
        });
      } else {
        showError(result.error || 'Failed to remove item from cart');
      }
    } catch (error) {
      showError('Failed to remove item from cart');
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!isAuthenticated) return;

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      const result = await CartService.updateCartItem(productId, quantity);
      if (result.success) {
        dispatch({ 
          type: CART_ACTIONS.LOAD_CART, 
          payload: result.cart.items 
        });
      } else {
        showError(result.error || 'Failed to update cart item');
      }
    } catch (error) {
      showError('Failed to update cart item');
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) return;

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      const result = await CartService.clearCart();
      if (result.success) {
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
      } else {
        showError(result.error || 'Failed to clear cart');
      }
    } catch (error) {
      showError('Failed to clear cart');
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Cart calculations
  const cartStats = {
    items: state.items, // Add items array for shipping calculations
    totalItems: state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: state.items.reduce((sum, item) => {
      // Handle both direct price and productData.price structures
      const itemPrice = item.price || item.productData?.price || 0;
      return sum + (itemPrice * item.quantity);
    }, 0),
    itemCount: state.items.length,
    isEmpty: state.items.length === 0
  };

  // Cart utilities
  const isInCart = (productId) => {
    return state.items.some(item => {
      // Handle both direct _id and productData._id structures
      return item._id === productId || item.productData?._id === productId;
    });
  };

  const getCartItem = (productId) => {
    return state.items.find(item => {
      // Handle both direct _id and productData._id structures
      return item._id === productId || item.productData?._id === productId;
    });
  };

  const value = {
    // State
    cartItems: state.items,
    cartStats,
    loading: state.loading,
    error: state.error,
    
    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    
    // Utilities
    isInCart,
    getCartItem
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
