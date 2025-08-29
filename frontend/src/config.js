// Image path configuration
const IMAGE_PATHS = {
  products: 'products',
  properties: 'properties',
  usedProducts: 'used-products',
  vendorLogos: 'vendor-logos',
  profiles: 'profiles',
  homepageCategories: 'homepage-categories',
  'homepage-cards': 'homepage-cards'
};

// Get base URL for the application (for API calls)
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_BASE_URL || 
              import.meta.env.VITE_API_URL || 
              (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
              
  return url
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
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

// Centralized configuration
export const config = {
  BASE_URL: getBaseUrl(),
  API_BASE_URL: `${getBaseUrl()}/api`,
  UPLOADS_URL: `${getBaseUrl()}`,  // Add this line for image uploads
  APP_NAME: import.meta.env.VITE_APP_NAME || 'International Tijarat',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  IMAGE_PATHS
};

// Get image URL with proper path handling (using backend-relative paths)
export const getImageUrl = (type, originalFilename) => {
  console.log('🌐 getImageUrl called with:', { type, originalFilename });
  
  if (!originalFilename) {
    console.log('⚠️ [getImageUrl] No filename provided');
    return '/assets/no-image.png';
  }
  
  if (!type) {
    console.log('⚠️ [getImageUrl] No type provided');
    return '/assets/no-image.png';
  }

  // Handle arrays - take the first item
  let filename = Array.isArray(originalFilename) ? originalFilename[0] : originalFilename;

  try {
    // Handle data URLs (for image previews)
    if (filename.startsWith('data:')) {
      return filename;
    }

    // If it's already a full URL
    if (filename.startsWith('http')) {
      return filename;
    }

    // Clean up any prefixes and get just the filename
    const cleanFilename = filename
      .replace(/^\/uploads\/products\//, '')
      .replace(/^uploads\/products\//, '')
      .replace(/^\/uploads\//, '')
      .replace(/^uploads\//, '')
      .replace(/^products\//, '')
      .replace(/^\/products\//, '')
      .split('/')
      .pop()
      .split('\\')
      .pop();

    // Build the relative path based on type
    let relativeUrl = '';
    if (type === 'products') {
      relativeUrl = `/uploads/products/${cleanFilename}`;
    } else if (IMAGE_PATHS[type]) {
      relativeUrl = `/uploads/${IMAGE_PATHS[type]}/${cleanFilename}`;
    } else {
      relativeUrl = `/uploads/${cleanFilename}`;
    }

    console.log('🔄 [getImageUrl] Path construction:', {
      type,
      original: originalFilename,
      cleaned: cleanFilename,
      relative: relativeUrl
    });

    // For development, use the full URL
    if (import.meta.env.DEV) {
      return `${config.BASE_URL}${relativeUrl}`;
    }
    
    // In production, use relative URL
    return relativeUrl;
  } catch (error) {
    console.error('❌ [getImageUrl] Error processing image path:', error, {
      type,
      originalFilename,
      baseUrl: config.BASE_URL,
      uploadsUrl: config.UPLOADS_URL,
      dev: import.meta.env.DEV
    });
    return '/assets/no-image.png';
  }
};

// Alias getImageUrl as getUploadUrl for backward compatibility
export const getUploadUrl = getImageUrl;

export default config;
