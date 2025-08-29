// Image URL configuration
const CONFIG = {
    API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    UPLOADS_BASE_PATH: '/uploads',
    IMAGE_PATHS: {
        products: 'products',
        properties: 'properties',
        usedProducts: 'used-products',
        vendorLogos: 'vendor-logos',
        profiles: 'profiles'
    }
};

// Construct image URL with proper path handling
const getImageUrl = (type, filename) => {
    if (!filename) return null;
    
    if (!CONFIG.IMAGE_PATHS[type]) {
        console.error(`Invalid image type: ${type}`);
        return null;
    }

    // Clean the filename to prevent path traversal
    const cleanFilename = filename.split('/').pop().split('\\').pop();
    
    return `${CONFIG.API_URL}${CONFIG.UPLOADS_BASE_PATH}/${CONFIG.IMAGE_PATHS[type]}/${cleanFilename}`;
};

// Get multiple image URLs (for arrays of images)
const getMultipleImageUrls = (type, filenames) => {
    if (!Array.isArray(filenames)) return [];
    return filenames.map(filename => getImageUrl(type, filename));
};

export {
    CONFIG,
    getImageUrl,
    getMultipleImageUrls
};
