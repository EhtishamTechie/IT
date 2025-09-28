import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { config, getApiUrl, getImageUrl } from '../config';
import { Link } from 'react-router-dom';

const CACHE_DURATION = 30000; // 30 seconds

const CategoryCarousel = () => {
                          
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [homepageCategories, setHomepageCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Cache
  const cache = useRef({
    homepageCategories: { data: null, timestamp: 0 }
  });

  // Fetch homepage categories
  useEffect(() => {
    const fetchCategories = async () => {
      const now = Date.now();
      if (cache.current.homepageCategories.data && now - cache.current.homepageCategories.timestamp < CACHE_DURATION) {
        console.log('Using cached homepage categories data');
        setHomepageCategories(cache.current.homepageCategories.data);
        setLoading(false);
        return;
      }

      console.log('Fetching fresh homepage categories data');
      try {
        const response = await fetch(getApiUrl('homepage/categories'));
        const data = await response.json();
        setHomepageCategories(data);
        
        // Update cache
        cache.current.homepageCategories = {
          data: data,
          timestamp: now
        };
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Stats images
  const statsImages = {
    categories: "https://images.pexels.com/photos/1005638/pexels-photo-1005638.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop",
    products: "https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop",
    satisfaction: "https://th.bing.com/th/id/R.9c6d9b71b974dada1e858aee2ffd7b74?rik=LI36TuwD42e7bw&pid=ImgRaw&r=0",
    support: "https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop"
  };

  // 15 Different Categories with consolidated image sources
  const categories = [
    {
      id: 1,
      name: "Electronics",
      gradient: "from-blue-500 to-indigo-600",
      src: "./IT Images/1.jpeg",
      description: "Laptops, Phones, Gadgets"
    },
    {
      id: 2,
      name: "Fashion",
      gradient: "from-pink-500 to-rose-600",
      src: "./IT Images/2.jpeg",
      description: "Clothing, Shoes, Accessories"
    },
    {
      id: 3,
      name: "Home & Garden",
      gradient: "from-green-500 to-emerald-600",
      src: "./IT Images/3.jpeg",
      description: "Furniture, Decor, Plants"
    },
    {
      id: 4,
      name: "Beauty & Care",
      gradient: "from-purple-500 to-violet-600",
      src: "./IT Images/4.jpeg",
      description: "Cosmetics, Skincare"
    },
    {
      id: 5,
      name: "Sports & Fitness",
      gradient: "from-orange-500 to-red-600",
      src: "./IT Images/5.jpeg",
      description: "Gym, Equipment, Sportswear"
    },
    {
      id: 6,
      name: "Books & Media",
      gradient: "from-amber-500 to-yellow-600",
      src: "./IT Images/6.jpeg",
      description: "Books, Movies, Games"
    },
    {
      id: 7,
      name: "Automotive",
      gradient: "from-gray-600 to-slate-700",
      src: "./IT Images/7.jpeg",
      description: "Car Parts, Tools, Accessories"
    },
    {
      id: 8,
      name: "Baby & Kids",
      gradient: "from-cyan-500 to-blue-600",
      src: "./IT Images/8.jpeg",
      description: "Toys, Clothes, Care"
    },
    {
      id: 9,
      name: "Food & Grocery",
      gradient: "from-lime-500 to-green-600",
      src: "./IT Images/9.jpeg",
      description: "Fresh Produce, Snacks"
    },
    {
      id: 10,
      name: "Gaming",
      gradient: "from-violet-500 to-purple-600",
      src: "./IT Images/10.jpeg",
      description: "Consoles, Games, Accessories"
    },
    {
      id: 11,
      name: "Jewelry",
      gradient: "from-yellow-500 to-orange-600",
      src: "./IT Images/11.jpeg",
      description: "Rings, Necklaces, Watches"
    },
    {
      id: 12,
      name: "Tools & Hardware",
      gradient: "from-red-500 to-pink-600",
      src: "./IT Images/12.jpeg",
      description: "Hand Tools, Power Tools"
    },
    {
      id: 13,
      name: "Pet Supplies",
      gradient: "from-teal-500 to-cyan-600",
      src: "./IT Images/13.jpeg",
      description: "Food, Toys, Accessories"
    },
    {
      id: 14,
      name: "Music & Audio",
      gradient: "from-indigo-500 to-blue-600",
      src: "./IT Images/14.jpeg",
      description: "Headphones, Speakers"
    },
    {
      id: 15,
      name: "Travel & Luggage",
      gradient: "from-emerald-500 to-teal-600",
      src: "./IT Images/15.jpeg",
      description: "Suitcases, Backpacks"
    }
  ];

  // Duplicate categories for seamless infinite loop
  const infiniteCategories = [...homepageCategories, ...homepageCategories, ...homepageCategories];

  const handleImageError = (categoryId) => {
    setFailedImages(prev => new Set([...prev, categoryId]));
  };

  const handleImageLoad = (categoryId) => {
    setLoadedImages(prev => new Set([...prev, categoryId]));
  };

  return (
    <>
      <section className="py-4 sm:py-6 lg:py-8 bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-6 sm:mb-7 lg:mb-8">
            <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span>Explore Categories</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
              Shop by 
              <span className="bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent"> Category</span>
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 max-w-2xl mx-auto px-4 sm:px-0">
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
                minWidth: '100%',
              }}
            >
              {infiniteCategories.map((category, index) => (
                <div 
                  key={`${category._id}-${Math.floor(index / homepageCategories.length)}`}
                  className="flex-shrink-0 w-44 sm:w-52 md:w-60 px-2 sm:px-3"
                >
                  <div className="group cursor-pointer transform transition-all duration-300 hover:scale-105">
                    {/* Category Card */}
                    <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden h-52 sm:h-56 md:h-64">
                      {/* Image Container */}
                      <div className="relative h-36 sm:h-40 md:h-48 overflow-hidden bg-gray-100">
                        <Link to={`/category-group/${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`} className="block w-full h-full">
                          <img 
                            src={getImageUrl('homepageCategories', category.imageUrl)}
                            alt={category.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={() => handleImageError(category._id)}
                            onLoad={() => handleImageLoad(category._id)}
                          />
                          
                          {/* Fallback Content (shown by default, hidden when image loads) */}
                          <div 
                            className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center text-white transition-opacity duration-300 ${
                              loadedImages.has(category._id) ? 'opacity-0 pointer-events-none' : 'opacity-100'
                            }`}
                          >
                            <div className="text-lg font-bold text-center mb-1">{category.name}</div>
                            <div className="text-sm opacity-90 text-center px-3">{category.description || 'Explore Products'}</div>
                          </div>
                          
                          {/* Gradient Overlay for images */}
                          {loadedImages.has(category._id) && (
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                          )}
                        </Link>
                        
                        {/* Hover Overlay */}
                        {/* <div className="absolute inset-0 bg-transparent bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-0 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                            <button className="bg-white text-gray-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg">
                              Shop Now
                            </button>
                          </div>
                        </div> */}
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
              ))}
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
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-200"
            aria-label={isPaused ? "Play carousel" : "Pause carousel"}
          >
            {isPaused ? (
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600 group-hover:text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600 group-hover:text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </button>
        </div>



        {/* Background Decorations */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-orange-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-16 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute top-1/2 right-8 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-ping"></div>
      </section>

      {/* Custom CSS for Infinite Scroll Animation */}
      <style>
        {`
          @keyframes infinite-scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-${homepageCategories.length * 250}px);
            }
          }
          
          .animate-infinite-scroll {
            animation: infinite-scroll 25s linear infinite;
            will-change: transform;
          }
          
          /* Pause animation when hovering over the carousel container */
          .carousel-container:hover .animate-infinite-scroll {
            animation-play-state: paused;
          }
          
          /* Override the paused state when isPaused is true */
          .animate-infinite-scroll.paused {
            animation-play-state: paused;
          }
        `}
      </style>
    </>
  );
};

export default CategoryCarousel;