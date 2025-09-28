import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getImageUrl } from '../config';

const ProductCarousel = ({ product, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Combine video and images into media array
  const mediaItems = React.useMemo(() => {
    const items = [];
    
    // Add video first if available
    if (product.video && !videoError) {
      items.push({
        type: 'video',
        src: product.video,
        alt: 'Product Video'
      });
    }
    
    // Add images with correct priority: Primary image first, then multiple images
    const addedImages = new Set(); // To avoid duplicate images
    
    // Add primary image first if available
    if (product.image) {
      items.push({
        type: 'image',
        src: product.image,
        alt: 'Primary Product Image'
      });
      addedImages.add(product.image);
    }
    
    // Add remaining multiple images (excluding the primary image if it's duplicated)
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image, index) => {
        if (!addedImages.has(image)) {
          items.push({
            type: 'image',
            src: image,
            alt: `Product Image ${index + 1}`
          });
          addedImages.add(image);
        }
      });
    }
    
    return items;
  }, [product.video, product.images, product.image, videoError]);

  const currentMedia = mediaItems[currentIndex];

  // Handle video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((error) => {
          console.error('Video play failed:', error);
          setVideoError(true);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Navigation functions
  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? mediaItems.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => 
      prev === mediaItems.length - 1 ? 0 : prev + 1
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Reset video when switching away from video
  useEffect(() => {
    if (currentMedia?.type !== 'video' && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentIndex, currentMedia?.type]);

  if (mediaItems.length === 0) {
    return (
      <div className={`w-full bg-gray-200 rounded-lg flex items-center justify-center ${className || 'h-96'}`}>
        <span className="text-gray-500">No media available</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-2xl mx-auto ${className}`}>
      {/* Main Media Display */}
      <div className="relative w-80 h-80 mx-auto bg-gray-100 rounded-lg overflow-hidden shadow-lg">
        {currentMedia?.type === 'video' ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setVideoError(true)}
            >
              <source src={getImageUrl('products', currentMedia.src)} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={toggleMute}
                  className="p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={getImageUrl('products', currentMedia.src)}
            alt={currentMedia.alt}
            className="w-full h-full object-contain bg-white"
            onError={(e) => {
              console.error('Image failed to load:', currentMedia.src);
              e.target.style.display = 'none';
            }}
          />
        )}

        {/* Navigation Arrows */}
        {mediaItems.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Slide Counter */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {mediaItems.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {mediaItems.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {mediaItems.map((media, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 aspect-square
                ${currentIndex === index 
                  ? 'border-blue-500 shadow-lg scale-105' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              {media.type === 'video' ? (
                <div className="relative w-full h-full bg-gray-200 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <video className="w-full h-full object-contain" muted>
                    <source src={getImageUrl('products', media.src)} type="video/mp4" />
                  </video>
                </div>
              ) : (
                <img
                  src={getImageUrl('products', media.src)}
                  alt={media.alt}
                  className="w-full h-full object-contain bg-white p-1"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Dots Indicator (for mobile) */}
      {mediaItems.length > 1 && (
        <div className="mt-4 flex justify-center gap-2 md:hidden">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${currentIndex === index 
                  ? 'bg-blue-500 w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductCarousel;