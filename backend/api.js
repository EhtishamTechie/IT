// Simple API Server for Vercel Deployment
// FIXED: Await MongoDB connection before handling requests

const express = require('express');
const cors = require('cors');

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cacheService = require('./services/cacheService');

// Auth middleware
const { authenticateToken, authenticateAdmin } = require('./middleware/auth');

// Upload middleware
const { uploadMultipleProductImages } = require('./middleware/uploadMiddleware');

// Routes
const bannerRoutes = require('./routes/bannerRoutes');
const homepageCardRoutes = require('./routes/homepageCardRoutes');

// Models
const FeaturedProducts = require('./models/FeaturedProducts');
const HomepageBanner = require('./models/HomepageBanner');
const PremiumProducts = require('./models/PremiumProducts');
const Category = require('./models/Category');

const app = express();

// Upload directory configuration
const UPLOAD_DIRS = {
    products: 'products',
    properties: 'properties',
    usedProducts: 'used-products',
    vendorLogos: 'vendor-logos',
    profiles: 'profiles',
    homepageCategories: 'homepage-categories',
    homepageCards: 'homepage-cards',
    wholesaleSuppliers: 'wholesale-suppliers',
    qrCodes: 'qr-codes',
    paymentReceipts: 'payment-receipts'
};

// Base upload path configuration
const UPLOADS_BASE_DIR = 'uploads';
const UPLOADS_ABSOLUTE_PATH = path.join(__dirname, UPLOADS_BASE_DIR);

// Ensure upload directories exist
const ensureUploadDirectories = () => {
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

// Initialize upload directories
ensureUploadDirectories();

// Serve homepage category images
app.use('/uploads/homepage-categories', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'homepage-categories'), {
    fallthrough: true
}));

// Serve homepage card images
app.use('/uploads/homepage-cards', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'homepage-cards'), {
    fallthrough: true
}));

// Serve QR code images for payment accounts
app.use('/uploads/qr-codes', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'qr-codes'), {
    fallthrough: true
}));

// Serve payment receipt images for advance payment orders
app.use('/uploads/payment-receipts', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'payment-receipts'), {
    fallthrough: true
}));

// Fix any misplaced product images
const fixProductImages = require('./utils/fixProductImages');
fixProductImages();

// Configure CORS for static file serving with standardized paths
app.use([
    `/${UPLOADS_BASE_DIR}`,
    ...Object.values(UPLOAD_DIRS).map(dir => `/${UPLOADS_BASE_DIR}/${dir}`)
], (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Unified file serving handler with standardized paths
const handleImageRequest = (req, res, next) => {
    // Clean the path and get relative path
    const cleanPath = path.normalize(req.path)
        .replace(/^(\.\.[\/\\])+/, '')
        .replace(/^\/+/, '');
    
    console.log('🎯 [IMAGE] Request received:', {
        originalUrl: req.originalUrl,
        url: req.url,
        path: req.path,
        cleanPath
    });
    
    // Get just the filename without path
    const filename = path.basename(cleanPath);
    
    // Determine file type based on filename pattern and use standardized paths
    let targetDir = path.join(UPLOADS_BASE_DIR, UPLOAD_DIRS.products); // Default to products
    
    // Use standardized directory structure
    if (filename.startsWith('property-')) {
        targetDir = path.join(UPLOADS_BASE_DIR, UPLOAD_DIRS.properties);
    } else if (filename.startsWith('vendor-')) {
        targetDir = path.join(UPLOADS_BASE_DIR, UPLOAD_DIRS.vendorLogos);
    } else if (filename.startsWith('profile-')) {
        targetDir = path.join(UPLOADS_BASE_DIR, UPLOAD_DIRS.profiles);
    } else if (filename.startsWith('supplier-')) {
        targetDir = path.join(UPLOADS_BASE_DIR, UPLOAD_DIRS.wholesaleSuppliers);
    }
  
  console.log('📁 [IMAGE] Target directory determined:', {
    filename,
    targetDir,
    pattern: filename.match(/^\d{13,}\.[a-zA-Z]+$/) ? 'timestamp' : 
            filename.startsWith('image-') ? 'image-prefix' :
            filename.startsWith('property-') ? 'property-prefix' : 'unknown'
  });
  
  // Define possible locations to look for the file
  const possiblePaths = [
    path.join(__dirname, targetDir, filename),                      // In specific folder
    path.join(__dirname, 'uploads', 'products', filename),         // Try products
    path.join(__dirname, 'uploads', 'properties', filename),       // Try properties
    path.join(__dirname, 'uploads', 'vendor-logos', filename),     // Try vendor logos
    path.join(__dirname, 'uploads', 'wholesale-suppliers', filename), // Try wholesale suppliers
    path.join(__dirname, 'uploads', filename)                      // Try root uploads
  ];
  
  console.log('📸 Image request:', {
    url: req.url,
    path: req.path,
    cleanPath,
    filename,
    targetDir,
    possiblePaths
  });
  
  // Try each path
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      console.log('✅ Found image at:', tryPath);
      return res.sendFile(tryPath);
    }
  }
  
  next();
};

// Static file serving for all upload directories
const serveStatic = (prefix, dir) => {
  const targetPath = path.join(__dirname, 'uploads', prefix);
  console.log('📂 [STATIC] Setting up static serving for:', {
    prefix,
    targetPath,
    exists: fs.existsSync(targetPath)
  });
  
  // Handle all possible paths for this prefix
  const handler = (req, res, next) => {
    const filepath = path.join(targetPath, req.path.replace(/^\/+/, ''));
    console.log('🔍 [STATIC] Checking file:', {
      url: req.url,
      path: req.path,
      filepath,
      exists: fs.existsSync(filepath)
    });
    
    if (fs.existsSync(filepath)) {
      console.log('✅ [STATIC] Serving file:', filepath);
      res.sendFile(filepath);
    } else {
      console.log('❌ [STATIC] File not found:', filepath);
      next();
    }
  };
  
  // Set up routes with detailed logging
  app.use(`/uploads/${prefix}`, handler);
  app.use(`/${prefix}`, (req, res) => {
    console.log('🔄 [STATIC] Redirecting to /uploads prefix');
    res.redirect(301, `/uploads/${prefix}${req.path}`);
  });
};

// Set up static serving for each directory
serveStatic('products', 'products');
serveStatic('vendor-logos', 'vendor-logos');
serveStatic('used-products', 'used-products');
serveStatic('properties', 'properties');
serveStatic('wholesale-suppliers', 'wholesale-suppliers');

// Static file serving with caching for all upload directories
const staticOptions = {
    fallthrough: true,
    setHeaders: (res) => {
        res.set('Cache-Control', 'public, max-age=31536000'); // 1 year caching
    }
};

// Serve product images from a single dedicated directory without fallback
app.use('/uploads/products', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'products'), {
    ...staticOptions,
    fallthrough: false,  // Don't fall through to next middleware
    index: false        // Disable directory indexing for security
}));

// Serve each specialized upload directory type (except products)
Object.entries(UPLOAD_DIRS).forEach(([key, dir]) => {
    if (dir !== 'products') {  // Skip products as it's handled separately above
        const urlPath = `/${UPLOADS_BASE_DIR}/${dir}`;
        const dirPath = path.join(UPLOADS_ABSOLUTE_PATH, dir);
        app.use(urlPath, express.static(dirPath, {
            ...staticOptions,
            fallthrough: false,  // Don't fall through
            index: false        // Disable directory indexing
        }));
        console.log(`📁 Serving ${key} at ${urlPath} from ${dirPath}`);
    }
});

// Logging middleware for static files
app.use('/uploads/products', (req, res, next) => {
  const cleanPath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(UPLOADS_ABSOLUTE_PATH, 'products', path.basename(cleanPath));
  
  console.log('🔍 [STATIC] Checking file:', {
    url: req.path,
    path: cleanPath,
    filepath: filePath,
    exists: fs.existsSync(filePath)
  });
  
  if (fs.existsSync(filePath)) {
    console.log('✅ [STATIC] Serving file:', filePath);
  } else {
    console.log('❌ [STATIC] File not found:', filePath);
  }

  console.log('📁 Static file request:', {
    url: req.path,
    cleanPath,
    filePath,
    isVendorLogo,
    exists: fs.existsSync(filePath)
  });

  // For vendor logos that weren't found, try serving the file directly
  if (isVendorLogo && !res.headersSent && fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  next();
});

// Add property image serving with logging
app.use('/properties', (req, res, next) => {
  // Look in the properties subfolder
  const filePath = path.join(__dirname, 'uploads', 'properties', req.url);
  console.log('🏠 Property image request:', {
    url: req.url,
    filePath: filePath,
    exists: fs.existsSync(filePath)
  });
  
  // Try to serve from uploads/properties directory
  express.static(path.join(__dirname, 'uploads', 'properties'))(req, res, next);
});

// CORS headers for all upload routes
app.use(['/uploads', '/uploads/products', '/uploads/used-products', '/uploads/vendor-logos', '/uploads/homepage-categories'], (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = constants.ALLOWED_ORIGINS;
  if (allowedOrigins && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*'); // Allow any origin for images
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, x-admin-token, x-admin-impersonation');
  res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// CORS Configuration
const constants = require('./config/constants');

const corsOptions = {
  origin: constants.ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'x-admin-token', 'x-admin-impersonation'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400
};

dotenv.config();

// CRITICAL: Import all models at the top for serverless
const User = require('./models/User');
const Property = require('./models/Property');
const UsedProduct = require('./models/UsedProduct');

// Import route modules
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vendorAuthRoutes = require('./routes/vendorAuth');
// CRITICAL: Import ALL missing vendor routes
const vendorProductRoutes = require('./routes/vendorProducts');
const vendorOrderRoutes = require('./routes/vendorOrders');
const vendorCategoryRoutes = require('./routes/vendorCategories');
const vendorAnalyticsRoutes = require('./routes/vendorAnalytics');
const vendorCommissionRoutes = require('./routes/vendorCommissions');
const propertyRoutes = require('./routes/properties');
const usedProductRoutes = require('./routes/usedProducts');
const emailRoutes = require('./routes/emailRoutes');
const emailVerificationRoutes = require('./routes/emailVerificationRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const adminNewsletterRoutes = require('./routes/adminNewsletterRoutes');
const adminManagementRoutes = require('./routes/adminManagementRoutes');
const adminAuthRoutes = require('./routes/adminAuth');
const adminCommissionRoutes = require('./routes/adminCommissionRoutes');
// CRITICAL: Import ALL missing admin routes
const adminCategoryRoutes = require('./routes/adminCategoryRoutes');
const adminOrderRoutes = require('./routes/adminOrders');
const adminProductRoutes = require('./routes/adminProductRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminStatsRoutes = require('./routes/adminStatsRoutes');
const adminPropertiesRoutes = require('./routes/adminProperties');
const adminUsedProductsRoutes = require('./routes/adminUsedProducts');
const adminVendorRoutes = require('./routes/adminVendor');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const seoRoutes = require('./routes/seoRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const statusRoutes = require('./routes/simpleStatusRoutes');
const inventoryRoutes = require('./routes/inventory');
const contactPublicRouter = require('./routes/contact');
const contactAdminRouter = require('./routes/contact').adminRouter;
const wholesaleRoutes = require('./routes/wholesale');
const paymentAccountRoutes = require('./routes/paymentAccountRoutes');

// ...existing code...

// Basic middleware
const allowedOrigins = [
  'https://it-3rd-5tgl.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000'
];

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('⚠️ Blocked request from:', origin);
      return callback(null, true); // Changed to true for development
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization', 
    'Cache-Control',
    'X-Auth-Token',
    'x-admin-token',
    'x-admin-impersonation'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ...existing code...

// CRITICAL FIX: Enhanced connection state management for serverless
let isConnected = false;
let connectingPromise = null;

const connectToDatabase = async () => {
  console.log('🔍 connectToDatabase() called');
  console.log('📊 Current connection state:', mongoose.connection.readyState);
  console.log('🌐 MONGODB_URI available:', !!process.env.MONGODB_URI);
  
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ Already connected, reusing connection');
    return;
  }
  
  // If already connecting, wait for that connection
  if (connectingPromise) {
    console.log('⏳ Connection in progress, waiting...');
    await connectingPromise;
    return;
  }
  
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    const mongoUri = process.env.MONGODB_URI || (isDev ? 'mongodb://localhost:27017/internationaltijarat' : null);
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set in production');
    }

    console.log('🔗 Connecting to MongoDB...');
    console.log('🎯 URI host:', mongoUri.includes('@') ? mongoUri.split('@')[1]?.split('/')[0] : 'localhost');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    
    // Simplified connection options for better reliability
    connectingPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      w: 'majority'
    });
    
    await connectingPromise;
    connectingPromise = null;
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Final connection state:', mongoose.connection.readyState);
    console.log('🗄️ Database name:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
  } catch (error) {
    connectingPromise = null;
    isConnected = false;
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('🔍 Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName
    });
    throw error;
  }
};

// ENHANCED: Middleware to ensure database connection before any database operation
const ensureConnection = async (req, res, next) => {
  const startTime = Date.now();
  let connectionTime;
  
  try {
    console.log('🔍 [ensureConnection] Starting connection check...');
    console.log('📊 Current mongoose readyState:', mongoose.connection.readyState);
    
    // Only attempt connection if not already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 Connection not ready, attempting reconnection...');
      await connectToDatabase();
    }
    
    // Set timeout for connection check
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection check timeout after 10 seconds')), 10000);
    });
    
    // Wait for connection with timeout
    await Promise.race([
      new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) resolve();
        mongoose.connection.once('connected', resolve);
      }),
      timeoutPromise
    ]);
    
    connectionTime = Date.now() - startTime;
    console.log(`✅ [ensureConnection] Database ready in ${connectionTime}ms`);
    console.log('🗄️ Connected to:', mongoose.connection.name);
    return next();
    
  } catch (error) {
    connectionTime = Date.now() - startTime;
    console.error(`❌ [ensureConnection] Failed after ${connectionTime}ms:`, error.message);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        success: false,
        error: 'Database connection failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        duration: `${connectionTime}ms`,
        connectionState: mongoose.connection.readyState
      });
    }
  }
};

// Special Products Routes
// Get all featured products
app.get('/api/special/featured', async (req, res) => {
    try {
        const featuredProducts = await FeaturedProducts.findOne()
            .populate({
                path: 'products',
                populate: [
                    { path: 'category' },
                    { path: 'vendor', select: 'name shopName' }
                ]
            });
        
        if (!featuredProducts) {
            return res.json([]);
        }

        // Filter out any null or undefined products
        const validProducts = featuredProducts.products.filter(product => product && product._id);
        res.json(validProducts);
    } catch (error) {
        console.error('Featured products error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all premium products
app.get('/api/special/premium', async (req, res) => {
    try {
        const premiumProducts = await PremiumProducts.findOne()
            .populate({
                path: 'products',
                populate: [
                    { path: 'category' },
                    { path: 'vendor' }
                ]
            });

        const products = premiumProducts ? premiumProducts.products : [];
        res.json(products);
    } catch (error) {
        console.error('Error fetching premium products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Banner Management Routes
app.get('/api/banner', async (req, res) => {
    try {
        console.log('🎯 Banner GET request received');
        
        const cachedSlides = await cacheService.get('homepage_banner');
        if (cachedSlides) {
            console.log('✅ Serving cached banner data');
            return res.json(cachedSlides);
        }

        const banner = await HomepageBanner.findOne().populate('slides.category');
        console.log('📊 Banner found:', !!banner);
        
        const slides = banner ? banner.slides.sort((a, b) => a.order - b.order) : [];
        console.log('📝 Slides count:', slides.length);
        
        // Cache the slides for 1 hour
        await cacheService.set('homepage_banner', slides, 3600);
        
        console.log('✅ Banner data sent successfully');
        res.json(slides);
    } catch (error) {
        console.error('❌ Error fetching banner:', error);
        res.status(500).json({ message: 'Failed to fetch banner data' });
    }
});

app.put('/api/banner', [authenticateAdmin, uploadMultipleProductImages], async (req, res) => {
    try {
        console.log('🎯 Banner PUT request received');
        console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
        
        const { slides } = req.body;
        
        // Input validation
        if (!slides || !Array.isArray(slides)) {
            console.log('❌ Invalid slides data');
            return res.status(400).json({ message: 'Slides array is required' });
        }

        console.log('📊 Processing', slides.length, 'slides');

        // Validate each slide
        for (const [index, slide] of slides.entries()) {
            console.log(`🔍 Validating slide ${index}:`, slide.title);
            
            if (!slide.title) {
                console.log(`❌ Slide ${index} missing title`);
                return res.status(400).json({ 
                    message: `Slide ${index + 1} must have a title` 
                });
            }

            // Validate category exists if provided
            if (slide.category) {
                const categoryExists = await Category.findById(slide.category);
                if (!categoryExists) {
                    console.log(`❌ Category ${slide.category} not found for slide ${index}`);
                    return res.status(400).json({ message: `Category ${slide.category} not found` });
                }
            }
        }

        // Process uploaded files
        if (req.files) {
            console.log('📁 Processing uploaded files:', Object.keys(req.files));
            for (const slide of slides) {
                if (req.files[slide.image]) {
                    slide.image = req.files[slide.image].filename;
                }
            }
        }

        let banner = await HomepageBanner.findOne();
        if (!banner) {
            console.log('📝 Creating new banner document');
            banner = new HomepageBanner();
        } else {
            console.log('📝 Updating existing banner document');
        }
        
        banner.slides = slides.map((slide, index) => ({
            ...slide,
            order: index
        }));
        
        await banner.save();
        
        // Invalidate cache
        await cacheService.del('homepage_banner');
        
        console.log('✅ Banner updated successfully');
        res.json(banner.slides);
    } catch (error) {
        console.error('❌ Error updating banner:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update featured products (admin only)
app.put('/api/special/featured', authenticateAdmin, async (req, res) => {
    try {
        const { productIds } = req.body;
        let featuredProducts = await FeaturedProducts.findOne();
        
        if (!featuredProducts) {
            featuredProducts = new FeaturedProducts();
        }
        
        featuredProducts.products = productIds;
        featuredProducts.lastUpdated = Date.now();
        await featuredProducts.save();
        
        const updatedProducts = await FeaturedProducts.findOne()
            .populate('products');
        
        res.json(updatedProducts.products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update premium products (admin only)
app.put('/api/special/premium', authenticateAdmin, async (req, res) => {
    try {
        const { productIds } = req.body;
        let premiumProducts = await PremiumProducts.findOne();
        
        if (!premiumProducts) {
            premiumProducts = new PremiumProducts();
        }
        
        premiumProducts.products = productIds;
        premiumProducts.lastUpdated = Date.now();
        await premiumProducts.save();
        
        const updatedProducts = await PremiumProducts.findOne()
            .populate('products');
        
        res.json(updatedProducts.products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get products by category for selection
app.get('/api/special/category/:categoryId', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.categoryId });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Enhanced health check endpoint with database diagnostics
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: 'ENHANCED_CONNECTION_v4.0_20250819',
    environment: process.env.NODE_ENV || 'development',
    // Database diagnostics
    database: {
      readyState: mongoose.connection.readyState,
      readyStateName: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown',
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriHost: process.env.MONGODB_URI ? process.env.MONGODB_URI.split('@')[1]?.split('/')[0] : 'none'
    }
  };
  
  // Test database connection if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const testCollection = mongoose.connection.db.collection('products');
      const count = await testCollection.countDocuments({});
      healthCheck.database.testQuery = `✅ Found ${count} products`;
      healthCheck.database.testStatus = 'success';
    } catch (testError) {
      healthCheck.database.testQuery = `❌ Test failed: ${testError.message}`;
      healthCheck.database.testStatus = 'failed';
    }
  }
  
  res.json(healthCheck);
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Simplified API is working', 
    version: 'SERVERLESS_v3.0',
    timestamp: new Date().toISOString(),
    pathToRegexpStatus: 'COMPLETELY_REMOVED'
  });
});

// CRITICAL: Apply ensureConnection middleware to all database routes
app.use('/api/cart', ensureConnection, cartRoutes);
app.use('/api/orders', ensureConnection, orderRoutes);

// CRITICAL: Mount specific vendor routes BEFORE general vendor routes
app.use('/api/vendors/products', ensureConnection, vendorProductRoutes);
// Vendor commission routes - Keep original structure that was working
app.use('/api/vendors/commissions', ensureConnection, vendorCommissionRoutes);
app.use('/api/vendors/orders', ensureConnection, vendorOrderRoutes);
app.use('/api/vendors/categories', ensureConnection, vendorCategoryRoutes);
app.use('/api/vendors/analytics', ensureConnection, vendorAnalyticsRoutes);
app.use('/api/vendors', ensureConnection, vendorAuthRoutes); // Mount general routes LAST

app.use('/api/properties', ensureConnection, propertyRoutes);
app.use('/api/used-products', ensureConnection, usedProductRoutes);
app.use('/api/email', ensureConnection, emailRoutes);
app.use('/api/email-verification', ensureConnection, emailVerificationRoutes);
app.use('/api/newsletter', ensureConnection, newsletterRoutes);
app.use('/api/admin/management', ensureConnection, adminManagementRoutes);
app.use('/api/admin', ensureConnection, adminAuthRoutes);
// CRITICAL: Add ALL missing admin routes that were causing 404 errors
app.use('/api/admin/categories', ensureConnection, adminCategoryRoutes);
app.use('/api/admin/orders', ensureConnection, adminOrderRoutes);
app.use('/api/admin/products', ensureConnection, adminProductRoutes);
app.use('/api/admin/users', ensureConnection, adminUserRoutes);
app.use('/api/admin/dashboard', ensureConnection, adminStatsRoutes);
app.use('/api/admin/properties', ensureConnection, adminPropertiesRoutes);
app.use('/api/admin/used-products', ensureConnection, adminUsedProductsRoutes);
app.use('/api/admin/vendor-management', ensureConnection, adminVendorRoutes);
// Admin commission routes - Organized to avoid conflicts
// Unified commission routes
app.use('/api/admin/commissions', ensureConnection, adminCommissionRoutes);  // This will handle all commission routes
app.use('/api/admin/newsletter', ensureConnection, adminNewsletterRoutes); // Admin newsletter routes
app.use('/api/admin/contacts', ensureConnection, contactAdminRouter); // Admin contact routes
app.use('/api/contact', ensureConnection, contactPublicRouter); // Public contact routes
app.use('/api/payment-accounts', ensureConnection, paymentAccountRoutes); // Payment account routes
app.use('/api/auth', ensureConnection, authRoutes);
app.use('/api/products', ensureConnection, productRoutes);
app.use('/api/categories', ensureConnection, categoryRoutes);
app.use('/api/seo', ensureConnection, seoRoutes);
app.use('/api/footer-categories', ensureConnection, require('./routes/publicFooterRoutes'));
app.use('/api/homepage/categories', ensureConnection, require('./routes/homepageCategoryRoutes'));
app.use('/api/homepage/static-categories', ensureConnection, require('./routes/homepageStaticCategoryRoutes'));
app.use('/api/homepage/cards', ensureConnection, homepageCardRoutes);
app.use('/api/payments', ensureConnection, paymentRoutes);
app.use('/api/status', ensureConnection, statusRoutes);
app.use('/api/inventory', ensureConnection, inventoryRoutes);
app.use('/api/wholesale', ensureConnection, wholesaleRoutes);
app.use('/api/homepage/banners', ensureConnection, bannerRoutes);

// Placeholder route to match frontend requests
app.get('/api/placeholder/:w/:h', (req, res) => {
  const { w, h } = req.params;
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#999" text-anchor="middle" dy=".3em">
        ${w} x ${h}
      </text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// Error handler with enhanced logging
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  res.status(500).json({ 
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path 
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❓ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Route not found', 
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// CRITICAL: Initialize database connection on module load for serverless
const initializeDatabase = async () => {
  try {
    console.log('🚀 Initializing database connection for serverless...');
    await connectToDatabase();
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    // Don't throw - let individual requests handle connection
  }
};

// Initialize database connection
initializeDatabase();

const PORT = process.env.PORT || 3001;

// Always start the server in development, only conditionally in production
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
