import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import ProductService from "../services/productService";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";

const ProductPage = () => {
  // Get category name from URL parameters
  const { categoryName } = useParams();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [sortBy, setSortBy] = useState("popularity");
  const [addingToCart, setAddingToCart] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  
  // Use cart and auth contexts - UPDATED TO MATCH AllProductsPage
  const { addToCart: addToCartContext, cartItems, loading: cartLoading, error: cartError } = useCart();
  const { isAuthenticated } = useAuth();

  const displayCategory = useMemo(() => 
    categoryName.replace(/-/g, " "), [categoryName]
  );

  useEffect(() => {
    // SEO: Dynamic document title
    document.title = `${displayCategory.charAt(0).toUpperCase() + displayCategory.slice(1)} - International Tijarat`;
    
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`Fetching products for category: ${categoryName}`);
        console.log(`Display category: ${displayCategory}`);
        
        // Try to fetch products by category from backend
        let categoryProducts;
        try {
          categoryProducts = await ProductService.getProductsByCategory(displayCategory);
          console.log(`Found ${categoryProducts.length} products for category: ${displayCategory}`);
        } catch (err) {
          console.log(`Category API failed, trying getAllProducts: ${err.message}`);
          categoryProducts = [];
        }
        
        if (categoryProducts.length > 0) {
          setProducts(categoryProducts);
          // Initialize quantities
          const qtyInit = {};
          categoryProducts.forEach((p) => (qtyInit[p._id] = 1));
          setQuantities(qtyInit);
        } else {
          // If no products found for specific category, show all products as fallback
          console.log(`No products found for ${displayCategory}, showing all products`);
          const allProductsResult = await ProductService.getAllProducts();
          if (allProductsResult.success) {
            setProducts(allProductsResult.data || []);
            // Initialize quantities
            const qtyInit = {};
            (allProductsResult.data || []).forEach((p) => (qtyInit[p._id] = 1));
            setQuantities(qtyInit);
          } else {
            setError(allProductsResult.error || 'Failed to load products');
            setProducts([]);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching products by category:", err);
        setError('Failed to load products. Please check your connection and try again.');
        setProducts([]);
        setLoading(false);
      }
    };

    if (categoryName) {
      fetchProducts();
    }
  }, [categoryName, displayCategory]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        case "newest":
          return b.inStock - a.inStock; // In stock items first
        default:
          return b.reviews - a.reviews; // popularity by reviews
      }
    });
  }, [products, sortBy]);

  const handleQuantityChange = useCallback((productId, value) => {
    const newQuantity = Math.max(1, parseInt(value));
    setQuantities(prev => ({ ...prev, [productId]: newQuantity }));
  }, []);

  const addToCart = useCallback(async (product) => {
    // Clear any previous error messages for this product
    setErrorMessages(prev => ({ ...prev, [product._id]: null }));
    
    try {
      // Set loading state immediately
      setAddingToCart(prev => ({ ...prev, [product._id]: true }));
      
      // Call addToCart and wait for result
      const quantityToAdd = quantities[product._id] || 1;
      const result = await addToCartContext(product, quantityToAdd);
      
      if (result && result.success) {
        // Success - the cart state will automatically update to show "In Cart"
        console.log(`${product.title || product.name} (x${quantityToAdd}) added to cart successfully`);
      } else {
        // Handle specific error cases
        const errorMsg = result?.error || 'Failed to add to cart';
        setErrorMessages(prev => ({ ...prev, [product._id]: errorMsg }));
        
        // Clear error message after delay
        setTimeout(() => {
          setErrorMessages(prev => ({ ...prev, [product._id]: null }));
        }, 4000);
        
        console.error('Cart operation failed:', errorMsg);
      }
      
    } catch (error) {
      // Handle unexpected errors
      const errorMsg = 'Something went wrong. Please try again.';
      setErrorMessages(prev => ({ ...prev, [product._id]: errorMsg }));
      
      setTimeout(() => {
        setErrorMessages(prev => ({ ...prev, [product._id]: null }));
      }, 4000);
      
      console.error('Error adding to cart:', error);
    } finally {
      // Always clear loading state
      setAddingToCart(prev => ({ ...prev, [product._id]: false }));
    }
  }, [quantities, addToCartContext]);

  // Helper function to check if product is in cart and get quantity
  const getCartItemQuantity = (productId) => {
    // Safety check: ensure cartItems exists and is an array
    if (!cartItems || !Array.isArray(cartItems)) {
      return 0;
    }
    
    // Check for both direct _id and productData._id structures (backend vs local)
    const cartItem = cartItems.find(item => 
      item._id === productId || 
      item.productData?._id === productId ||
      item.productId === productId
    );
    
    return cartItem ? (cartItem.quantity || 0) : 0;
  };

  // Helper function to check if product is in cart
  const isProductInCart = (productId) => {
    return getCartItemQuantity(productId) > 0;
  };

  const buyNow = useCallback(async (product) => {
    if (!isAuthenticated) {
      alert('Please login to purchase items');
      return;
    }

    try {
      const quantity = quantities[product._id] || 1;
      await addToCartContext(product, quantity);
      // In real app: navigate("/checkout");
      window.location.href = "/checkout";
    } catch (error) {
      console.error('Error in buy now:', error);
      alert('Failed to add item to cart');
    }
  }, [quantities, addToCartContext, isAuthenticated]);

  const formatPrice = useCallback((price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }, []);

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin"></div>
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-20 min-h-[60vh] flex flex-col justify-center items-center">
      <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
        <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-4">No Products Found</h3>
      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        Sorry, we couldn't find any products in the "{displayCategory}" category.
      </p>
      <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 transform hover:scale-105 shadow-lg">
        View All Products
      </button>
    </div>
  );

  const ProductCard = ({ 
    product,
    isAddingToCart = false,
    errorMessage = null,
    cartQuantity = 0,
    isInCart = false 
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    
    const currentQuantity = quantities[product._id] || 1;
    const totalPrice = product.price * currentQuantity;
    const originalPrice = (product.discount || 0) > 0 
      ? (product.price / (1 - (product.discount || 0) / 100)).toFixed(2)
      : null;

    // Determine button state with proper priority - CART STATE DRIVEN
    const getButtonState = () => {
      if (isAddingToCart) return 'loading';
      if (errorMessage) return 'error';
      if (isInCart && cartQuantity > 0) return 'inCart';  // Direct cart state check
      if (!product.inStock) return 'outOfStock';
      return 'addToCart';
    };

    const buttonState = getButtonState();

    // Button styling based on state
    const getButtonStyles = () => {
      switch (buttonState) {
        case 'loading':
          return 'bg-orange-400 text-white cursor-not-allowed';
        case 'error':
          return 'bg-red-500 hover:bg-red-600 text-white';
        case 'inCart':
          return 'bg-blue-500 hover:bg-blue-600 text-white';
        case 'addToCart':
          return 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800';
        case 'outOfStock':
          return 'bg-gray-300 text-gray-500 cursor-not-allowed';
        default:
          return 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800';
      }
    };

    // Button content based on state
    const getButtonContent = () => {
      switch (buttonState) {
        case 'loading':
          return (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Adding...
            </>
          );
        case 'error':
          return (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Try Again
            </>
          );
        case 'inCart':
          return (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 3M7 13l2.5 3m9.5-3v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              In Cart ({cartQuantity})
            </>
          );
        case 'addToCart':
          return (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 3M7 13l2.5 3m9.5-3v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              Add to Cart
            </>
          );
        case 'outOfStock':
          return 'Out of Stock';
        default:
          return (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 3M7 13l2.5 3m9.5-3v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              Add to Cart
            </>
          );
      }
    };

    return (
      <div 
        className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-500 hover:shadow-2xl transform hover:-translate-y-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative overflow-hidden">
          <div className={`aspect-square bg-gradient-to-br from-slate-100 to-slate-200 ${!imageLoaded && !imageError ? 'animate-pulse' : ''}`}>
            {!imageError ? (
              <img
                src={product.image}
                alt={product.title}
                className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isHovered ? 'scale-110' : 'scale-100'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {(product.discount || 0) > 0 && (
              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                -{product.discount}%
              </span>
            )}
            {!(product.inStock !== false) && (
              <span className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                OUT OF STOCK
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0`}>
            <button className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all duration-200">
              <svg className="w-5 h-5 text-slate-600 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-6">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight mb-2">
              {product.title}
            </h3>
            <p className="text-sm text-slate-600">
              {product.mainCategory} → {product.subCategory}
            </p>
            {/* Vendor/Admin Information */}
            {product.vendor && typeof product.vendor === 'object' && product.vendor.businessName ? (
              <div className="flex items-center mt-2">
                <span className="text-xs text-slate-500">Sold by:</span>
                <span className="text-xs font-semibold text-emerald-600 ml-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {product.vendor.businessName}
                </span>
              </div>
            ) : (
              <div className="flex items-center mt-2">
                <span className="text-xs text-slate-500">Sold by:</span>
                <div className="flex items-center ml-1">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    International Tijarat
                  </span>
                  <span 
                    className="ml-1 text-blue-600 cursor-help" 
                    title="Directly owned by International Tijarat"
                  >
                    ✓
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center mb-4">
            <div className="flex items-center mr-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 4.5) ? 'text-yellow-400 fill-current' : 'text-slate-200'}`} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-semibold text-slate-700">{product.rating || '4.5'}</span>
            <span className="text-xs text-slate-500 ml-1">({(product.reviews || 150).toLocaleString()})</span>
          </div>

          {/* Quantity Selector */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Quantity:</label>
              <select
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                value={currentQuantity}
                onChange={(e) => handleQuantityChange(product._id, e.target.value)}
              >
                {[...Array(10).keys()].map((i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-emerald-600">{formatPrice(totalPrice, product.currency)}</span>
              {originalPrice && (
                <span className="text-sm text-slate-500 line-through">${originalPrice}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => addToCart(product)}
              disabled={isAddingToCart || buttonState === 'outOfStock'}
              className={`w-full py-3 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center ${getButtonStyles()}`}
              title={errorMessage || ''}
            >
              {getButtonContent()}
            </button>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="mt-2 text-xs text-red-600 text-center bg-red-50 py-1 px-2 rounded">
                {errorMessage}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => buyNow(product)}
                disabled={product.inStock === false}
                className="py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Buy Now
              </button>
              
              <a
                href={`https://wa.me/923269475516?text=${encodeURIComponent(`Hello, I'm interested in: ${product.title} (Category: ${displayCategory}, Product ID: ${product._id})`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 text-center text-sm flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943s-.099-.133-.197-.232z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FilterControls = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Sort by:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white min-w-[180px]"
          >
            <option value="popularity">Most Popular</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Customer Rating</option>
            <option value="newest">Availability</option>
          </select>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-xl p-8">
          <div className="bg-red-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Fetching Products</h1>
          <p className="text-slate-700 mb-6">{error}</p>
          <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 transform hover:scale-105 shadow-lg">
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* SEO Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": `${displayCategory.charAt(0).toUpperCase() + displayCategory.slice(1)} Products`,
          "description": `Browse our ${displayCategory} collection with ${products.length} premium products`,
          "numberOfItems": products.length
        })}
      </script>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-4">
            <a href="/" className="hover:text-emerald-600 transition-colors">Home</a>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="capitalize text-slate-900 font-medium">{displayCategory}</span>
          </nav>
          
          <h1 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4 capitalize tracking-tight">
            {displayCategory}
            <span className="block text-lg lg:text-xl font-normal text-slate-600 mt-2">
              Premium Quality Products
            </span>
          </h1>
          
          <p className="text-slate-600 text-lg">
            Showing <span className="font-bold text-emerald-600">{sortedProducts.length}</span> premium products
          </p>
        </div>

        <FilterControls />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {sortedProducts.map((product) => (
            <ProductCard 
              key={product._id} 
              product={product}
              isAddingToCart={addingToCart[product._id]}
              errorMessage={errorMessages[product._id]}
              cartQuantity={getCartItemQuantity(product._id)}
              isInCart={isProductInCart(product._id)}
            />
          ))}
        </div>

        {/* Demo controls */}
        <div className="mt-12 text-center">
          <button 
            onClick={() => setLoading(!loading)}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Toggle loading state to test
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;