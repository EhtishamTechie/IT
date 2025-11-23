# ⚡ Quick Deploy Commands

## 1️⃣ Build Frontend (Already Done ✅)
```bash
cd frontend
npm run build
# ✅ Built successfully - dist/ folder ready
```

## 2️⃣ Deploy to Server
```bash
# From your local PC (D:\IT website new\IT_new\IT)
cd frontend
scp -r dist/* root@147.93.108.205:/var/www/internationaltijarat/frontend/
```

## 3️⃣ Configure Cache on Server

### SSH to Server
```bash
ssh root@147.93.108.205
```

### Check Web Server Type
```bash
# Check if Nginx
nginx -v

# Check if Apache
apache2 -v
```

### For Nginx:
```bash
# Edit config
sudo nano /etc/nginx/sites-available/internationaltijarat.com

# Add these lines in server { } block:
```
```nginx
# Static assets - long cache
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

# Gzip
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
```
```bash
# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### For Apache:
```bash
cd /var/www/internationaltijarat

# Copy .htaccess from project
# Or paste this content:
sudo nano .htaccess
```
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>
```
```bash
# Enable modules and reload
sudo a2enmod expires headers deflate
sudo systemctl reload apache2
```

## 4️⃣ Verify Cache Working
```bash
# Test JS file (should show 1 year cache)
curl -I https://internationaltijarat.com/assets/index-CKsc3qYV.js | grep Cache-Control

# Expected: Cache-Control: public, max-age=31536000, immutable

# Test HTML (should show no cache)
curl -I https://internationaltijarat.com/ | grep Cache-Control

# Expected: Cache-Control: no-store, no-cache
```

## 5️⃣ Test Performance
```bash
# Open in browser:
# https://pagespeed.web.dev/analysis/https-internationaltijarat-com/aspgwkkh02?form_factor=mobile

# Expected score: 75-80 (from 57)
```

---

## 🎯 What Changed?
1. ✅ First homepage card & categories load immediately (no lazy loading)
2. ✅ Analytics load after page interactive (not blocking)
3. ✅ Bundle optimized (Terser, tree shaking, es2020)
4. ✅ Cache headers configured (820KB savings on repeat visits)

## ⚠️ What to Watch
- Make sure cache headers are working (step 4)
- Test website after deploy (all pages should work normally)
- Check PageSpeed score improvement

## 🚀 Time Required
- Deploy: 5 minutes
- Configure cache: 10 minutes
- Verify: 5 minutes
**Total: ~20 minutes**

---

**Current Status:** ✅ Ready to deploy  
**Risk Level:** 🟢 Low (no functionality changed)  
**Expected Improvement:** +18-23 points (57→75-80)
