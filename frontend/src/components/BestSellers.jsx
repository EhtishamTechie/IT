import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';
import { getApiUrl, getImageUrl } from '../config';
import { toast } from 'react-toastify';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import EnhancedProductCard from './EnhancedProductCard';

const CACHE_DURATION = 30000; // 30 seconds

const BestSellers = () => {
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();
  
  const [categoryProducts, setCategoryProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  
  // Cache
  const cache = useRef({
    categoryProducts: { data: null, timestamp: 0 }
  });

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      const now = Date.now();
      if (cache.current.categoryProducts.data && now - cache.current.categoryProducts.timestamp < CACHE_DURATION) {
        console.log('Using cached best sellers data');
        setCategoryProducts(cache.current.categoryProducts.data);
        setLoading(false);
        return;
      }

      console.log('Fetching fresh best sellers data');
      try {
        // Fetch static categories that we set up in admin
        const response = await API.get(getApiUrl('homepage/static-categories'));
        const staticCategories = response.data.categories;

        // Transform the data into the format we need
        const productsMap = {};
        staticCategories.forEach(category => {
          productsMap[category.category._id] = {
            name: category.category.name,
            products: category.selectedProducts || []
          };
        });

        setCategoryProducts(productsMap);
        
        // Update cache
        cache.current.categoryProducts = {
          data: productsMap,
          timestamp: now
        };
      } catch (err) {
        console.error('Error fetching homepage categories:', err);
        toast.error('Failed to load best sellers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, []);

  // Handle add to cart
  const handleAddToCart = async (product) => {
    setErrorMessages(prev => ({ ...prev, [product._id]: null }));
    
    try {
      setAddingToCart(prev => ({ ...prev, [product._id]: true }));
      
      const result = await addToCart(product);
      
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
    return getCartItemQuantity(productId) > 0;
  };

  if (loading) {
    return (
      <div className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 w-1/3 bg-gray-200 rounded mb-6 sm:mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-56 sm:h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8 sm:space-y-12">
          {Object.entries(categoryProducts).map(([categoryId, { name, products }]) => (
            <div key={categoryId}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Best Sellers in {name}</h2>
                <Link
                  to={`/category-group/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="text-sm sm:text-base text-blue-600 hover:text-blue-800 font-medium"
                >
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {products.slice(0, 4).map((product) => (
                  <EnhancedProductCard 
                    key={product._id} 
                    product={product}
                    onAddToCart={handleAddToCart}
                    onBuyNow={handleBuyNow}
                    cartQuantity={getCartItemQuantity(product._id)}
                    isInCart={isProductInCart(product._id)}
                    isAddingToCart={addingToCart[product._id] || false}
                    errorMessage={errorMessages[product._id]}
                    showBuyNow={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BestSellers;
