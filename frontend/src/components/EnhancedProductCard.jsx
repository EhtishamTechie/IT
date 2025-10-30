import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, ShoppingBag } from 'lucide-react';
import { getImageUrl } from '../config';
import ImagePlaceholder from './ImagePlaceholder';

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
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (onBuyNow) {
      onBuyNow(product);
    }
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


  const getImageSrc = () => {
    if (primaryImage) {
      return getImageUrl('products', primaryImage);
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

  // Size classes
  const sizeClasses = {
    small: 'w-full max-w-[250px]',
    normal: 'w-full max-w-[300px]',
    large: 'w-full max-w-[350px]',
    wide: 'w-full max-w-[400px]',
    tall: 'w-full max-w-[300px]'
  };

  const heightClasses = {
    small: 'h-[240px] sm:h-[300px]',
    normal: 'h-[260px] sm:h-[350px]',
    large: 'h-[280px] sm:h-[400px]',
    wide: 'h-[240px] sm:h-[300px]',
    tall: 'h-[320px] sm:h-[450px]'
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

      {/* Media Container */}
      <div className="relative w-full aspect-square overflow-hidden rounded-t-xl bg-gray-100">
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
          <img
            src={getImageSrc()}
            alt={product.title || 'Product'}
            loading="lazy"
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

        {/* Multiple images indicator */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              +{product.images.length - 1} more
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className={`
          absolute inset-0 bg-black/20 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `} />
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col h-auto min-h-[140px]">
        {/* Product Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors min-h-[2.5rem]">
          {product.title || 'Untitled Product'}
        </h3>

        {/* Vendor Information */}
        <div className="mb-2">
          {product.vendor ? (
            <p className="text-xs text-gray-500">
              by <span className="text-green-600 font-medium">
                {typeof product.vendor === 'object' ? product.vendor.businessName : product.vendor}
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              by <span className="text-blue-600 font-medium">International Tijarat</span>
            </p>
          )}
        </div>

        {/* Price Section */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex flex-col">
            <span className="text-xs sm:text-lg font-bold text-gray-900">
               PKR {product.price || '0.00'}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                PKR {product.originalPrice}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="text-right">
            {product.stock !== undefined ? (
              product.stock > 0 ? (
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">In Stock</span>
              ) : (
                <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full">Out of Stock</span>
              )
            ) : (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">Stock N/A</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto">
          {/* Both Add to Cart and Buy Now buttons */}
          {showAddToCart && showBuyNow && (
            <div className="space-y-2">
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || !product.stock}
                className={`
                  w-full py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 
                  flex items-center justify-center gap-2
                  ${isAddingToCart 
                    ? 'bg-orange-400 text-white cursor-not-allowed' 
                    : isInCart && cartQuantity > 0
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : !product.stock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]'
                  }
                `}
                title={errorMessage || ''}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  {isAddingToCart 
                    ? 'Adding...' 
                    : isInCart && cartQuantity > 0 
                    ? `In Cart (${cartQuantity})`
                    : !product.stock
                    ? 'Out of Stock'
                    : 'Add to Cart'
                  }
                </span>
              </button>
              
              <button
                onClick={handleBuyNow}
                disabled={isAddingToCart || !product.stock}
                className={`
                  w-full py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 
                  flex items-center justify-center gap-2
                  ${isAddingToCart || !product.stock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]'
                  }
                `}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Buy Now</span>
              </button>
            </div>
          )}

          {/* Only Add to Cart button */}
          {showAddToCart && !showBuyNow && (
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || !product.stock}
              className={`
                w-full py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 
                flex items-center justify-center gap-2
                ${isAddingToCart 
                  ? 'bg-orange-400 text-white cursor-not-allowed' 
                  : isInCart && cartQuantity > 0
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : !product.stock
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]'
                }
              `}
              title={errorMessage || ''}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {isAddingToCart 
                  ? 'Adding...' 
                  : isInCart && cartQuantity > 0 
                  ? `In Cart (${cartQuantity})`
                  : !product.stock
                  ? 'Out of Stock'
                  : 'Add to Cart'
                }
              </span>
            </button>
          )}

          {/* Only Buy Now button */}
          {!showAddToCart && showBuyNow && (
            <button
              onClick={handleBuyNow}
              disabled={isAddingToCart || !product.stock}
              className={`
                w-full py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 
                flex items-center justify-center gap-2
                ${isAddingToCart || !product.stock
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]'
                }
              `}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy Now</span>
            </button>
          )}

          {/* Fallback: default add to cart button */}
          {!showAddToCart && !showBuyNow && (
            <button
              onClick={handleAddToCart}
              className="w-full py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Add to Cart</span>
            </button>
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <div className="mt-2 text-xs text-red-600 text-center bg-red-50 py-1 px-2 rounded border">
              {errorMessage}
            </div>
          )}

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
      </div>
    </div>
  );
};

export default EnhancedProductCard;