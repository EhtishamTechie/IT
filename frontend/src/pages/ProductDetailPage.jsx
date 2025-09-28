import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ProductService from "../services/productService";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl, getImageUrl } from '../config';
import ProductCarousel from '../components/ProductCarousel';
import Footer from '../components/Footer';
import { generateProductSEO, generateBreadcrumbs, generateCanonicalUrl } from '../utils/seoHelpers';
import { generateProductSchema, generateBreadcrumbSchema } from '../utils/schemaGenerator';

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

  const handleAddToCart = async () => {
    if (!product) return;
    
    setIsAddingToCart(true);
    try {
      await addToCart(product, quantity);
      console.log('Product added to cart successfully');
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle buy now with authentication check
  const handleBuyNow = async () => {
    if (!product) return;
    
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
        quantity: quantity
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
    <div className="bg-gray-50 py-2">
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
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SEO-Enhanced Breadcrumb Navigation */}
        <nav className="mb-4" aria-label="Breadcrumb">
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
          <nav className="mb-2" aria-label="Simple Breadcrumb">
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
          <div className="lg:flex">
            
            {/* Product Media Carousel */}
            <div className="lg:w-1/2">
              <ProductCarousel product={product} className="h-40 sm:h-48 lg:h-56" />
            </div>

            {/* Product Details */}
            <div className="lg:w-1/2 p-2 sm:p-3">
              <div itemScope itemType="https://schema.org/Product">
                {/* SEO-optimized product title */}
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1" itemProp="name">
                  {product?.seo?.title || product?.metaTitle || product?.title || 'Product'}
                </h1>
                
                {/* Hidden SEO elements */}
                <div style={{ display: 'none' }}>
                  <span itemProp="description">{product?.seo?.description || product?.metaDescription || product?.description}</span>
                  <span itemProp="sku">{product?.sku || product?._id}</span>
                  <span itemProp="mpn">{product?.sku || product?._id}</span>
                  <div itemProp="brand" itemScope itemType="https://schema.org/Brand">
                    <span itemProp="name">{product?.brand || 'International Tijarat'}</span>
                  </div>
                </div>
                
                {/* SEO-Enhanced Price Section */}
                <div className="space-y-1 mb-3" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl font-bold text-gray-900" itemProp="price" content={(discountedPrice || 0).toFixed(2)}>
                      PKR {(discountedPrice || 0).toFixed(2)}
                    </span>
                    {/* Hidden structured data */}
                    <meta itemProp="priceCurrency" content="USD" />
                    <meta itemProp="availability" content={product?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
                    <meta itemProp="url" content={canonicalUrl || window.location.href} />
                    <meta itemProp="priceValidUntil" content={new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} />
                    {product && product.discount > 0 && (
                      <>
                        <span className="text-base text-gray-500 line-through">
                          PKR {(product.price || 0).toFixed(2)}
                        </span>
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
                          {product.discount}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Stock Status */}
                  <div className="flex items-center space-x-2">
                    {product && product.stock > 0 ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-600 font-medium">In Stock</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-red-600 font-medium">Out of Stock</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <h3 className="text-sm font-semibold mb-1">Description</h3>
                  <p className="text-gray-600 text-xs">{product?.description || 'No description available'}</p>
                </div>

                {/* Category Information */}
                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-semibold mb-1 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {/* Main Category */}
                    {(() => {
                      const mainCategories = extractCategoryNames(product?.mainCategory);
                      return mainCategories.length > 0 && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Main:</span>
                          <div className="flex flex-wrap gap-2">
                            {mainCategories.map((catName, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                                {catName}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Sub Category */}
                    {(() => {
                      const subCategories = extractCategoryNames(product?.subCategory);
                      return subCategories.length > 0 && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Sub:</span>
                          <div className="flex flex-wrap gap-2">
                            {subCategories.map((catName, index) => (
                              <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                                {catName}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* General Category */}
                    {(() => {
                      const categories = extractCategoryNames(product?.category);
                      return categories.length > 0 && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Category:</span>
                          <div className="flex flex-wrap gap-2">
                            {categories.map((catName, index) => (
                              <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                                {catName}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Show message if no categories are available */}
                    {(() => {
                      const hasAnyCategories = 
                        extractCategoryNames(product?.mainCategory).length > 0 ||
                        extractCategoryNames(product?.subCategory).length > 0 ||
                        extractCategoryNames(product?.category).length > 0;
                      
                      return !hasAnyCategories && (
                        <p className="text-gray-500 text-sm">No categories assigned to this product</p>
                      );
                    })()}
                  </div>
                </div>

                {/* Vendor Information */}
                {product?.vendor && typeof product.vendor === 'object' && product.vendor.businessName ? (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold mb-1 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Vendor Information
                    </h3>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-20">Sold by:</span>
                        <span className="text-emerald-600 font-semibold">
                          {typeof product.vendor === 'object' && product.vendor.businessName 
                            ? product.vendor.businessName 
                            : product.vendor.name || 'Verified Vendor'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold mb-1 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Product Information
                    </h3>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-20">Sold by:</span>
                        <span className="text-black font-semibold flex items-center">
                          International Tijarat
                          <span 
                            className="ml-2 text-black cursor-help" 
                            title="Directly owned by International Tijarat"
                          >
                            ✓
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-20">Status:</span>
                        <span className="text-green-600">Directly managed by our team</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quantity and Add to Cart */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <label className="font-medium text-sm">Quantity:</label>
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-2 py-1 hover:bg-gray-100 text-sm"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 px-2 py-1 text-center border-0 focus:ring-0 text-sm"
                        min="1"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-2 py-1 hover:bg-gray-100 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddToCart}
                      disabled={(product?.stock || 0) === 0 || isAddingToCart}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                        (product?.stock || 0) === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isAddingToCart ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Adding...
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
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                        (product?.stock || 0) === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {(product?.stock || 0) === 0 ? 'Out of Stock' : 'Buy Now'}
                    </button>
                    
                    <button className="py-2 px-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Features */}
        {product.features && product.features.length > 0 && (
          <div className="mt-2 bg-white rounded-lg shadow-sm p-2 sm:p-3">
            <h2 className="text-base sm:text-lg font-bold mb-2">Features</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-2 bg-white rounded-lg shadow-sm p-2 sm:p-3">
            <h2 className="text-base sm:text-lg font-bold mb-2">Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1 border-b border-gray-200">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
