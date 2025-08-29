// Backend configuration constants
const constants = {
    // Server configuration
    PORT: process.env.PORT || 3001,
    
    // URL configurations
    BASE_URL: process.env.NODE_ENV === 'production' 
        ? process.env.BASE_URL
        : `http://localhost:${process.env.PORT || 3001}`,
    
    UPLOADS_URL: process.env.NODE_ENV === 'production'
        ? `${process.env.BASE_URL}/uploads`
        : `http://localhost:${process.env.PORT || 3001}/uploads`,

    // CORS allowed origins
    ALLOWED_ORIGINS: process.env.NODE_ENV === 'production'
        ? [process.env.CLIENT_URL].filter(Boolean)
        : ['http://localhost:5173', 'http://localhost:3000']
};

module.exports = constants;
