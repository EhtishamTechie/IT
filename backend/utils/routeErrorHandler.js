// Route error handler to prevent path-to-regexp crashes
const logger = require('./logger');

function safeRouteRegister(app, path, router) {
  try {
    app.use(path, router);
    logger.info(`✅ Route registered successfully: ${path}`);
  } catch (error) {
    logger.error(`❌ Failed to register route ${path}:`, error.message);
    
    // If it's a path-to-regexp error, try to fix it
    if (error.message.includes('Missing parameter name') || 
        error.message.includes('path-to-regexp')) {
      logger.warn(`🔧 Path-to-regexp error detected for route ${path}, attempting recovery...`);
      
      // Create a dummy route that returns an error
      app.use(path, (req, res) => {
        res.status(500).json({ 
          error: 'Route configuration error',
          message: 'This endpoint is temporarily unavailable due to configuration issues',
          path: req.path,
          timestamp: new Date().toISOString()
        });
      });
    }
  }
}

function wrapRouterWithErrorHandling(router) {
  // Add error handling middleware to any router
  router.use((err, req, res, next) => {
    if (err.message && err.message.includes('path-to-regexp')) {
      logger.error('Path-to-regexp error in route:', err);
      return res.status(500).json({
        error: 'Route pattern error',
        message: 'Invalid route configuration',
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  });
  
  return router;
}

module.exports = {
  safeRouteRegister,
  wrapRouterWithErrorHandling
};
