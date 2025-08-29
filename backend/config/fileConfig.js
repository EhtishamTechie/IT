const path = require('path');

// Upload directory configuration
const UPLOAD_DIRS = {
    products: 'products',
    properties: 'properties',
    usedProducts: 'used-products',
    vendorLogos: 'vendor-logos',
    profiles: 'profiles'
};

// Base paths
const UPLOADS_BASE_DIR = 'uploads';
const UPLOADS_ABSOLUTE_PATH = path.join(__dirname, '..', UPLOADS_BASE_DIR);

// Get absolute path for a specific upload type
const getUploadPath = (type) => {
    if (!UPLOAD_DIRS[type]) {
        throw new Error(`Invalid upload type: ${type}`);
    }
    return path.join(UPLOADS_ABSOLUTE_PATH, UPLOAD_DIRS[type]);
};

// Get relative path for a specific file (used for URLs)
const getRelativePath = (type, filename) => {
    if (!UPLOAD_DIRS[type]) {
        throw new Error(`Invalid upload type: ${type}`);
    }
    return path.join(UPLOADS_BASE_DIR, UPLOAD_DIRS[type], filename);
};

// Ensure upload directories exist
const ensureUploadDirs = () => {
    // Create base uploads directory
    if (!fs.existsSync(UPLOADS_ABSOLUTE_PATH)) {
        fs.mkdirSync(UPLOADS_ABSOLUTE_PATH, { recursive: true });
    }

    // Create all upload type directories
    Object.values(UPLOAD_DIRS).forEach(dir => {
        const fullPath = path.join(UPLOADS_ABSOLUTE_PATH, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    });
};

module.exports = {
    UPLOAD_DIRS,
    UPLOADS_BASE_DIR,
    UPLOADS_ABSOLUTE_PATH,
    getUploadPath,
    getRelativePath,
    ensureUploadDirs
};
