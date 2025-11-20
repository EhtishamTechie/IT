import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, Star, ArrowRight, Zap, Award, TrendingUp } from 'lucide-react';
import axios from 'axios';
import ProductService from '../services/productService';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getImageUrl } from '../config';
import EnhancedProductCard from './EnhancedProductCard';

const PremiumProductDisplay = ({ premiumProducts = [], featuredProducts = [], newArrivals = [] }) => {
  const navigate = useNavigate();
  const { addToCart, removeFromCart, cartItems } = useCart();
  const { user } = useAuth();
  const [addingToCart, setAddingToCart] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const tabs = [
    { id: 'featured', label: 'Premium', icon: Award },
    { id: 'trending', label: 'New Arrivals', icon: Zap },
    { id: 'newArrivals', label: 'Featured', icon: TrendingUp }
  ];
  const [activeTab, setActiveTab] = useState('featured');
  const [products, setProducts] = useState({
    featured: [],
    trending: [],
    newArrivals: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update products when props change
  useEffect(() => {
    setProducts({
      featured: premiumProducts,    // Premium products show in the Premium tab
      trending: newArrivals,        // New arrivals in the middle tab
      newArrivals: featuredProducts // Featured products show in the Featured tab
    });
  }, [premiumProducts, featuredProducts, newArrivals]);

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

  // Cart functionality
  const handleAddToCart = async (product, quantity = 1, selectedSize = null) => {
    setErrorMessages(prev => ({ ...prev, [product._id]: null }));
    
    try {
      setAddingToCart(prev => ({ ...prev, [product._id]: true }));
      
      const result = await addToCart(product, quantity, selectedSize);
      
      if (result && result.success) {
        console.log(`${product.title || product.name} added to cart successfully`);
      } else {
        console.error('Cart operation failed:', result?.error || 'Failed to add to cart');
      }
      
    } catch (error) {
      console.error('Cart add error:', error);
    } finally {
      setAddingToCart(prev => ({ ...prev, [product._id]: false }));
    }
  };

  // Handle buy now with authentication check
  const handleBuyNow = async (product, quantity = 1, selectedSize = null) => {
    try {
      // Check if user is authenticated first
      if (!user) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }

      // Store product in localStorage for buy now checkout
      // IMPORTANT: Use standardized structure matching cart items
      const buyNowItem = {
        quantity: quantity,
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
      
      console.log('✅ Buy Now item structured (PremiumProductDisplay):', buyNowItem);
      localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
      
      // Navigate directly to checkout, skipping cart page
      navigate('/checkout');
    } catch (error) {
      console.error('Buy now error:', error);
    }
  };

  // Helper function to check if product is in cart and get quantity
  const getCartItemQuantity = (productId) => {
    if (!cartItems || !Array.isArray(cartItems)) {
      return 0;
    }
    
    const cartItem = cartItems.find(item => 
      item._id === productId || 
      item.productData?._id === productId ||
      item.productId === productId
    );
    
    return cartItem ? (cartItem.quantity || 0) : 0;
  };

  // Helper function to check if product is in cart
  const isProductInCart = (productId) => {
    const quantity = getCartItemQuantity(productId);
    return quantity > 0;
  };

  return (
    <section className="py-8 bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-pink-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-600 px-6 py-3 rounded-full text-sm font-bold mb-4 shadow-lg">
            <Zap className="w-4 h-4" />
            <span>Premium Collection</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Discover
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent"> Exceptional</span>
            <br />Products
          </h2>
          <p className="text-sm text-gray-600 max-w-3xl mx-auto leading-relaxed">
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
                <EnhancedProductCard 
                  key={product._id || product.id} 
                  product={product}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  cartQuantity={getCartItemQuantity(product._id || product.id)}
                  isInCart={isProductInCart(product._id || product.id)}
                  isAddingToCart={addingToCart[product._id || product.id] || false}
                  errorMessage={errorMessages[product._id || product.id]}
                  showBuyNow={true}
                />
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