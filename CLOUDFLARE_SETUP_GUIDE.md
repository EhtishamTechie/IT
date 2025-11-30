# Cloudflare CDN Setup Guide - Phase 5
**Expected Improvement**: 90-95% consistent PageSpeed score, 300-500ms faster LCP globally

## Step 1: Create Cloudflare Account & Add Domain

1. **Sign up at Cloudflare**: https://dash.cloudflare.com/sign-up
   - Use your business email
   - Free plan is sufficient for now

2. **Add Your Domain**:
   - Click "Add a Site"
   - Enter: `internationaltijarat.com`
   - Select **Free Plan**
   - Click "Continue"

3. **Cloudflare will scan your DNS records** (takes 60 seconds)

## Step 2: Update DNS Records

Cloudflare will show your current DNS records. Verify these are correct:

```
Type    Name                    Content              Proxy Status
A       internationaltijarat.com    147.93.108.205      Proxied (Orange Cloud)
A       www                     147.93.108.205      Proxied (Orange Cloud)
```

**Important**: Make sure the **Proxy status is ON** (orange cloud icon) - this enables CDN

## Step 3: Update Nameservers at Your Domain Registrar

Cloudflare will provide 2 nameservers like:
```
carmen.ns.cloudflare.com
rex.ns.cloudflare.com
```

**Go to your domain registrar** (where you bought internationaltijarat.com):
1. Log in to your registrar account
2. Find DNS/Nameserver settings
3. Replace existing nameservers with Cloudflare's nameservers
4. Save changes

**⏱️ Wait 24-48 hours** for DNS propagation (usually happens in 2-6 hours)

## Step 4: Configure Cloudflare Performance Settings

Once DNS is active, configure these settings in Cloudflare Dashboard:

### 4.1 Speed Settings (`Speed` → `Optimization`)

✅ **Auto Minify**:
- [x] JavaScript
- [x] CSS  
- [x] HTML

✅ **Brotli**: ON

✅ **Rocket Loader**: OFF (we already optimized JS loading)

✅ **Early Hints**: ON (sends link headers before full response)

### 4.2 Caching Settings (`Caching` → `Configuration`)

✅ **Caching Level**: Standard

✅ **Browser Cache TTL**: 
- Set to **1 year** (respects our backend Cache-Control headers)

✅ **Always Online**: ON (serves cached version if server is down)

### 4.3 Page Rules (`Rules` → `Page Rules`)

Create these 3 page rules (order matters):

**Rule 1: Cache Static Assets Aggressively**
```
URL Pattern: *internationaltijarat.com/assets/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 year
```

**Rule 2: Cache Images Aggressively**  
```
URL Pattern: *internationaltijarat.com/uploads/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
```

**Rule 3: Cache API Responses (Short)**
```
URL Pattern: *internationaltijarat.com/api/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 5 minutes
  - Browser Cache TTL: 5 minutes
```

### 4.4 Security Settings

✅ **SSL/TLS Mode**: Full (Strict)
- Go to `SSL/TLS` → `Overview`
- Select "Full (strict)"

✅ **Always Use HTTPS**: ON
- Go to `SSL/TLS` → `Edge Certificates`  
- Enable "Always Use HTTPS"

✅ **Automatic HTTPS Rewrites**: ON

✅ **Security Level**: Medium (adjust if getting false positives)

### 4.5 Network Settings

✅ **HTTP/2**: ON (already enabled by default)

✅ **HTTP/3 (QUIC)**: ON

✅ **0-RTT Connection Resumption**: ON

## Step 5: Enable Cloudflare Image Optimization (Optional - Paid)

If you upgrade to Pro plan ($20/month), you get:

✅ **Polish**: Automatic WebP/AVIF conversion
✅ **Mirage**: Lazy loading
✅ **Image Resizing**: On-the-fly resizing

**We already have AVIF optimization**, so this is optional.

## Step 6: Purge Cache After Deployment

After deploying new code:

1. Go to `Caching` → `Configuration`
2. Click **Purge Everything**
3. Confirm

Or purge specific files:
```bash
# Purge CSS/JS after build
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://internationaltijarat.com/assets/index.css"]}'
```

## Step 7: Verify Cloudflare is Working

### Check DNS Propagation:
```bash
nslookup internationaltijarat.com
# Should return Cloudflare IPs (104.x.x.x or 172.x.x.x range)
```

### Check Headers:
```bash
curl -I https://internationaltijarat.com
# Look for: cf-cache-status, cf-ray, server: cloudflare
```

### Test from Multiple Locations:
- https://tools.keycdn.com/performance
- https://www.webpagetest.org/

## Step 8: Update Backend CORS (If Needed)

If you see CORS errors, update `backend/api.js`:

```javascript
app.use(cors({
  origin: [
    'https://internationaltijarat.com',
    'https://www.internationaltijarat.com',
    'http://localhost:5173', // Dev
  ],
  credentials: true
}));
```

## Expected Results After Cloudflare Setup

**Before Cloudflare:**
- FCP: 2.1-2.3s
- LCP: 2.6-3.5s
- Speed Index: 4.8-7.3s
- PageSpeed: 85-91%

**After Cloudflare:**
- FCP: 1.5-1.8s ⬇️ 30% faster
- LCP: 2.0-2.5s ⬇️ 25% faster  
- Speed Index: 3.5-5.0s ⬇️ 35% faster
- PageSpeed: 90-95% ⬆️ Consistent

**Why Cloudflare Helps:**
- ✅ Edge caching in 200+ cities worldwide
- ✅ Closer to users = faster response times
- ✅ Automatic Brotli compression
- ✅ HTTP/2 & HTTP/3 (faster multiplexing)
- ✅ DDoS protection & uptime improvement
- ✅ Free SSL certificate

## Troubleshooting

**Issue: Site not loading after DNS change**
- Wait 2-6 hours for DNS propagation
- Check nameservers: `nslookup -type=ns internationaltijarat.com`

**Issue: Mixed content warnings**
- Enable "Automatic HTTPS Rewrites" in Cloudflare
- Update all internal links to use relative paths or HTTPS

**Issue: API requests failing**
- Check CORS settings in backend
- Verify API is using HTTPS
- Check Cloudflare Firewall Rules aren't blocking API

**Issue: Images not loading**
- Clear Cloudflare cache
- Check Page Rules aren't too aggressive
- Verify image URLs use HTTPS

## Monitoring & Maintenance

### Daily:
- Monitor Cloudflare Analytics dashboard
- Check cache hit ratio (should be 85%+)

### After Code Deployments:
- Purge Cloudflare cache
- Test site functionality
- Run PageSpeed Insights

### Monthly:
- Review bandwidth usage
- Check security threats blocked
- Optimize Page Rules based on analytics

---

## Quick Start Checklist

- [ ] Create Cloudflare account
- [ ] Add internationaltijarat.com domain
- [ ] Update nameservers at registrar
- [ ] Wait for DNS propagation (2-6 hours)
- [ ] Configure Speed settings (Auto Minify, Brotli)
- [ ] Configure Caching (1 year browser cache)
- [ ] Create 3 Page Rules (assets, uploads, api)
- [ ] Set SSL to "Full (strict)"
- [ ] Enable Always Use HTTPS
- [ ] Enable HTTP/3
- [ ] Test with curl and PageSpeed Insights
- [ ] Celebrate 90-95% PageSpeed score! 🎉

**Need help?** Cloudflare has excellent docs: https://developers.cloudflare.com/
