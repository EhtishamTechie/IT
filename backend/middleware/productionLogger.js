// Production-Ready Request Logger with Minimal Overhead
const productionLogger = (req, res, next) => {
  // Only log in development or if specifically enabled
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_REQUEST_LOGGING === 'true') {
    const start = Date.now();
    
    // Log only essential information
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    
    // Log response time on completion
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusColor = res.statusCode >= 400 ? '❌' : '✅';
      console.log(`${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
  }
  
  next();
};

// Critical Error Logger (Always Active)
const errorLogger = (err, req, res, next) => {
  // Log critical errors even in production
  console.error(`CRITICAL ERROR: ${new Date().toISOString()}`);
  console.error(`Route: ${req.method} ${req.originalUrl}`);
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  
  // Log user info for debugging (but sanitize sensitive data)
  if (req.user) {
    console.error(`User ID: ${req.user.id || req.user.userId}`);
  }
  
  next(err);
};

// Security Incident Logger
const securityLogger = (req, res, next) => {
  // Log potential security incidents
  const suspiciousPatterns = [
    /SELECT.*FROM/i,
    /<script/i,
    /javascript:/i,
    /eval\(/i,
    /\.\.\/\.\./,
    /etc\/passwd/,
    /proc\/self/,
  ];
  
  const requestContent = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    url: req.originalUrl
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestContent));
  
  if (isSuspicious) {
    console.error(`🚨 SECURITY ALERT: ${new Date().toISOString()}`);
    console.error(`IP: ${req.ip}`);
    console.error(`Route: ${req.method} ${req.originalUrl}`);
    console.error(`User-Agent: ${req.get('User-Agent')}`);
    console.error(`Suspicious Content: ${requestContent}`);
  }
  
  next();
};

// Performance Monitor for Slow Queries
const performanceLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 5 seconds)
    if (duration > 5000) {
      console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.originalUrl} took ${duration}ms`);
      console.warn(`IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
    }
  });
  
  next();
};

module.exports = {
  productionLogger,
  errorLogger,
  securityLogger,
  performanceLogger
};
