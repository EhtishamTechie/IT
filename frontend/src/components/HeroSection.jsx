import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../config';
import DynamicHomepageCards from './DynamicHomepageCards';

const HeroSection = ({ banners = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Colors for each slide
  const slideColors = ["#FF9900", "#146EB4", "#067D62"];

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
    return banners.length > 0 ? banners.map((slide, index) => {
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
        title: "Welcome to International Tijarat",
        bgColor: "#146EB4",
        category: null,
        mainProduct: {
          image: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="%23146EB4"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="16" fill="%23ffffff" font-weight="bold">IT</text></svg>`,
          title: "Shop Premium Products",
          id: null,
          product: null
        },
        secondaryProducts: []
      }];
  }, [banners]);

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
    title: "Welcome to International Tijarat",
    category: null,
    mainProduct: {
      image: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="%23146EB4"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="16" fill="%23ffffff" font-weight="bold">IT</text></svg>`,
      title: "Shop Premium Products",
      id: null,
      product: null
    },
    secondaryProducts: []
  };

  return (
    <div className="w-full bg-white">
      {/* Main Hero Banner - Amazon Professional Style - Responsive */}
      <div className="relative w-full min-h-[200px] sm:h-48 md:h-56 lg:h-64 overflow-hidden">
        <div 
          className="relative sm:absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{ backgroundColor: currentSlideData.bgColor }}
        >
          <div className="container mx-auto px-3 sm:px-4 h-full">
            {/* Mobile Layout - Vertical */}
            <div className="sm:hidden py-4">
              {/* Text Content */}
              <div className="text-center mb-3">
                <h1 className="text-xl font-bold text-white mb-2 leading-tight">
                  {currentSlideData.title}
                </h1>
                {/* Shop now button */}
                {currentSlideData.category?.name ? (
                  <Link 
                    to={`/category-group/${currentSlideData.category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                    className="inline-block bg-white text-gray-900 px-4 py-1.5 rounded-md font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg text-xs"
                  >
                    Shop now
                  </Link>
                ) : (
                  <Link 
                    to="/products"
                    className="inline-block bg-white text-gray-900 px-4 py-1.5 rounded-md font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg text-xs"
                  >
                    Shop now
                  </Link>
                )}
              </div>
              
              {/* All Product Images - Horizontal Row */}
              <div className="flex justify-center items-center gap-1 flex-wrap">
                {/* Main Featured Product */}
                <div className="relative flex-shrink-0">
                  {currentSlideData.mainProduct.id ? (
                    <Link to={`/product/${currentSlideData.mainProduct.id}`}>
                      <img 
                        src={currentSlideData.mainProduct.image}
                        alt={currentSlideData.mainProduct.title}
                        loading="eager"
                        fetchpriority="high"
                        width="80"
                        height="80"
                        decoding="async"
                        className="w-20 h-20 object-cover rounded-md shadow-md cursor-pointer"
                        onError={(e) => {
                          e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="12" fill="%236b7280">Product</text></svg>`;
                        }}
                      />
                    </Link>
                  ) : (
                    <img 
                      src={currentSlideData.mainProduct.image}
                      alt={currentSlideData.mainProduct.title}
                      loading="eager"
                      fetchpriority="high"
                      width="80"
                      height="80"
                      decoding="async"
                      className="w-20 h-20 object-cover rounded-md shadow-md"
                      onError={(e) => {
                        e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="12" fill="%236b7280">Product</text></svg>`;
                      }}
                    />
                  )}
                </div>
                
                {/* Secondary Products */}
                {currentSlideData.secondaryProducts.slice(0, 3).map((productItem, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    {productItem.id ? (
                      <Link to={`/product/${productItem.id}`}>
                        <img 
                          src={productItem.image}
                          alt={productItem.title || `Featured Product ${index + 1}`}
                          width="80"
                          height="80"
                          loading="lazy"
                          decoding="async"
                          className="w-20 h-20 object-cover rounded-md shadow-md cursor-pointer"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="12" fill="%236b7280">Item</text></svg>`;
                          }}
                        />
                      </Link>
                    ) : (
                      <img 
                        src={productItem.image}
                        alt={productItem.title || `Featured Product ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-md shadow-md"
                        onError={(e) => {
                          e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="16" fill="%236b7280">Item</text></svg>`;
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop/Tablet Layout - Horizontal */}
            <div className="hidden sm:flex h-full items-center">
              <div className="flex w-full items-center justify-between gap-2 sm:gap-3 md:gap-4">
              
              {/* Left - Professional Text Content */}
              <div className="flex-shrink-0 z-10 text-left ml-4 sm:ml-6 md:ml-8">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 leading-tight">
                  {currentSlideData.title}
                </h1>
                {/* Shop now button - Navigate to category group page */}
                {currentSlideData.category?.name ? (
                  <Link 
                    to={`/category-group/${currentSlideData.category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                    className="inline-block bg-white text-gray-900 px-4 py-1.5 sm:px-5 sm:py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg text-xs sm:text-sm"
                  >
                    Shop now
                  </Link>
                ) : (
                  <Link 
                    to="/products"
                    className="inline-block bg-white text-gray-900 px-4 py-1.5 sm:px-5 sm:py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg text-xs sm:text-sm"
                  >
                    Shop now
                  </Link>
                )}
              </div>
              
              {/* Right - All Product Images in Horizontal Row - Same Size */}
              <div className="flex justify-end items-center gap-0 flex-shrink-0 overflow-x-auto scrollbar-hide">
                {/* Main Featured Product - Same size as others */}
                <div className="relative flex-shrink-0">
                  {currentSlideData.mainProduct.id ? (
                    <Link to={`/product/${currentSlideData.mainProduct.id}`}>
                      <img 
                        src={currentSlideData.mainProduct.image}
                        alt={currentSlideData.mainProduct.title}
                        loading="eager"
                        fetchpriority="high"
                        width="160"
                        height="160"
                        decoding="async"
                        className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 object-cover rounded-md shadow-md hover:scale-105 transition-transform duration-200 cursor-pointer"
                        onError={(e) => {
                          e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="%236b7280">Product</text></svg>`;
                        }}
                      />
                    </Link>
                  ) : (
                    <img 
                      src={currentSlideData.mainProduct.image}
                      alt={currentSlideData.mainProduct.title}
                      loading="eager"
                      fetchpriority="high"
                      width="160"
                      height="160"
                      decoding="async"
                      className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 object-cover rounded-md shadow-md"
                      onError={(e) => {
                        e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="%236b7280">Product</text></svg>`;
                      }}
                    />
                  )}
                </div>
                
                {/* Secondary Products - Horizontal layout - Same size as main */}
                {currentSlideData.secondaryProducts.slice(0, 3).map((productItem, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    {productItem.id ? (
                      <Link to={`/product/${productItem.id}`}>
                        <img 
                          src={productItem.image}
                          alt={productItem.title || `Featured Product ${index + 1}`}
                          width="160"
                          height="160"
                          loading="lazy"
                          decoding="async"
                          className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 object-cover rounded-md shadow-md hover:scale-105 transition-transform duration-200 cursor-pointer"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="%236b7280">Item</text></svg>`;
                          }}
                        />
                      </Link>
                    ) : (
                      <img 
                        src={productItem.image}
                        alt={productItem.title || `Featured Product ${index + 1}`}
                        width="160"
                        height="160"
                        loading="lazy"
                        decoding="async"
                        className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 object-cover rounded-md shadow-md hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="%236b7280">Item</text></svg>`;
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
        className="absolute left-0 sm:left-1 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-1.5 sm:p-2 shadow-lg transition-all duration-200 hover:scale-110"
      >
        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
      </button>
      
      <button 
        onClick={nextSlide}
        className="absolute right-0 sm:right-1 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-1.5 sm:p-2 shadow-lg transition-all duration-200 hover:scale-110"
      >
        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
      </button>
    </div>

    {/* Dynamic Homepage Cards */}
    <DynamicHomepageCards />
  </div>
  );
};

export default HeroSection;