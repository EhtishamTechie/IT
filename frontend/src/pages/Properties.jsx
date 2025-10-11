import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Home, Building, DollarSign, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { config, getApiUrl } from '../config';
import { getImageUrl } from '../services/propertyService';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    propertyType: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Infinite scroll refs
  const observer = useRef();
  const lastPropertyElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !loading) {
        loadMoreProperties();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasNextPage, loading]);

  // Fetch properties from API
  useEffect(() => {
    setCurrentPage(1);
    setHasNextPage(true);
    fetchProperties(1, true);
  }, [filters]);

  const fetchProperties = async (page = 1, resetProperties = true) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page,
        limit: 20 // Increased limit for better infinite scroll experience
      });
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      // Make the API request
      const response = await axios.get(`${config.API_BASE_URL}/properties/public?${queryParams}`);
      
      if (response.data.success) {
        // Process property images
        const propertiesWithImages = (response.data.data || []).map(property => ({
          ...property,
          images: property.images.map(img => getImageUrl(img))
        }));
        
        const pagination = response.data.pagination || {};
        
        if (resetProperties || page === 1) {
          setProperties(propertiesWithImages);
        } else {
          setProperties(prev => [...prev, ...propertiesWithImages]);
        }
        
        setTotalProperties(pagination.total || propertiesWithImages.length);
        setCurrentPage(page);
        
        // Check if there are more pages
        const totalPages = pagination.pages || Math.ceil((pagination.total || 0) / 20);
        setHasNextPage(page < totalPages);
        
      } else {
        if (resetProperties || page === 1) {
          setProperties([]);
        }
        setError(response.data.message || 'Failed to load properties');
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      if (resetProperties || page === 1) {
        setProperties([]);
      }
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more properties for infinite scroll
  const loadMoreProperties = useCallback(() => {
    if (!loadingMore && hasNextPage && !loading) {
      fetchProperties(currentPage + 1, false);
    }
  }, [currentPage, hasNextPage, loadingMore, loading]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      propertyType: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      search: ''
    });
  };

  const formatPrice = (price) => {
    if (price >= 10000000) {
      return `${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `${(price / 100000).toFixed(1)} Lac`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
              <p className="text-gray-600 mt-1">Find your dream property</p>
            </div>
            <Link
              to="/sell-property"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Sell Property</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search properties..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Office">Office</option>
                    <option value="Shop">Shop</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Plot">Plot</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <select
                    value={filters.bedrooms}
                    onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5+">5+</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="lg:w-3/4">


            {loading && properties.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-300"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
                      <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !properties || properties.length === 0 ? (
              <div className="text-center py-12">
                <Home className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No properties found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria or check back later.
                </p>
                {Object.values(filters).some(filter => filter) && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(properties || []).map((property, index) => (
                    <Link
                      key={property._id}
                      ref={index === properties.length - 1 ? lastPropertyElementRef : null}
                      to={`/properties/${property._id}`}
                      className="group bg-white rounded-lg shadow-sm border hover:shadow-lg transition-shadow duration-200"
                    >
                    {/* Property Image */}
                    <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={getImageUrl(property.images[0])} /* Using propertyService getImageUrl */
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            console.warn('Image load error:', e.target.src);
                            if (!e.target.src.includes('no-image.png')) {
                              e.target.src = '/assets/no-image.png';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Property Details */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {property.propertyType}
                        </span>
                      </div>

                      <div className="flex items-center text-gray-600 text-sm mb-3">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{property.area_name}, {property.city}</span>
                      </div>

                      {/* Property Features */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        {property.bedrooms && (
                          <span>{property.bedrooms} Bed</span>
                        )}
                        {property.bathrooms && (
                          <span>{property.bathrooms} Bath</span>
                        )}
                        {property.area && property.area.value && (
                          <span>{property.area.value} {property.area.unit}</span>
                        )}
                      </div>

                      {/* WhatsApp Contact */}
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(`https://wa.me/923005567507?text=Hi, I'm interested in your property: ${property.title}`, '_blank');
                          }}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Get more Details
                        </button>
                      </div>
                    </div>
                  </Link>
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
                    <span className="text-gray-700 font-medium">Loading more properties...</span>
                  </div>
                </div>
              )}

              {/* End of Properties Message */}
              {!hasNextPage && properties.length > 0 && !loading && (
                <div className="text-center mt-12 mb-8">
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-full px-6 py-3 border border-orange-200">
                    <div className="text-left">
                      <p className="text-gray-800 font-semibold">You've reached the end!</p>
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
                    fetchProperties(1, true);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Properties;
