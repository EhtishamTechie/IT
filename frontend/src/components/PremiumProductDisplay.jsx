import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, Star, ArrowRight, Zap, Award, TrendingUp } from 'lucide-react';
import axios from 'axios';
import ProductService from '../services/productService';
import { useCart } from '../contexts/CartContext';
import { getApiUrl, getImageUrl } from '../config';

const PremiumProductDisplay = () => {
  const { addToCart, removeFromCart, cartItems } = useCart();
  const tabs = [
    { id: 'featured', label: 'Premium', icon: Award },
    { id: 'trending', label: 'New Arrivals', icon: Zap },
    { id: 'newArrivals', label: 'Featured', icon: TrendingUp }
  ];
  const [activeTab, setActiveTab] = useState('featured');
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [addingToCart, setAddingToCart] = useState(null); // Track which product is being added
  const [products, setProducts] = useState({
    featured: [],
    trending: [],
    newArrivals: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load products from backend
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Load products from different endpoints in parallel
        const [premiumResponse, featuredResponse, newArrivalsData] = await Promise.all([
          axios.get(getApiUrl('special/premium')),
          axios.get(getApiUrl('special/featured')),
          ProductService.getTrendingProducts(20)  // Get up to 20 new arrivals
        ]);

        // Get products from our special endpoints
        const premiumProducts = premiumResponse.data || [];
        const featuredProducts = featuredResponse.data || [];
        
        // Get new arrivals from dedicated API (sorted by creation date)
        const newArrivals = ProductService.formatProducts(newArrivalsData.products || []);
        
        console.log('📊 Product sections:', {
          premium: { count: premiumProducts.length, products: premiumProducts },
          newArrivals: { count: newArrivals.length, products: newArrivals },
          featured: { count: featuredProducts.length, products: featuredProducts }
        });

        setProducts({
          featured: premiumProducts,    // Premium products show in the Premium tab
          trending: newArrivals,        // New arrivals in the middle tab
          newArrivals: featuredProducts // Featured products show in the Featured tab
        });
      } catch (err) {
        console.error('❌ Error loading products:', err);
        setError('Unable to load products. Please try again later.');
        // Fallback to static products in development environment
        if (process.env.NODE_ENV === 'development') {
          setProducts(staticProducts);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Fallback static product data for demo purposes
  const staticProducts = {
    featured: [
      {
        id: 1,
        name: "Premium Wireless Headphones",
        price: 299.99,
        originalPrice: 399.99,
        rating: 4.8,
        image: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Best Seller",
        discount: 25
      },
      {
        id: 2,
        name: "Smart Fitness Watch Series X",
        price: 449.99,
        originalPrice: 549.99,
        rating: 4.9,
        image: "https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "New Arrival",
        discount: 18
      },
      {
        id: 3,
        name: "Professional Camera Lens",
        price: 1299.99,
        originalPrice: 1599.99,
        rating: 4.7,
        image: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Pro Choice",
        discount: 19
      },
      {
        id: 4,
        name: "Luxury Ergonomic Office Chair",
        price: 899.99,
        originalPrice: 1199.99,
        rating: 4.6,
        image: "https://images.pexels.com/photos/586958/pexels-photo-586958.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Editor's Pick",
        discount: 25
      },
      {
        id: 9,
        name: "MacBook Pro 16-inch",
        price: 2499.99,
        originalPrice: 2799.99,
        rating: 4.9,
        image: "https://images.pexels.com/photos/812264/pexels-photo-812264.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Premium",
        discount: 11
      },
      {
        id: 10,
        name: "Designer Running Shoes",
        price: 179.99,
        originalPrice: 219.99,
        rating: 4.7,
        image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Sports",
        discount: 18
      }
    ],
    trending: [
      {
        id: 5,
        name: "Gaming Mechanical Keyboard",
        price: 189.99,
        originalPrice: 229.99,
        rating: 4.8,
        image: "https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Hot Deal",
        discount: 17
      },
      {
        id: 6,
        name: "Wireless Charging Stand",
        price: 79.99,
        originalPrice: 99.99,
        rating: 4.5,
        image: "https://images.pexels.com/photos/4158/apple-iphone-smartphone-desk.jpg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Eco-Friendly",
        discount: 20
      },
      {
        id: 11,
        name: "4K Ultra HD Monitor",
        price: 599.99,
        originalPrice: 749.99,
        rating: 4.6,
        image: "https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Gaming",
        discount: 20
      },
      {
        id: 12,
        name: "Bluetooth Speaker Pro",
        price: 149.99,
        originalPrice: 199.99,
        rating: 4.4,
        image: "https://images.pexels.com/photos/1619651/pexels-photo-1619651.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Audio",
        discount: 25
      },
      {
        id: 13,
        name: "Smart Coffee Maker",
        price: 299.99,
        originalPrice: 379.99,
        rating: 4.7,
        image: "https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Kitchen",
        discount: 21
      },
      {
        id: 14,
        name: "Portable Power Bank",
        price: 49.99,
        originalPrice: 69.99,
        rating: 4.3,
        image: "https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Essential",
        discount: 29
      }
    ],
    newArrivals: [
      {
        id: 7,
        name: "Smart Home Hub Pro",
        price: 199.99,
        originalPrice: 249.99,
        rating: 4.4,
        image: "https://images.pexels.com/photos/4790566/pexels-photo-4790566.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Just Launched",
        discount: 20
      },
      {
        id: 8,
        name: "Premium Skincare Set",
        price: 159.99,
        originalPrice: 199.99,
        rating: 4.9,
        image: "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Limited Edition",
        discount: 20
      },
      {
        id: 15,
        name: "Wireless Earbuds Pro",
        price: 199.99,
        originalPrice: 249.99,
        rating: 4.8,
        image: "https://images.pexels.com/photos/8566472/pexels-photo-8566472.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "New",
        discount: 20
      },
      {
        id: 16,
        name: "Smart Thermostat",
        price: 249.99,
        originalPrice: 299.99,
        rating: 4.5,
        image: "https://images.pexels.com/photos/4440449/pexels-photo-4440449.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Smart Home",
        discount: 17
      },
      {
        id: 17,
        name: "Professional Drone",
        price: 899.99,
        originalPrice: 1099.99,
        rating: 4.6,
        image: "https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Pro",
        discount: 18
      },
      {
        id: 18,
        name: "Electric Toothbrush",
        price: 129.99,
        originalPrice: 159.99,
        rating: 4.7,
        image: "https://images.pexels.com/photos/3738352/pexels-photo-3738352.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
        badge: "Health",
        discount: 19
      }
    ]
  };



  const toggleFavorite = (productId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  };

  const handleAddToCart = async (product) => {
    try {
      setAddingToCart(product._id);
      // Format the product data properly before adding to cart
      const formattedProduct = {
        ...product,
        _id: product._id,
        title: product.title,
        price: product.price,
        // Keep both images array and single image
        images: product.images || [],
        image: product.image,
        stock: product.stock || 100,
        quantity: 1
      };
      
      // Log the product data for debugging
      console.log('Adding to cart with image data:', {
        images: formattedProduct.images,
        image: formattedProduct.image
      });
      
      await addToCart(formattedProduct, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  const getBadgeColor = (badge) => {
    const colors = {
      'Best Seller': 'bg-gradient-to-r from-yellow-400 to-orange-500',
      'New Arrival': 'bg-gradient-to-r from-green-400 to-blue-500',
      'Pro Choice': 'bg-gradient-to-r from-purple-400 to-pink-500',
      'Editor\'s Pick': 'bg-gradient-to-r from-red-400 to-pink-500',
      'Hot Deal': 'bg-gradient-to-r from-orange-400 to-red-500',
      'Eco-Friendly': 'bg-gradient-to-r from-green-400 to-emerald-500',
      'Just Launched': 'bg-gradient-to-r from-blue-400 to-indigo-500',
      'Limited Edition': 'bg-gradient-to-r from-purple-400 to-violet-500'
    };
    return colors[badge] || 'bg-gradient-to-r from-gray-400 to-gray-500';
  };

  const ProductCard = ({ product }) => {
    // Use MongoDB _id as primary ID
    const productId = product._id;
    const productName = product.title;
    const productPrice = product.price;
    const productImage = getImageUrl('products', product.images?.[0] || product.image);
    const productRating = product.rating || 4.5;
    const productBadge = product.badge || (product.stock < 50 ? 'Limited Stock' : 'New');
    const productDiscount = product.discount || 0;
    const productOriginalPrice = product.originalPrice;
    const productStock = product.stock || 0;

    return (
      <div 
        className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-gray-200"
        onMouseEnter={() => setHoveredProduct(productId)}
        onMouseLeave={() => setHoveredProduct(null)}
      >
        {/* Product Badge */}
        <div className={`absolute top-3 left-3 z-20 ${getBadgeColor(productBadge)} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>
          {productBadge}
        </div>

        {/* Discount Badge */}
        {productDiscount > 0 && (
          <div className="absolute top-3 right-3 z-20 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            -{productDiscount}%
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={() => toggleFavorite(productId)}
          className={`absolute top-12 right-3 z-20 p-2 rounded-full transition-all duration-300 ${
            favorites.has(productId) 
              ? 'bg-red-500 text-white scale-110' 
              : 'bg-white/90 text-gray-600 hover:bg-red-500 hover:text-white'
          } backdrop-blur-sm shadow-lg`}
        >
          <Heart className={`w-4 h-4 ${favorites.has(productId) ? 'fill-current' : ''}`} />
        </button>

        {/* Product Image */}
        <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <img 
            src={productImage}
            alt={productName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              console.error('Image failed to load:', productImage);
              e.target.src = '/assets/no-image.png';
            }}
          />
          
          {/* Overlay on Hover */}
          <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            hoveredProduct === productId ? 'opacity-20' : 'opacity-0'
          }`} />
          
          {/* Quick Action Buttons */}
          <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-all duration-500 ${
            hoveredProduct === productId ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Link to={`/product/${productId}`} className="bg-white text-gray-900 p-3 rounded-full hover:bg-gray-100 transition-colors duration-200 shadow-xl">
              <Eye className="w-5 h-5" />
            </Link>
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleAddToCart(product);
              }}
              disabled={addingToCart === productId}
              className={`${addingToCart === productId ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'} 
                text-white p-3 rounded-full transition-colors duration-200 shadow-xl`}>
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-5">
          {/* Name */}
          <Link to={`/product/${productId}`}>
            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors duration-200">
              {productName}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${
                    i < Math.floor(productRating) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">{productRating}</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">${productPrice}</span>
              {productOriginalPrice && (
                <span className="text-sm text-gray-400 line-through">${productOriginalPrice}</span>
              )}
            </div>
            <button 
              onClick={() => handleAddToCart(product)}
              disabled={addingToCart === productId}
              className={`${addingToCart === productId ? 'bg-gray-400' : 'bg-gradient-to-r from-orange-500 to-pink-500'} 
                text-white px-4 py-2 rounded-full font-semibold hover:shadow-lg transform hover:scale-105 
                transition-all duration-200 text-sm flex items-center gap-2`}>
              {addingToCart === productId ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Adding...
                </>
              ) : (
                'Add to Cart'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-pink-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-600 px-6 py-3 rounded-full text-sm font-bold mb-6 shadow-lg">
            <Zap className="w-4 h-4" />
            <span>Premium Collection</span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Discover
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent"> Exceptional</span>
            <br />Products
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Curated collection of premium products from world-class brands, 
            designed to elevate your lifestyle with unmatched quality and innovation.
          </p>
        </div>

        {/* Dynamic Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-xl shadow-orange-500/25 scale-105'
                    : 'bg-white text-gray-600 hover:text-gray-900 shadow-lg hover:shadow-xl border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
                
                {/* Active indicator */}
                {activeTab === tab.id && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <span className="ml-4 text-gray-600">Loading products...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {(products[activeTab] && products[activeTab].length > 0) ? (
              products[activeTab].map((product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <p className="text-gray-600 mb-4">No products available in this category</p>
                <p className="text-sm text-gray-500">Check back soon for new arrivals!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PremiumProductDisplay;