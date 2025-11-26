// Aggressive caching middleware for production performance
const cacheHeaders = (req, res, next) => {
  const path = req.path;
  
  // Static assets - 1 year cache (immutable with hash-based naming)
  if (path.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Vary': 'Accept-Encoding'
    });
  }
  
  // Images - 1 month cache (products don't change often)
  else if (path.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
      'Vary': 'Accept-Encoding',
      'X-Content-Type-Options': 'nosniff'
    });
  }
  
  // API responses - short cache with revalidation
  else if (path.startsWith('/api/')) {
    // Products and categories - 5 minutes cache
    if (path.includes('/products') || path.includes('/categories') || path.includes('/homepage')) {
      res.set({
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding'
      });
    }
    // Auth and user-specific - no cache
    else if (path.includes('/auth') || path.includes('/user') || path.includes('/cart') || path.includes('/orders')) {
      res.set({
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    }
    // Other API - 1 minute cache
    else {
      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        'Vary': 'Accept-Encoding'
      });
    }
  }
  
  // HTML - no cache (SPA shell)
  else if (path.match(/\.html$/) || path === '/') {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  
  // Default - short cache
  else {
    res.set({
      'Cache-Control': 'public, max-age=3600',
      'Vary': 'Accept-Encoding'
    });
  }
  
  next();
};

module.exports = cacheHeaders;
