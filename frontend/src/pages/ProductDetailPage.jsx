import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductService from "../services/productService";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl, getImageUrl } from '../config';

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
  const [imageError, setImageError] = useState(false); // Track image loading errors
  
  // Use cart and auth contexts
  const { addToCart, isInCart, getCartItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [selectedImage, setSelectedImage] = useState(0);

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
      setImageError(false); // Reset image error state for new product
      
      try {
        console.log(`Fetching product with ID: ${productId}`);
        
        // Try to fetch from backend
        const response = await ProductService.getProductById(productId);
        console.log('📦 Raw response received:', response);
        
        // Handle different response formats from backend
        let productData = null;
        
        if (response && response.success && response.product) {
          // New format: {success: true, product: {...}}
          productData = response.product;
        } else if (response && response._id) {
          // Direct product object format
          productData = response;
        } else if (response && response.data && response.data._id) {
          // Nested data format: {data: {...}}
          productData = response.data;
        }
        
        if (productData && productData._id) {
          setProduct(productData);
          document.title = `${productData.title} - International Tijarat`;
        } else {
          throw new Error(response?.message || 'Product not found or invalid format');
        }
        
      } catch (err) {
        console.error('Error fetching product:', err);
        
        // Show error instead of mock product for better debugging
        setError(`Product not found: ${err.message || err.response?.data?.message || 'Unknown error'}`);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h2>
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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <nav className="mb-8">
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

        {/* Product Details */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="lg:flex">
            
            {/* Product Image */}
            <div className="lg:w-1/2">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                {!imageError && product?.image ? (
                  <img
                    src={getImageUrl('products', product.image)}
                    alt={product?.title || 'Product'}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error('❌ Image failed to load:', e.target.src);
                      setImageError(true);
                    }}
                    onLoad={(e) => console.log('✅ Product image loaded successfully:', e.target.src)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 p-8">
                    <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">No Image Available</p>
                    <p className="text-sm">Product image could not be loaded</p>
                    {product?.image && (
                      <p className="text-xs text-gray-500 mt-2">
                        Image path: {product.image}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="lg:w-1/2 p-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product?.title || 'Product'}</h1>
                
                {/* Price */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl font-bold text-gray-900">
                      ${(discountedPrice || 0).toFixed(2)}
                    </span>
                    {product && product.discount > 0 && (
                      <>
                        <span className="text-xl text-gray-500 line-through">
                          ${(product.price || 0).toFixed(2)}
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
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{product?.description || 'No description available'}</p>
                </div>

                {/* Category Information */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Categories
                  </h3>
                  <div className="space-y-2">
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
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Vendor Information
                    </h3>
                    <div className="space-y-2">
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
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Product Information
                    </h3>
                    <div className="space-y-2">
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
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="font-medium">Quantity:</label>
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 hover:bg-gray-100"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-3 py-2 text-center border-0 focus:ring-0"
                        min="1"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-2 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handleAddToCart}
                      disabled={(product?.stock || 0) === 0 || isAddingToCart}
                      className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                        (product?.stock || 0) === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isAddingToCart ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Adding...
                        </div>
                      ) : (product?.stock || 0) === 0 ? (
                        'Out of Stock'
                      ) : (
                        'Add to Cart'
                      )}
                    </button>
                    
                    <button className="py-3 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">Features</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
