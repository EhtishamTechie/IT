import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import ProductService from '../services/productService';
import { getImageUrl, getApiUrl } from '../config';
import EnhancedProductCard from '../components/EnhancedProductCard';

// Icons
const ShoppingCartIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const SearchIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0110.607 10.607z" />
  </svg>
);

const FilterIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
  </svg>
);

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();
  
  // Search state
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  // Filter states
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  const productsPerPage = 20;

  // Infinite scroll refs
  const observer = useRef();
  const lastProductElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isLoading && hasSearched) {
        loadMoreProducts();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasNextPage, isLoading, hasSearched]);
  
  // Cart state tracking
  const [addingToCart, setAddingToCart] = useState({});
  const [cartErrors, setCartErrors] = useState({});

  // Categories state for dynamic loading
  const [categories, setCategories] = useState(['all']);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch(`${getApiUrl()}/categories`);
        const categoriesData = await response.json();
        
        // Extract unique main category names (both admin and vendor)
        const mainCategories = [...new Set(
          categoriesData
            .filter(cat => !cat.parentCategory && cat.isActive) // Only main categories that are active
            .map(cat => cat.name)
        )];
        
        // Add 'all' at the beginning
        setCategories(['all', ...mainCategories.sort()]);
        console.log('📋 [SEARCH] Loaded categories:', ['all', ...mainCategories]);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to hardcoded categories
        setCategories(['all', 'Electronics', 'Fashion', 'Home & Furniture', 'Beauty & Personal Care', 'Sports & Outdoors', 'Groceries & Essentials', 'Salt Products']);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Load search results when query changes
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && query.trim()) {
      console.log('🔍 [SEARCH PAGE] URL query detected:', query);
      if (query !== searchQuery) {
        setSearchQuery(query);
      }
      // Always trigger search when URL changes with a query
      resetAndSearch(query);
    }
  }, [searchParams]);

  // Also trigger search when searchQuery state changes (for manual input)
  useEffect(() => {
    if (searchQuery && searchQuery.trim() && searchQuery === searchParams.get('q')) {
      // Only search if this query change came from URL params to avoid double search
      return;
    }
  }, [searchQuery]);

  // Reset search state and perform new search
  const resetAndSearch = (query = searchQuery) => {
    setProducts([]);
    setCurrentPage(1);
    setHasNextPage(true);
    setTotalResults(0);
    searchProducts(query, 1, true);
  };

  // Search products function with infinite scroll support
  const searchProducts = useCallback(async (query = searchQuery, page = 1, resetProducts = true) => {
    if (!query?.trim()) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      setHasSearched(true);

      const filters = {
        page,
        limit: productsPerPage,
        sort: sortBy === 'price-low' ? 'price' : sortBy === 'price-high' ? 'price' : sortBy === 'newest' ? 'createdAt' : 'createdAt',
        order: sortBy === 'price-high' ? 'desc' : sortBy === 'price-low' ? 'asc' : 'desc',
        ...(priceRange.min && { minPrice: parseFloat(priceRange.min) }),
        ...(priceRange.max && { maxPrice: parseFloat(priceRange.max) }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      };

      console.log('🔍 [SEARCH] Searching:', { query, filters });

      const response = await ProductService.searchProducts(query.trim(), filters);
      console.log('🔍 [SEARCH] Response:', response);
      
      // Handle different response formats
      const productsData = response.products || response.data || response || [];
      const total = response.totalResults || response.totalProducts || productsData.length || 0;
      const totalPagesCalc = response.totalPages || Math.ceil(total / productsPerPage);
      
      if (resetProducts || page === 1) {
        setProducts(Array.isArray(productsData) ? productsData : []);
      } else {
        setProducts(prev => [...prev, ...(Array.isArray(productsData) ? productsData : [])]);
      }
      
      setTotalResults(total);
      setCurrentPage(page);
      setHasNextPage(page < totalPagesCalc && productsData.length === productsPerPage);
      
      console.log('🔍 [SEARCH] Results:', {
        productsCount: productsData.length,
        totalResults: total,
        currentPage: page,
        hasNextPage: page < totalPagesCalc && productsData.length === productsPerPage
      });
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search products. Please try again.');
      if (resetProducts) {
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, sortBy, categoryFilter, priceRange, productsPerPage]);

  // Load more products for infinite scroll
  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasNextPage && !isLoading && hasSearched && searchQuery) {
      searchProducts(searchQuery, currentPage + 1, false);
    }
  }, [currentPage, hasNextPage, loadingMore, isLoading, hasSearched, searchQuery, searchProducts]);

  // Handle new search from search bar
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
      resetAndSearch(searchQuery.trim());
    }
  };

  // Handle filter changes - reset and search with new filters
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    if (hasSearched && searchQuery) {
      resetAndSearch(searchQuery);
    }
  };

  const handleCategoryChange = (category) => {
    setCategoryFilter(category);
    if (hasSearched && searchQuery) {
      resetAndSearch(searchQuery);
    }
  };

  const handlePriceRangeChange = () => {
    if (hasSearched && searchQuery) {
      resetAndSearch(searchQuery);
    }
  };

  // Cart functionality
  const handleAddToCart = async (product) => {
    const productId = product._id;
    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    setCartErrors(prev => ({ ...prev, [productId]: null }));

    try {
      const result = await addToCart(product, 1);
      // CartContext already handles notifications, no need to show here
      if (!result.success) {
        setCartErrors(prev => ({ ...prev, [productId]: result.error }));
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add to cart';
      setCartErrors(prev => ({ ...prev, [productId]: errorMessage }));
      // CartContext already handles error notifications
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
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

  // Get cart quantity for a product
  const getCartQuantity = (productId) => {
    const cartItem = cartItems.find(item => {
      const itemId = item.productData?._id || item._id;
      return itemId === productId;
    });
    return cartItem ? cartItem.quantity : 0;
  };

  // Check if product is in cart
  const isProductInCart = (productId) => {
    return cartItems.some(item => {
      const itemId = item.productData?._id || item._id;
      return itemId === productId;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, categories, or brands..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-500"
                />
                <SearchIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors"
                >
                  <SearchIcon className="h-4 w-4" />
                </button>
              </form>
            </div>
            
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <FilterIcon className="h-4 w-4" />
              Filters
            </button>
          </div>


        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* Filters Sidebar */}
          <div className={`lg:col-span-3 ${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
              
              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Category</h4>
                <select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={loadingCategories}
                >
                  {loadingCategories ? (
                    <option>Loading categories...</option>
                  ) : (
                    categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="Min"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm min-w-0"
                  />
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="Max"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm min-w-0"
                  />
                </div>
                <button
                  onClick={handlePriceRangeChange}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md transition-colors text-sm"
                >
                  Apply Price Filter
                </button>
              </div>

              {/* Sort Options */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Sort By</h4>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="relevance">Most Relevant</option>
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-9">
            {isLoading && products.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-gray-600">Searching products...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
                <button
                  onClick={() => resetAndSearch()}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-12">
                <SearchIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Search for Products</h3>
                <p className="text-gray-600">Enter a search term to find products by name, category, or subcategory.</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <SearchIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your search terms or filters.</p>
                <div className="text-sm text-gray-500">
                  <p>Search tips:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Check your spelling</li>
                    <li>Try different keywords</li>
                    <li>Use more general terms</li>
                    <li>Clear filters if applied</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>


                {/* Products Grid with Infinite Scroll */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((product, index) => (
                    <EnhancedProductCard
                      key={product._id}
                      product={product}
                      ref={products.length === index + 1 ? lastProductElementRef : null}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartQuantity={getCartQuantity(product._id)}
                      isInCart={isProductInCart(product._id)}
                      isAddingToCart={addingToCart[product._id] || false}
                      showBuyNow={true}
                    />
                  ))}
                </div>

                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    <span className="ml-3 text-gray-600">Loading more products...</span>
                  </div>
                )}

                {/* End of Results Message */}
                {!hasNextPage && products.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You've reached the end of search results</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
