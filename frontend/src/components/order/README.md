# Standard Order Details Implementation Guide

## Overview
The new standard order details system provides a unified way to view order information across all areas of the application. It groups orders by handler (Admin vs Vendor) and provides a clean cancellation system.

## Working Endpoints Confirmed:

### ✅ Primary Endpoint (WORKING):
```
GET /api/admin/orders/{orderId}/split-details
```
- Used by all order tracking components
- Returns grouped data by handler
- Includes parts structure for mixed orders
- Calculates unified status

### ✅ Cancellation Endpoints (WORKING):
```
POST /api/orders/user/cancel/{orderId}              # Cancel entire order
POST /api/orders/user/cancel-vendor-part/{vendorOrderId}  # Cancel vendor part
POST /api/orders/user/cancel-admin-part/{adminOrderId}    # Cancel admin part
```

## Order Status Flow:
- **placed** → **processing** → **shipped** → **delivered**
- **Cancellable:** placed, processing
- **Non-cancellable:** shipped, delivered

## Integration Examples:

### 1. Order History Page
```jsx
import StandardOrderDetailsModal from '../components/order/StandardOrderDetailsModal';

// Replace EnhancedOrderTracking with:
{trackingOrderId && (
  <StandardOrderDetailsModal 
    orderId={trackingOrderId}
    onClose={() => setTrackingOrderId(null)}
    onOrderUpdate={handleOrderUpdate}
    userRole="customer"
    allowCancellation={true}
  />
)}
```

### 2. Admin Panel (Legacy & Multi-Vendor)
```jsx
import StandardOrderDetailsModal from '../components/order/StandardOrderDetailsModal';

// Replace UnifiedOrderTracking with:
{trackingOrderId && (
  <StandardOrderDetailsModal 
    orderId={trackingOrderId}
    onClose={() => setTrackingOrderId(null)}
    onOrderUpdate={refreshOrders}
    userRole="admin"
    allowCancellation={false}  // Admins don't cancel, they manage
  />
)}
```

### 3. Vendor Dashboard
```jsx
import StandardOrderDetailsModal from '../components/order/StandardOrderDetailsModal';

// Replace various vendor implementations with:
{selectedOrder && (
  <StandardOrderDetailsModal 
    orderId={selectedOrder._id}
    onClose={() => setSelectedOrder(null)}
    onOrderUpdate={loadOrders}
    userRole="vendor"
    allowCancellation={false}
  />
)}
```

### 4. Order Confirmation Page
```jsx
// Keep as separate page but use shared components:
import OrderStatusDisplay from '../components/order/OrderStatusDisplay';
import OrderItemsList from '../components/order/OrderItemsList';
import OrderCustomerInfo from '../components/order/OrderCustomerInfo';

// Use these components within the existing page layout
```

## Key Features:

### 🎯 Handler-Based Grouping:
- **Admin Group:** Items handled by International Tijarat
- **Vendor Groups:** Items grouped by vendor (Vendor1, Vendor2, etc.)
- Clear visual separation with different colors and icons

### 🚫 Smart Cancellation System:
- **Full Order Cancellation:** For admin_only/vendor_only orders
- **Partial Cancellation:** For mixed orders (cancel by handler group)
- **Status-Based:** Only allows cancellation before shipping
- **User-Specific:** Only customers can cancel their orders

### 📊 Clean Status Display:
- **Unified Status:** Shows overall order status
- **Part Status:** Shows individual part statuses for mixed orders
- **Progress Indicators:** Clear visual status progression
- **Mixed Status Handling:** "Partially Processed" for mixed completion

## File Structure:
```
components/order/
├── StandardOrderDetailsModal.jsx    # Main modal component
├── OrderStatusDisplay.jsx           # Status with timeline
├── OrderItemsList.jsx               # Grouped items display
├── OrderCustomerInfo.jsx            # Customer information
└── OrderActions.jsx                 # Actions (cancel, track, print)
```

## Implementation Timeline:

### Phase 1 (Completed): Standard Components Created
- ✅ StandardOrderDetailsModal.jsx
- ✅ OrderStatusDisplay.jsx  
- ✅ OrderItemsList.jsx
- ✅ OrderCustomerInfo.jsx
- ✅ OrderActions.jsx

### Phase 2 (Next): Replace Existing Implementations
1. Update OrderHistoryPage.jsx
2. Update Admin OrderManagement.jsx
3. Update Admin EnhancedOrderManagement.jsx
4. Update all Vendor order pages
5. Update OrderConfirmationPage.jsx

### Phase 3 (Final): Cleanup
1. Remove old components (EnhancedOrderTracking, UnifiedOrderTracking)
2. Test all order flows
3. Update imports and dependencies

## Benefits:
- **Single Source of Truth:** One modal for all order details
- **Consistent UX:** Same look across all areas
- **Handler Grouping:** Clear organization by who handles what
- **Smart Cancellation:** Prevents invalid cancellations
- **Easy Maintenance:** Changes in one place
- **Better Performance:** No duplicate components

## Testing Checklist:
- [ ] Order History page view details
- [ ] Admin Legacy tab view icon
- [ ] Admin Multi-vendor tab view icon
- [ ] Vendor dashboard view icon
- [ ] Order confirmation page display
- [ ] Cancellation system (before/after shipping)
- [ ] Mixed order partial cancellation
- [ ] Status updates and refresh
- [ ] Different user roles (customer/admin/vendor)
