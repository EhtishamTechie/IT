# Order System Endpoints Documentation

## Overview
Documentation of the order system endpoints, their purposes, authentication requirements, and data structures.

## Endpoint Architecture

### 1. Admin/Customer Endpoints

#### Get Order with Split Details
```
GET /api/orders/:id/split-details
```

**Purpose**: Retrieve order with calculated mixed status and item-level details
**Authentication**: Admin token or regular user token
**Used By**: Admin users, Customer users
**Response Format**:
```json
{
  "_id": "order_id",
  "user": "user_id",
  "items": [
    {
      "_id": "item_id",
      "product": { /* product details */ },
      "vendor": "vendor_id",
      "quantity": 2,
      "price": 100,
      "status": "shipped",        // Individual item status
      "vendorStatus": "processing"
    }
  ],
  "status": "mixed",             // Calculated overall status
  "totalAmount": 200,
  "shippingAddress": { /* address */ },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Status Calculation Logic**:
- If all items have same status → return that status
- If items have different statuses → return "mixed"
- Supports individual item status tracking

### 2. Vendor Endpoints

#### Get Vendor Order
```
GET /api/vendors/orders/:id
```

**Purpose**: Retrieve vendor-specific order data
**Authentication**: Vendor token required
**Used By**: Vendor users
**Data Sources**: 
- Primary: `VendorOrder` collection
- Fallback: `Order` collection (filtered for vendor)

**Response Format**:
```json
{
  "_id": "order_id",
  "vendor": "vendor_id",
  "items": [
    {
      "_id": "item_id", 
      "product": { /* product details */ },
      "quantity": 1,
      "price": 50,
      "status": "processing"
    }
  ],
  "status": "processing",
  "totalAmount": 50,
  "customer": { /* customer info */ },
  "shippingAddress": { /* address */ },
  "createdAt": "timestamp"
}
```

**Backend Implementation**:
```javascript
// In vendorOrderController_clean.js
const getVendorOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check VendorOrder collection first
    let order = await VendorOrder.findById(id)
      .populate('items.product')
      .populate('customer', 'name email phone');
    
    if (!order) {
      // Fallback to main Order collection
      order = await Order.findById(id)
        .populate('items.product')
        .populate('user', 'name email phone');
        
      // Filter items for this vendor only
      if (order) {
        order.items = order.items.filter(
          item => item.vendor.toString() === req.vendor.id
        );
      }
    }
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching vendor order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 3. Endpoint Selection Logic

#### Frontend Decision Tree
```javascript
// In SimpleOrderDetailPage.jsx - loadOrderDetails()

const determineEndpoint = () => {
  // Priority 1: Admin context (highest priority)
  if (currentUser?.role?.includes('admin') || localStorage.getItem('adminToken')) {
    console.log('🔑 Using admin endpoint');
    return `/api/orders/${orderId}/split-details`;
  }
  
  // Priority 2: Vendor context
  if (vendor || localStorage.getItem('vendorToken')) {
    console.log('🔑 Using vendor endpoint');
    return `/api/vendors/orders/${orderId}`;
  }
  
  // Priority 3: Customer context (default)
  console.log('🔑 Using customer endpoint');
  return `/api/orders/${orderId}/split-details`;
};
```

#### Authentication Headers
```javascript
const getAuthHeaders = () => {
  const adminToken = localStorage.getItem('adminToken');
  const vendorToken = localStorage.getItem('vendorToken');
  const regularToken = localStorage.getItem('token');
  
  // Use appropriate token based on endpoint
  if (endpoint.includes('/vendors/')) {
    return { 'Authorization': `Bearer ${vendorToken}` };
  } else {
    return { 'Authorization': `Bearer ${adminToken || regularToken}` };
  }
};
```

## Data Collection Strategy

### VendorOrder vs Order Collections

#### VendorOrder Collection
- **Purpose**: Vendor-specific order records
- **Structure**: Optimized for vendor operations
- **Contains**: Only items from specific vendor
- **Status**: Vendor-controlled status updates

#### Order Collection  
- **Purpose**: Complete customer orders
- **Structure**: Full order with all items from all vendors
- **Contains**: All items in original order
- **Status**: Mixed status calculation based on individual items

#### Backend Query Strategy
```javascript
// Always check both collections for maximum compatibility
const findOrderForVendor = async (orderId, vendorId) => {
  // Try VendorOrder first (vendor-specific)
  let order = await VendorOrder.findById(orderId);
  
  if (order && order.vendor.toString() === vendorId) {
    return order;
  }
  
  // Fallback to Order collection with filtering
  order = await Order.findById(orderId);
  if (order) {
    // Filter to vendor's items only
    order.items = order.items.filter(
      item => item.vendor.toString() === vendorId
    );
    return order.items.length > 0 ? order : null;
  }
  
  return null;
};
```

## Authentication Requirements

### Admin Access
- **Token**: `adminToken` in localStorage
- **Role**: `currentUser.role` includes 'admin'
- **Endpoints**: Full access to all order endpoints
- **Permissions**: Can view any order, any status

### Vendor Access
- **Token**: `vendorToken` in localStorage  
- **Context**: `vendor` object from VendorAuthContext
- **Endpoints**: Restricted to vendor-specific endpoints
- **Permissions**: Can only view orders containing their items

### Customer Access
- **Token**: `token` in localStorage
- **Context**: `currentUser` from AuthContext
- **Endpoints**: Customer order endpoints
- **Permissions**: Can only view their own orders

## Error Handling

### Common Error Scenarios

#### 403 Forbidden
```javascript
// Cause: Wrong authentication token for endpoint
// Example: Admin trying to use vendor endpoint with adminToken

// Error Response:
{
  "message": "Access denied. Vendor authentication required.",
  "status": 403
}

// Solution: Fix endpoint selection logic
```

#### 404 Not Found
```javascript
// Cause: Order not in expected collection
// Example: Order in main Order collection but vendor endpoint only checks VendorOrder

// Error Response:
{
  "message": "Order not found",
  "status": 404
}

// Solution: Implement dual collection fallback
```

#### 500 Server Error
```javascript
// Cause: Database query failure or missing populate fields

// Error Response:
{
  "message": "Server error",
  "status": 500
}

// Solution: Add proper error handling and logging
```

## Performance Considerations

### Query Optimization
```javascript
// Efficient population strategy
.populate('items.product', 'name price images')
.populate('user', 'name email phone')
.populate('vendor', 'name email')
```

### Caching Strategy
```javascript
// Frontend caching for repeated requests
const orderCache = new Map();

const getCachedOrder = (orderId) => {
  const cached = orderCache.get(orderId);
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
    return cached.data;
  }
  return null;
};
```

### Index Requirements
```javascript
// Recommended database indexes
db.orders.createIndex({ "user": 1, "createdAt": -1 });
db.orders.createIndex({ "items.vendor": 1 });
db.vendororders.createIndex({ "vendor": 1, "createdAt": -1 });
```

## Testing Endpoints

### Admin Endpoint Test
```bash
# Test admin access to order details
curl -X GET \
  http://localhost:5000/api/orders/ORDER_ID/split-details \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Vendor Endpoint Test  
```bash
# Test vendor access to their orders
curl -X GET \
  http://localhost:5000/api/vendors/orders/ORDER_ID \
  -H "Authorization: Bearer VENDOR_TOKEN"
```

### Cross-Authentication Test
```bash
# Test admin token on vendor endpoint (should fail)
curl -X GET \
  http://localhost:5000/api/vendors/orders/ORDER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---
*Last Updated: August 13, 2025*
*Part of: Unified Order View System Documentation*
