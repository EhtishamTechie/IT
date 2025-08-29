# Order System Troubleshooting Guide

## Common Issues and Solutions

### 1. "Order not found" Errors

#### Symptoms
- Users see "Order not found" message
- 404 errors in console
- Orders exist in database but can't be accessed

#### Root Causes & Solutions

**Cause 1: Wrong Endpoint Selection**
```javascript
// Problem: Admin users routed to vendor endpoint
// Console shows: GET /api/vendors/orders/123 → 403 Forbidden

// Solution: Fix endpoint priority in SimpleOrderDetailPage.jsx
if (currentUser?.role?.includes('admin') || localStorage.getItem('adminToken')) {
  endpoint = `/api/orders/${orderId}/split-details`;  // Admin endpoint
} else if (vendor || localStorage.getItem('vendorToken')) {
  endpoint = `/api/vendors/orders/${orderId}`;        // Vendor endpoint
}
```

**Cause 2: Dual Order Collections**
```javascript
// Problem: Order exists in Order collection but vendor endpoint only checks VendorOrder
// Solution: Backend checks both collections

// In vendorOrderController_clean.js
let order = await VendorOrder.findById(orderId);
if (!order) {
  order = await Order.findById(orderId);  // Fallback to main collection
}
```

**Cause 3: Authentication Context Mismatch**
```javascript
// Problem: Multiple auth tokens causing confusion
// Check localStorage for conflicting tokens:
console.log({
  vendorToken: localStorage.getItem('vendorToken'),
  adminToken: localStorage.getItem('adminToken'),
  token: localStorage.getItem('token')
});

// Solution: Clear conflicting tokens or implement priority logic
```

### 2. Authentication Redirects to Login

#### Symptoms
- Users redirected to login when accessing order details
- Valid sessions but still prompted for authentication

#### Root Causes & Solutions

**Cause: Route Protection Blocking Access**
```javascript
// Problem: ProtectedRoute wrapper preventing access
// Old problematic code:
<ProtectedRoute>
  <Route path="/order-detail/:id" element={<SimpleOrderDetailPage />} />
</ProtectedRoute>

// Solution: Remove route-level protection
<Route path="/order-detail/:id" element={<SimpleOrderDetailPage />} />
// Handle authentication within component instead
```

### 3. Wrong File Being Modified

#### Symptoms
- Changes made but not reflected in application
- Multiple similar files exist

#### Root Causes & Solutions

**Cause: Multiple Vendor Order Components**
```
Files that might exist:
- VendorOrdersPage.jsx          ← Active component
- SimplifiedVendorOrdersPage.jsx ← Inactive/old component
- VendorOrderManagement.jsx      ← Alternative implementation
```

**Solution: Verify Active Component**
```javascript
// 1. Check browser dev tools
// 2. Look for component name in React DevTools
// 3. Search for actual imports in App.jsx
// 4. Check route definitions
```

### 4. Navigation Not Working

#### Symptoms
- Back button goes to wrong page
- Navigation context lost

#### Root Causes & Solutions

**Cause: Missing Source Tracking**
```javascript
// Problem: No source set before navigation
const handleViewOrder = (orderId) => {
  navigate(`/order-detail/${orderId}`);  // Missing source tracking
};

// Solution: Set source before navigation
const handleViewOrder = (orderId) => {
  localStorage.setItem('orderDetailSource', '/orders');
  navigate(`/order-detail/${orderId}`);
};
```

**Cause: Incorrect User Role Detection in Fallback**
```javascript
// Problem: Customer users redirected to vendor login due to old vendorToken
// Fallback logic incorrectly checks for vendorToken presence

// Solution: Fix role detection priority
// Admin users (highest priority)
if (currentUser?.role?.includes('admin') || localStorage.getItem('adminToken')) {
  return '/admin/orders';
}

// Vendor users (only if currently authenticated as vendor)
if (vendor || (currentUser?.role === 'vendor' && localStorage.getItem('vendorToken'))) {
  return '/vendor/orders';
}

// Customer users (default fallback for everyone else)
return '/orders';
```

**Cause: Referrer-Based Detection Without Authentication Validation**
```javascript
// Problem: Customer visiting from /vendor/dashboard gets detected as vendor
// Referrer detection doesn't validate if user is actually authenticated for that route

// Solution: Add authentication validation to referrer detection
if (referrer.includes('/vendor/') && (vendor || (currentUser?.role === 'vendor' && localStorage.getItem('vendorToken')))) {
  return '/vendor/orders';  // Only if actually authenticated as vendor
}

// Fall back to role-based detection if referrer doesn't match authenticated context
```

### 5. Mixed Order Status Issues

#### Symptoms
- Order status showing incorrect values
- Items showing wrong individual statuses

#### Root Causes & Solutions

**Cause: Missing Split-Details Endpoint**
```javascript
// Problem: Using basic order endpoint
GET /api/orders/123  // Returns order.status only

// Solution: Use split-details endpoint
GET /api/orders/123/split-details  // Returns calculated mixed status
```

## Debugging Workflow

### Step 1: Identify User Type
```javascript
// Check console for user context
console.log('👤 User context:', { 
  role: currentUser?.role, 
  isVendor: !!vendor,
  isAdmin: !!currentUser?.role?.includes('admin'),
  vendorToken: !!localStorage.getItem('vendorToken')
});
```

### Step 2: Verify Endpoint Selection
```javascript
// Check which endpoint is being used
console.log('🎯 Using endpoint:', endpoint);
```

### Step 3: Check Network Tab
- Look for 403 Forbidden errors
- Verify correct endpoint is being called
- Check authentication headers

### Step 4: Verify Data Structure
```javascript
// Check order data structure
console.log('📦 Order data:', orderData);
```

## Testing Scenarios

### Admin User Testing
1. Login as admin
2. Go to "My Orders" tab → click View
3. Go to "Vendor Orders" tab → click View
4. Verify both use admin endpoint
5. Test back navigation from both sources

### Vendor User Testing
1. Login as vendor
2. Go to vendor orders page
3. Click View on any order
4. Verify vendor endpoint is used
5. Test back navigation

### Mixed Authentication Testing
1. Login as admin
2. Also login as vendor in another tab (creates vendorToken)
3. Test admin order viewing
4. Should still use admin endpoint despite vendorToken

## Prevention Strategies

### 1. Clear Role Priority
Always implement clear role hierarchy:
```javascript
// Admin takes precedence over vendor
const isAdmin = currentUser?.role?.includes('admin');
const isVendor = !!vendor && !isAdmin;
```

### 2. Comprehensive Logging
Add debugging at key decision points:
```javascript
console.log('Auth Decision:', { isAdmin, isVendor, endpoint });
```

### 3. Backend Fallbacks
Always check multiple data sources:
```javascript
// Check primary collection first, then fallback
let order = await VendorOrder.findById(id) || await Order.findById(id);
```

### 4. Component Verification
Before editing, verify active component:
```bash
# Search for component usage
grep -r "VendorOrdersPage" src/
grep -r "SimplifiedVendorOrdersPage" src/
```

## Quick Fixes Reference

### Reset Authentication State
```javascript
// Clear all auth tokens
localStorage.removeItem('token');
localStorage.removeItem('adminToken');
localStorage.removeItem('vendorToken');
localStorage.removeItem('orderDetailSource');
```

### Force Endpoint
```javascript
// Temporarily force specific endpoint for testing
const endpoint = `/api/orders/${orderId}/split-details`; // Admin
const endpoint = `/api/vendors/orders/${orderId}`;       // Vendor
```

### Check Active Routes
```javascript
// In App.jsx, verify route configuration
<Route path="/order-detail/:id" element={<SimpleOrderDetailPage />} />
```

---
*Last Updated: August 13, 2025*
*Based on: Unified Order View System Implementation*
