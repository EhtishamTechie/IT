# Quick Reference: Localhost URL Replacements

## Most Common Patterns (Copy & Paste Ready)

### 1. Add Import (Top of File)
```javascript
import { getApiUrl, getUploadUrl, config } from '../config';
```

### 2. VS Code Find & Replace Commands

#### Replace API URLs in fetch calls:
- **Find:** `'http://localhost:5000/api/`
- **Replace:** `getApiUrl('/`

#### Replace API URLs in template literals:
- **Find:** `` `http://localhost:5000/api/``  
- **Replace:** `` getApiUrl(`/``

#### Replace upload/image URLs:
- **Find:** `http://localhost:5000/uploads/`
- **Replace:** `getUploadUrl('')`

### 3. Manual Fixes Needed After Global Replace

After running global replace, manually fix these patterns:

```javascript
// Fix incomplete getApiUrl calls:
getApiUrl('/orders') ✓
getApiUrl('/orders/') ✗ (remove trailing slash)

// Fix image URLs:
getUploadUrl('filename.jpg') ✓
getUploadUrl('/uploads/filename.jpg') ✗ (remove /uploads/ prefix)
```

## 🚀 Deploy Test After These 3 Files:
1. `src/pages/Vendor/VendorOrdersPage.jsx`
2. `src/pages/SimpleOrderHistoryPage.jsx`  
3. `src/pages/SellUsedProduct.jsx`
