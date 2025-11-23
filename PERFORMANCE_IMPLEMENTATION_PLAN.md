# 🎯 Performance Optimization Implementation Plan
**Based on PageSpeed Insights Analysis - Score: 57/100**

## 📊 Key Issues Identified from Screenshots

### Critical Problems:
1. **LCP Image Not Discoverable** - "Top Quality Wallets" image causing 4,120ms delay
2. **Lazy Loading on Above-Fold Images** - LCP element has `loading="lazy"` ❌
3. **No fetchpriority=high** - Critical LCP image missing priority hint
4. **Massive Image Sizes** - Categories: 1,019KB, 880KB, 864KB (unoptimized)
5. **Zero Cache Policy** - All assets have Cache TTL: None ❌
6. **Render-Blocking CSS** - index-BkLhr9eq.css (120KB) blocking for 3,238ms
7. **Unused JavaScript** - 305KB total (101.4KB in main, 34.2KB in React)
8. **No Preconnect** - "no origins were preconnected" warning

---

## 🚀 Phase 1: CRITICAL FIXES (Do First - Biggest Impact)

### Step 1: Fix LCP Image Discovery & Lazy Loading (Est: 4,000ms improvement)
**Problem:** LCP image "Top Quality Wallets" not discoverable, has lazy loading applied

#### A. Identify LCP Image Source
The image appears to be from homepage cards. Need to:
1. Find which homepage card contains "Top Quality Wallets"
2. Preload this image in HTML head
3. Remove lazy loading from this specific image

**Implementation:**

**File: `frontend/index.html`** - Add after line 39 (after preconnect hints):
```html
<!-- Preload LCP Image - Homepage Card (Top Quality Wallets) -->
<link rel="preload" as="image" href="/uploads/homepage-cards/card-1761469120435-491492735.jpeg" fetchpriority="high">
```

**File: `frontend/src/components/DynamicHomepageCards.jsx`** - Line 119:
```jsx
// BEFORE (current):
<img 
  src={getCardImageUrl(card)}
  alt={card.title}
  loading="lazy"  // ❌ REMOVE THIS
  className="w-full h-32 sm:h-40 object-cover rounded-md mb-3 sm:mb-4"
/>

// AFTER (optimized):
<img 
  src={getCardImageUrl(card)}
  alt={card.title}
  fetchpriority={index === 0 ? "high" : "low"}  // ✅ First card is LCP
  loading={index === 0 ? "eager" : "lazy"}      // ✅ Only lazy load non-LCP
  decoding="async"
  className="w-full h-32 sm:h-40 object-cover rounded-md mb-3 sm:mb-4"
/>
```

**Expected Result:** FCP improves from 5.7s → 2.0s, LCP from 8.0s → 3.0s

---

### Step 2: Fix Category Carousel Images (Save 1,197 KB)
**Problem:** Massive category images (1,019KB, 880KB, 864KB) loading unoptimized

#### A. Remove Lazy Loading from Above-Fold Categories
**File: `frontend/src/components/CategoryCarousel.jsx`** - Line 198:

```jsx
// BEFORE (current):
<img 
  src={getImageUrl('homepageCategories', category.imageUrl)}
  alt={category.name}
  loading="lazy"  // ❌ BAD for visible categories
  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
/>

// AFTER (optimized):
<img 
  src={getImageUrl('homepageCategories', category.imageUrl)}
  alt={category.name}
  loading={currentIndex < 4 ? "eager" : "lazy"}  // ✅ Only eager for visible
  fetchpriority={currentIndex < 2 ? "high" : "auto"}
  decoding="async"
  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
/>
```

#### B. Add Responsive Images with srcset
Create image optimization script:

**File: `backend/scripts/optimize-category-images.js`** (NEW):
```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../uploads/homepage-categories');
const outputDir = path.join(__dirname, '../uploads/homepage-categories-optimized');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function optimizeImage(filename) {
  const inputPath = path.join(inputDir, filename);
  const baseName = path.parse(filename).name;
  
  try {
    // Create WebP versions at different sizes
    await Promise.all([
      // Small (mobile)
      sharp(inputPath)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(path.join(outputDir, `${baseName}-400w.webp`)),
      
      // Medium (tablet)
      sharp(inputPath)
        .resize(800, 800, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(path.join(outputDir, `${baseName}-800w.webp`)),
      
      // Large (desktop)
      sharp(inputPath)
        .resize(1200, 1200, { fit: 'cover' })
        .webp({ quality: 75 })
        .toFile(path.join(outputDir, `${baseName}-1200w.webp`)),
      
      // Fallback JPEG (optimized)
      sharp(inputPath)
        .resize(1200, 1200, { fit: 'cover' })
        .jpeg({ quality: 80, progressive: true })
        .toFile(path.join(outputDir, `${baseName}.jpg`))
    ]);
    
    console.log(`✅ Optimized: ${filename}`);
  } catch (error) {
    console.error(`❌ Error optimizing ${filename}:`, error.message);
  }
}

async function optimizeAllImages() {
  const files = fs.readdirSync(inputDir);
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  
  console.log(`Found ${imageFiles.length} images to optimize...`);
  
  for (const file of imageFiles) {
    await optimizeImage(file);
  }
  
  console.log('\n✅ All images optimized!');
}

optimizeAllImages();
```

**Install sharp:**
```bash
cd backend
npm install sharp
```

**Add to `backend/package.json` scripts:**
```json
"scripts": {
  "optimize-images": "node scripts/optimize-category-images.js"
}
```

#### C. Update Image Component to Use Responsive Images
**File: `frontend/src/components/CategoryCarousel.jsx`** - Update img tag:
```jsx
<picture>
  <source 
    type="image/webp"
    srcSet={`
      ${getImageUrl('homepageCategories', category.imageUrl.replace(/\.(jpg|png)$/i, '-400w.webp'))} 400w,
      ${getImageUrl('homepageCategories', category.imageUrl.replace(/\.(jpg|png)$/i, '-800w.webp'))} 800w,
      ${getImageUrl('homepageCategories', category.imageUrl.replace(/\.(jpg|png)$/i, '-1200w.webp'))} 1200w
    `}
    sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  />
  <img 
    src={getImageUrl('homepageCategories', category.imageUrl)}
    alt={category.name}
    loading={currentIndex < 4 ? "eager" : "lazy"}
    fetchpriority={currentIndex < 2 ? "high" : "auto"}
    decoding="async"
    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
  />
</picture>
```

**Expected Savings:** 1,197 KB → ~400 KB (66% reduction)

---

### Step 3: Implement Cache Headers (Save 820 KB on repeat visits)
**Problem:** All assets showing Cache TTL: None

#### Server Configuration Required

**For Nginx** - Add to server block:
```nginx
# Cache static assets aggressively
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot|otf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
    
    # Enable CORS for fonts
    add_header Access-Control-Allow-Origin "*";
}

# Don't cache HTML
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
}

# Cache API responses briefly
location /api/ {
    expires 1m;
    add_header Cache-Control "public, max-age=60";
}

# Enable Gzip
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

# Enable Brotli (if available)
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

**For Apache** - Create/update `.htaccess`:
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  
  # Images
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  
  # CSS and JavaScript
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  
  # Fonts
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType application/font-woff "access plus 1 year"
  ExpiresByType font/ttf "access plus 1 year"
  ExpiresByType font/otf "access plus 1 year"
  
  # HTML - no cache
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
  AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>
```

**Expected Result:** Second visit loads in <1s instead of 5.7s

---

### Step 4: Eliminate Render-Blocking CSS (Save 600ms)
**Problem:** index-BkLhr9eq.css (120KB) blocking for 3,238ms

#### A. Extract Critical CSS
**Install critical CSS tool:**
```bash
cd frontend
npm install -D critical
```

**Create extraction script** - `frontend/scripts/extract-critical-css.js`:
```javascript
const critical = require('critical');
const fs = require('fs');
const path = require('path');

async function extractCriticalCSS() {
  try {
    const { css } = await critical.generate({
      base: 'dist/',
      src: 'index.html',
      target: {
        css: 'critical.css',
      },
      width: 1300,
      height: 900,
      inline: false,
      extract: false,
    });
    
    // Save critical CSS
    fs.writeFileSync(path.join(__dirname, '../critical.css'), css);
    console.log('✅ Critical CSS extracted!');
    console.log(`Size: ${(css.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error extracting critical CSS:', error);
  }
}

extractCriticalCSS();
```

**Add to package.json:**
```json
"scripts": {
  "build": "vite build",
  "extract-critical": "node scripts/extract-critical-css.js"
}
```

#### B. Inline Critical CSS in HTML
**File: `frontend/index.html`** - Add in `<head>` after line 39:
```html
<!-- Critical CSS - Inline for immediate render -->
<style>
  /* Will be filled by build process - essential above-fold styles only */
  body{margin:0;font-family:system-ui,-apple-system,sans-serif}
  .hero{min-height:400px}
  header{position:sticky;top:0;z-index:50}
  /* Add extracted critical CSS here after running extract-critical script */
</style>

<!-- Load full CSS async -->
<link rel="preload" href="/assets/index.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/assets/index.css"></noscript>
```

**Expected Result:** FCP improves by 600-800ms

---

### Step 5: Defer Non-Critical JavaScript
**Problem:** GTM and Meta Pixel blocking initial render

**File: `frontend/index.html`** - Move analytics to end of body (before closing `</body>`):

```html
<!-- MOVE THESE FROM HEAD TO END OF BODY -->
<script>
  // Load GTM after page interactive
  window.addEventListener('load', function() {
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-K55PGMBD');
  });
</script>

<script>
  // Load Meta Pixel after page interactive
  window.addEventListener('load', function() {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', '1122233005539042');
    fbq('track', 'PageView');
  });
</script>
```

**Expected Result:** Initial load 200-300ms faster

---

## 🎯 Phase 2: IMPORTANT OPTIMIZATIONS (Do Second)

### Step 6: Reduce Unused JavaScript (Save 305 KB)
**Problem:** 101.4KB unused in main bundle, 34.2KB in React vendor

#### A. Improve Tree Shaking
**File: `frontend/vite.config.js`** - Update build config:
```javascript
build: {
  rollupOptions: {
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    },
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'scheduler', 'react-is', 'prop-types'],
        'router': ['react-router-dom'],
        'query': ['@tanstack/react-query'],
        'ui-icons': ['lucide-react'],  // Separate icons
        'utils': ['axios', 'lodash', 'jwt-decode', 'clsx']
      }
    }
  },
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,      // Remove console.logs
      drop_debugger: true,     // Remove debugger statements
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
    format: {
      comments: false,
    }
  }
}
```

#### B. Lazy Load Lucide Icons
Instead of importing all icons, import only what you need:

```jsx
// BAD (current):
import { ChevronLeft, ChevronRight, X, Menu, ShoppingCart } from 'lucide-react';

// GOOD (tree-shakeable):
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
```

**Expected Savings:** 135 KB → 90 KB (45KB saved)

---

### Step 7: Add Preconnect for Critical Origins
**Problem:** "no origins were preconnected" warning

**File: `frontend/index.html`** - Update preconnect section (line 35):
```html
<!-- Preconnect to critical third-party origins -->
<link rel="preconnect" href="https://www.googletagmanager.com">
<link rel="preconnect" href="https://connect.facebook.net">
<link rel="preconnect" href="https://www.facebook.com">
<link rel="dns-prefetch" href="https://www.google-analytics.com">

<!-- Preconnect to own API -->
<link rel="preconnect" href="https://internationaltijarat.com">
```

---

### Step 8: Optimize Product Card Images
**File: `frontend/src/components/EnhancedProductCard.jsx`** - Line 234:

```jsx
// Add conditional lazy loading
<img 
  src={imageUrl}
  alt={product.name}
  loading={index < 4 ? "eager" : "lazy"}  // First 4 products load immediately
  fetchpriority={index < 2 ? "high" : "auto"}
  decoding="async"
  className="w-full h-full object-cover"
/>
```

---

## 🎯 Phase 3: POLISH & MONITORING (Do Last)

### Step 9: Add Performance Monitoring
**File: `frontend/src/utils/performance.js`** (NEW):
```javascript
// Track Web Vitals
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Track LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: 'LCP',
        value: Math.round(lastEntry.renderTime || lastEntry.loadTime),
        non_interaction: true,
      });
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // Track FCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      console.log('FCP:', entry.startTime);
      
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'FCP',
          value: Math.round(entry.startTime),
          non_interaction: true,
        });
      }
    });
  }).observe({ entryTypes: ['paint'] });

  // Track CLS
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    console.log('CLS:', clsValue);
  }).observe({ entryTypes: ['layout-shift'] });
}
```

**Import in `main.jsx`:**
```javascript
import { trackWebVitals } from './utils/performance';

// After ReactDOM.render
if (import.meta.env.PROD) {
  trackWebVitals();
}
```

---

## 📋 Implementation Checklist

### Week 1 - Critical (Priority 1):
- [ ] **Step 1A**: Identify and preload LCP image (Top Quality Wallets)
- [ ] **Step 1B**: Remove lazy loading from first homepage card
- [ ] **Step 1C**: Add fetchpriority=high to LCP image
- [ ] **Step 2A**: Remove lazy loading from visible categories (first 4)
- [ ] **Step 2B**: Install sharp and create image optimization script
- [ ] **Step 2C**: Run optimization script on all category images
- [ ] **Step 2D**: Update CategoryCarousel to use responsive images
- [ ] **Step 3**: Configure server cache headers (Nginx/Apache)
- [ ] **Step 4A**: Extract critical CSS
- [ ] **Step 4B**: Inline critical CSS in HTML
- [ ] **Step 5**: Move GTM and Meta Pixel to load after page interactive
- [ ] **Deploy and Test**: Verify PageSpeed score improves to 75+

### Week 2 - Important (Priority 2):
- [ ] **Step 6A**: Update Vite config for better tree shaking
- [ ] **Step 6B**: Fix icon imports to be tree-shakeable
- [ ] **Step 7**: Add proper preconnect hints
- [ ] **Step 8**: Optimize product card image loading
- [ ] **Deploy and Test**: Verify PageSpeed score improves to 85+

### Week 3 - Polish (Priority 3):
- [ ] **Step 9**: Add Web Vitals monitoring
- [ ] **Optimize homepage cards images** (same as categories)
- [ ] **Add service worker** for offline caching
- [ ] **Deploy and Test**: Target PageSpeed score 90+

---

## 🎯 Expected Results After All Fixes

| Metric | Current | After Phase 1 | After Phase 2 | After Phase 3 | Target |
|--------|---------|---------------|---------------|---------------|--------|
| **Performance Score** | 57 | 75 | 85 | 90+ | 90+ |
| **FCP** | 5.7s | 2.0s | 1.5s | 1.2s | <1.8s ✅ |
| **LCP** | 8.0s | 3.0s | 2.3s | 2.0s | <2.5s ✅ |
| **TBT** | 70ms | 60ms | 50ms | 40ms | <200ms ✅ |
| **CLS** | 0.012 | 0.012 | 0.010 | 0.008 | <0.1 ✅ |
| **Speed Index** | 9.5s | 3.5s | 2.8s | 2.5s | <3.4s ✅ |
| **Network Payload** | 4,653 KB | 2,800 KB | 2,200 KB | 1,800 KB | <2,000 KB ✅ |

---

## 🔍 Testing Commands

After each phase, run:

```bash
# Build optimized version
cd frontend
npm run build

# Check bundle sizes
npm run build -- --mode production --analyze

# Test locally
npm run preview

# Run Lighthouse
npx lighthouse https://internationaltijarat.com --view --preset=desktop
npx lighthouse https://internationaltijarat.com --view --preset=mobile

# Check specific metrics
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://internationaltijarat.com&strategy=mobile" | jq '.lighthouseResult.audits | {fcp: .["first-contentful-paint"].displayValue, lcp: .["largest-contentful-paint"].displayValue, tbt: .["total-blocking-time"].displayValue}'
```

---

## 🚨 Critical Paths to Optimize

Based on network dependency tree from screenshot:

1. **Critical Path 1** (3,238ms):
   - HTML (1,109ms) → index-CHAXmyM1.js (2,890ms) → index-BkLhr9eq.css (3,238ms)
   - **Fix**: Inline critical CSS, defer non-critical

2. **Critical Path 2** (4,120ms):
   - HTML → Resource load delay (4,120ms) → LCP image
   - **Fix**: Preload LCP image, remove lazy loading

3. **Critical Path 3** (Blocking):
   - GTM + Meta Pixel scripts in head
   - **Fix**: Defer until after page interactive

---

## 💡 Quick Wins (Can Do Today)

1. **Remove lazy loading from LCP image** (10 mins) - Step 1B
2. **Add fetchpriority=high to LCP** (5 mins) - Step 1C
3. **Move analytics to end of body** (10 mins) - Step 5
4. **Add preconnect hints** (5 mins) - Step 7
5. **Remove console.logs in production** (already in config)

**Total time: 30 minutes**
**Expected improvement: 55 → 65 score (10 points)**

---

**Last Updated:** November 23, 2025
**Analysis Source:** PageSpeed Insights Mobile Screenshots
**Target Completion:** 3 weeks (Priority 1: 1 week, Priority 2: 1 week, Priority 3: 1 week)
