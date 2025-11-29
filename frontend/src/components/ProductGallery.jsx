import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getImageUrl } from '../config';
import LazyImage from './LazyImage';

const ProductGallery = ({ product }) => {
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
        alt: 'Primary Product Image',
        optimizedImage: product.optimizedImage || null
      });
      addedImages.add(product.image);
    }
    
    // Add remaining multiple images (excluding the primary image if it's duplicated)
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image, index) => {
        if (!addedImages.has(image)) {
          // Find corresponding optimizedImages data
          const optimizedImageData = product.optimizedImages && product.optimizedImages[index] 
            ? product.optimizedImages[index] 
            : null;
          
          items.push({
            type: 'image',
            src: image,
            alt: `Product Image ${index + 1}`,
            optimizedImage: optimizedImageData
          });
          addedImages.add(image);
        }
      });
    }
    
    return items;
  }, [product.video, product.images, product.image, product.optimizedImage, product.optimizedImages, videoError]);

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
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">No media available</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Main Media Display - Square aspect ratio for product images */}
      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-lg">
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
          <LazyImage
            src={currentMedia.src}
            alt={currentMedia.alt}
            optimizedImage={currentMedia.optimizedImage}
            enableModernFormats={true}
            priority={currentIndex === 0}
            className="w-full h-full object-cover bg-white"
            width={800}
            height={800}
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

      {/* Thumbnail Navigation - Separate section */}
      {mediaItems.length > 1 && (
        <div className="w-full">
          <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
            {mediaItems.map((media, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`
                  flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200
                  ${currentIndex === index 
                    ? 'border-blue-500 shadow-md' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                {media.type === 'video' ? (
                  <div className="relative w-full h-full bg-gray-200 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <video className="w-full h-full object-contain" muted>
                      <source src={getImageUrl('products', media.src)} type="video/mp4" />
                    </video>
                  </div>
                ) : (
                  <LazyImage
                    src={media.src}
                    alt={media.alt}
                    optimizedImage={media.optimizedImage}
                    enableModernFormats={true}
                    priority={false}
                    className="w-full h-full object-cover"
                    width={64}
                    height={64}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGallery;