# Admin Panel Quick Reference Guide

## Quick Access Commands

### Check Revenue Statistics
```bash
# API Test
curl -X GET "http://localhost:5000/api/admin/dashboard/revenue" \
  -H "Authorization: Bearer <admin_token>"

# Database Query
db.orders.aggregate([
  {$match: {status: 'delivered', orderType: 'admin_only'}},
  {$group: {_id: null, total: {$sum: '$amount'}}}
])
```

### Check Vendor Passwords
```bash
# API Test  
curl -X GET "http://localhost:5000/api/admin/vendor-management/vendors/<vendor_id>" \
  -H "Authorization: Bearer <admin_token>"

# Database Query
db.vendors.findOne(
  {email: 'vendor1@gmail.com'}, 
  {tempPasswordForAdmin: 1, businessName: 1}
)
```

### Test Vendor Impersonation
```bash
# Login with impersonation header
curl -X POST "http://localhost:5000/api/vendors/login" \
  -H "Content-Type: application/json" \
  -H "x-admin-impersonation: true" \
  -d '{"email": "vendor@example.com", "password": "password"}'
```

## File Locations

### Key Backend Files
- Revenue: `backend/controllers/adminController.js`
- Vendor Management: `backend/controllers/adminVendorController.js`  
- Password Tracking: `backend/controllers/vendorAuthController.js`
- Vendor Model: `backend/models/Vendor.js`

### Key Frontend Files
- Admin Dashboard: `frontend/src/pages/Admin/AdminDashboard.jsx`
- Vendor Details: `frontend/src/pages/Admin/VendorDetailPage.jsx`
- Vendor Context: `frontend/src/contexts/VendorAuthContext.jsx`
- Admin API: `frontend/src/services/adminAPI.js`

## Endpoint Summary

| Feature | Method | Endpoint | Purpose |
|---------|--------|----------|---------|
| Revenue Stats | GET | `/api/admin/dashboard/revenue` | Get admin revenue data |
| Vendor Details | GET | `/api/admin/vendor-management/vendors/:id` | Get vendor details with password |
| Password Change | PUT | `/api/vendors/change-password` | Update vendor password (tracked) |
| Vendor Login | POST | `/api/vendors/login` | Vendor login (impersonation support) |
| Commission Update | PUT | `/api/admin/vendors/:id/commission` | Update vendor commission rate |
| Suspend Vendor | POST | `/api/admin/vendors/:id/suspend` | Suspend vendor account |
| Unsuspend Vendor | POST | `/api/admin/vendors/:id/unsuspend` | Reactivate vendor account |

## Status Check

### System Health
- ✅ Revenue Statistics: Working ($1085 from 11 orders)
- ✅ Vendor Dashboard Access: Working (Orders & Commission tabs)
- ✅ Password Viewing: Working ("2nd_hand_p" visible)
- ✅ Commission Controls: Backend ready, Frontend integrated
- ✅ Suspend Controls: Backend ready, Frontend integrated

### Current Database State
- Vendor `vendor1@gmail.com`: Password "2nd_hand_p" tracked
- Admin revenue: $1085 calculated correctly
- Impersonation system: Headers working properly
- Password tracking: Real-time updates functional

## Troubleshooting

### Common Issues
1. Revenue shows $0 → Check order status filters
2. Password not visible → Verify `tempPasswordForAdmin` field
3. Impersonation fails → Check admin token and headers
4. Vendor access denied → Validate vendor authentication

### Debug Logs
```javascript
// Backend password change logs
console.log('✅ [CHANGE PASSWORD] tempPasswordForAdmin saved for admin viewing');

// Backend impersonation logs  
console.log('🔒 Cleared temporary admin password after admin impersonation');

// Revenue calculation logs
console.log('💰 [BACKEND REVENUE] TOTAL: $1085 from 11 delivered orders');
```

## Security Notes
- Admin tokens required for all admin endpoints
- Vendor passwords only visible to authenticated admins
- Impersonation logged for audit purposes
- Password fields excluded by default in queries
