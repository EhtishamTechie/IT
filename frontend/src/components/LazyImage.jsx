import React from 'react';
import PropTypes from 'prop-types';

/**
 * LazyImage Component - Optimized image loading with lazy loading and modern attributes
 * 
 * Features:
 * - Native lazy loading (loading="lazy")
 * - Async decoding for better performance
 * - Fallback placeholder support
 * - Error handling with fallback image
 * - Responsive image support with srcSet
 */
const LazyImage = ({ 
  src, 
  alt = '', 
  className = '', 
  width,
  height,
  srcSet,
  sizes,
  fallback = '/placeholder-image.jpg',
  onError,
  priority = false,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = React.useState(src);
  const [hasError, setHasError] = React.useState(false);

  // Update image source when src prop changes
  React.useEffect(() => {
    setImageSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = (e) => {
    if (!hasError) {
      console.warn(`Failed to load image: ${src}`);
      setImageSrc(fallback);
      setHasError(true);
      
      if (onError) {
        onError(e);
      }
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleError}
      {...props}
    />
  );
};

LazyImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  srcSet: PropTypes.string,
  sizes: PropTypes.string,
  fallback: PropTypes.string,
  onError: PropTypes.func,
  priority: PropTypes.bool // Set to true for above-the-fold images
};

export default LazyImage;
