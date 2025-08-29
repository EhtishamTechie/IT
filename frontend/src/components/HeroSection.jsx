import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../api';
import { getImageUrl } from '../config';
import DynamicHomepageCards from './DynamicHomepageCards';

const CACHE_DURATION = 30000; // 30 seconds

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bannerData, setBannerData] = useState([]);
  
  // Cache
  const cache = useRef({
    bannerData: { data: null, timestamp: 0 }
  });

  // Colors for each slide
  const slideColors = ["#FF9900", "#146EB4", "#067D62"];

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const now = Date.now();
    if (cache.current.bannerData.data && now - cache.current.bannerData.timestamp < CACHE_DURATION) {
      console.log('Using cached banner data');
      setBannerData(cache.current.bannerData.data);
      return;
    }

    console.log('Fetching fresh banner data');
    try {
      const response = await API.get('/banner');
      const data = response.data || [];
      setBannerData(data);
      
      // Update cache
      cache.current.bannerData = {
        data: data,
        timestamp: now
      };
    } catch (err) {
      console.error('Error fetching banners:', err);
      setBannerData([]); // Set empty array on error to prevent undefined errors
    }
  };

  const processProductImage = (product) => {
    if (!product) return null;
    
    // Handle array of images
    if (Array.isArray(product.images) && product.images.length > 0) {
      return getImageUrl('products', product.images[0]);
    }
    
    // Handle single image or imagePath
    if (product.image || product.imagePath) {
      return getImageUrl('products', product.image || product.imagePath);
    }
    
    // Handle case where product is just a string (image path)
    if (typeof product === 'string') {
      return getImageUrl('products', product);
    }
    
    return null;
  };

  const heroSlides = useMemo(() => {
    return bannerData.length > 0 ? bannerData.map((slide, index) => {
      const mainProductImage = slide.primaryProduct ? processProductImage(slide.primaryProduct) : processProductImage(slide);
      
      return {
        id: slide._id,
        title: slide.title,
        bgColor: slideColors[index % slideColors.length],
        category: slide.category, // Include category for navigation
        mainProduct: {
          image: mainProductImage || getImageUrl('products', slide.image),
          title: slide.primaryProduct?.title || slide.title,
          id: slide.primaryProduct?._id, // Include product ID for navigation
          product: slide.primaryProduct // Full product object
        },
        secondaryProducts: (slide.secondaryProducts || [])
          .map(product => ({
            image: processProductImage(product),
            id: product?._id,
            title: product?.title,
            product: product
          }))
          .filter(item => item.image) // Remove any items without images
      };
    }) : [
      {
        id: 'default-1',
        title: "Loading...",
        bgColor: "#146EB4",
        category: null,
        mainProduct: {
          image: "placeholder.jpg",
          title: "Loading...",
          id: null,
          product: null
        },
        secondaryProducts: []
      }];
  }, [bannerData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const currentSlideData = heroSlides[currentSlide] || heroSlides[0] || {
    bgColor: "#146EB4",
    title: "Loading...",
    mainProduct: {
      image: "placeholder.jpg",
      title: "Loading..."
    },
    secondaryProducts: []
  };

  return (
    <div className="w-full bg-white">
      {/* Main Hero Banner - Amazon Professional Style - Responsive */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden">
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{ backgroundColor: currentSlideData.bgColor }}
        >
          <div className="container mx-auto px-4 sm:px-6 h-full flex items-center">
            <div className="flex flex-col md:flex-row w-full items-center justify-between gap-4 md:gap-0">
              
              {/* Left Side - Professional Text Content */}
              <div className="flex-1 max-w-md z-10 text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight">
                  {currentSlideData.title}
                </h1>
                {/* Shop now button - Navigate to category group page */}
                {currentSlideData.category?.name ? (
                  <Link 
                    to={`/category-group/${currentSlideData.category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                    className="inline-block bg-white text-gray-900 px-6 py-2 sm:px-8 sm:py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg text-sm sm:text-base"
                  >
                    Shop now
                  </Link>
                ) : (
                  <Link 
                    to="/products"
                    className="inline-block bg-white text-gray-900 px-6 py-2 sm:px-8 sm:py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg text-sm sm:text-base"
                  >
                    Shop now
                  </Link>
                )}
              </div>
              
              {/* Right Side - Professional Product Showcase - Responsive */}
              <div className="flex-1 flex justify-center md:justify-end items-center space-x-2 sm:space-x-4">
                {/* Main Featured Product - Responsive sizes */}
                <div className="relative">
                  {currentSlideData.mainProduct.id ? (
                    <Link to={`/product/${currentSlideData.mainProduct.id}`}>
                      <img 
                        src={currentSlideData.mainProduct.image}
                        alt={currentSlideData.mainProduct.title}
                        className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-cover rounded-lg shadow-xl hover:scale-105 transition-transform duration-200 cursor-pointer"
                        onError={(e) => {
                          e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="16" fill="%236b7280">${currentSlideData.mainProduct.title}</text></svg>`;
                        }}
                      />
                    </Link>
                  ) : (
                    <img 
                      src={currentSlideData.mainProduct.image}
                      alt={currentSlideData.mainProduct.title}
                      className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-cover rounded-lg shadow-xl"
                      onError={(e) => {
                        e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="16" fill="%236b7280">${currentSlideData.mainProduct.title}</text></svg>`;
                      }}
                    />
                  )}
                </div>
                
                {/* Secondary Products Stack - Each clickable - Responsive */}
                <div className="flex flex-col space-y-1 sm:space-y-2">
                  {currentSlideData.secondaryProducts.slice(0, 3).map((productItem, index) => (
                    <div key={index} className="relative">
                      {productItem.id ? (
                        <Link to={`/product/${productItem.id}`}>
                          <img 
                            src={productItem.image}
                            alt={productItem.title || `Product ${index + 1}`}
                            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-cover rounded-md shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer"
                            onError={(e) => {
                              e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="12" fill="%236b7280">Item</text></svg>`;
                            }}
                          />
                        </Link>
                      ) : (
                        <img 
                          src={productItem.image}
                          alt={productItem.title || `Product ${index + 1}`}
                          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-cover rounded-md shadow-lg hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="12" fill="%236b7280">Item</text></svg>`;
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Navigation Arrows - Responsive */}
        <button 
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 sm:p-3 shadow-lg transition-all duration-200 hover:scale-110"
        >
          <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-gray-700" />
        </button>
        
        <button 
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 sm:p-3 shadow-lg transition-all duration-200 hover:scale-110"
        >
          <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-gray-700" />
        </button>

        {/* Professional Slide Indicators - Responsive */}
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-1 sm:space-x-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-200 ${
                index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Dynamic Homepage Cards */}
      <DynamicHomepageCards />
    </div>
  );
};

export default HeroSection;