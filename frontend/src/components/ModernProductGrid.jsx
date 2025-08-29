import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid, List, ArrowUpRight, Loader, Search, Filter, Heart, Star,
  Zap, Smartphone, Shirt, Home, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductService from '../services/productService';
import { getUploadUrl } from '../config';

// Configuration for animations and settings
const ANIMATION_CONFIG = {
  staggerDelay: 75,
  hoverScale: 1.08,
  transitionDuration: 500,
  pulseInterval: 3000,
  glowIntensity: 0.15
};

// Icon mapping utility
const iconMap = {
  'Zap': Zap,
  'Smartphone': Smartphone,
  'Shirt': Shirt,
  'Home': Home,
  'Activity': Activity
};

const getIconComponent = (iconName) => {
  return iconMap[iconName] || Zap;
};

// External product data service (now using real API)
const ProductDataService = {
  async fetchProducts() {
    try {
      const products = await ProductService.getAllProducts();
      const formattedProducts = ProductService.formatProducts(products);
      
      // Add demo display properties for the visual presentation
      return formattedProducts.map((product, index) => ({
        ...product,
        id: product._id, // Add id for compatibility with the existing component logic
        featured: index % 3 === 0, // Every 3rd product is featured
        trending: index % 4 === 1, // Every 4th product (offset by 1) is trending
        category: product.mainCategory?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'general'
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to mock data if API fails
      return [
      // Electronics
      { id: 1, category: "electronics", image: "https://images.pexels.com/photos/812264/pexels-photo-812264.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 2, category: "electronics", image: "https://images.pexels.com/photos/4158/apple-iphone-smartphone-desk.jpg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: true },
      { id: 3, category: "electronics", image: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 4, category: "electronics", image: "https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: true },
      { id: 5, category: "electronics", image: "https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 6, category: "electronics", image: "https://images.pexels.com/photos/8566472/pexels-photo-8566472.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: false },
      { id: 7, category: "electronics", image: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: true },
      { id: 8, category: "electronics", image: "https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: false },
      
      // Fashion  
      { id: 9, category: "fashion", image: "https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 10, category: "fashion", image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: true },
      { id: 11, category: "fashion", image: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 12, category: "fashion", image: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: true },
      { id: 13, category: "fashion", image: "https://images.pexels.com/photos/1670766/pexels-photo-1670766.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 14, category: "fashion", image: "https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: false },
      { id: 15, category: "fashion", image: "https://images.pexels.com/photos/1936848/pexels-photo-1936848.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: true },
      { id: 16, category: "fashion", image: "https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: false },
      
      // Home
      { id: 17, category: "home", image: "https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 18, category: "home", image: "https://images.pexels.com/photos/586958/pexels-photo-586958.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: true },
      { id: 19, category: "home", image: "https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 20, category: "home", image: "https://images.pexels.com/photos/3738352/pexels-photo-3738352.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: true },
      { id: 21, category: "home", image: "https://images.pexels.com/photos/4440449/pexels-photo-4440449.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 22, category: "home", image: "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: false },
      { id: 23, category: "home", image: "https://images.pexels.com/photos/4790566/pexels-photo-4790566.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: true },
      { id: 24, category: "home", image: "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: false },
      
      // Sports
      { id: 23, category: "sports", image: "https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: true, trending: false },
      { id: 24, category: "sports", image: "https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop", featured: false, trending: true }
    ];
    }
  },

  async fetchCategories() {
    return [
      { id: 'all', name: 'All Products', icon: 'Zap', color: 'from-blue-500 to-indigo-600' },
      { id: 'electronics', name: 'Electronics', icon: 'Smartphone', color: 'from-purple-500 to-blue-600' },
      { id: 'fashion', name: 'Fashion', icon: 'Shirt', color: 'from-pink-500 to-rose-600' },
      { id: 'home', name: 'Home & Living', icon: 'Home', color: 'from-green-500 to-emerald-600' },
      { id: 'sports', name: 'Sports & Lifestyle', icon: 'Activity', color: 'from-orange-500 to-red-600' }
    ];
  }
};

const ModernProductGrid = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('masonry');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all'); // all, featured, trending

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        ProductDataService.fetchProducts(),
        ProductDataService.fetchCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setTimeout(() => setIsVisible(true), 100);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesSearch = searchTerm === '' || product.id.toString().includes(searchTerm);
    const matchesView = viewFilter === 'all' || 
      (viewFilter === 'featured' && product.featured) ||
      (viewFilter === 'trending' && product.trending);
    return matchesCategory && matchesSearch && matchesView;
  });

  const toggleFavorite = useCallback((productId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  }, []);

  const getProductCardSize = (index) => {
    if (viewMode !== 'masonry') return 'normal';
    
    // Optimized sizing pattern for masonry layout to fill gaps
    const patterns = ['large', 'normal', 'normal', 'normal', 'wide', 'normal', 'tall', 'normal', 'normal', 'normal', 'normal', 'wide', 'normal', 'normal', 'tall', 'normal'];
    return patterns[index % patterns.length];
  };

  const getCardClasses = (size, viewMode) => {
    const baseClasses = "group relative cursor-pointer overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-100 transition-all duration-700";
    
    if (viewMode === 'masonry') {
      switch (size) {
        case 'large': return `${baseClasses} col-span-2 row-span-2`;
        case 'wide': return `${baseClasses} col-span-2`;
        case 'tall': return `${baseClasses} row-span-2`;
        default: return baseClasses;
      }
    }
    
    if (viewMode === 'carousel') {
      return `${baseClasses} min-w-[300px] snap-center`;
    }
    
    return baseClasses;
  };

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <Loader className="w-12 h-12 text-blue-600 animate-spin" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 rounded-full animate-pulse"></div>
      </div>
      <p className="mt-4 text-gray-600 font-medium">Loading premium products...</p>
      <div className="flex gap-2 mt-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
        ))}
      </div>
    </div>
  );

  const ProductCard = ({ product, index, size = 'normal' }) => {
    const cardClasses = getCardClasses(size, viewMode);
    const isLarge = size === 'large';
    const isWide = size === 'wide';
    const isTall = size === 'tall';
    
    return (
      <div
        className={`${cardClasses} hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-2 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ 
          transitionDelay: `${index * ANIMATION_CONFIG.staggerDelay}ms`,
          minHeight: isTall ? '400px' : isLarge ? '300px' : '250px'
        }}
        onClick={() => navigate(`/product/${product._id || product.id}`)}
        onMouseEnter={() => setHoveredProduct(product._id || product.id)}
        onMouseLeave={() => setHoveredProduct(null)}
      >
        {/* Status Badges */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          {product.featured && (
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              Featured
            </span>
          )}
          {product.trending && (
            <span className="bg-gradient-to-r from-red-400 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              Trending
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          className={`absolute top-4 right-4 z-20 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
            favorites.has(product.id)
              ? 'bg-red-500 text-white scale-110 shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white hover:scale-110'
          }`}
        >
          <Heart className={`w-4 h-4 ${favorites.has(product.id) ? 'fill-current' : ''}`} />
        </button>

        {/* Product Image */}
        <div className="relative w-full h-full overflow-hidden rounded-3xl">
          <img
            src={`${getUploadUrl()}/${product.image}`}
            alt={`Product ${product.id}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          
          {/* Floating Action Buttons */}
          <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-all duration-500 ${
            hoveredProduct === product.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-all duration-200 shadow-xl hover:scale-110"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>

          {/* Pulse Effect on Hover */}
          {hoveredProduct === product.id && (
            <div className="absolute inset-0 border-4 border-blue-400 rounded-3xl animate-pulse opacity-50"></div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-b from-white to-gray-50/30">
        <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
          <LoadingState />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-gradient-to-b from-white to-gray-50/30 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden opacity-5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-40 h-40 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-2xl animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${6 + i * 2}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-6 lg:px-12 max-w-7xl relative z-10">
        {/* Dynamic Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-6 py-3 rounded-full border border-blue-100 shadow-sm">
              Premium Collection
            </span>
          </div>
        </div>

        {/* Advanced Controls */}
        <div className="mb-8 space-y-4">
          {/* Search and View Mode */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200 shadow-sm">
              {[
                { mode: 'masonry', icon: Grid, label: 'Masonry' },
                { mode: 'grid', icon: Grid, label: 'Grid' },
                { mode: 'carousel', icon: List, label: 'Carousel' }
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => {
                return (
                  <button
                    key={category.id}
                    onClick={() => setFilterCategory(category.id)}
                    className={`whitespace-nowrap px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                      filterCategory === category.id
                        ? `bg-gradient-to-r ${category.color} text-white shadow-lg shadow-blue-500/25 scale-105`
                        : 'bg-white/80 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span className="mr-2 flex items-center">
                      {React.createElement(getIconComponent(category.icon), { className: "w-4 h-4" })}
                    </span>
                    {category.name}
                  </button>
                );
              })}
            </div>

            {/* View Filters */}
            <div className="flex gap-2">
              {[
                { filter: 'all', label: 'All' },
                { filter: 'featured', label: 'Featured' },
                { filter: 'trending', label: 'Trending' }
              ].map(({ filter, label }) => (
                <button
                  key={filter}
                  onClick={() => setViewFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    viewFilter === filter
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'bg-white/80 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Display */}
        {viewMode === 'carousel' ? (
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <div className={`transition-all duration-500 ${
            viewMode === 'masonry'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-min'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'
          }`}>
            {filteredProducts.map((product, index) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                index={index} 
                size={getProductCardSize(index)}
              />
            ))}
          </div>
        )}


      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default ModernProductGrid;