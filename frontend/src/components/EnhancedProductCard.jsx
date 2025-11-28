import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, ShoppingBag } from 'lucide-react';
import { getImageUrl } from '../config';
import ImagePlaceholder from './ImagePlaceholder';
import LazyImage from './LazyImage';

const EnhancedProductCard = ({ 
  product, 
  size = 'normal', 
  className = '',
  onFavoriteToggle,
  onAddToCart,
  onBuyNow,
  showAddToCart = true,
  showBuyNow = false,
  showFavorite = true,
  showQuickView = true,
  showTitle = true, // New prop to control title visibility
  isAddingToCart = false,
  cartQuantity = 0,
  isInCart = false,
  errorMessage = null
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [sizeAction, setSizeAction] = useState(null); // 'cart' or 'buy'
  const videoRef = useRef(null);

  // Handle video playback on hover
  useEffect(() => {
    if (videoRef.current && product.video) {
      if (isHovered && !videoError) {
        videoRef.current.play().catch((error) => {
          console.error('Video play failed:', error);
          setVideoError(true);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovered, product.video, videoError]);

  const handleProductClick = () => {
    navigate(`/product/${product._id || product.id}`);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    if (onFavoriteToggle) {
      onFavoriteToggle(product._id || product.id, !isFavorite);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    
    // Check if product has sizes - filter only sizes with stock > 0
    if (product.hasSizes && product.availableSizes && product.availableSizes.length > 0) {
      const sizesWithStock = product.availableSizes.filter(size => {
        const stock = product.sizeStock?.[size] || 0;
        return stock > 0;
      });
      
      if (sizesWithStock.length > 0) {
        setSizeAction('cart');
        setShowSizeModal(true);
        return;
      }
    }
    
    if (onAddToCart) {
      onAddToCart(product, 1, null);
    }
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    
    // Check if product has sizes - filter only sizes with stock > 0
    if (product.hasSizes && product.availableSizes && product.availableSizes.length > 0) {
      const sizesWithStock = product.availableSizes.filter(size => {
        const stock = product.sizeStock?.[size] || 0;
        return stock > 0;
      });
      
      if (sizesWithStock.length > 0) {
        setSizeAction('buy');
        setShowSizeModal(true);
        return;
      }
    }
    
    if (onBuyNow) {
      onBuyNow(product, 1, null);
    }
  };

  const handleSizeSelect = () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }
    
    setShowSizeModal(false);
    
    if (sizeAction === 'cart' && onAddToCart) {
      onAddToCart(product, 1, selectedSize);
    } else if (sizeAction === 'buy' && onBuyNow) {
      onBuyNow(product, 1, selectedSize);
    }
    
    // Reset
    setSelectedSize('');
    setSizeAction(null);
  };

  const closeSizeModal = (e) => {
    e?.stopPropagation();
    setShowSizeModal(false);
    setSelectedSize('');
    setSizeAction(null);
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    // Quick view functionality can be implemented later
    console.log('Quick view for product:', product.title);
  };

  // Get the primary image (dedicated primary image field takes precedence)
  const primaryImage = product.image 
    ? product.image 
    : (product.images && product.images.length > 0 ? product.images[0] : null);

  // Determine the correct image URL
  // Note: LazyImage needs the raw path to generate WebP/AVIF variants
  const getImageSrc = () => {
    if (primaryImage) {
      // Return raw path for LazyImage to process
      return primaryImage;
    }
    return null;
  };

  // Get video URL using proper config
  const getVideoSrc = () => {
    if (product.video) {
      return getImageUrl('products', product.video);
    }
    return null;
  };

  // Size classes - reduced to half
  const sizeClasses = {
    small: 'w-full max-w-[125px]',
    normal: 'w-full max-w-[150px]',
    large: 'w-full max-w-[175px]',
    wide: 'w-full max-w-[200px]',
    tall: 'w-full max-w-[150px]'
  };

  const heightClasses = {
    small: 'h-[120px] sm:h-[150px]',
    normal: 'h-[130px] sm:h-[175px]',
    large: 'h-[140px] sm:h-[200px]',
    wide: 'h-[120px] sm:h-[150px]',
    tall: 'h-[160px] sm:h-[225px]'
  };

  return (
    <div 
      className={`
        w-full bg-white rounded-xl shadow-md hover:shadow-xl 
        transition-all duration-300 ease-in-out
        hover:scale-[1.02] hover:-translate-y-1
        cursor-pointer group relative overflow-hidden
        border border-gray-100
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleProductClick}
    >
      {/* Status Badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        {product.featured && (
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            Featured
          </span>
        )}
        {product.trending && (
          <span className="bg-gradient-to-r from-red-400 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            Trending
          </span>
        )}
        {product.isNew && (
          <span className="bg-gradient-to-r from-green-400 to-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            New
          </span>
        )}
      </div>

      {/* Media Container - Square 1:1 aspect ratio for images */}
      <div className="relative w-full overflow-hidden rounded-t-xl bg-gray-100" style={{ paddingBottom: '100%', height: 0 }}>
        <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
        {/* Video - shown on hover if available */}
        {product.video && !videoError && (
          <video
            ref={videoRef}
            className={`
              absolute inset-0 w-full h-full object-cover transition-opacity duration-300
              ${isHovered ? 'opacity-100' : 'opacity-0'}
            `}
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
          >
            <source src={getVideoSrc()} type="video/mp4" />
          </video>
        )}

        {/* Primary Image - shown by default or when video not available */}
        {primaryImage && !imageError ? (
          <LazyImage
            src={getImageSrc()}
            alt={product.title || 'Product'}
            enableModernFormats={false}
            priority={false}
            className={`
              absolute inset-0 w-full h-full object-cover transition-all duration-500
              ${isHovered && product.video && !videoError 
                ? 'opacity-0 scale-110' 
                : 'opacity-100 group-hover:scale-110'
              }
            `}
            onError={(e) => {
              console.error('Image failed to load:', getImageSrc());
              setImageError(true);
            }}
          />
        ) : (
          <ImagePlaceholder className="absolute inset-0 w-full h-full" />
        )}

        {/* Fallback if no image */}
        {!primaryImage && (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No Image</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className={`
          absolute inset-0 bg-black/20 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `} />
        </div>
      </div>

      {/* Product Info */}
      <div className="p-1 flex flex-col h-auto min-h-0">
        {/* Product Title - Conditionally shown */}
        {showTitle && (
          <h3 className="font-semibold text-gray-900 text-[10px] leading-tight mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors min-h-[1.5rem]">
            {product.title || 'Untitled Product'}
          </h3>
        )}
        
        {/* Price Section */}
        <div className="flex items-center justify-between mb-0">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900">
               PKR {product.price || '0.00'}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[9px] text-gray-500 line-through">
                PKR {product.originalPrice}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="text-right">
            {product.stock !== undefined ? (
              product.stock > 0 ? (
                <span className="text-[8px] text-green-600 font-medium bg-green-50 px-1 py-0.5 rounded-full">In Stock</span>
              ) : (
                <span className="text-[8px] text-red-600 font-medium bg-red-50 px-1 py-0.5 rounded-full">Out of Stock</span>
              )
            ) : (
              <span className="text-[8px] text-gray-500 bg-gray-50 px-1 py-0.5 rounded-full">Stock N/A</span>
            )}
          </div>
        </div>

        {/* Rating if available */}
        {product.rating && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-xs ${
                      i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-600">
                ({product.reviewCount || 0})
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Size Selection Modal - Rendered via Portal to be completely outside card DOM */}
      {showSizeModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          onClick={closeSizeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Size</h3>
              <button
                onClick={closeSizeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                {product.title || 'Product'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {product.availableSizes?.filter(size => {
                  const stock = product.sizeStock?.[size] || 0;
                  return stock > 0;
                }).map((size) => {
                  const stock = product.sizeStock?.[size] || 0;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`
                        py-2.5 px-3 rounded-lg border-2 font-semibold text-sm transition-all relative
                        ${selectedSize === size
                          ? 'border-orange-500 bg-orange-50 text-orange-600 scale-105'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                        }
                      `}
                    >
                      <div>{size}</div>
                      <div className="text-xs text-gray-500 font-normal">Stock: {stock}</div>
                    </button>
                  );
                })}
              </div>
              {product.availableSizes?.filter(size => (product.sizeStock?.[size] || 0) > 0).length === 0 && (
                <p className="text-sm text-red-500 mt-2">All sizes are out of stock</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={closeSizeModal}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSizeSelect}
                disabled={!selectedSize}
                className={`
                  flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors
                  ${selectedSize
                    ? sizeAction === 'buy' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {sizeAction === 'cart' ? 'Add to Cart' : 'Buy Now'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EnhancedProductCard;