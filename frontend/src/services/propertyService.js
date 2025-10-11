import { config } from '../config';

// Helper function to get full image URL for properties
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '/assets/no-image.png';
  
  // Handle data URLs (for image previews)
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }

  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // Clean up any prefixes and get just the filename
  const cleanFilename = imagePath
    .replace(/^\/uploads\/properties\//, '')
    .replace(/^uploads\/properties\//, '')
    .replace(/^\/uploads\//, '')
    .replace(/^uploads\//, '')
    .replace(/^properties\//, '')
    .replace(/^\/properties\//, '')
    .split('/')
    .pop()
    .split('\\')
    .pop();

  // For properties, always use the uploads/properties path
  const relativeUrl = `/uploads/properties/${cleanFilename}`;

  // For development, use the full URL
  if (import.meta.env.DEV) {
    return `${config.BASE_URL}${relativeUrl}`;
  }
  
  // In production, use relative URL
  return relativeUrl;
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
