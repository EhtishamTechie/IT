# 🚀 Critical Performance Optimizations - PageSpeed Score: 57/100

## Current Performance Issues (Nov 23, 2025)

### 📊 Metrics:
- **Performance Score:** 57/100 ❌
- **FCP:** 5.7s (Target: < 1.8s) ❌
- **LCP:** 8.0s (Target: < 2.5s) ❌
- **TBT:** 70ms (Good) ✅
- **CLS:** 0.012 (Excellent) ✅
- **Speed Index:** 9.5s (Target: < 3.4s) ❌

---

## 🎯 Priority 1: Critical Fixes (Immediate)

### 1. **Optimize Images** (Save 1,197 KB)

**Current Issue:** Images are not optimized, too large, and not using modern formats

**Solutions:**

#### A. Convert to WebP/AVIF format
```bash
# Install image optimization tool
npm install -D @squoosh/cli

# Create optimization script
```

Add to `package.json`:
```json
"scripts": {
  "optimize-images": "node scripts/optimize-images.js"
}
```

Create `backend/scripts/optimize-images.js`:
```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../public/products');
const outputDir = path.join(__dirname, '../public/products-optimized');

// Convert images to WebP
async function optimizeImages() {
  const files = fs.readdirSync(imagesDir);
  
  for (const file of files) {
    if (file.match(/\.(jpg|jpeg|png)$/i)) {
      await sharp(path.join(imagesDir, file))
        .webp({ quality: 80 })
        .toFile(path.join(outputDir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp')));
      
      console.log(`Optimized: ${file}`);
    }
  }
}

optimizeImages();
```

#### B. Implement lazy loading for images

Update image components to add `loading="lazy"`:
```jsx
<img 
  src={imageUrl} 
  alt={alt}
  loading="lazy"  // Add this
  decoding="async" // Add this
/>
```

#### C. Add responsive images with srcset
```jsx
<img
  src={imageLarge}
  srcSet={`
    ${imageSmall} 400w,
    ${imageMedium} 800w,
    ${imageLarge} 1200w
  `}
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="lazy"
  alt={alt}
/>
```

### 2. **Eliminate Render-Blocking Resources** (Save 600ms)

**Current Issue:** CSS and JS files blocking initial paint

**Solutions:**

#### A. Inline critical CSS
```html
<head>
  <style>
    /* Inline critical above-the-fold CSS here */
    body { margin: 0; font-family: system-ui; }
    .hero { min-height: 400px; }
  </style>
  
  <!-- Load full CSS async -->
  <link rel="preload" href="/assets/index.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/index.css"></noscript>
</head>
```

#### B. Defer non-critical JavaScript
Update `index.html`:
```html
<script type="module" src="/src/main.jsx" defer></script>
```

#### C. Move Google Tag Manager and Facebook Pixel to load after page interactive
```html
<script>
  // Load analytics after page is interactive
  window.addEventListener('load', function() {
    // GTM code here
  });
</script>
```

### 3. **Efficient Cache Policy** (Save 820 KB)

**Current Issue:** Static assets not cached efficiently

**Server Configuration Needed:**

#### For Nginx:
```nginx
# Add to your nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# HTML - no cache
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

#### For Apache (.htaccess):
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  
  # Images
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  
  # CSS and JavaScript
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  
  # Fonts
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
```

### 4. **Reduce Unused JavaScript** (Save 305 KB)

**Current Issue:** Large JavaScript bundles with unused code

**Already Done:** ✅ Bundle splitting implemented
**Additional:** Tree-shake unused code

Update `vite.config.js`:
```javascript
build: {
  rollupOptions: {
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    }
  }
}
```

---

## 🎯 Priority 2: Important Improvements

### 5. **Reduce Network Payload** (4,653 KB total)

**Solutions:**
- Enable Gzip/Brotli compression on server
- Remove unused dependencies
- Use dynamic imports for heavy libraries

#### Enable Brotli compression (Nginx):
```nginx
brotli on;
brotli_types text/plain text/css application/json application/javascript text/xml application/xml;
brotli_comp_level 6;
```

### 6. **Avoid Long Main Thread Tasks** (5 tasks found)

**Solutions:**
- Break up long-running JavaScript
- Use `setTimeout` to yield to browser
- Implement code splitting more aggressively

### 7. **Legacy JavaScript** (Save 34 KB)

**Update build target** in `vite.config.js`:
```javascript
build: {
  target: 'es2020', // More modern target
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true
    }
  }
}
```

---

## 🎯 Priority 3: Accessibility Issues (Score: 78/100)

### Issues Found:
1. **Buttons without accessible names**
2. **Links without discernible names**
3. **Insufficient color contrast**
4. **Touch targets too small**
5. **Missing main landmark**
6. **Heading elements not in order**

**Quick Fixes:**

```jsx
// Add aria-labels to icon buttons
<button aria-label="Add to cart">
  <ShoppingCartIcon />
</button>

// Add main landmark
<main role="main">
  {/* page content */}
</main>

// Fix heading order (h1 → h2 → h3, don't skip)
<h1>Title</h1>
<h2>Subtitle</h2> // Not h3

// Increase touch target size
.button {
  min-width: 48px;
  min-height: 48px;
}

// Fix color contrast
// Ensure text has at least 4.5:1 contrast ratio
```

---

## 🎯 Priority 4: Best Practices (Score: 96/100)

### Issues:
1. **Images with incorrect aspect ratio**
2. **Missing CSP (Content Security Policy)**
3. **Missing HSTS header**

**Fixes:**

#### Add CSP Header (Nginx):
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;";
```

#### Add HSTS Header:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

## 📋 Implementation Checklist

### Week 1 (Critical):
- [ ] Optimize all product images to WebP (save 1,197 KB)
- [ ] Add lazy loading to all images
- [ ] Configure server caching (save 820 KB)
- [ ] Defer non-critical JavaScript (save 600ms)
- [ ] Enable Brotli/Gzip compression

### Week 2 (Important):
- [ ] Inline critical CSS
- [ ] Remove unused JavaScript (save 305 KB)
- [ ] Fix accessibility issues (buttons, links, contrast)
- [ ] Add main landmark and fix heading order
- [ ] Increase touch target sizes

### Week 3 (Optimization):
- [ ] Add responsive images with srcset
- [ ] Implement code splitting for heavy components
- [ ] Add CSP and security headers
- [ ] Update build target to ES2020
- [ ] Break up long main thread tasks

---

## 🎯 Expected Results After Fixes

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Performance Score | 57 | 90+ | +33 points |
| FCP | 5.7s | 1.5s | -4.2s |
| LCP | 8.0s | 2.0s | -6.0s |
| Speed Index | 9.5s | 3.0s | -6.5s |
| Total Size | 4,653 KB | 2,000 KB | -57% |

---

## 🚀 Quick Win Script

Create `scripts/quick-performance-fixes.sh`:
```bash
#!/bin/bash

echo "🚀 Applying quick performance fixes..."

# 1. Enable lazy loading for all images
find frontend/src -name "*.jsx" -type f -exec sed -i 's/<img /<img loading="lazy" /g' {} +

# 2. Add defer to scripts
sed -i 's/<script type="module"/<script type="module" defer/g' frontend/index.html

# 3. Build with optimizations
cd frontend
npm run build

echo "✅ Quick fixes applied!"
echo "📊 Next: Configure server caching and enable Brotli compression"
```

---

## 📊 Monitoring

After implementing fixes, test again:
```bash
# Use Lighthouse CLI
npx lighthouse https://internationaltijarat.com --view

# Or PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://internationaltijarat.com"
```

---

**Priority Order:**
1. 🔴 Images (biggest impact - 1,197 KB)
2. 🟡 Caching (820 KB + faster repeat visits)
3. 🟡 Render blocking (600ms faster FCP)
4. 🟢 JavaScript optimization (305 KB)
5. 🟢 Accessibility fixes (better UX)

**Estimated Time to 90+ Score:** 2-3 weeks with focused effort

---

**Last Updated:** November 23, 2025
**Report Source:** PageSpeed Insights Mobile Analysis
