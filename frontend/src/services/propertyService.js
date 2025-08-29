import { config } from '../config';

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '/assets/no-image.png';
  
  // If it's a full URL from our old backend (port 5000), fix it
  if (imagePath.includes('localhost:5000')) {
    const match = imagePath.match(/\/uploads\/(.+)$/);
    if (match) {
      const filename = match[1].replace(/^properties\/+/, '');
      return `${config.BASE_URL}/properties/${filename}`;
    }
  }
  
  // If it's any other full URL, return it as is
  if (imagePath.startsWith('http')) return imagePath;
  
  // Clean up and construct URL for relative paths
  // Remove any path prefixes, we just want the filename
  const filename = imagePath
    .replace(/^\/+/, '')           // Remove leading slashes
    .replace(/^uploads\/+/, '')    // Remove uploads/ prefix
    .replace(/^properties\/+/, '') // Remove properties/ prefix
  
  // Use BASE_URL which doesn't include /api
  return `${config.BASE_URL}/properties/${filename}`;
};

// Helper function to normalize property data
const normalizeProperty = (property) => {
  if (!property) return null;

  return {
    ...property,
    images: property.images?.map(getImageUrl) || []
  };
};

// Service configuration
console.log('🔧 Initializing property service with config:', {
  API_BASE_URL: config.API_BASE_URL,
  UPLOADS_URL: config.UPLOADS_URL
});

export const propertyService = {
  // Helper functions
  getImageUrl,
  normalizeProperty,

  // Property data normalization
  normalizeProperties: (properties) => {
    if (!Array.isArray(properties)) return [];
    return properties.map(normalizeProperty);
  }
};
