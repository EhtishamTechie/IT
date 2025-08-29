// Server configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const fs = require('fs');
const path = require('path');

const config = {
  port: process.env.PORT || 3001,
  baseUrl: isDevelopment
    ? `http://localhost:${process.env.PORT || 3001}`
    : process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL,
  uploadsPath: 'uploads',
  absoluteUploadsPath: isDevelopment 
    ? path.resolve(__dirname, '..', 'uploads')
    : '/tmp'
};

// Helper functions for URLs
const getImageUrl = (type, filename) => {
  if (!filename) {
    return '/assets/no-image.png';
  }
  
  // If it's already a full URL, return it as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  // Clean up the filename to remove any unwanted path segments
  const cleanFilename = filename
    .split('/')
    .pop()
    .split('\\')
    .pop();

  // Map types to their upload directories
  const typeToPath = {
    products: 'products',
    properties: 'properties',
    vendors: 'vendor-logos',
    usedProducts: 'used-products',
    userProfiles: 'user-profiles'
  };

  const uploadPath = typeToPath[type] || '';
  const relativePath = uploadPath 
    ? `/uploads/${uploadPath}/${cleanFilename}`
    : `/uploads/${cleanFilename}`;

  // In development, we might want to return the full URL
  if (isDevelopment) {
    return `${config.baseUrl}${relativePath}`;
  }

  // In production, return just the relative path
  return relativePath;
};

// Export config and helper functions
module.exports = {
  config,
  getImageUrl
};
