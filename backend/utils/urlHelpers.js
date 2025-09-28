const getUploadUrl = (type, filename) => {
  const baseUrl = process.env.UPLOAD_URL || `http://localhost:${process.env.PORT || 3001}`;
  
  // Handle case where only path is provided (backward compatibility)
  if (arguments.length === 1) {
    const path = type; // First argument is the path
    
    if (!path || path === 'placeholder-image.jpg') {
      return `${baseUrl}/uploads/products/placeholder-image.jpg`;
    }
    
    return `${baseUrl}/uploads${path.startsWith('/') ? path : `/${path}`}`;
  }

  // Handle missing or empty filename in two-parameter case
  if (!filename || filename === 'placeholder-image.jpg') {
    return `${baseUrl}/uploads/products/placeholder-image.jpg`;
  }

  // For product images and other typed uploads
  const uploadPath = type === 'products' ? 'products' : 
                    type === 'vendors' ? 'vendor-logos' :
                    type === 'properties' ? 'properties' :
                    type === 'used-products' ? 'used-products' : '';
  
  // Check if the filename already contains the full path
  if (filename.includes('/uploads/')) {
    return `${baseUrl}${filename}`;
  }
  
  return `${baseUrl}/uploads/${uploadPath}/${filename}`;
};

module.exports = {
  getUploadUrl
};
