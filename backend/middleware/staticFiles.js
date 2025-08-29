const {
    UPLOADS_BASE_DIR,
    UPLOADS_ABSOLUTE_PATH,
    ensureUploadDirs
} = require('./config/fileConfig');

// Ensure upload directories exist on startup
ensureUploadDirs();

// Configure static file serving with proper CORS
app.use(`/${UPLOADS_BASE_DIR}`, (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
}, express.static(UPLOADS_ABSOLUTE_PATH));
