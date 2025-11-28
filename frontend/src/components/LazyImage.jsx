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
  optimizedImage = null, // Backend-provided optimized image paths
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

  // Generate srcSet for responsive images - use backend data if available
  const generateSrcSet = (baseSrc, sizes, format = '') => {
    if (srcSet) return srcSet; // Use provided srcSet if available
    
    // If we have optimizedImage data from backend, use it directly
    if (optimizedImage && format) {
      const formatData = optimizedImage[format]; // 'avif' or 'webp'
      if (formatData) {
        const srcSetParts = [];
        
        // Only include sizes that actually exist
        for (const size of sizes) {
          const sizeKey = `${size}w`;
          const path = formatData[sizeKey];
          
          if (path) {
            // In dev, prepend BASE_URL; in production, use as-is
            const finalPath = import.meta.env.DEV && path.startsWith('/') 
              ? `${config.BASE_URL}${path}` 
              : path;
            srcSetParts.push(`${finalPath} ${size}w`);
          }
        }
        
        // If no size-specific variants exist, use full size as fallback
        if (srcSetParts.length === 0 && formatData['full']) {
          const fullPath = import.meta.env.DEV && formatData['full'].startsWith('/') 
            ? `${config.BASE_URL}${formatData['full']}` 
            : formatData['full'];
          console.log(`[LazyImage] Using full size fallback for ${format}:`, fullPath);
          return fullPath; // Return single path, not srcset
        }
        
        // If we have at least one valid size variant, return the srcset
        if (srcSetParts.length > 0) {
          console.log(`[LazyImage] Generated srcset for ${format}:`, srcSetParts.join(', '));
          return srcSetParts.join(', ');
        }
      }
    }
    
    // Fallback: Generate paths client-side (less reliable)
    if (!baseSrc) return '';
    
    // Extract path from full URL if needed
    let pathOnly = baseSrc;
    if (baseSrc.includes(config.BASE_URL)) {
      pathOnly = baseSrc.replace(config.BASE_URL, '');
    }
    
    // Get the directory and filename separately
    const lastSlash = pathOnly.lastIndexOf('/');
    const directory = pathOnly.substring(0, lastSlash + 1);
    const filename = pathOnly.substring(lastSlash + 1);
    
    // Remove extension from filename
    const lastDot = filename.lastIndexOf('.');
    const filenameWithoutExt = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
    
    // Generate srcSet with format suffix  
    const formatSuffix = format ? `.${format}` : '';
    return sizes
      .map(size => {
        const optimizedPath = `${directory}${filenameWithoutExt}-${size}w${formatSuffix}`;
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

  // Generate sizes attribute if not provided - based on what actually exists
  const generateSizes = () => {
    if (sizes) return sizes;
    
    // If we have optimizedImage data, check which sizes actually exist
    if (optimizedImage && (optimizedImage.avif || optimizedImage.webp)) {
      const availableSizes = new Set();
      
      // Collect available sizes from both formats
      ['avif', 'webp'].forEach(format => {
        if (optimizedImage[format]) {
          Object.keys(optimizedImage[format]).forEach(sizeKey => {
            if (sizeKey.endsWith('w')) {
              const size = parseInt(sizeKey);
              if (!isNaN(size)) availableSizes.add(size);
            }
          });
        }
      });
      
      // Convert to sorted array
      const sortedSizes = Array.from(availableSizes).sort((a, b) => a - b);
      
      // Generate sizes attribute based on what's available
      if (sortedSizes.length === 0) {
        // No size-specific variants, use original
        return '100vw';
      } else if (sortedSizes.length === 1) {
        // Only one size available (e.g., only 300w)
        return `(max-width: 640px) ${sortedSizes[0]}px, ${sortedSizes[0]}px`;
      } else if (sortedSizes.includes(300) && sortedSizes.includes(600) && sortedSizes.includes(1200)) {
        // All sizes available - use full responsive rules
        return '(max-width: 640px) 300px, (max-width: 1024px) 600px, 1200px';
      } else if (sortedSizes.includes(300) && !sortedSizes.includes(600)) {
        // Only 300w available, don't request 600w
        return '(max-width: 640px) 300px, 300px';
      } else if (sortedSizes.includes(300) && sortedSizes.includes(600)) {
        // 300w and 600w available, but no 1200w
        return '(max-width: 640px) 300px, 600px';
      }
    }
    
    // Default responsive sizes as fallback
    return '(max-width: 640px) 300px, (max-width: 1024px) 600px, 1200px';
  };

  // If modern formats are enabled, use picture element
  if (enableModernFormats && !hasError) {
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
  responsiveSizes: PropTypes.arrayOf(PropTypes.number), // Responsive breakpoints
  optimizedImage: PropTypes.shape({
    original: PropTypes.string,
    webp: PropTypes.object,
    avif: PropTypes.object
  })
};

export default LazyImage;
