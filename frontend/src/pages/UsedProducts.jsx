import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createWhatsAppURL } from '../utils/whatsappUtils';
import { getApiUrl, getImageUrl } from '../config';

const UsedProducts = () => {
  const [usedProducts, setUsedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    condition: 'all',
    minPrice: '',
    maxPrice: '',
    sort: '-createdAt'
  });

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

  const categories = [
    'Vehicles',
    'Electronics',
    'Furniture',
    'Home Appliances',
    'Sports & Recreation',
    'Books & Media',
    'Clothing & Accessories',
    'Tools & Equipment',
    'Other'
  ];

  const conditions = ['Excellent', 'Good', 'Fair', 'Poor'];
  const sortOptions = [
    { value: '-createdAt', label: 'Newest First' },
    { value: 'createdAt', label: 'Oldest First' },
    { value: 'price', label: 'Price: Low to High' },
    { value: '-price', label: 'Price: High to Low' },
    { value: '-views', label: 'Most Viewed' }
  ];

  useEffect(() => {
    setCurrentPage(1);
    setHasNextPage(true);
    fetchUsedProducts(1, true);
  }, [filters]);

  const fetchUsedProducts = async (page = 1, resetProducts = true) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const queryParams = new URLSearchParams({
        page: page,
        limit: 20, // Increased limit for better infinite scroll experience
        sort: filters.sort
      });

      if (filters.category !== 'all') queryParams.append('category', filters.category);
      if (filters.condition !== 'all') queryParams.append('condition', filters.condition);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);

      const response = await fetch(getApiUrl(`/used-products?${queryParams}`));
      const result = await response.json();

      if (result.success) {
        const newProducts = result.data || [];
        
        if (resetProducts || page === 1) {
          setUsedProducts(newProducts);
        } else {
          setUsedProducts(prev => [...prev, ...newProducts]);
        }
        
        setTotalProducts(result.pagination.total);
        setCurrentPage(page);
        
        // Check if there are more pages
        const totalPages = result.pagination.pages;
        setHasNextPage(page < totalPages);
        
      } else {
        setError(result.message || 'Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching used products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more products for infinite scroll
  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasNextPage && !loading) {
      fetchUsedProducts(currentPage + 1, false);
    }
  }, [currentPage, hasNextPage, loadingMore, loading]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatPrice = (price) => {
    return `PKR ${new Intl.NumberFormat('en-US').format(price)}`;
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const getConditionColor = (condition) => {
    const colors = {
      'Excellent': 'bg-green-100 text-green-800',
      'Good': 'bg-blue-100 text-blue-800',
      'Fair': 'bg-yellow-100 text-yellow-800',
      'Poor': 'bg-red-100 text-red-800'
    };
    return colors[condition] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Used Products Marketplace</h1>
            <p className="text-xl text-orange-100 max-w-2xl mx-auto">
              Discover great deals on quality pre-owned items from trusted sellers
            </p>
            <div className="mt-8">
              <Link
                to="/sell-used-products"
                className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Sell Your Item</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Condition Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                value={filters.condition}
                onChange={(e) => handleFilterChange('condition', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Conditions</option>
                {conditions.map(cond => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="PKR 0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="PKR ∞"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {loading && usedProducts.length === 0 ? 'Loading...' : `${totalProducts} Products Found`}
          </h2>
          {usedProducts.length > 0 && (
            <div className="text-sm text-gray-600">
              Showing {usedProducts.length} of {totalProducts} products
            </div>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-300"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : usedProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-500 mb-8">Try adjusting your search filters or browse all categories</p>
            <Link
              to="/sell-used-products"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Be the first to sell in this category
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {usedProducts.map((product, index) => (
                <div
                  key={product._id}
                  ref={index === usedProducts.length - 1 ? lastProductElementRef : null}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                {/* Product Image - Clickable for detail page */}
                <Link
                  to={`/used-products/${product._id}`}
                  className="block relative h-48 bg-gray-200"
                >
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={getImageUrl('usedProducts', product.images[0])}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Prevent infinite loop by only setting error once
                        if (!e.target.dataset.errorHandled) {
                          e.target.dataset.errorHandled = 'true';
                          e.target.style.display = 'none';
                          // Show fallback icon instead
                          const fallbackDiv = e.target.nextElementSibling;
                          if (fallbackDiv) {
                            fallbackDiv.style.display = 'flex';
                          }
                        }
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback icon for failed images */}
                  <div className="w-full h-full flex items-center justify-center text-gray-400" style={{display: 'none'}}>
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  
                  {/* Default no image state */}
                  {(!product.images || product.images.length === 0) && (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Condition Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(product.condition)}`}>
                      {product.condition}
                    </span>
                  </div>

                  {/* Multiple Images Indicator */}
                  {product.images && product.images.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
                      +{product.images.length - 1} more
                    </div>
                  )}
                </Link>

                {/* Product Details - Clickable for detail page */}
                <Link to={`/used-products/${product._id}`} className="block p-4">
                  <div className="mb-2">
                    <span className="text-xs text-orange-600 font-medium">{product.category}</span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 h-12">
                    {product.title}
                  </h3>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-bold text-orange-600">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(product.createdAt)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>📍 {product.location}</span>
                  </div>
                </Link>

                {/* WhatsApp Contact Button - Separate from detail link */}
                <div className="px-4 pb-4">
                  <div className="flex justify-center">
                    <a
                      href={createWhatsAppURL(product.contactPhone, product.title, formatPrice(product.price))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()} // Prevent navigation to detail page
                      className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.492"/>
                      </svg>
                      Buy it
                    </a>
                  </div>
                </div>
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
          {!hasNextPage && usedProducts.length > 0 && !loading && (
            <div className="text-center mt-12 mb-8">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-full px-6 py-3 border border-orange-200">
                <div className="text-left">
                  <p className="text-gray-800 font-semibold">You've reached the end!</p>
                  <p className="text-gray-600 text-sm">{totalProducts} products total</p>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setCurrentPage(1);
                setHasNextPage(true);
                fetchUsedProducts(1, true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsedProducts;
