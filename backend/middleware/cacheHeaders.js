// Aggressive caching middleware for production performance + Cloudflare CDN optimization
const cacheHeaders = (req, res, next) => {
  const path = req.path;
  
  // Static assets - 1 year cache (immutable with hash-based naming)
  if (path.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000, immutable', // Cloudflare-specific
      'Vary': 'Accept-Encoding'
    });
  }
  
  // Images - 1 year cache (Phase 4.1: Extended for AVIF/WebP optimized images)
  else if (path.match(/\.(jpg|jpeg|png|webp|avif|gif|svg|ico)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000, immutable', // Cloudflare edge cache for 1 year
      'Vary': 'Accept-Encoding',
      'X-Content-Type-Options': 'nosniff'
    });
  }
  
  // API responses - short cache with revalidation
  else if (path.startsWith('/api/')) {
    // Admin operations and mutations - NO CACHE (POST, PUT, DELETE, PATCH)
    if (req.method !== 'GET' || path.includes('/admin')) {
      res.set({
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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
    // Homepage all-data: browser 30s, Cloudflare 5 min.
    // Cloudflare cache is explicitly purged via API whenever admin saves any homepage
    // section (banners, featured products, premium products, static categories).
    // This gives CDN speed WITHOUT stale data showing to users after admin edits.
    else if (path.includes('/homepage/all-data')) {
      res.set({
        'Cache-Control': 'public, max-age=30, must-revalidate',  // Browser: 30s
        'CDN-Cache-Control': 'public, max-age=300',               // Cloudflare: 5 min (purged on admin save)
        'Vary': 'Accept-Encoding'
      });
    }
    // Products and categories - SHORT cache for admin changes to reflect quickly
    else if (path.includes('/products') || path.includes('/categories') || path.includes('/homepage')) {
      res.set({
        'Cache-Control': 'public, max-age=30, must-revalidate',  // Browser: 30s
        'CDN-Cache-Control': 'public, max-age=120', // Cloudflare edge: 2 minutes (shorter than all-data)
        'Vary': 'Accept-Encoding'
      });
    }
    // Other API - 1 minute cache
    else {
      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        'CDN-Cache-Control': 'public, max-age=120', // Cloudflare edge: 2 minutes
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
