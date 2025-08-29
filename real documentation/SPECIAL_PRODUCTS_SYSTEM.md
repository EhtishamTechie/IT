# Special Products System Documentation

## Overview
The Special Products System manages two types of highlighted products on the International Tijarat platform:
1. Premium Products
2. Featured Products

## System Architecture

### Database Models

#### Premium Products Model
Location: `backend/models/PremiumProducts.js`
```javascript
const premiumProductsSchema = {
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}
```

### Frontend Components

#### 1. PremiumProductDisplay Component
Location: `frontend/src/components/PremiumProductDisplay.jsx`

Purpose: Main component for displaying special products on the homepage with three tabs:
- Premium Tab: Shows premium products
- Trending Tab: Shows new arrivals
- Featured Tab: Shows featured products

#### 2. Admin Components
Location: `frontend/src/components/admin/homepage/`

Components:
- `PremiumProductsManager.jsx`: Admin interface for managing premium products
- `SpecialProductsManager.jsx`: Base component for managing both premium and featured products

### Backend Routes

#### 1. Special Products API Routes
Location: `backend/routes/specialProducts.js`

Public Endpoints:
```
GET /api/special/premium
- Purpose: Get all premium products
- Authentication: None required
- Response: Array of premium products with populated details

GET /api/special/featured
- Purpose: Get all featured products
- Authentication: None required
- Response: Array of featured products with populated details
```

Admin Endpoints:
```
PUT /api/special/premium
- Purpose: Update premium products list
- Authentication: Admin only
- Request body: { productIds: string[] }
- Response: Updated premium products array

PUT /api/special/featured
- Purpose: Update featured products list
- Authentication: Admin only
- Request body: { productIds: string[] }
- Response: Updated featured products array

GET /api/special/category/:categoryId
- Purpose: Get products by category for selection
- Authentication: Admin only
- Response: Array of products in the specified category
```

#### 2. Product Routes
Location: `backend/routes/productRoutes.js`

Public Endpoints with Caching:
```
GET /api/products/featured
GET /api/products/premium
GET /api/products/trending
GET /api/products/new-arrivals
```

### Frontend Services

#### Product Service
Location: `frontend/src/services/productService.js`

Key Methods:
```javascript
static async getPremiumProducts(limit = 8)
// Fetches premium products with optional limit
// Returns formatted product data with image URLs

static formatProducts(products)
// Formats product data for frontend display
// Adds image URLs and other display-ready properties
```

### Admin Panel Management

#### Special Products Manager
Path: `/admin/homepage/special-products`

Features:
1. Separate tabs for Premium and Featured products
2. Product selection interface with filters
3. Drag-and-drop reordering
4. Save/Update functionality with immediate preview

Admin Operations:
- Select/Deselect products for premium/featured status
- Reorder selected products
- View current selections with preview
- Update and publish changes

### Cache Implementation

The system implements caching for better performance:

```javascript
// Product route caching
router.get('/featured', cacheService.middleware(PRODUCT_LIST_CACHE), getFeaturedProducts);
router.get('/premium', cacheService.middleware(PRODUCT_LIST_CACHE), getPremiumProducts);
```

Cache invalidation occurs on:
- Product updates
- Premium/Featured list changes
- Admin product management operations

### Security

1. Admin Authentication:
```javascript
// Admin routes protection
router.put('/premium', [auth, admin], async (req, res) => {
    // Update premium products
});
```

2. Route Protection:
- Public routes: Open access with rate limiting
- Admin routes: Requires authentication and admin role
- Cache-enabled routes: Protected against cache poisoning

### Integration Points

1. Homepage Integration:
- PremiumProductDisplay component renders in HomePage
- Auto-fetches data on mount
- Handles loading and error states

2. Admin Panel Integration:
- Special products management in admin dashboard
- Real-time preview of changes
- Immediate cache invalidation on updates

### Error Handling

1. Frontend Error Handling:
```javascript
catch (err) {
    console.error('❌ Error loading products:', err);
    setError('Unable to load products. Please try again later.');
    // Fallback to static products in development environment
}
```

2. Backend Error Handling:
```javascript
catch (error) {
    res.status(500).json({ message: error.message });
}
```

## Usage Guide

### For Developers

1. Adding New Special Products:
```javascript
const updatePremiumProducts = async (productIds) => {
    await axios.put('/api/special/premium', { productIds });
};
```

2. Fetching Special Products:
```javascript
const fetchPremiumProducts = async () => {
    const response = await axios.get('/api/special/premium');
    return response.data;
};
```

### For Administrators

1. Accessing Special Products Management:
- Navigate to Admin Dashboard
- Select "Homepage Management"
- Choose "Special Products"

2. Managing Products:
- Use tabs to switch between Premium/Featured
- Select products from the product list
- Drag to reorder if needed
- Save changes to update the homepage

### Best Practices

1. Product Selection:
- Keep premium/featured lists under 12 products
- Update regularly for freshness
- Ensure selected products have stock
- Verify all product images load correctly

2. Performance:
- Utilize caching for better response times
- Invalidate cache when updating products
- Monitor API response times
- Use pagination where appropriate

## Troubleshooting

Common Issues:
1. Products not displaying
   - Check cache invalidation
   - Verify product IDs exist
   - Ensure proper population in queries

2. Admin updates not reflecting
   - Clear browser cache
   - Verify admin permissions
   - Check network requests
   - Validate cache invalidation

## API Documentation

### Special Products API

#### Get Premium Products
```
GET /api/special/premium

Response:
{
    success: true,
    products: [
        {
            _id: string,
            title: string,
            price: number,
            image: string,
            // ... other product fields
        }
    ]
}
```

#### Update Premium Products
```
PUT /api/special/premium
Authorization: Bearer {admin_token}

Request:
{
    productIds: string[]
}

Response:
{
    success: true,
    products: [
        // Updated premium products array
    ]
}
```

Similar endpoints exist for Featured Products with `/api/special/featured` path.
