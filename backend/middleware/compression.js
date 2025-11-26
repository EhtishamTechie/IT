const compression = require('compression');

// Aggressive compression for all text-based responses
const compressionMiddleware = compression({
  // Compression level: 6 is good balance (1-9, higher = more compression but slower)
  level: 6,
  // Compression threshold: compress responses larger than 1KB
  threshold: 1024,
  // Filter function to determine what to compress
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Compress all text-based content types
    const contentType = res.getHeader('Content-Type');
    if (!contentType) return false;
    
    return (
      contentType.includes('text/') ||
      contentType.includes('application/json') ||
      contentType.includes('application/javascript') ||
      contentType.includes('application/xml') ||
      contentType.includes('application/x-javascript') ||
      contentType.includes('+json') ||
      contentType.includes('+xml')
    );
  },
  // Use best compression for static assets
  memLevel: 8
});

module.exports = compressionMiddleware;
