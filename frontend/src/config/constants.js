// API and Image configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:3000/uploads';

// Route configuration
export const ROUTES = {
  CATEGORY: '/category',
  PRODUCT: '/product',
};

// Default values
export const DEFAULTS = {
  BANNER_BG_COLOR: '#FF9900',
  FALLBACK_IMAGE: 'placeholder.jpg',
};
