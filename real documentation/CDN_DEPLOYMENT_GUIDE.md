# CDN Deployment Guide

## Overview
This guide covers the setup and configuration for deploying static assets to a Content Delivery Network (CDN) for optimal performance.

## Cache Headers Already Configured

### Static Asset Serving (backend/api.js)

All static assets are now configured with aggressive caching headers:

```javascript
// Static options with CDN-optimized cache headers
const staticOptions = {
    fallthrough: true,
    maxAge: '1y', // 1 year caching for immutable assets
    immutable: true,
    setHeaders: (res, filePath) => {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Timing-Allow-Origin', '*'); // For performance monitoring
    }
};
```

### Cache Durations by Asset Type

| Asset Type | Cache Duration | Immutable | Purpose |
|------------|---------------|-----------|---------|
| Product Images | 1 year | Yes | Product images rarely change |
| Homepage Images | 1 year | Yes | Homepage banners/cards change rarely |
| Vendor Logos | 1 year | Yes | Vendor logos are stable |
| Property Images | 1 year | Yes | Property listings are static |
| QR Codes | 30 days | No | May need updates occasionally |
| Payment Receipts | 1 year | Yes | Historical records never change |

## API Response Caching

### Currently Cached Endpoints

All API responses have server-side caching implemented:

#### Category Routes (1 hour cache)
- `GET /api/categories` - All categories
- `GET /api/categories/id/:id` - Category by ID
- `GET /api/categories/:identifier` - SEO-friendly category
- `GET /api/categories/:categoryId/products` - Category products (10 min)
- `GET /api/categories/parent/:parentId` - Parent hierarchy
- `GET /api/categories/:categoryId/subcategories` - Subcategories

#### Homepage Routes (1 hour cache)
- `GET /api/homepage/categories` - Homepage categories
- `GET /api/homepage/cards` - Homepage cards
- `GET /api/banner` - Banner slides

#### Product Routes (10-30 min cache)
- Various product listing endpoints
- Product detail pages
- Search and filter results

### Cache Invalidation

Automatic cache invalidation on data updates:

```javascript
// Pattern-based cache clearing
cacheService.clearPattern('cache:*/categories*'); // Clear all category caches
cacheService.clearPattern('cache:*/homepage*');   // Clear homepage caches
cacheService.clearPattern('cache:*/banner*');     // Clear banner caches
```

## CDN Configuration Recommendations

### 1. Cloudflare Setup

**Step 1: Add your domain to Cloudflare**
1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers at your domain registrar

**Step 2: Configure Cache Rules**

Create Page Rules for static assets:
- URL Pattern: `*yourdomain.com/uploads/*`
- Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year

**Step 3: Enable Performance Features**
- ✅ Auto Minify: JavaScript, CSS, HTML
- ✅ Brotli Compression
- ✅ Rocket Loader (test carefully)
- ✅ HTTP/2
- ✅ HTTP/3 (QUIC)

**Step 4: Configure Transform Rules**
Add response headers:
```
Header: Cache-Control
Value: public, max-age=31536000, immutable
Applies to: /uploads/*
```

### 2. AWS CloudFront Setup

**Step 1: Create S3 Bucket for Assets**
```bash
aws s3 mb s3://your-cdn-assets
aws s3 sync ./backend/uploads s3://your-cdn-assets/uploads --acl public-read
```

**Step 2: Create CloudFront Distribution**
1. Origin Domain: your-cdn-assets.s3.amazonaws.com
2. Origin Path: /uploads
3. Viewer Protocol Policy: Redirect HTTP to HTTPS
4. Compress Objects Automatically: Yes
5. Default TTL: 31536000 (1 year)
6. Maximum TTL: 31536000
7. Minimum TTL: 0

**Step 3: Configure Cache Behaviors**
```json
{
  "PathPattern": "/uploads/*",
  "TargetOriginId": "S3-your-cdn-assets",
  "ViewerProtocolPolicy": "redirect-to-https",
  "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
  "CachedMethods": ["GET", "HEAD"],
  "Compress": true,
  "MinTTL": 31536000,
  "DefaultTTL": 31536000,
  "MaxTTL": 31536000
}
```

**Step 4: Update Backend URLs**
```javascript
// backend/config/fileConfig.js
const CDN_URL = process.env.CDN_URL || '';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

module.exports = {
  getImageUrl: (path) => {
    if (!path) return null;
    // Use CDN for production
    if (process.env.NODE_ENV === 'production' && CDN_URL) {
      return `${CDN_URL}${path}`;
    }
    return `${BASE_URL}${path}`;
  }
};
```

### 3. Netlify/Vercel Edge CDN

Both Netlify and Vercel provide automatic CDN edge caching:

**Netlify Configuration** (netlify.toml):
```toml
[[headers]]
  for = "/uploads/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Access-Control-Allow-Origin = "*"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**Vercel Configuration** (vercel.json):
```json
{
  "headers": [
    {
      "source": "/uploads/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    },
    {
      "source": "/(.*).js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Image Optimization

### 1. WebP Conversion (Recommended)

Install Sharp for image optimization:
```bash
cd backend
npm install sharp
```

Create image optimization middleware:
```javascript
// backend/middleware/imageOptimization.js
const sharp = require('sharp');
const path = require('path');

const optimizeImage = async (filePath) => {
  const ext = path.extname(filePath);
  const basePath = filePath.replace(ext, '');
  
  // Create WebP version
  await sharp(filePath)
    .webp({ quality: 80 })
    .toFile(`${basePath}.webp`);
  
  // Optimize original
  if (ext === '.jpg' || ext === '.jpeg') {
    await sharp(filePath)
      .jpeg({ quality: 85, progressive: true })
      .toFile(`${basePath}-optimized${ext}`);
  } else if (ext === '.png') {
    await sharp(filePath)
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(`${basePath}-optimized${ext}`);
  }
};

module.exports = { optimizeImage };
```

### 2. Lazy Loading Images (Already Implemented)

Frontend images should use native lazy loading:
```jsx
<img 
  src={imageUrl} 
  alt="Product" 
  loading="lazy"
  decoding="async"
/>
```

### 3. Responsive Images

Use srcset for responsive images:
```jsx
<img
  src={imageUrl}
  srcSet={`
    ${imageUrl}?w=400 400w,
    ${imageUrl}?w=800 800w,
    ${imageUrl}?w=1200 1200w
  `}
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Product"
  loading="lazy"
/>
```

## Performance Monitoring

### 1. Enable Performance APIs

Headers already configured for performance monitoring:
- `Timing-Allow-Origin: *` - Allows performance API access

### 2. Monitor CDN Cache Hit Ratio

Key metrics to track:
- Cache Hit Ratio (target: >90%)
- Average Response Time (target: <200ms)
- Bandwidth Savings (target: 60-80% reduction)

### 3. Test CDN Performance

Use these tools:
- WebPageTest.org - Global performance testing
- GTmetrix - Performance analysis
- Chrome DevTools → Network → Check cache headers

## Environment Variables

Add to your `.env` file:

```env
# CDN Configuration
CDN_URL=https://cdn.yourdomain.com
CDN_ENABLED=true

# Cache Configuration
REDIS_URL=your-redis-url-here
ENABLE_API_CACHE=true
CACHE_DEFAULT_TTL=1800
```

## Migration Checklist

- [ ] Configure CDN provider (Cloudflare/CloudFront/etc.)
- [ ] Upload existing assets to CDN/S3
- [ ] Update environment variables with CDN URL
- [ ] Test asset loading from CDN
- [ ] Verify cache headers in browser DevTools
- [ ] Enable Redis for API caching (optional but recommended)
- [ ] Set up automatic asset sync pipeline
- [ ] Configure CDN cache purge on asset updates
- [ ] Monitor CDN analytics and cache hit ratio
- [ ] Implement image optimization (WebP conversion)
- [ ] Test performance improvements with WebPageTest

## Expected Performance Gains

With proper CDN configuration, expect:

| Metric | Before CDN | After CDN | Improvement |
|--------|-----------|-----------|-------------|
| Initial Load Time | 3-5s | 0.8-1.5s | 60-75% faster |
| Asset Load Time | 500-800ms | 50-150ms | 70-90% faster |
| Bandwidth Usage | 100% | 20-40% | 60-80% reduction |
| Server Load | High | Low | 80%+ reduction |
| Global Latency | High | Low | Edge caching |

## Cache Invalidation Strategy

### On Content Updates

**Product Images:**
```javascript
// When product image changes
await cacheService.clearPattern(`cache:*/products/${productId}*`);
```

**Homepage Content:**
```javascript
// When homepage changes
await cacheService.clearPattern('cache:*/homepage*');
```

**Category Changes:**
```javascript
// When categories change
await cacheService.clearPattern('cache:*/categories*');
```

### CDN Cache Purge

For external CDN (Cloudflare/CloudFront), implement webhook:

```javascript
// backend/utils/cdnPurge.js
const axios = require('axios');

const purgeCDNCache = async (paths) => {
  if (process.env.CDN_PROVIDER === 'cloudflare') {
    await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      { files: paths },
      {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  // Add other CDN providers as needed
};

module.exports = { purgeCDNCache };
```

## Troubleshooting

### Images Not Loading from CDN

1. Check CORS headers: `Access-Control-Allow-Origin: *`
2. Verify CDN SSL certificate is valid
3. Check CloudFront/CDN distribution status
4. Test direct CDN URL in browser

### Stale Content Being Served

1. Verify cache invalidation is triggered
2. Check CDN cache purge API response
3. Use cache-busting query strings for critical updates: `image.jpg?v=timestamp`
4. Reduce cache TTL for frequently changing content

### Slow Performance Despite CDN

1. Check cache hit ratio in CDN analytics
2. Verify assets are being served from edge locations
3. Enable Brotli/Gzip compression
4. Optimize image sizes and formats
5. Implement HTTP/2 and HTTP/3

## Security Considerations

1. **Prevent Hotlinking**: Add referrer checks in CDN rules
2. **Signed URLs**: For private content, use CloudFront signed URLs
3. **Rate Limiting**: Configure CDN rate limiting to prevent abuse
4. **DDoS Protection**: Enable CDN DDoS protection features

---

**Last Updated**: January 2025  
**Status**: Production Ready ✅  
**Cache Headers**: Configured ✅  
**API Caching**: Implemented ✅  
**CDN Migration**: Pending Deployment
