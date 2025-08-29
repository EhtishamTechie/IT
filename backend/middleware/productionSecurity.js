const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');

// Production Security Configuration
const setupProductionSecurity = (app) => {
  
  // 1. Helmet for Security Headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": ["'self'", "data:", "https:", "http:"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  // 2. Compression for Better Performance
  app.use(compression({
    level: 6, // Compression level (1-9)
    threshold: 1024, // Only compress files > 1KB
  }));

  // 3. General API Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    }
  });

  // 4. Strict Auth Rate Limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit login attempts
    message: {
      error: 'Too many login attempts, please try again later.',
      retryAfter: 900
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 5. Order Creation Rate Limiting (Prevent Order Spam)
  const orderLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Max 10 orders per 5 minutes per IP
    message: {
      error: 'Too many orders placed, please wait before placing another order.',
      retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 6. Email/OTP Rate Limiting (Prevent Email Spam)
  const emailLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Max 5 emails per 10 minutes per IP
    message: {
      error: 'Too many email requests, please wait before requesting another.',
      retryAfter: 600
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 7. Admin Actions Rate Limiting
  const adminLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // Higher limit for admin operations
    message: {
      error: 'Too many admin requests, please slow down.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 8. Slow Down Middleware (Gradual Response Delay) - Updated for v2 API
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 500, // Allow 500 requests per windowMs without delay
    delayMs: () => 100, // Updated for v2: function that returns delay
    maxDelayMs: 5000, // Max delay of 5 seconds
    validate: { delayMs: false } // Disable the warning message
  });

  // Apply Middleware
  app.use(generalLimiter);
  app.use(speedLimiter);

  // Specific Route Rate Limiting
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/vendors/login', authLimiter);
  app.use('/api/vendors/register', authLimiter);
  app.use('/api/admin/login', authLimiter);
  
  app.use('/api/orders/create', orderLimiter);
  app.use('/api/orders', orderLimiter);
  
  app.use('/api/email-verification', emailLimiter);
  
  app.use('/api/admin', adminLimiter);

  console.log('🔐 Production security middleware configured');
};

// Production Error Handler
const productionErrorHandler = (err, req, res, next) => {
  console.error(`Error ${err.status || 500}: ${err.message}`);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      success: false,
      message: err.status === 404 ? 'Resource not found' : 'Internal server error',
      error: err.status || 500
    });
  } else {
    res.status(err.status || 500).json({
      success: false,
      message: err.message,
      error: err.status || 500,
      stack: err.stack
    });
  }
};

// Request Timeout Middleware
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    res.setTimeout(timeout, () => {
      const error = new Error('Request timeout');
      error.status = 408;
      next(error);
    });
    next();
  };
};

module.exports = {
  setupProductionSecurity,
  productionErrorHandler,
  requestTimeout
};
