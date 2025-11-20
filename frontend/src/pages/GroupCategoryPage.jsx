import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import ProductService from "../services/productService";
import { getUploadUrl, getImageUrl } from "../config";
import EnhancedProductCard from "../components/EnhancedProductCard";
import { generateCategorySEO, getCanonicalUrl, generateBreadcrumbs } from "../utils/seoHelpers";
import { getCategorySchema, getBreadcrumbSchema } from "../utils/schemaGenerator";

// Category mapping for navigation - UPDATED to handle both admin and vendor categories
const categoryMap = {
  "beauty-personal-care": "Beauty & Personal Care",
  "electronics": "Electronics", 
  "home-furniture": "Home & Furniture",
  "fashion": "Fashion",
  "groceries-essentials": "Groceries & Essentials",
  "sports-outdoors": "Sports & Outdoors",
  "salt-products": "Salt Products"
};

// Helper function to get category name from URL parameter
const getCategoryNameFromUrl = (groupName) => {
  // First try the predefined mapping
  if (categoryMap[groupName]) {
    return categoryMap[groupName];
  }
  
  // If not found, convert URL slug to readable name
  // This handles vendor categories that might not be in our mapping
  return groupName
    .split('-')
    .map(word => {
      // Handle special cases
      if (word.toLowerCase() === 'and') return '&';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

const GroupCategoryPage = () => {
  // Get the actual groupName from URL parameters
  const { groupName } = useParams();
  const navigate = useNavigate();
  
  // State for products with pagination
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // UI state
  const [quantities, setQuantities] = useState({});
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [addingToCart, setAddingToCart] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  
  // Infinite scroll refs
  const observer = useRef();
  const lastProductElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !loading) {
        loadMoreProducts();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasNextPage, loading]);
  
  // Use cart and auth contexts - UPDATED TO MATCH AllProductsPage
  const { addToCart: addToCartContext, cartItems, loading: cartLoading, error: cartError } = useCart();
  const { isAuthenticated } = useAuth();

  // Convert group name to display format
  const displayGroup = useMemo(() => 
    getCategoryNameFromUrl(groupName), [groupName]
  );

  // Generate SEO data - moved here to comply with Rules of Hooks
  const seoData = useMemo(() => 
    generateCategorySEO(displayGroup, products, groupName), 
    [displayGroup, products, groupName]
  );

  const breadcrumbs = useMemo(() => 
    generateBreadcrumbs(window.location.pathname, { categoryName: displayGroup }), 
    [displayGroup]
  );

  const categorySchema = useMemo(() => 
    getCategorySchema(displayGroup, products), 
    [displayGroup, products]
  );

  const breadcrumbSchema = useMemo(() => 
    getBreadcrumbSchema(breadcrumbs), 
    [breadcrumbs]
  );

  // Load products with server-side category filtering and pagination
  const loadProducts = useCallback(async (page = 1, resetProducts = true) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      // Get the mapped category name for server-side filtering
      const categoryName = getCategoryNameFromUrl(groupName);
      if (!categoryName) {
        throw new Error(`No category mapping found for groupName: ${groupName}`);
      }
      
      console.log(`🔍 Loading products - Page: ${page}, Category: ${categoryName}, Sort: ${sortBy}`);
      
      // Build filters for API call with server-side filtering
      const apiFilters = {
        page,
        limit: 20,
        category: categoryName, // Server-side category filtering
        ...(sortBy && sortBy !== 'relevance' && { sort: sortBy })
      };
      
      console.log('📋 API Filters:', apiFilters);
      
      const result = await ProductService.getAllProducts(apiFilters);
      console.log('📦 API Response:', result);
      
      if (result.success) {
        const newProducts = result.data || [];
        console.log(`📊 Received ${newProducts.length} products for page ${page}`);
        
        if (resetProducts || page === 1) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }
        
        // Handle pagination metadata from API response
        setTotalProducts(result.totalProducts || 0);
        setHasNextPage(result.hasNextPage || false);
        setCurrentPage(page);
        
        // Initialize quantities for new products
        if (newProducts.length > 0) {
          const qtyInit = {};
          newProducts.forEach((p) => (qtyInit[p._id] = 1));
          setQuantities(prev => ({ ...prev, ...qtyInit }));
        }
        
      } else {
        setError(result.error || 'Failed to load products');
      }
    } catch (err) {
      console.error("Error loading category products:", err);
      setError('Failed to load products. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [groupName, sortBy]);

  // Load more products for infinite scroll
  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasNextPage && !loading) {
      loadProducts(currentPage + 1, false);
    }
  }, [currentPage, hasNextPage, loadingMore, loading, loadProducts]);

  useEffect(() => {
    // SEO: Dynamic document title
    document.title = `${displayGroup.charAt(0).toUpperCase() + displayGroup.slice(1)} Products - International Tijarat`;
    
    if (groupName) {
      setCurrentPage(1);
      setHasNextPage(true);
      loadProducts(1, true);
    }
  }, [groupName, loadProducts]);

  // Reload products when sort changes
  useEffect(() => {
    if (groupName) {
      setCurrentPage(1);
      setHasNextPage(true);
      loadProducts(1, true);
    }
  }, [sortBy, groupName, loadProducts]);

  // Since we're using server-side sorting, just use products directly
  const sortedProducts = useMemo(() => {
    return products;
  }, [products]);

  const handleQuantityChange = useCallback((productId, value) => {
    const newQuantity = Math.max(1, parseInt(value));
    setQuantities(prev => ({ ...prev, [productId]: newQuantity }));
  }, []);

  const addToCart = useCallback(async (product, quantity = null, selectedSize = null) => {
    // Clear any previous error messages for this product
    setErrorMessages(prev => ({ ...prev, [product._id]: null }));
    
    try {
      // Set loading state immediately
      setAddingToCart(prev => ({ ...prev, [product._id]: true }));
      
      // Call addToCart and wait for result
      const quantityToAdd = quantity || quantities[product._id] || 1;
      const result = await addToCartContext(product, quantityToAdd, selectedSize);
      
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

  const handleBuyNow = useCallback(async (product, quantity = null, selectedSize = null) => {
    try {
      // Check if user is authenticated first
      if (!user) {
        navigate('/login');
        return;
      }

      // Store product in localStorage for buy now checkout
      // IMPORTANT: Use standardized structure matching cart items
      const quantityToAdd = quantity || quantities[product._id] || 1;
      const buyNowItem = {
        quantity: quantityToAdd,
        selectedSize: selectedSize || null,
        productData: {
          _id: product._id,
          title: product.title,
          name: product.title,
          price: product.price,
          image: product.image || (product.images?.[0] || null),
          images: product.images || [],
          stock: product.stock || 0,
          shipping: product.shipping || 0,
          vendor: product.vendor,
          currency: product.currency || 'USD',
          discount: product.discount || 0,
          description: product.description || '',
          mainCategory: product.mainCategory,
          subCategory: product.subCategory,
          category: product.category
        }
      };
      
      console.log('✅ Buy Now item structured (GroupCategoryPage):', buyNowItem);
      localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
      
      // Navigate directly to checkout, skipping cart page
      navigate('/checkout');
    } catch (error) {
      const errorMsg = 'Something went wrong. Please try again.';
      setErrorMessages(prev => ({ ...prev, [product._id]: errorMsg }));
      
      setTimeout(() => {
        setErrorMessages(prev => ({ ...prev, [product._id]: null }));
      }, 4000);
      
      console.error('Error with buy now:', error);
    }
  }, [quantities, navigate]);

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 mx-auto mb-4"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading {displayGroup} products...</p>
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
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords.join(', ')} />
        <link rel="canonical" href={seoData.canonicalUrl} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={seoData.openGraph.title} />
        <meta property="og:description" content={seoData.openGraph.description} />
        <meta property="og:type" content={seoData.openGraph.type} />
        <meta property="og:url" content={seoData.openGraph.url} />
        <meta property="og:site_name" content="International Tijarat" />
        {seoData.openGraph.images.length > 0 && (
          <>
            <meta property="og:image" content={seoData.openGraph.images[0].url} />
            <meta property="og:image:width" content={seoData.openGraph.images[0].width} />
            <meta property="og:image:height" content={seoData.openGraph.images[0].height} />
            <meta property="og:image:alt" content={seoData.openGraph.images[0].alt} />
          </>
        )}
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.twitter.title} />
        <meta name="twitter:description" content={seoData.twitter.description} />
        {seoData.twitter.images.length > 0 && (
          <meta name="twitter:image" content={seoData.twitter.images[0]} />
        )}
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="International Tijarat" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(categorySchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 capitalize">
                {displayGroup} Products
              </h1>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-hidden">
              <div className="w-full sm:min-w-[200px] sm:flex-1 relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full max-w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm sm:text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors truncate"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popularity">Most Popular</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {products.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">No products available in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedProducts.map((product, index) => (
              <div
                key={product._id}
                ref={index === sortedProducts.length - 1 ? lastProductElementRef : null}
              >
                <EnhancedProductCard
                  product={product}
                  onAddToCart={() => addToCart(product)}
                  onBuyNow={() => handleBuyNow(product)}
                  showBuyNow={true}
                  isAddingToCart={addingToCart[product._id]}
                  cartQuantity={getCartItemQuantity(product._id)}
                  isInCart={isProductInCart(product._id)}
                  errorMessage={errorMessages[product._id]}
                />
              </div>
            ))}
          </div>
        )}

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
        {!hasNextPage && products.length > 0 && !loading && (
          <div className="text-center mt-12 mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-full px-6 py-3 border border-orange-200">
              <div className="text-left">
                <p className="text-gray-800 font-semibold">You've reached the end!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupCategoryPage;
