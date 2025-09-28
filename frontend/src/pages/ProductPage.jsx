import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import ProductService from "../services/productService";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import EnhancedProductCard from "../components/EnhancedProductCard";
import { generateCategorySEO, getCanonicalUrl, generateBreadcrumbs } from "../utils/seoHelpers";
import { getCategorySchema, getBreadcrumbSchema } from "../utils/schemaGenerator";

const ProductPage = () => {
  // Get category name from URL parameters
  const { categoryName } = useParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [sortBy, setSortBy] = useState("popularity");
  const [addingToCart, setAddingToCart] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  
  // Use cart and auth contexts - UPDATED TO MATCH AllProductsPage
  const { addToCart: addToCartContext, cartItems, loading: cartLoading, error: cartError } = useCart();
  const { isAuthenticated, user } = useAuth();

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
    try {
      // Check if user is authenticated first
      if (!user) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }

      // Store product in localStorage for buy now checkout
      const quantity = quantities[product._id] || 1;
      const buyNowItem = {
        _id: product._id,
        title: product.title,
        price: product.price,
        image: product.image || (product.images?.[0] || null),
        stock: product.stock || 100,
        quantity: quantity
      };
      
      localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
      
      // Navigate directly to checkout, skipping cart page
      navigate('/checkout');
    } catch (error) {
      console.error('Buy now error:', error);
    }
  }, [quantities, user, navigate]);

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

  // Generate SEO data
  const seoData = useMemo(() => 
    generateCategorySEO(displayCategory, products, categoryName), 
    [displayCategory, products, categoryName]
  );

  const breadcrumbs = useMemo(() => 
    generateBreadcrumbs(window.location.pathname, { categoryName: displayCategory }), 
    [displayCategory]
  );

  const categorySchema = useMemo(() => 
    getCategorySchema(displayCategory, products), 
    [displayCategory, products]
  );

  const breadcrumbSchema = useMemo(() => 
    getBreadcrumbSchema(breadcrumbs), 
    [breadcrumbs]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
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
            <EnhancedProductCard 
              key={product._id} 
              product={product}
              onAddToCart={addToCart}
              onBuyNow={buyNow}
              cartQuantity={getCartItemQuantity(product._id)}
              isInCart={isProductInCart(product._id)}
              isAddingToCart={addingToCart[product._id] || false}
              errorMessage={errorMessages[product._id]}
              showBuyNow={true}
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