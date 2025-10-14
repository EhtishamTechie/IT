import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ProductService from "../services/productService";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { getApiUrl, getImageUrl } from '../config';
import ProductCarousel from '../components/ProductCarousel';
import Footer from '../components/Footer';
import { generateProductSEO, generateBreadcrumbs, generateCanonicalUrl } from '../utils/seoHelpers';
import { generateProductSchema, generateBreadcrumbSchema } from '../utils/schemaGenerator';
import { trackProductView, trackAddToCart } from '../utils/analytics';

// Mock product data for fallback
const mockProduct = {
  _id: "11",
  title: "Apple iPhone 15 Pro Max",
  price: 1199.99,
  currency: "USD",
  image: "iphone-15.jpg",
  mainCategory: "Electronics",
  subCategory: "Mobile Phones",
  inStock: true,
  discount: 10,
  description: "The most advanced iPhone ever with titanium design, A17 Pro chip, and professional camera system.",
  features: [
    "6.7-inch Super Retina XDR display",
    "A17 Pro chip with 6-core GPU",
    "Pro camera system with 48MP main camera",
    "Up to 29 hours video playback",
    "Titanium design with textured matte glass back"
  ],
  specifications: {
    "Display": "6.7-inch Super Retina XDR",
    "Chip": "A17 Pro",
    "Storage": "256GB",
    "Camera": "48MP Pro camera system",
    "Battery": "Up to 29 hours video playback",
    "Weight": "221 grams"
  }
};

const ProductDetailPage = () => {
  const { id: productId } = useParams(); // Get 'id' from route params and rename it to productId
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  // Use cart and auth contexts
  const { addToCart, isInCart, getCartItem } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { showError } = useNotification();

  // Helper function to safely extract category names
  const extractCategoryNames = (categoryData) => {
    if (!categoryData) return [];
    
    const categories = Array.isArray(categoryData) ? categoryData : [categoryData];
    return categories
      .filter(cat => cat) // Remove null/undefined
      .map(cat => {
        if (typeof cat === 'object' && cat !== null) {
          // If it's a populated object with name
          return cat.name || cat.toString();
        }
        // If it's a string (could be ObjectId or actual name)
        const str = cat.toString();
        // Check if it looks like an ObjectId (24 hex characters)
        if (str.length === 24 && /^[0-9a-fA-F]{24}$/.test(str)) {
          return null; // Don't display ObjectIds
        }
        return str;
      })
      .filter(name => name && name.trim()); // Remove empty strings and nulls
  };

  // Debug log to check if productId is received correctly
  useEffect(() => {
    console.log('🚀 ProductDetailPage loaded with productId:', productId);
  }, [productId]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 [SEO] Fetching product with identifier: ${productId}`);
        
        // Use the new unified endpoint that supports both slugs and IDs
        const response = await ProductService.getProductById(productId);
        console.log('📦 [SEO] Raw response received:', response);
        
        // Handle different response formats from backend
        let productData = null;
        
        if (response && response.success && response.product) {
          // New SEO-enhanced format: {success: true, product: {..., seo: {...}}}
          productData = response.product;
          console.log('✅ [SEO] Product with SEO data:', {
            slug: productData.slug,
            seo: productData.seo,
            title: productData.title
          });
        } else if (response && response._id) {
          // Direct product object format (fallback)
          productData = response;
        } else if (response && response.data && response.data._id) {
          // Nested data format (fallback)
          productData = response.data;
        }
        
        if (productData && productData._id) {
          setProduct(productData);
          
          // SEO-optimized title using product's SEO data
          const seoTitle = productData.seo?.title || productData.metaTitle || productData.title;
          document.title = `${seoTitle} - International Tijarat`;
          
          console.log('🎯 [SEO] Page title set:', document.title);
          
          // Update URL if we have a slug and current URL is using ID
          if (productData.slug && productId !== productData.slug) {
            const currentPath = window.location.pathname;
            const newPath = `/product/${productData.slug}`;
            
            // Only update if we're currently on an ID-based URL
            if (currentPath.includes(productId) && /^[0-9a-fA-F]{24}$/.test(productId)) {
              console.log('🔗 [SEO] Updating URL from ID to slug:', { from: currentPath, to: newPath });
              navigate(newPath, { replace: true });
            }
          }
        } else {
          throw new Error(response?.message || 'Product not found or invalid format');
        }
        
      } catch (err) {
        console.error('❌ [SEO] Error fetching product:', err);
        
        // Enhanced error handling
        let errorMessage = 'Product not found';
        if (err.response?.status === 404) {
          errorMessage = 'This product could not be found. It may have been removed or the URL is incorrect.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setProduct(null);
        
        // SEO for error page
        document.title = 'Product Not Found - International Tijarat';
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, navigate]);

  // Reset quantity when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1); // Reset to 1 when product changes
      
      // Track product view for analytics
      trackProductView(product);
    }
  }, [product?._id]); // Only reset when the actual product ID changes

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check stock availability for the requested quantity
    const availableStock = product.stock || 0;
    if (availableStock <= 0) {
      showError('This product is currently out of stock.');
      return;
    }
    
    if (quantity > availableStock) {
      showError(`Cannot add ${quantity} items. Only ${availableStock} items available in stock.`);
      return;
    }
    
    setIsAddingToCart(true);
    try {
      await addToCart(product, quantity);
      console.log('Product added to cart successfully');
      
      // Track add to cart event for analytics
      trackAddToCart(product, quantity);
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Handle backend stock validation errors
      if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError('Failed to add item to cart. Please try again.');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Helper functions for quantity management with stock validation
  const handleQuantityIncrease = () => {
    const availableStock = product?.stock || 0;
    const newQuantity = quantity + 1;
    
    if (newQuantity > availableStock) {
      showError(`Cannot add more items. Only ${availableStock} items available in stock.`);
      return;
    }
    
    setQuantity(newQuantity);
  };

  const handleQuantityDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    const availableStock = product?.stock || 0;
    
    if (value < 1) {
      setQuantity(1);
      return;
    }
    
    if (value > availableStock) {
      showError(`Cannot set quantity to ${value}. Only ${availableStock} items available in stock.`);
      setQuantity(Math.min(value, availableStock));
      return;
    }
    
    setQuantity(value);
  };

  // Handle buy now with authentication check
  const handleBuyNow = async () => {
    if (!product) return;
    
    // Check stock availability for the requested quantity
    const availableStock = product.stock || 0;
    if (availableStock <= 0) {
      showError('This product is currently out of stock.');
      return;
    }
    
    if (quantity > availableStock) {
      showError(`Cannot buy ${quantity} items. Only ${availableStock} items available in stock.`);
      return;
    }
    
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
        quantity: quantity,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* SEO for loading state */}
        <Helmet>
          <title>Loading Product... - International Tijarat</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* SEO for error page */}
        <Helmet>
          <title>Product Not Found - International Tijarat</title>
          <meta name="description" content="The product you're looking for could not be found. Browse our other products or return to the homepage." />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h1>
            <p className="text-gray-600 mb-4">
              The product you're looking for might have been moved, deleted, or doesn't exist.
            </p>
            <div className="text-sm text-gray-500 mb-6 p-3 bg-gray-100 rounded-lg">
              <strong>Error details:</strong> {error}
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-orange-500 text-white px-6 py-3 rounded-md hover:bg-orange-600 transition-colors"
            >
              Go Back Home
            </button>
            <button
              onClick={() => navigate("/products")}
              className="w-full bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600 transition-colors"
            >
              Browse All Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* SEO for no product state */}
        <Helmet>
          <title>Product Not Available - International Tijarat</title>
          <meta name="description" content="This product is currently not available. Please browse our other products." />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h1>
          <button
            onClick={() => navigate("/")}
            className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  // Calculate discounted price only when product exists
  const discountedPrice = product && product.price ? (
    product.discount > 0 
      ? product.price * (1 - product.discount / 100) 
      : product.price
  ) : 0;

  // Generate comprehensive SEO data
  const seoData = product ? generateProductSEO(product) : null;
  const breadcrumbs = product ? generateBreadcrumbs('product', product) : [];
  const canonicalUrl = product ? generateCanonicalUrl('product', product.slug || product._id) : '';
  
  // Generate structured data
  const productSchema = product ? generateProductSchema(product) : null;
  const breadcrumbSchema = breadcrumbs.length ? generateBreadcrumbSchema(breadcrumbs) : null;

  return (
    <div className="bg-gray-50 py-1 lg:py-0 min-h-screen">
      {/* Comprehensive SEO Head Tags */}
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{seoData?.title || 'Product - International Tijarat'}</title>
        <meta name="title" content={seoData?.title || 'Product - International Tijarat'} />
        <meta name="description" content={seoData?.description || 'Quality products at International Tijarat'} />
        <meta name="keywords" content={seoData?.keywords || 'ecommerce, products, shopping'} />
        
        {/* Canonical URL */}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl || window.location.href} />
        <meta property="og:title" content={seoData?.title || 'Product - International Tijarat'} />
        <meta property="og:description" content={seoData?.description || 'Quality products at International Tijarat'} />
        <meta property="og:image" content={seoData?.image || '/og-image.jpg'} />
        <meta property="og:site_name" content="International Tijarat" />
        
        {/* Product-specific Open Graph tags */}
        {product?.price && <meta property="product:price:amount" content={product.price} />}
        {product?.price && <meta property="product:price:currency" content="USD" />}
        {product?.stock !== undefined && <meta property="product:availability" content={product.stock > 0 ? "in stock" : "out of stock"} />}
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={canonicalUrl || window.location.href} />
        <meta property="twitter:title" content={seoData?.title || 'Product - International Tijarat'} />
        <meta property="twitter:description" content={seoData?.description || 'Quality products at International Tijarat'} />
        <meta property="twitter:image" content={seoData?.image || '/og-image.jpg'} />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        
        {/* Structured Data */}
        {productSchema && (
          <script type="application/ld+json">
            {JSON.stringify(productSchema)}
          </script>
        )}
        {breadcrumbSchema && (
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbSchema)}
          </script>
        )}
        
        {/* Preload critical images */}
        {seoData?.image && <link rel="preload" as="image" href={seoData.image} />}
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-6 py-2 lg:py-1">
        
        {/* SEO-Enhanced Breadcrumb Navigation */}
        <nav className="mb-2 lg:mb-1" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                {index > 0 && <span className="text-gray-400 mx-2">/</span>}
                {crumb.url ? (
                  <button 
                    onClick={() => navigate(crumb.url)} 
                    className="text-orange-500 hover:text-orange-600 transition-colors"
                    itemProp="item"
                  >
                    <span itemProp="name">{crumb.name}</span>
                  </button>
                ) : (
                  <span className="text-gray-600 font-medium" itemProp="name">
                    {crumb.name}
                  </span>
                )}
                <meta itemProp="position" content={index + 1} />
              </li>
            ))}
          </ol>
        </nav>

        {/* Fallback simple breadcrumb if breadcrumbs array is empty */}
        {breadcrumbs.length === 0 && (
          <nav className="mb-1 lg:mb-0" aria-label="Simple Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <button onClick={() => navigate("/")} className="text-orange-500 hover:text-orange-600">
                  Home
                </button>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <button onClick={() => navigate("/products")} className="text-orange-500 hover:text-orange-600">
                  Products
                </button>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-600">{product?.title || 'Product'}</li>
            </ol>
          </nav>
        )}

        {/* Product Details */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            
            {/* Product Media Carousel */}
            <div className="w-full lg:w-1/2">
              <ProductCarousel product={product} className="h-80 lg:h-72" />
            </div>

            {/* Product Details */}
            <div className="w-full lg:w-1/2 p-6 lg:p-4">
              {/* Product Title */}
              <h1 className="text-2xl lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-1" itemProp="name">
                {product?.seo?.title || product?.metaTitle || product?.title || 'Product'}
              </h1>

              {/* Price */}
              <div className="mb-4 lg:mb-2">
                <span className="text-3xl lg:text-4xl font-bold text-orange-600">
                  PKR {(discountedPrice || 0).toFixed(2)}
                </span>
                {product && product.discount > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-lg text-gray-500 line-through">
                      PKR {(product.price || 0).toFixed(2)}
                    </span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {product.discount}% OFF
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-4 lg:mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  product && product.stock > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`font-medium ${
                  product && product.stock > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product && product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              {/* Description */}
              <div className="mb-4 lg:mb-2">
                <h3 className="text-lg lg:text-base font-semibold mb-1">Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  {product?.description || 'No description available'}
                </p>
              </div>

              {/* Categories */}
              {(() => {
                const mainCategories = extractCategoryNames(product?.mainCategory);
                const subCategories = extractCategoryNames(product?.subCategory);
                const categories = extractCategoryNames(product?.category);
                const hasAnyCategories = mainCategories.length > 0 || subCategories.length > 0 || categories.length > 0;
                
                return hasAnyCategories && (
                  <div className="mb-4 lg:mb-2">
                    <h3 className="text-lg lg:text-base font-semibold mb-2 lg:mb-1">Categories</h3>
                    <div className="flex flex-wrap gap-1 lg:gap-1">
                      {mainCategories.map((catName, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 lg:px-2 py-1 rounded-full text-sm lg:text-xs">
                          {catName}
                        </span>
                      ))}
                      {subCategories.map((catName, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 lg:px-2 py-1 rounded-full text-sm lg:text-xs">
                          {catName}
                        </span>
                      ))}
                      {categories.map((catName, index) => (
                        <span key={index} className="bg-purple-100 text-purple-800 px-2 lg:px-2 py-1 rounded-full text-sm lg:text-xs">
                          {catName}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Vendor Information */}
              <div className="mb-4 lg:mb-2">
                <h3 className="text-lg lg:text-base font-semibold mb-1">Sold by</h3>
                <span className="text-orange-600 font-semibold text-lg">
                  {product?.vendor && typeof product.vendor === 'object' && product.vendor.businessName
                    ? product.vendor.businessName
                    : product?.vendor?.name || 'International Tijarat'}
                </span>
              </div>

              {/* Quantity and Action Buttons */}
              <div className="space-y-3 lg:space-y-2">
                <div className="flex items-center gap-4">
                  <label className="text-lg lg:text-base font-semibold">Quantity:</label>
                  <div className="flex items-center border-2 border-gray-300 rounded-lg">
                    <button
                      onClick={handleQuantityDecrease}
                      className="px-3 lg:px-2 py-2 lg:py-1 text-xl lg:text-lg font-bold hover:bg-gray-100 transition-colors"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="w-16 lg:w-12 py-2 lg:py-1 text-center border-0 focus:ring-0 text-lg lg:text-base font-semibold"
                      min="1"
                      max={product?.stock || 999}
                    />
                    <button
                      onClick={handleQuantityIncrease}
                      className={`px-3 lg:px-2 py-2 lg:py-1 text-xl lg:text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        (product?.stock || 0) === 0 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : quantity >= (product?.stock || 0)
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'hover:bg-gray-100'
                      }`}
                      disabled={(product?.stock || 0) === 0}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Stock availability indicator */}
                {product?.stock !== undefined && (
                  <div className="text-sm text-gray-600">
                    {product.stock > 0 ? (
                      <span>
                        <strong>{product.stock}</strong> items available
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">Out of stock</span>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={(product?.stock || 0) === 0 || isAddingToCart}
                    className={`flex-1 py-4 lg:py-2 rounded-lg font-bold text-lg lg:text-sm transition-colors ${
                      (product?.stock || 0) === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    {isAddingToCart ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 lg:h-3 lg:w-3 border-b-2 border-white"></div>
                        <span className="lg:text-xs">Adding...</span>
                      </div>
                    ) : (product?.stock || 0) === 0 ? (
                      'Out of Stock'
                    ) : (
                      'Add to Cart'
                    )}
                  </button>
                  
                  <button
                    onClick={handleBuyNow}
                    disabled={(product?.stock || 0) === 0}
                    className={`flex-1 py-4 lg:py-2 rounded-lg font-bold text-lg lg:text-sm transition-colors ${
                      (product?.stock || 0) === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {(product?.stock || 0) === 0 ? 'Out of Stock' : 'Buy Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
