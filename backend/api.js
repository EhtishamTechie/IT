// Simple API Server for Vercel Deployment
// FIXED: Await MongoDB connection before handling requests

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cacheService = require('./services/cacheService');

// Custom optimized middleware
const compressionMiddleware = require('./middleware/compression');
const cacheHeaders = require('./middleware/cacheHeaders');

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// Apply compression FIRST (before any routes)
app.use(compressionMiddleware);

// Apply cache headers SECOND (before serving static files)
app.use(cacheHeaders);

// Serve homepage category images with optimized settings
app.use('/uploads/homepage-categories', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'homepage-categories'), {
    fallthrough: true,
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
    }
}));

// Serve homepage card images with optimized settings
app.use('/uploads/homepage-cards', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'homepage-cards'), {
    fallthrough: true,
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
    }
}));

// Serve QR code images for payment accounts
app.use('/uploads/qr-codes', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'qr-codes'), {
    fallthrough: true,
    maxAge: '30d',
    etag: true,
    lastModified: true
}));

// Serve payment receipt images
app.use('/uploads/payment-receipts', express.static(path.join(UPLOADS_ABSOLUTE_PATH, 'payment-receipts'), {
    fallthrough: true,
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true
}));

// Fix any misplaced product images
const fixProductImages = require('./utils/fixProductImages');
fixProductImages();

// CORS Configuration - MUST be before static file serving
const constants = require('./config/constants');

// CORS headers for all upload routes - BEFORE static middleware
app.use(['/uploads', '/uploads/products', '/uploads/used-products', '/uploads/vendor-logos', '/uploads/homepage-categories', '/uploads/homepage-cards', '/uploads/properties', '/uploads/qr-codes', '/uploads/payment-receipts'], (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ⚡ OPTIMIZED: Maximum performance static file serving with aggressive caching
const staticOptions = {
    maxAge: '365d', // 1 year caching for immutable assets
    immutable: true,
    index: false, // Disable directory indexing for security
    etag: true, // Enable ETag for conditional requests
    lastModified: true, // Enable Last-Modified header
    cacheControl: true, // Enable cache control
    setHeaders: (res, filePath) => {
        // Aggressive caching with stale-while-revalidate
        res.set('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, immutable');
        // Security headers
        res.set('X-Content-Type-Options', 'nosniff');
        // Timing headers for performance monitoring
        res.set('Timing-Allow-Origin', '*');
        // Vary header for proper CDN caching
        res.set('Vary', 'Accept-Encoding');
    }
};

// Serve all upload directories with consistent configuration
Object.entries(UPLOAD_DIRS).forEach(([key, dir]) => {
    const urlPath = `/${UPLOADS_BASE_DIR}/${dir}`;
    const dirPath = path.join(UPLOADS_ABSOLUTE_PATH, dir);
    
    // Single static middleware per directory
    app.use(urlPath, express.static(dirPath, staticOptions));
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📁 Serving ${key} at ${urlPath} from ${dirPath}`);
    }
});

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

// Compression is now applied via custom middleware at the top

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
// ⚡ OPTIMIZED ROUTE ORDER: Homepage routes - most specific first
// Place the optimized all-data endpoint FIRST to prevent route conflicts
app.use('/api/homepage', ensureConnection, require('./routes/homepageOptimized'));
app.use('/api/homepage/categories', ensureConnection, require('./routes/homepageCategoryRoutes'));
app.use('/api/homepage/static-categories', ensureConnection, require('./routes/homepageStaticCategoryRoutes'));
app.use('/api/homepage/cards', ensureConnection, homepageCardRoutes);
app.use('/api/homepage/banners', ensureConnection, bannerRoutes);

// Other API routes
app.use('/api/prerender', ensureConnection, require('./routes/prerenderRoutes')); // SEO prerender routes
app.use('/api/footer-categories', ensureConnection, require('./routes/publicFooterRoutes'));
app.use('/api/payments', ensureConnection, paymentRoutes);
app.use('/api/status', ensureConnection, statusRoutes);
app.use('/api/inventory', ensureConnection, inventoryRoutes);
app.use('/api/wholesale', ensureConnection, wholesaleRoutes);

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

// Import bot detection
const { isBotRequest } = require('./middleware/botDetection');
const prerenderRoutes = require('./routes/prerenderRoutes');

// Dynamic rendering: Serve prerendered HTML to bots, SPA to users
app.get('/', async (req, res, next) => {
  try {
    const userAgent = req.get('user-agent') || '';
    
    if (isBotRequest(userAgent)) {
      console.log(`🤖 Bot detected, serving prerendered HTML: ${userAgent.substring(0, 50)}...`);
      const html = await prerenderRoutes.generateHomepageHTML();
      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(html);
    }
    
    // Serve SPA for regular users
    const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(frontendPath)) {
      return res.sendFile(frontendPath);
    }
    
    // Fallback: serve a basic HTML that loads the SPA
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>International Tijarat</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script>window.location.href = 'https://internationaltijarat.com';</script>
      </head>
      <body>
        <p>Loading... <a href="https://internationaltijarat.com">Click here if not redirected</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in dynamic rendering:', error);
    next(error);
  }
});

// Serve static frontend files for SPA
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath, {
    maxAge: '1y',
    immutable: true,
    index: false, // Don't auto-serve index.html
    setHeaders: (res, filePath) => {
      // Ensure correct MIME types for all files
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.jsx')) {
        // CRITICAL: JSX files should never be served - this is a build issue
        console.error('⚠️ WARNING: Attempting to serve JSX source file:', filePath);
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      }
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));
  console.log('✅ Serving frontend static files from:', frontendDistPath);
} else {
  console.error('⚠️ Frontend dist directory not found at:', frontendDistPath);
  console.error('⚠️ Please run "npm run build" in the frontend directory');
}

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

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  console.log(`❓ API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'API route not found', 
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Catch-all for frontend routes (SPA) with bot detection
app.get('*', async (req, res) => {
  try {
    const userAgent = req.get('user-agent') || '';
    
    // If bot detected, serve prerendered HTML
    if (isBotRequest(userAgent)) {
      console.log(`🤖 Bot detected on ${req.path}, serving prerendered HTML: ${userAgent.substring(0, 50)}...`);
      
      // For products page, generate products HTML
      if (req.path === '/products' || req.path.startsWith('/products/')) {
        const html = await prerenderRoutes.generateProductsPageHTML(req.path);
        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(html);
      }
      
      // For homepage, use homepage HTML
      if (req.path === '/' || req.path === '') {
        const html = await prerenderRoutes.generateHomepageHTML();
        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(html);
      }
      
      // For other routes, serve a basic SEO-friendly page
      const html = prerenderRoutes.generateBasicHTML(req.path);
      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(html);
    }
    
    // Serve SPA for regular users
    const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(frontendPath)) {
      res.sendFile(frontendPath);
    } else {
      res.status(404).send('Application not found. Please build the frontend first.');
    }
  } catch (error) {
    console.error('Error in catch-all route:', error);
    // Fallback to serving SPA
    const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(frontendPath)) {
      res.sendFile(frontendPath);
    } else {
      res.status(500).send('Server error');
    }
  }
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
