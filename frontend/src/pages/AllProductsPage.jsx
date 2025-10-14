import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import ProductService from '../services/productService';
import { getApiUrl, getImageUrl } from '../config';
import EnhancedProductCard from '../components/EnhancedProductCard';
import { getCanonicalUrl, generateBreadcrumbs } from '../utils/seoHelpers';
import { getCollectionSchema, getBreadcrumbSchema } from '../utils/schemaGenerator';

const AllProductsPage = () => {
    const navigate = useNavigate();
  const { addToCart, cartItems, loading: cartLoading } = useCart();
  const { user } = useAuth();
  
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

  // Handle buy now with authentication check
  const handleBuyNow = async (product) => {
    try {
      // Check if user is authenticated first
      if (!user) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }

      // Store product in localStorage for buy now checkout
      const buyNowItem = {
        _id: product._id,
        title: product.title,
        price: product.price,
        image: product.image || (product.images?.[0] || null),
        stock: product.stock || 100,
        quantity: 1,
        shipping: product.shipping || 0, // Include shipping cost
        productData: {
          shipping: product.shipping || 0
        }
      };
      
      localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
      
      // Navigate directly to checkout, skipping cart page
      navigate('/checkout');
    } catch (error) {
      console.error('Buy now error:', error);
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

  // Generate SEO data (MOVED BEFORE CONDITIONAL RETURNS)
  const allProductsSEO = useMemo(() => ({
    title: `All Products - Shop Quality Products Online | International Tijarat`,
    description: `Discover ${totalProducts > 0 ? totalProducts : 'thousands of'} premium products across all categories at International Tijarat. Electronics, fashion, home goods, and more with fast delivery.`,
    keywords: [
      'all products',
      'online shopping',
      'electronics',
      'fashion',
      'home goods',
      'international tijarat',
      'buy online',
      'premium products',
      'fast delivery'
    ],
    canonicalUrl: getCanonicalUrl('/products/all'),
    openGraph: {
      title: 'All Products | International Tijarat',
      description: `Shop from ${totalProducts > 0 ? totalProducts : 'thousands of'} premium products with fast delivery and best prices.`,
      type: 'website',
      url: getCanonicalUrl('/products/all'),
      images: products.length > 0 && products[0].image ? [
        {
          url: products[0].image,
          width: 1200,
          height: 630,
          alt: 'All Products at International Tijarat'
        }
      ] : []
    },
    twitter: {
      title: 'All Products | International Tijarat',
      description: `Shop from ${totalProducts > 0 ? totalProducts : 'thousands of'} premium products with fast delivery and best prices.`,
      images: products.length > 0 && products[0].image ? [products[0].image] : []
    }
  }), [totalProducts, products]);

  const breadcrumbs = useMemo(() => 
    generateBreadcrumbs('/products/all'), 
    []
  );

  const collectionSchema = useMemo(() => 
    getCollectionSchema('All Products', `Shop from ${totalProducts} premium products across all categories`, totalProducts), 
    [totalProducts]
  );

  const breadcrumbSchema = useMemo(() => 
    getBreadcrumbSchema(breadcrumbs), 
    [breadcrumbs]
  );

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
      {/* SEO Head Tags */}
      <Helmet>
        {/* Basic Meta Tags */}
        <title>{allProductsSEO.title}</title>
        <meta name="description" content={allProductsSEO.description} />
        <meta name="keywords" content={allProductsSEO.keywords.join(', ')} />
        <link rel="canonical" href={allProductsSEO.canonicalUrl} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={allProductsSEO.openGraph.title} />
        <meta property="og:description" content={allProductsSEO.openGraph.description} />
        <meta property="og:type" content={allProductsSEO.openGraph.type} />
        <meta property="og:url" content={allProductsSEO.openGraph.url} />
        <meta property="og:site_name" content="International Tijarat" />
        {allProductsSEO.openGraph.images.length > 0 && (
          <>
            <meta property="og:image" content={allProductsSEO.openGraph.images[0].url} />
            <meta property="og:image:width" content={allProductsSEO.openGraph.images[0].width} />
            <meta property="og:image:height" content={allProductsSEO.openGraph.images[0].height} />
            <meta property="og:image:alt" content={allProductsSEO.openGraph.images[0].alt} />
          </>
        )}
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={allProductsSEO.twitter.title} />
        <meta name="twitter:description" content={allProductsSEO.twitter.description} />
        {allProductsSEO.twitter.images.length > 0 && (
          <meta name="twitter:image" content={allProductsSEO.twitter.images[0]} />
        )}
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="International Tijarat" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(collectionSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

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
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm mb-4" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <svg className="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium">{crumb.name}</span>
                ) : (
                  <a 
                    href={crumb.url} 
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(crumb.url);
                    }}
                  >
                    {crumb.name}
                  </a>
                )}
              </div>
            ))}
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title and Stats */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                All Products
              </h1>
            </div>

            {/* Sort and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-hidden">
              {/* Category Filter */}
              <div className="w-full sm:min-w-[200px] sm:flex-1 relative">
                <select 
                  value={filters.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full max-w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm sm:text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors truncate"
                >
                  <option value="">All Categories</option>
                  {categories.map((category, index) => (
                    <option key={`category-${index}`} value={category} className="truncate">
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="w-full sm:min-w-[200px] sm:flex-1 relative">
                <select 
                  value={filters.sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full max-w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm sm:text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors truncate"
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedProducts.map((product, index) => (
            <div
              key={product._id}
              ref={index === filteredAndSortedProducts.length - 1 ? lastProductElementRef : null}
            >
              <EnhancedProductCard
                product={product}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                cartQuantity={getCartItemQuantity(product._id)}
                isInCart={isProductInCart(product._id)}
                isAddingToCart={addingToCart[product._id] || false}
                errorMessage={errorMessages[product._id]}
                showBuyNow={true}
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

export default AllProductsPage;