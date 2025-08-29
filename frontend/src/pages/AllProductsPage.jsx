import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import ProductService from '../services/productService';
import { getApiUrl, getImageUrl } from '../config';

const AllProductsPage = () => {
    const navigate = useNavigate();
  const { addToCart, cartItems, loading: cartLoading } = useCart();
  
  // State for products from backend API with pagination
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // State for UI interactions
  const [addingToCart, setAddingToCart] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [wishlist, setWishlist] = useState(new Set());
  
  // Infinite scroll refs
  const observer = useRef();
  const lastProductElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isLoading) {
        loadMoreProducts();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasNextPage, isLoading]);
  
  // Filters state
  const [filters, setFilters] = useState({
    sortBy: 'relevance',
    category: ''
  });

  // Debug cart changes
  useEffect(() => {
    console.log('Cart items changed:', cartItems);
  }, [cartItems]);

  // Load products from backend API with pagination
  const loadProducts = useCallback(async (page = 1, resetProducts = true) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      // Build filters for API call
      const apiFilters = {
        page,
        limit: 20, // Back to 20 products per page
        ...(filters.category && filters.category !== '' && { category: filters.category }),
        ...(filters.sortBy && filters.sortBy !== 'relevance' && { sort: filters.sortBy })
      };
      
      console.log('🔄 Loading products - Page:', page, 'Filters:', apiFilters);
      
      const result = await ProductService.getAllProducts(apiFilters);
      
      console.log('📦 API Response:', {
        success: result.success,
        productsCount: result.data?.length,
        totalProducts: result.totalProducts,
        currentPage: result.currentPage,
        hasNextPage: result.hasNextPage,
        resetProducts
      });
      
      if (result.success) {
        const newProducts = result.data || [];
        
        if (resetProducts || page === 1) {
          setProducts(newProducts);
          console.log('🔄 Set products (reset):', newProducts.length);
        } else {
          setProducts(prev => {
            const updated = [...prev, ...newProducts];
            console.log('🔄 Appended products:', prev.length, '+', newProducts.length, '=', updated.length);
            return updated;
          });
        }
        
        // Handle pagination metadata from API response
        setTotalProducts(result.totalProducts || 0);
        setHasNextPage(result.hasNextPage || false);
        setCurrentPage(page);
      } else {
        setError(result.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  // Load more products for infinite scroll
  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasNextPage && !isLoading) {
      loadProducts(currentPage + 1, false);
    }
  }, [currentPage, hasNextPage, loadingMore, isLoading, loadProducts]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/categories`);
        const categoriesData = await response.json();
        
        // Extract unique main category names
        const mainCategories = [...new Set(
          categoriesData
            .filter(cat => !cat.parentCategory) // Only main categories (no parent)
            .map(cat => cat.name)
        )];
        
        setCategories(mainCategories);
      } catch (err) {
        console.error('Error loading categories:', err);
        // Fallback to empty categories if API fails
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  // Load products when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHasNextPage(true);
    loadProducts(1, true);
  }, [filters, loadProducts]);

  const handleSortChange = useCallback((sortBy) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);

  const handleAddToCart = async (product) => {
    console.log('Adding product to cart:', product._id, product.title);
    console.log('Current cartItems before add:', cartItems);
    
    // Clear any previous error messages for this product
    setErrorMessages(prev => ({ ...prev, [product._id]: null }));
    
    try {
      // Set loading state immediately
      setAddingToCart(prev => ({ ...prev, [product._id]: true }));
      
      // Call addToCart and wait for result
      const result = await addToCart(product);
      console.log('AddToCart result:', result);
      
      if (result && result.success) {
        // Success - the cart state will automatically update to show "In Cart"
        console.log(`${product.title} added to cart successfully`);
        console.log('CartItems after add:', cartItems);
      } else {
        // Don't set error messages in state - let CartContext handle notifications
        console.error('Cart operation failed:', result?.error || 'Failed to add to cart');
      }
      
    } catch (error) {
      // Don't set error messages in state - let CartContext handle notifications
      console.error('Cart add error:', error);
    } finally {
      // Always clear loading state
      setAddingToCart(prev => ({ ...prev, [product._id]: false }));
    }
  };

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
    
    const quantity = cartItem ? (cartItem.quantity || 0) : 0;
    return quantity;
  };

  // Helper function to check if product is in cart
  const isProductInCart = (productId) => {
    const quantity = getCartItemQuantity(productId);
    return quantity > 0;
  };

  const handleToggleWishlist = (productId) => {
    setWishlist(prev => {
      const newWishlist = new Set(prev);
      if (newWishlist.has(productId)) {
        newWishlist.delete(productId);
      } else {
        newWishlist.add(productId);
      }
      return newWishlist;
    });
  };

  // Since we're now doing server-side filtering and sorting, 
  // we can use the products directly from the API
  const filteredAndSortedProducts = useMemo(() => {
    return products;
  }, [products]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 mx-auto mb-4"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading products...</p>
          <p className="text-gray-500 text-sm mt-1">Please wait while we fetch the latest products</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cart Loading Indicator */}
      {cartLoading && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="text-sm">Updating cart...</span>
        </div>
      )}



      {/* Enhanced Modern Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title and Stats */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                All Products
              </h1>
              <p className="text-gray-600 text-lg">
                Discover {products.length} amazing products
              </p>
            </div>

            {/* Sort and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category Filter */}
              <div className="min-w-[200px]">
                <select 
                  value={filters.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                >
                  <option value="">All Categories</option>
                  {categories.map((category, index) => (
                    <option key={`category-${index}`} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="min-w-[200px]">
                <select 
                  value={filters.sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                >
                  <option value="relevance">Sort by Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Products Count */}
        {totalProducts > 0 && (
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {products.length} of {totalProducts} products
              {filters.category && filters.category !== '' && ` in "${filters.category}"`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedProducts.map((product, index) => (
            <div
              key={product._id}
              ref={index === filteredAndSortedProducts.length - 1 ? lastProductElementRef : null}
            >
              <ProductCard
                product={product}
                onAddToCart={() => handleAddToCart(product)}
                onToggleWishlist={() => handleToggleWishlist(product._id)}
                isAddingToCart={addingToCart[product._id]}
                errorMessage={errorMessages[product._id]}
                cartQuantity={getCartItemQuantity(product._id)}
                isInCart={isProductInCart(product._id)}
              />
            </div>
          ))}
        </div>

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="text-center mt-12 mb-8">
            <div className="inline-flex items-center space-x-2 bg-white rounded-full px-6 py-3 shadow-lg border border-gray-100">
              <div className="relative">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200"></div>
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent absolute top-0 left-0"></div>
              </div>
              <span className="text-gray-700 font-medium">Loading more products...</span>
            </div>
          </div>
        )}

        {/* End of Products Message */}
        {!hasNextPage && products.length > 0 && !isLoading && (
          <div className="text-center mt-12 mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-full px-6 py-3 border border-orange-200">
              <div className="text-left">
                <p className="text-gray-800 font-semibold">You've reached the end!</p>
                <p className="text-gray-600 text-sm">
                  {totalProducts} products total
                </p>
              </div>
            </div>
          </div>
        )}


        {/* No Products Found */}
        {products.length === 0 && !isLoading && (
          <div className="text-center mt-12">
            <div className="text-gray-300 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {filters.category && filters.category !== '' 
                ? `No products found in "${filters.category}" category.`
                : 'No products match your criteria.'
              }
            </p>
            {(filters.category && filters.category !== '') && (
              <button
                onClick={() => handleCategoryChange('')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                View All Products
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cart Notification - Removed to prevent disturbing popup */}
      {/* 
      {Object.values(successMessages).some(Boolean) && (
        <div className="fixed top-4 right-4 bg-orange-400 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-medium">Product added to cart!</div>
            <div className="text-sm opacity-90">Check the cart counter in header!</div>
          </div>
        </div>
      )}
      */}
    </div>
  );
};

// Simple Icons
const ShoppingCartIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L8 6H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

// Clean Product Card
const ProductCard = ({ 
  product, 
  onAddToCart, 
  onToggleWishlist, 
  isAddingToCart = false, 
  errorMessage = null,
  cartQuantity = 0,
  isInCart = false 
}) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  // Navigate to product detail page
  const handleProductClick = () => {
    console.log('🔗 Navigating to product from AllProductsPage:', {
      productId: product._id,
      title: product.title,
      fullProduct: product
    });
    if (!product._id) {
      console.error('❌ Product ID is missing!', product);
      return;
    }
    navigate(`/product/${product._id}`);
  };

  // Determine button state with proper priority - CART STATE DRIVEN
  const getButtonState = () => {
    if (isAddingToCart) return 'loading';
    if (errorMessage) return 'error';
    if (isInCart && cartQuantity > 0) return 'inCart';  // Direct cart state check
    if (!product.stock || product.stock === 0) return 'outOfStock';
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
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'outOfStock':
        return 'bg-gray-300 text-gray-500 cursor-not-allowed';
      default:
        return 'bg-orange-500 hover:bg-orange-600 text-white';
    }
  };

  // Button content based on state
  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Adding...
          </>
        );
      case 'error':
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Try Again
          </>
        );
      case 'inCart':
        return (
          <>
            <ShoppingCartIcon className="w-4 h-4" />
            In Cart ({cartQuantity})
          </>
        );
      case 'addToCart':
        return (
          <>
            <ShoppingCartIcon className="w-4 h-4" />
            Add to Cart
          </>
        );
      case 'outOfStock':
        return 'Out of Stock';
      default:
        return 'Add to Cart';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      {/* Product Image - Clickable with hover animation */}
      <div 
        className="relative aspect-square overflow-hidden cursor-pointer group"
        onClick={handleProductClick}
      >
        {!imageError ? (
          <img
            src={getImageUrl('products', product.image)}
            alt={product.title || product.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-110"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center transition-all duration-300 group-hover:bg-gray-300">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">No Image</span>
            </div>
          </div>
        )}

        {/* Discount Badge */}
        {product.discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -{product.discount}%
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling to parent div
            onToggleWishlist(product._id);
          }}
          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {product.brand}
          </p>
        )}

        {/* Product Name - Clickable */}
        <h3 
          className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm cursor-pointer hover:text-orange-600 transition-colors"
          onClick={handleProductClick}
        >
          {product.title || product.name}
        </h3>

        {/* Vendor/Admin Information */}
        {product.vendor && typeof product.vendor === 'object' && product.vendor.businessName ? (
          <div className="mb-2 flex items-center text-xs text-gray-600">
            <svg className="w-3 h-3 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-emerald-600 font-medium">
              {product.vendor.businessName}
            </span>
          </div>
        ) : (
          <div className="mb-2 flex items-center text-xs text-gray-600">
            <div className="flex items-center">
              <div 
                className="relative cursor-help mr-1"
                title="Directly owned by International Tijarat"
              >
                <svg className="w-3 h-3 text-blue-600 peer" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {/* Hover tooltip - only appears when hovering over the checkmark */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none">
                  Directly owned by International Tijarat
                </div>
              </div>
              <span className="text-blue-600 font-medium">International Tijarat</span>
            </div>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900">
            ${product.price}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              ${product.originalPrice}
            </span>
          )}
        </div>

        {/* Stock Information - Only show out of stock, hide counts from customers */}
        <div className="mb-3">
          {product.stock === 0 ? (
            <span className="text-sm text-red-600 font-medium">Out of Stock</span>
          ) : (
            <span className="text-sm text-green-600">In Stock</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={onAddToCart}
          disabled={isAddingToCart || buttonState === 'outOfStock'}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${getButtonStyles()}`}
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
      </div>

    </div>
  );
};

export default AllProductsPage;