import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { getImageUrl, config } from "../config";

const CartPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const navigate = useNavigate();
  
  // Use cart and auth contexts
  const { 
    cartItems, 
    cartStats, 
    removeFromCart: removeFromCartContext, 
    updateQuantity: updateQuantityContext, 
    clearCart: clearCartContext 
  } = useCart();
  const { isAuthenticated } = useAuth();
  const { showError } = useNotification();

  // All hooks must be defined before any conditional logic
  const removeItem = useCallback((productId) => {
    setUpdatingItemId(productId);
    setTimeout(() => {
      removeFromCartContext(productId);
      setUpdatingItemId(null);
    }, 300);
  }, [removeFromCartContext]);

  const updateQuantity = useCallback(async (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }
    
    // Find the cart item to get stock information
    const cartItem = cartItems.find(item => {
      const itemId = item.productData?._id || item._id;
      return itemId === productId;
    });
    
    if (!cartItem) return;
    
    // Get stock information for validation
    const availableStock = cartItem.productData?.stock || cartItem.stock;
    
    // Check if we're trying to set quantity beyond available stock
    if (availableStock !== undefined && newQuantity > availableStock) {
      showError(
        `Cannot add more items. Only ${availableStock} items available in stock.`
      );
      return;
    }
    
    setUpdatingItemId(productId);
    
    try {
      await updateQuantityContext(productId, newQuantity);
      setUpdatingItemId(null);
    } catch (error) {
      setUpdatingItemId(null);
      // Handle backend stock validation errors
      if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError('Failed to update quantity. Please try again.');
      }
    }
  }, [updateQuantityContext, removeItem, cartItems, showError]);

  const clearCart = useCallback(() => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCartContext();
    }
  }, [clearCartContext]);

  const { subtotal, totalItems, shipping, total } = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.productData?.price || item.price || 0;
      return sum + (price * item.quantity);
    }, 0);
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate shipping - find maximum shipping cost among all products
    let shipping = 0;
    if (cartItems.length > 0) {
      console.log('CartPage: Cart items for shipping calculation:', cartItems);
      const shippingCosts = cartItems.map(item => {
        const productShipping = item.productData?.shipping || item.shipping || 0;
        console.log('CartPage: Item shipping data:', {
          itemId: item._id,
          hasProductData: !!item.productData,
          productData: item.productData,
          productDataShipping: item.productData?.shipping,
          itemShipping: item.shipping,
          finalShipping: productShipping
        });
        return parseFloat(productShipping) || 0;
      });
      console.log('CartPage: All shipping costs:', shippingCosts);
      shipping = Math.max(...shippingCosts, 0);
      console.log('CartPage: Maximum shipping cost:', shipping);
    }
    
    // Apply free shipping rule for orders >= $10,000
    if (subtotal >= 10000) {
      shipping = 0;
    }
    
    const total = subtotal + shipping;
    
    return { subtotal, totalItems, shipping, total };
  }, [cartItems]);

  // Update document title
  useEffect(() => {
    document.title = cartStats.totalItems > 0 
      ? `Shopping Cart (${cartStats.totalItems}) - International Tijarat`
      : 'Shopping Cart - International Tijarat';
  }, [cartStats.totalItems]);

  // Show login requirement if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          </div>
        </div>

        {/* Login Required Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            {/* Amazon-style icon */}
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Sign in to see your cart</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Your shopping cart is waiting! Sign in to view your items and complete your purchase.
            </p>
            
            {/* Action Buttons - Amazon Style */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <button 
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-8 py-3 rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-medium text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="bg-white text-gray-700 border-2 border-gray-300 px-8 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-lg"
              >
                Create Account
              </button>
            </div>
            
            {/* Continue Shopping Link */}
            <div className="border-t pt-6">
              <Link 
                to="/" 
                className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Continue Shopping
              </Link>
            </div>
          </div>
          
          {/* Additional Features Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Shopping</h3>
              <p className="text-sm text-gray-600">Your data is protected with industry-standard encryption</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Easy Returns</h3>
              <p className="text-sm text-gray-600">30-day return policy on most items</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 3M7 13l2.5 3m9.5-3v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Save Your Cart</h3>
              <p className="text-sm text-gray-600">Items stay in your cart across devices</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Icons
  const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const MinusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
    </svg>
  );

  const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );

  // Empty Cart Component
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          </div>
        </div>

        {/* Empty Cart Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            {/* Amazon-style cart icon */}
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 3M7 13l2.5 3m9.5-3v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Start adding items to your cart to see them here. Explore our amazing products!
            </p>
            
            {/* Action Button */}
            <button 
              onClick={() => navigate('/products')}
              className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-8 py-3 rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-medium text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Start Shopping
            </button>
            
            {/* Popular Categories */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Categories</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {['Electronics', 'Fashion & Style', 'Beauty & Cosmetic', 'Furniture', 'Groceries'].map((category) => (
                  <button
                    key={category}
                    onClick={() => navigate(`/category-group/${category.toLowerCase().replace(' & ', '-').replace(' ', '-')}`)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cart Item Component
  const CartItem = ({ item }) => {
    const productId = item.productData?._id || item._id;
    const isUpdating = updatingItemId === productId;
    const [imageError, setImageError] = useState(false);

    // Handle both backend cart structure and legacy structure
    const title = item.productData?.title || item.title;
    const price = item.productData?.price || item.price;
    const image = item.productData?.image || item.image;
    const currency = item.productData?.currency || item.currency || 'USD';
    
    // Use consistent getImageUrl approach like other working components
    const imageUrl = getImageUrl('products', image);
    
    // Debug logging for image URL
    console.log('🖼️ Cart item image debug:', {
      productId: productId,
      title: title,
      originalImage: image,
      finalImageUrl: imageUrl
    });

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {!imageError ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                onLoad={() => {
                  console.log('✅ Image loaded successfully:', imageUrl);
                }}
                onError={(e) => {
                  console.log('❌ Image failed to load:', imageUrl);
                  setImageError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <div className="w-8 h-8 bg-gray-400 rounded mx-auto mb-1"></div>
                  <div className="text-xs text-gray-500">No Image</div>
                </div>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium text-gray-900 line-clamp-2 pr-4">
                {title}
              </h3>
              <button
                onClick={() => removeItem(productId)}
                disabled={isUpdating}
                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                title="Remove item"
              >
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                ) : (
                  <TrashIcon />
                )}
              </button>
            </div>

            {/* Brand and Category */}
            <div className="text-sm text-gray-600 mb-3">
              {item.brand && <span>{item.brand}</span>}
              {item.brand && item.category && <span className="mx-2">•</span>}
              {item.category && <span>{item.category}</span>}
              {item.selectedSize && (
                <>
                  {(item.brand || item.category) && <span className="mx-2">•</span>}
                  <span className="font-medium text-gray-700">Size: {item.selectedSize}</span>
                </>
              )}
            </div>

            {/* Stock Status - Default to In Stock since we're adding items to cart */}
            <div className="text-sm text-green-600 mb-3">
              {item.inStock !== false ? 'In Stock' : 'Out of Stock'}
            </div>

            {/* Price and Quantity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">
                  PKR {(price * item.quantity).toFixed(2)}
                </span>
                {item.originalPrice && item.originalPrice > price && (
                  <span className="text-sm text-gray-500 line-through">
                    PKR {(item.originalPrice * item.quantity).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center border border-gray-300 rounded">
                <button
                  onClick={() => updateQuantity(productId, item.quantity - 1)}
                  disabled={isUpdating || item.quantity <= 1}
                  className="p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MinusIcon />
                </button>
                <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                  {isUpdating ? '...' : item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(productId, item.quantity + 1)}
                  disabled={isUpdating}
                  className="p-2 hover:bg-gray-50 disabled:opacity-50"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>

            {/* Free Shipping */}
            {item.freeShipping && (
              <div className="text-sm text-green-600 mt-2">Free Shipping</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Amazon-style Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
              <p className="text-gray-600 mt-1">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <button
                onClick={clearCart}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Cart
              </button>
              <button
                onClick={() => navigate('/products')}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Items in your cart</h2>
                <button
                  onClick={clearCart}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Clear cart
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <div key={item.productData?._id || item._id} className="p-0">
                    <CartItem item={item} />
                  </div>
                ))}
              </div>
            </div>

            {/* Continue Shopping */}
            <button
              onClick={() => window.location.href = '/products'}
              className="text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Continue shopping
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({totalItems} items)</span>
                  <span className="font-medium">PKR {subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shipping > 0 ? `PKR ${shipping.toFixed(2)}` : 'Free'}
                    {subtotal >= 10000 && (
                      <span className="text-green-600 text-xs block">Free shipping applied!</span>
                    )}
                  </span>
                </div>
                
                {/* Shipping Information */}
                {shipping > 0 && subtotal < 10000 && (
                  <div className="text-xs text-gray-500 mt-1">
                    <p>Highest product shipping: PKR {shipping.toFixed(2)}</p>
                    <p className="text-green-600">Add PKR {(10000 - subtotal).toFixed(2)} more for free shipping!</p>
                  </div>
                )}
                
                <hr className="border-gray-200" />
                
                <div className="flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span className="text-orange-600">PKR {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button - Amazon Style */}
              <button
                onClick={() => navigate('/checkout')}
                disabled={isLoading}
                className="w-full mt-6 bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 px-4 rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-medium disabled:opacity-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Proceed to Checkout</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Security Badges */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure Checkout
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Money Back Guarantee
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>
        {`
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}
      </style>
    </div>
  );
};

export default CartPage;