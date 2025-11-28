import React from 'react';
import PropTypes from 'prop-types';
import { config } from '../config';

/**
 * LazyImage Component - Optimized image loading with modern formats and responsive images
 * 
 * Features:
 * - Native lazy loading (loading="lazy")
 * - Async decoding for better performance
 * - WebP and AVIF support with fallbacks
 * - Responsive images with srcSet
 * - Fallback placeholder support
 * - Error handling with fallback image
 * - Explicit dimensions to prevent CLS
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
  enableModernFormats = true, // Enable WebP/AVIF
  responsiveSizes = [300, 600, 1200], // Responsive breakpoints
  ...props 
}) => {
  // Helper to get full URL for images
  const getFullUrl = (path) => {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path;
    
    // If it's a backend path starting with /uploads/
    if (path.startsWith('/uploads/')) {
      // In development, prepend BASE_URL (http://localhost:3001)
      // In production, use relative path (served by same domain)
      if (import.meta.env.DEV) {
        return `${config.BASE_URL}${path}`;
      }
      // Production - use relative path as-is
      return path;
    }
    
    // Otherwise return as-is
    return path;
  };

  const [imageSrc, setImageSrc] = React.useState(getFullUrl(src));
  const [hasError, setHasError] = React.useState(false);

  // Update image source when src prop changes
  React.useEffect(() => {
    setImageSrc(getFullUrl(src));
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

  // Generate srcSet for responsive images if not provided
  const generateSrcSet = (baseSrc, sizes, format = '') => {
    if (!baseSrc || srcSet) return srcSet; // Use provided srcSet if available
    
    // Extract path from full URL if needed
    let pathOnly = baseSrc;
    if (baseSrc.includes(config.BASE_URL)) {
      pathOnly = baseSrc.replace(config.BASE_URL, '');
    }
    
    const ext = pathOnly.substring(pathOnly.lastIndexOf('.'));
    const baseWithoutExt = pathOnly.substring(0, pathOnly.lastIndexOf('.'));
    
    // Generate srcSet with format suffix
    const formatSuffix = format ? `.${format}` : ext;
    return sizes
      .map(size => {
        const optimizedPath = `${baseWithoutExt}-${size}w${formatSuffix}`;
        // In production, use relative paths; in dev, use full URLs
        if (import.meta.env.DEV) {
          const fullUrl = optimizedPath.startsWith('/') 
            ? `${config.BASE_URL}${optimizedPath}` 
            : optimizedPath;
          return `${fullUrl} ${size}w`;
        }
        // Production - use relative path
        return `${optimizedPath} ${size}w`;
      })
      .join(', ');
  };

  // Generate sizes attribute if not provided
  const generateSizes = () => {
    if (sizes) return sizes;
    
    // Default responsive sizes
    return '(max-width: 640px) 300px, (max-width: 1024px) 600px, 1200px';
  };

  // If modern formats are enabled, use picture element
  if (enableModernFormats && !hasError) {
    const baseWithoutExt = imageSrc.substring(0, imageSrc.lastIndexOf('.'));
    const ext = imageSrc.substring(imageSrc.lastIndexOf('.'));
    
    return (
      <picture>
        {/* AVIF - Best compression, modern browsers */}
        <source 
          type="image/avif" 
          srcSet={generateSrcSet(imageSrc, responsiveSizes, 'avif')}
          sizes={generateSizes()}
        />
        
        {/* WebP - Good compression, wide support */}
        <source 
          type="image/webp" 
          srcSet={generateSrcSet(imageSrc, responsiveSizes, 'webp')}
          sizes={generateSizes()}
        />
        
        {/* Original format - Fallback */}
        <img
          src={imageSrc}
          alt={alt}
          className={className}
          width={width}
          height={height}
          srcSet={srcSet || generateSrcSet(imageSrc, responsiveSizes)}
          sizes={sizes || generateSizes()}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={handleError}
          {...props}
        />
      </picture>
    );
  }

  // Fallback to simple img tag
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
  priority: PropTypes.bool, // Set to true for above-the-fold images
  enableModernFormats: PropTypes.bool, // Enable WebP/AVIF picture element
  responsiveSizes: PropTypes.arrayOf(PropTypes.number) // Responsive breakpoints
};

export default LazyImage;
