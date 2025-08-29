// Image path configuration
const IMAGE_PATHS = {
  products: 'products',
  properties: 'properties',
  usedProducts: 'used-products',
  vendorLogos: 'vendor-logos',
  profiles: 'profiles'
};

// Get base URL for the application
const getBaseUrl = () => {
  // Get base URL from environment or default
  const url = import.meta.env.VITE_API_BASE_URL || 
              import.meta.env.VITE_API_URL || 
              (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
              
  return url
    .replace(/\/+$/, '')         // Remove trailing slashes
    .replace(/\/api$/, '');      // Remove /api suffix if present
};

// Centralized configuration
export const config = {
  // Base URL (without /api)
  BASE_URL: getBaseUrl(),
  
  // API Base URL (with /api)
  API_BASE_URL: `${getBaseUrl()}/api`,
  
  // Uploads URL for images and files
  UPLOADS_URL: import.meta.env.VITE_UPLOADS_URL || 
               `${getBaseUrl()}/uploads`,
  
  // Email Service URL
  EMAIL_API_URL: import.meta.env.REACT_APP_EMAIL_API_URL || 
                 import.meta.env.VITE_API_BASE_URL || 
                 getBaseUrl(),
  
  // App Info
  APP_NAME: import.meta.env.VITE_APP_NAME || 'International Tijarat',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Image paths
  IMAGE_PATHS
};

// Get API URL for endpoints
export const getApiUrl = (endpoint = '') => {
  // Remove trailing slash from base and remove any /api suffix
  const base = config.BASE_URL
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
  
  // Clean the endpoint: remove leading/trailing slashes and api prefix
  const path = endpoint
    .replace(/^api\/?/, '')         // Remove api/ prefix
    .replace(/^\/+|\/+$/g, '')      // Remove leading/trailing slashes
    .replace(/\/+/g, '/');          // Replace multiple slashes with single
  
  // Combine with single /api/ prefix
  return path ? `${base}/api/${path}` : `${base}/api`;
};

// Get image URL with proper path handling
export const getImageUrl = (type, filename) => {
  // Handle missing or invalid paths
  if (!filename) {
    console.log('⚠️ [getImageUrl] No image filename provided');
    return '/assets/no-image.png';
  }

  // Handle arrays - take the first item
  if (Array.isArray(filename)) {
    filename = filename[0];
  }

  try {
    // Handle data URLs (for image previews)
    if (filename.startsWith('data:')) {
      return filename;
    }

    // If it's already a full URL and not using old port
    if (filename.startsWith('http')) {
      if (!filename.includes('localhost:5000')) {
        return filename;
      }
      // For old localhost:5000 URLs, extract just the path
      filename = filename.replace(/^https?:\/\/localhost:\d+\//, '');
    }

    const cleanPath = filename.split('/').pop().split('\\').pop();
    const base = config.UPLOADS_URL.replace(/\/+$/, '');

    // Handle different image types
    if (cleanPath.includes('property-')) {
      // Property images go in /properties/
      const match = cleanPath.match(/property-[^/\\]+\.[^/\\]+$/);
      const propertyPath = match ? match[0] : cleanPath;
      const url = `${base}/properties/${propertyPath}`;
      console.log('🏠 [getImageUrl] Property image:', url);
      return url;
    } 
    
    if (cleanPath.match(/^\d{13,}\.[a-zA-Z]+$/) || 
        cleanPath.startsWith('image-') || 
        cleanPath.startsWith('product-')) {
      // Product images are in the products/ subdirectory
      const url = `${base}/products/${cleanPath}`;
      console.log('📦 [getImageUrl] Product image:', {
        original: filename,
        cleaned: cleanPath,
        final: url,
        base
      });
      return url;
    } 
    
    if (cleanPath.startsWith('vendor-')) {
      // Vendor logos go in /vendor-logos/
      if (cleanPath.match(/^vendor-[a-f0-9]{24}$/)) {
        console.log('👤 [getImageUrl] No vendor logo found, using placeholder');
        return '/assets/default-vendor-logo.png';
      }
      const url = `${base}/vendor-logos/${cleanPath.replace(/^vendor-logos\/+/, '')}`;
      console.log('👤 [getImageUrl] Vendor logo:', url);
      
      // Set up error handler for placeholder
      const img = new Image();
      img.onerror = () => {
        console.log('👤 [getImageUrl] Vendor logo failed to load, using placeholder');
        return '/assets/default-vendor-logo.png';
      };
      img.src = url;
      return url;
    }
    
    // All other images go directly in uploads
    const url = `${base}/${cleanPath}`;
    console.log('📸 [getImageUrl] Standard image:', url);
    return url;
  } catch (error) {
    console.error('❌ [getImageUrl] Error processing image path:', error);
    return '/assets/no-image.png';
  }
};

// Alias getImageUrl as getUploadUrl for backward compatibility
export const getUploadUrl = getImageUrl;

export default config;
