import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { getImageUrl } from '../config';

const CategoryCarousel = () => {
  const navigate = useNavigate();
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Constants for stats images
  const statsImages = {
    categories: getImageUrl('assets', 'categories-icon.png'),
    satisfaction: getImageUrl('assets', 'satisfaction-icon.png'),
    support: getImageUrl('assets', 'support-icon.png')
  };

  // Function to generate gradients based on category name
  const getGradientForCategory = (categoryName) => {
    const gradients = {
      'Electronics': 'from-blue-500 to-indigo-600',
      'Fashion': 'from-pink-500 to-rose-600',
      'Home': 'from-green-500 to-emerald-600',
      'Beauty': 'from-purple-500 to-violet-600',
      'Sports': 'from-orange-500 to-red-600',
      'default': 'from-gray-500 to-gray-600'
    };

    const matchingKey = Object.keys(gradients).find(key => 
      categoryName.toLowerCase().includes(key.toLowerCase())
    );
    return gradients[matchingKey] || gradients.default;
  };

  // Image handling functions
  const handleImageError = (categoryId) => {
    setFailedImages(prev => new Set([...prev, categoryId]));
  };

  const handleImageLoad = (categoryId) => {
    setLoadedImages(prev => new Set([...prev, categoryId]));
  };

  // Function to fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const response = await API.get('/api/categories');
      if (!response.data?.categories || !Array.isArray(response.data.categories)) {
        throw new Error('Invalid categories data received from server');
      }
      
      const categoriesData = response.data.categories;
      
      if (categoriesData.length === 0) {
        setCategories([]);
        return;
      }

      const categoriesWithImages = await Promise.all(
        categoriesData.map(async (category) => {
          try {
            if (!category || !category._id) {
              throw new Error('Invalid category data');
            }

            // Fetch one product from this category to use its image
            const productsResponse = await API.get(`/api/products/category/${category._id}?limit=1`);
            let productImage = 'placeholder-image.jpg';

            if (productsResponse.data?.products?.[0]?.image) {
              productImage = productsResponse.data.products[0].image;
            }

            return {
              id: category._id,
              name: category.name || 'Untitled Category',
              description: category.description || 'Explore our collection',
              gradient: getGradientForCategory(category.name || ''),
              src: getImageUrl('products', productImage),
              slug: category.slug || (category.name || 'untitled').toLowerCase().replace(/\s+/g, '-')
            };
          } catch (err) {
            console.error(`Error fetching product for category ${category?.name || 'unknown'}:`, err);
            return null;
          }
        })
      );

      const validCategories = categoriesWithImages.filter(category => 
        category && category.id && category.name && category.src
      );

      if (validCategories.length === 0) {
        throw new Error('No valid categories found');
      }

      setCategories(validCategories);
      setError(false);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories when component mounts
  useEffect(() => {
    fetchCategories();
  }, []);

  // Create infinite categories array for seamless scrolling
  const infiniteCategories = [...categories, ...categories, ...categories];

  return (
    <>
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span>Explore Categories</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Shop by 
              <span className="bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent"> Category</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover amazing products across all categories with unbeatable prices and quality
            </p>
          </div>
        </div>

        {/* Full Width Infinite Carousel Container */}
        <div className="relative w-full">
          <div 
            className="overflow-hidden carousel-container"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Infinite Moving Track */}
            <div 
              className={`flex ${isPaused ? 'animate-infinite-scroll paused' : 'animate-infinite-scroll'}`}
              style={{
                width: `${infiniteCategories.length * 250}px`,
              }}
            >
              {loading ? (
                // Loading skeletons
                Array(6).fill(null).map((_, index) => (
                  <div key={`skeleton-${index}`} className="flex-shrink-0 w-60 px-3">
                    <div className="animate-pulse bg-gray-200 rounded-2xl h-64"></div>
                  </div>
                ))
              ) : error ? (
                <div className="w-full flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-red-500 mb-2">Failed to load categories</div>
                    <button 
                      onClick={fetchCategories}
                      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                infiniteCategories.map((category, index) => (
                  <div 
                    key={`${category.id}-${Math.floor(index / categories.length)}`}
                    className="flex-shrink-0 w-60 px-3"
                    onClick={() => navigate(`/category-group/${category.slug}`)}
                  >
                    <div className="group cursor-pointer transform transition-all duration-300 hover:scale-105">
                      {/* Category Card */}
                      <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden h-64">
                        {/* Image Container */}
                        <div className="relative h-48 overflow-hidden bg-gray-100">
                          <img 
                            src={category.src}
                            alt={category.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={() => handleImageError(category.id)}
                            onLoad={() => handleImageLoad(category.id)}
                          />
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* Category Info (shown on hover) */}
                          <div className="absolute inset-0 flex flex-col items-center justify-end text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="text-lg font-bold text-center mb-1">{category.name}</div>
                            <div className="text-sm opacity-90 text-center px-3">{category.description}</div>
                          </div>
                          
                          {/* Gradient Overlay for images */}
                          {loadedImages.has(category.id) && (
                            <div className={`absolute inset-0 bg-gradient-to-t ${category.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                          )}
                        </div>

                        {/* Category Info */}
                        <div className="p-4 text-center">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-200">
                            {category.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-200"
            aria-label={isPaused ? "Play carousel" : "Pause carousel"}
          >
            {isPaused ? (
              <svg className="w-6 h-6 text-gray-600 group-hover:text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-600 group-hover:text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </button>
          
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-200"
            aria-label={isPaused ? "Play carousel" : "Pause carousel"}
          >
            {isPaused ? (
              <svg className="w-6 h-6 text-gray-600 group-hover:text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-600 group-hover:text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Stats Section */}
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-16 text-center">
            {[
              { number: "15+", label: "Categories", image: statsImages.categories },
              { number: "99%", label: "Satisfaction", image: statsImages.satisfaction },
              { number: "24/7", label: "Support", image: statsImages.support }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full overflow-hidden">
                  <img 
                    src={stat.image} 
                    alt={stat.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Background Decorations */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-orange-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-16 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute top-1/2 right-8 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-ping"></div>
      </section>

      {/* Custom CSS for Infinite Scroll Animation */}
      <style jsx>{`
        @keyframes infinite-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${categories.length * 250}px);
          }
        }
        
        .animate-infinite-scroll {
          animation: infinite-scroll 40s linear infinite;
        }
        
        /* Pause animation when hovering over the carousel container */
        .carousel-container:hover .animate-infinite-scroll {
          animation-play-state: paused;
        }
        
        /* Override the paused state when isPaused is true */
        .animate-infinite-scroll.paused {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
};

export default CategoryCarousel;
