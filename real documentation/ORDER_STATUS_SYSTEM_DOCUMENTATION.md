# Order Status System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Order Types](#order-types)
3. [Status Flow](#status-flow)
4. [API Endpoints](#api-endpoints)
5. [Status Resolution Logic](#status-resolution-logic)
6. [Frontend Implementation](#frontend-implementation)
7. [Troubleshooting](#troubleshooting)

## Overview

The International Tijarat e-commerce platform uses a sophisticated multi-vendor order status system that handles three types of orders: **admin-only**, **vendor-only**, and **mixed orders**. The system automatically splits mixed orders and calculates overall status based on sub-order statuses.

### Key Features
- **Automatic Order Splitting**: Mixed orders are automatically split into admin and vendor parts
- **Real-time Status Resolution**: Overall status is calculated from sub-order statuses
- **Commission Tracking**: Automatic commission calculation and reversal on cancellations
- **Multi-level Cancellation**: Support for full order, part-level, and item-level cancellations

## Order Types

### 1. Admin-Only Orders
- **Description**: Orders containing only admin-managed products
- **Behavior**: No splitting required, direct status management
- **Status Source**: Direct from main order

### 2. Vendor-Only Orders  
- **Description**: Orders containing only products from a single vendor
- **Behavior**: Forwarded to vendor, status depends on vendor actions
- **Status Source**: From vendor order status

### 3. Mixed Orders
- **Description**: Orders containing both admin and vendor products
- **Behavior**: Automatically split into admin and vendor parts
- **Status Source**: Calculated from all active sub-order statuses

## Status Flow

### New 6-Status System (Current)
The system now uses a unified 6-status approach for all orders:

```
placed → processing → shipped → delivered
  ↓         ↓          ↓
cancelled_by_customer (Customer cancellation - FINAL)
cancelled (Admin/Vendor cancellation - FINAL)
cancelled_by_user (Legacy customer cancellation - FINAL)
```

#### Status Definitions
- **placed**: Order created and confirmed
- **processing**: Order is being prepared/accepted by vendor
- **shipped**: Order has been dispatched
- **delivered**: Order successfully completed
- **cancelled_by_customer**: Customer cancelled the order (NEW - Immutable)
- **cancelled**: Admin or vendor cancelled the order
- **cancelled_by_user**: Legacy customer cancellation format

### Legacy Status Hierarchy (Backward Compatibility)

#### Admin Status Flow
```
placed → processing → shipped → delivered
  ↓
cancelled (can happen at any stage)
```

#### Vendor Status Flow  
```
placed → pending → accepted → shipped → delivered
  ↓              ↓
cancelled    rejected
```

### Status Normalization
The system normalizes different status formats for unified processing:

| Admin Status | Vendor Status | Normalized | Final Status |
|-------------|---------------|------------|--------------|
| Pending     | pending       | placed     | No           |
| Confirmed   | accepted      | processing | No           |
| Shipped     | shipped       | shipped    | No           |
| Delivered   | delivered     | delivered  | Yes          |
| Cancelled   | rejected      | cancelled  | Yes          |
| -           | -             | cancelled_by_customer | Yes |
| -           | -             | cancelled_by_user | Yes |

### Customer Cancellation Protection System

#### Immutable Customer Decisions
Once a customer cancels an order (status becomes `cancelled_by_customer` or legacy `cancelledBy: 'user'`), the order becomes **completely immutable**:

- ❌ Admin cannot change status
- ❌ Vendor cannot change status  
- ❌ Order cannot be forwarded to vendors
- ❌ No further modifications allowed
- ✅ Customer cancellation is final and protected

#### Status Change Prevention Logic
```javascript
// Prevention check implemented across all controllers
if (currentStatus === 'cancelled_by_customer' && newStatus !== 'cancelled_by_customer') {
  return res.status(400).json({
    success: false,
    message: 'Cannot change status of orders cancelled by customer. Customer cancellations are final.'
  });
}
```

## API Endpoints

### Customer Endpoints

#### Get Order Split Details
```
GET /api/orders/{orderId}/split-details
Authorization: Bearer {token}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "mainOrder": {
      "orderNumber": "ORD-123456789",
      "status": "processing",
      "totalAmount": 280,
      "createdAt": "2025-08-11T17:01:05.935Z",
      "isSplit": true,
      "customerName": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "address": "123 Main St",
      "city": "New York",
      "paymentMethod": "COD"
    },
    "parts": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "type": "admin",
        "orderNumber": "ORD-123456789-ADMIN",
        "status": "processing",
        "isCancellable": true,
        "subtotal": 230,
        "items": [...]
      },
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "type": "vendor", 
        "orderNumber": "ORD-123456789-V9508",
        "status": "placed",
        "isCancellable": true,
        "vendorName": "Vendor Name",
        "vendorContact": {
          "email": "vendor@example.com",
          "phone": "0987654321"
        },
        "subtotal": 50,
        "items": [...]
      }
    ],
    "isSplit": true,
    "originalItems": [...]
  }
}
```

#### Cancel Order Parts
```
POST /api/orders/user/cancel-admin-part/{adminOrderId}
POST /api/orders/user/cancel-vendor-part/{vendorOrderId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Customer requested cancellation"
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Order part cancelled successfully",
  "data": {
    "originalStatus": "processing",
    "newStatus": "cancelled_by_customer",
    "commissionReversed": 25.50,
    "stockRestored": [
      {
        "productId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "quantity": 2,
        "restored": true
      }
    ]
  }
}
```

#### Cancel User Order (Full Order)
```
POST /api/orders/user/cancel/{orderId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Customer requested full cancellation"
}
```

**Features:**
- ✅ Automatic stock restoration for all items
- ✅ Commission reversal for vendor items
- ✅ Sets status to `cancelled_by_customer` (immutable)
- ✅ Prevents further admin/vendor modifications

#### Cancel Individual Items
```
POST /api/orders/user/cancel-items/{orderId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemsToCancel": ["itemId1", "itemId2"],
  "reason": "No longer needed"
}
```

### Admin Endpoints

#### Get Admin Split Details
```
GET /api/admin/orders/{orderId}/split-details
Authorization: Bearer {adminToken}
```

#### Update Order Status
```
PUT /api/admin/orders/{orderId}/admin-action
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "action": "updateStatus",
  "newStatus": "processing"
}
```

**Protection:** Blocked if order status is `cancelled_by_customer`

#### Admin Order Management Actions
```
PUT /api/admin/orders/{orderId}/admin-action
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "action": "cancel",
  "reason": "Admin cancellation reason"
}
```

**Features:**
- ✅ Stock restoration when admin cancels orders
- ✅ Prevention logic blocks customer-cancelled orders
- ✅ Proper commission handling and reversal

#### Forward Order to Vendors
```
POST /api/admin/orders/{orderId}/forward
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "vendorIds": ["vendorId1", "vendorId2"],
  "adminNotes": "Special instructions"
}
```

**Protection:** Cannot forward orders cancelled by customers

### Vendor Endpoints

#### Vendor Order Actions
```
PUT /api/vendors/orders/{orderId}/action
Authorization: Bearer {vendorToken}
Content-Type: application/json

{
  "action": "accept", // or "reject", "process", "ship"
  "notes": "Vendor notes"
}
```

**Protection:** All vendor actions blocked if order status is `cancelled_by_customer`

#### Vendor Status Updates
```
PUT /api/status/{orderId}/vendor-status
Authorization: Bearer {vendorToken}
Content-Type: application/json

{
  "status": "processing",
  "reason": "Order accepted and processing started"
}
```

**Features:**
- ✅ Stock restoration when vendor rejects orders
- ✅ Prevention logic blocks customer-cancelled orders
- ✅ Proper commission tracking and reversal

### Status API Endpoints

#### Simple Status Updates
```
PUT /api/status/{orderId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "shipped",
  "reason": "Package dispatched",
  "updatedBy": "AdminName"
}
```

**Protection:** Comprehensive prevention against modifying customer-cancelled orders

## Status Resolution Logic

### Mixed Order Status Calculation

The system uses a priority-based approach to calculate overall status:

1. **Collect All Statuses**: Gather statuses from admin parts, vendor parts, and unmatched vendor items
2. **Filter Active Statuses**: Exclude cancelled/rejected orders
3. **Apply Priority Rules**:
   - If any active part is "placed" → Overall: **"placed"**
   - If all active parts are "processing" or better → Overall: **"processing"** 
   - If all active parts are "shipped" or better → Overall: **"shipped"**
   - If all active parts are "delivered" → Overall: **"delivered"**

### Code Implementation
```javascript
// Priority-based status calculation
if (normalizedStatuses.every(status => status === 'delivered')) {
  calculatedStatus = 'delivered';
} else if (normalizedStatuses.every(status => ['delivered', 'shipped'].includes(status))) {
  calculatedStatus = 'shipped';
} else if (normalizedStatuses.every(status => ['delivered', 'shipped', 'processing'].includes(status))) {
  calculatedStatus = 'processing';
} else {
  // If any part is still "placed", overall status is "placed"
  calculatedStatus = 'placed';
}
```

### Unmatched Vendor Items Handling

The system now properly handles vendor items that don't have corresponding vendor parts:

```javascript
// Check for vendor items without matching vendor parts
const unmatchedVendorItems = order.cart.filter(item => {
  if (!item.vendor && !item.assignedVendor) return false;
  
  const hasMatchingVendorPart = vendorParts.some(vp => {
    return vp.items && vp.items.some(vpItem => 
      vpItem.price === item.price && vpItem.quantity === item.quantity
    );
  });
  
  return !hasMatchingVendorPart;
});

// Include their status in overall calculation
unmatchedVendorItems.forEach(item => {
  const itemStatus = item.status || 'placed';
  allStatuses.push(itemStatus);
});
```

## Frontend Implementation

### Order Detail Components

#### Main Components
- `SimpleOrderDetailPage.jsx`: Customer order detail page
- `EnhancedOrderTracking.jsx`: Advanced order tracking component
- `OrderActions.jsx`: Order action buttons (cancel, track, etc.)
- `OrderItemsList.jsx`: Individual items display with cancel buttons

#### Status Display Logic
```javascript
// Individual item status inheritance
const getItemStatus = (item, adminPart, vendorParts) => {
  const isAdminItem = !item.vendor && !item.assignedVendor;
  
  if (isAdminItem && adminPart) {
    return adminPart.status; // Use admin part status
  }
  
  // For vendor items, try to match with vendor parts
  for (const vendorPart of vendorParts) {
    const matchingItem = vendorPart.items.find(vItem => 
      vItem.price === item.price && 
      vItem.quantity === item.quantity
    );
    
    if (matchingItem) {
      return vendorPart.status; // Use vendor part status
    }
  }
  
  // If no match found, keep original status
  return item.status || 'placed';
};
```

### Cancel Button Implementation
```javascript
const handleCancelPart = async (part) => {
  const endpoint = part.type === 'admin' 
    ? `/api/orders/user/cancel-admin-part/${part.id}`
    : `/api/orders/user/cancel-vendor-part/${part.id}`;
    
  const response = await axios.post(endpoint, { 
    reason: 'Customer cancellation' 
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (response.data.success) {
    // Refresh order details
    await loadOrderDetails();
  }
};
```

## Commission System Integration

### Commission Tracking
- **On Order Creation**: Commission is calculated and tracked
- **On Customer Cancellation**: Commission is automatically reversed using stored amounts
- **On Admin/Vendor Cancellation**: Commission properly handled with stock restoration
- **Status**: Tracked in `MonthlyCommission` collection with cancellation metadata

### Commission Reversal Logic
```javascript
// When customer cancels vendor order - uses stored commission amount
if (vendorOrder.commissionAmount > 0) {
  await MonthlyCommission.updateOne(
    { 
      vendor: vendorOrder.vendor,
      'orders.vendorOrderId': vendorOrderId 
    },
    { 
      $inc: { 
        totalCommission: -vendorOrder.commissionAmount,
        totalSales: -vendorOrder.totalAmount 
      },
      $set: { 
        'orders.$.status': 'cancelled_by_customer',
        'orders.$.cancelledAt': new Date(),
        'orders.$.cancelledBy': 'customer'
      }
    }
  );
}
```

### Variable Commission Rate Support
The system supports configurable commission rates per vendor:
```javascript
// Commission calculation with variable rates
const commissionRate = vendor.settings?.commissionRate || 0.20; // Default 20%
const commissionAmount = totalAmount * commissionRate;
```

### Stock Management Integration

#### StockManager Service
```javascript
// Individual product stock restoration
await StockManager.restoreStock(productId, quantity);

// Comprehensive stock restoration for order cancellation
const StockManager = {
  async restoreStock(productId, quantity) {
    const product = await Product.findById(productId);
    if (product) {
      product.stock += quantity;
      await product.save();
      console.log(`📦 Restored ${quantity} units of product ${productId}`);
    }
  }
};
```

#### Stock Restoration Scenarios
1. **Customer Cancellation**: Stock restored automatically for all items
2. **Admin Cancellation**: Stock restored with admin metadata tracking
3. **Vendor Rejection**: Stock restored only for vendor's items
4. **Sub-order Cancellation**: Stock restored for specific part items

## Database Schema

### Order Model
```javascript
{
  orderNumber: String,
  orderType: String, // 'admin_only', 'vendor_only', 'mixed'
  status: String, // 'placed', 'processing', 'shipped', 'delivered', 'cancelled', 'cancelled_by_customer'
  isSplitOrder: Boolean,
  parentOrderId: ObjectId, // For sub-orders
  partialOrderType: String, // 'admin_part' or null
  
  // Cancellation metadata
  cancelledBy: String, // 'customer', 'admin', 'vendor'
  cancellationReason: String,
  cancelledAt: Date,
  
  cart: [{
    productId: ObjectId,
    vendor: String,
    assignedVendor: String,
    title: String,
    price: Number,
    quantity: Number,
    status: String,
    commissionAmount: Number
  }],
  totalAmount: Number,
  
  // Status tracking
  statusHistory: [{
    status: String,
    updatedBy: String,
    reason: String,
    timestamp: Date,
    userRole: String
  }],
  lastStatusUpdate: Date,
  statusUpdatedAt: Date
}
```

### VendorOrder Model
```javascript
{
  orderNumber: String,
  parentOrderId: ObjectId,
  splitFromMixedOrder: Boolean,
  vendor: String,
  status: String, // 'pending', 'accepted', 'shipped', 'delivered', 'rejected', 'cancelled'
  
  // Cancellation metadata
  cancelledBy: String, // 'customer', 'vendor', 'admin'
  cancellationReason: String,
  cancelledAt: Date,
  
  items: [{
    productName: String,
    quantity: Number,
    price: Number,
    subtotal: Number
  }],
  totalAmount: Number,
  commissionAmount: Number,
  
  // Status tracking
  statusHistory: [{
    status: String,
    updatedBy: String,
    reason: String,
    timestamp: Date,
    userRole: String
  }],
  lastStatusUpdate: Date
}
```

### MonthlyCommission Model
```javascript
{
  vendor: ObjectId,
  month: Number,
  year: Number,
  totalCommission: Number,
  totalSales: Number,
  orders: [{
    vendorOrderId: ObjectId,
    orderNumber: String,
    amount: Number,
    commission: Number,
    status: String, // 'active', 'cancelled_by_customer', 'cancelled'
    cancelledAt: Date,
    cancelledBy: String
  }],
  
  // Cancellation tracking
  totalCancelledCommission: Number,
  totalCancelledSales: Number,
  cancellationCount: Number
}
```

## Error Handling

### Common Issues and Solutions

#### 1. Status Mismatch Between Overall and Items
**Problem**: Overall status shows "shipped" but some items show "placed"
**Solution**: Check for unmatched vendor items in status calculation

#### 2. Cancel Buttons Not Working
**Problem**: Cancel buttons don't respond
**Solution**: Ensure correct endpoints and `isCancellable` property

#### 3. Commission Not Reversing
**Problem**: Commission not reversed on cancellation
**Solution**: Verify commission tracking in cancellation logic

#### 4. Admin/Vendor Actions on Customer-Cancelled Orders
**Problem**: Admin or vendor can still modify customer-cancelled orders
**Solution**: Ensure prevention logic is implemented:
```javascript
// Check for customer cancellation before any action
if (order.status === 'cancelled_by_customer') {
  return res.status(400).json({
    success: false,
    message: 'Cannot modify orders cancelled by customer'
  });
}
```

#### 5. Stock Not Restored on Cancellation
**Problem**: Product stock not restored when orders are cancelled
**Solution**: Ensure StockManager.restoreStock() is called:
```javascript
// Restore stock for each cancelled item
for (const item of order.items) {
  await StockManager.restoreStock(item.product, item.quantity);
}
```

#### 6. Frontend Buttons Still Visible for Protected Orders
**Problem**: Action buttons visible for customer-cancelled orders
**Solution**: Use canModifyOrder check:
```javascript
const canModifyOrder = (order) => {
  if (order.status === 'cancelled_by_customer') return false;
  return !((order.status === 'cancelled') && order.cancelledBy === 'user');
};
```

### Debug Logging
The system includes comprehensive logging for troubleshooting:
```
🔍 [MIXED ORDER STATUS] Starting resolution for order: ORD-123456789
📋 [MIXED ORDER STATUS] Added admin part status: processing  
📋 [MIXED ORDER STATUS] Added vendor part 1 status: shipped
📋 [MIXED ORDER STATUS] Added unmatched vendor item "product" status: placed
🎯 [MIXED ORDER STATUS] Some active parts still placed → PLACED
✅ [MIXED ORDER STATUS] Final calculated status: placed

🛡️ [PREVENTION] Blocked admin action on customer-cancelled order: ORD-123456789
📦 [STOCK] Restored 5 units of product 60f7b3b3b3b3b3b3b3b3b3b3
💰 [COMMISSION] Reversed $25.50 commission for cancelled order
```

## Testing Checklist

### Status Resolution Testing
- [ ] Admin-only order status updates correctly
- [ ] Vendor-only order reflects vendor actions
- [ ] Mixed order calculates correct overall status
- [ ] Unmatched vendor items are considered in calculation
- [ ] Cancelled parts are excluded from calculation

### Cancellation Testing
- [ ] Full order cancellation works
- [ ] Admin part cancellation works
- [ ] Vendor part cancellation works
- [ ] Individual item cancellation works
- [ ] Commission reversal on cancellation

### Customer Cancellation Protection Testing
- [ ] Admin cannot change status after customer cancellation
- [ ] Vendor cannot change status after customer cancellation
- [ ] Admin cannot forward customer-cancelled orders
- [ ] Vendor action buttons hidden for customer-cancelled orders
- [ ] Error messages displayed for blocked actions
- [ ] Both new (`cancelled_by_customer`) and legacy (`cancelledBy: 'user'`) formats protected

### Stock Restoration Testing
- [ ] Customer cancellation restores stock
- [ ] Admin cancellation restores stock
- [ ] Vendor rejection restores stock
- [ ] Sub-order cancellation restores correct items
- [ ] Individual item cancellation restores specific quantities

### Frontend Testing
- [ ] Order details load correctly
- [ ] Individual item statuses display correctly
- [ ] Cancel buttons appear for cancellable items only
- [ ] Cancel buttons hidden for customer-cancelled orders
- [ ] Status updates reflect in real-time
- [ ] Customer endpoints work with authentication
- [ ] Admin/vendor buttons respect protection logic

### Commission System Testing
- [ ] Commission calculated correctly on order creation
- [ ] Commission reversed on customer cancellation
- [ ] Variable commission rates work per vendor
- [ ] Commission tracking accurate in MonthlyCommission
- [ ] Cancellation metadata properly stored

## Performance Considerations

### Optimization Tips
1. **Status Caching**: Consider caching calculated statuses for frequently accessed orders
2. **Batch Processing**: Process status updates in batches for large orders
3. **Index Optimization**: Ensure proper indexes on `parentOrderId`, `orderNumber`, and `status`
4. **Pagination**: Implement pagination for order lists
5. **Stock Operation Batching**: Batch stock restoration operations for better performance
6. **Commission Calculation Optimization**: Cache commission rates to avoid repeated vendor lookups

### Database Indexing Strategy
```javascript
// Recommended indexes for optimal performance
db.orders.createIndex({ "status": 1, "createdAt": -1 });
db.orders.createIndex({ "parentOrderId": 1 });
db.orders.createIndex({ "orderNumber": 1 });
db.orders.createIndex({ "cancelledBy": 1, "status": 1 });
db.vendorOrders.createIndex({ "vendor": 1, "status": 1 });
db.vendorOrders.createIndex({ "parentOrderId": 1 });
db.monthlyCommissions.createIndex({ "vendor": 1, "year": 1, "month": 1 });
```

### Monitoring
- Monitor status calculation performance
- Track commission reversal accuracy
- Watch for authentication failures
- Monitor database query performance
- Track prevention logic effectiveness
- Monitor stock restoration operations
- Watch for customer cancellation protection bypasses

### Security Considerations
1. **Authentication**: Ensure all endpoints properly validate tokens
2. **Authorization**: Verify user roles before allowing status changes
3. **Prevention Logic**: Double-check customer cancellation protection
4. **Data Integrity**: Validate status transitions before applying
5. **Audit Trail**: Maintain comprehensive logs of all status changes

## Recent Updates and Features

### Version 3.0 Features (August 2025)
- ✅ **Customer Cancellation Protection**: Complete immutability of customer-cancelled orders
- ✅ **Comprehensive Stock Restoration**: Stock restoration across all cancellation scenarios
- ✅ **Variable Commission Rates**: Support for per-vendor commission configuration
- ✅ **Enhanced Prevention Logic**: Multi-layer protection against unauthorized status changes
- ✅ **Dual Format Support**: Backward compatibility with legacy cancellation formats
- ✅ **Improved Frontend Protection**: UI-level protection with proper button visibility
- ✅ **Enhanced Error Handling**: Clear error messages for blocked operations

### Migration Notes
- Existing orders with `cancelledBy: 'user'` remain protected
- New customer cancellations use `cancelled_by_customer` status
- Commission reversal logic updated to use stored amounts
- Stock restoration added to all cancellation endpoints
- Prevention logic added to all admin/vendor action endpoints

---

**Last Updated**: August 12, 2025  
**Version**: 3.0  
**Maintainer**: Development Team

## Implementation Summary

The International Tijarat order status system now provides:
- **Complete Customer Authority**: Customer cancellations are final and protected
- **Comprehensive Stock Management**: Accurate inventory tracking across all scenarios
- **Robust Commission System**: Variable rates with proper reversal mechanisms
- **Multi-layer Security**: Prevention logic at both frontend and backend levels
- **Backward Compatibility**: Support for legacy order formats
- **Real-time Updates**: Immediate status reflection across all interfaces
