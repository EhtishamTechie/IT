const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3001,
  
  // Base URLs
  BASE_URL: isDevelopment 
    ? `http://localhost:${process.env.PORT || 3001}`
    : process.env.BASE_URL,

  API_PREFIX: '/api',
  UPLOADS_PREFIX: '/uploads',

  // Client URLs for CORS
  CLIENT_URLS: isDevelopment
    ? ['http://localhost:5173', 'http://localhost:3000']
    : [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean),

  // Upload paths configuration
  UPLOAD_PATH: isDevelopment ? 'uploads' : '/tmp/uploads',
  
  // Function to get the full URL for uploads
  getUploadUrl: (path) => {
    if (!path) return null;
    const uploadPrefix = '/uploads/';
    const cleanPath = path.replace(/^\/+uploads\/+/, '');
    return isDevelopment
      ? `http://localhost:${process.env.PORT || 3001}${uploadPrefix}${cleanPath}`
      : `${process.env.BASE_URL || ''}${uploadPrefix}${cleanPath}`;
  }
};
