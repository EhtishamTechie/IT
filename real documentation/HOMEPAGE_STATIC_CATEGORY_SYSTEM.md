# Homepage Static Category System Documentation

## Overview
The Homepage Static Category System is a feature that allows admin users to manage and display curated product collections on the homepage. It consists of up to 4 category cards, each displaying up to 8 selected products in an Amazon-style carousel format.

## System Components

### 1. Database Schema
**Location**: `backend/models/HomepageStaticCategory.js`
```javascript
const homepageStaticCategorySchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  displayOrder: {
    type: Number,
    required: true
  },
  selectedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

// Validation for max 8 products
homepageStaticCategorySchema.path('selectedProducts').validate(function(value) {
  return value.length <= 8;
}, 'A static category cannot have more than 8 products');

// Additional index for better query performance
homepageStaticCategorySchema.index({ displayOrder: 1 });
```

### 2. API Endpoints

#### Backend Routes
**Location**: `backend/routes/homepageStaticCategoryRoutes.js`

1. `GET /api/homepage/static-categories`
   - Returns all static categories with their selected products
   - Populated with category and product details
   - Sorted by displayOrder

2. `POST /api/homepage/static-categories`
   - Creates a new static category
   - Validates maximum of 4 categories limit
   - Body: `{ categoryId, displayOrder }`

3. `PUT /api/homepage/static-categories/:id`
   - Updates selected products for a category
   - Validates maximum of 8 products
   - Body: `{ selectedProducts: [productIds] }`

4. `DELETE /api/homepage/static-categories/:id`
   - Removes a static category

### 3. Frontend Components

#### Admin Panel Component
**Location**: `frontend/src/components/admin/homepage/StaticCategoryManagement.jsx`

Features:
- Category selection
- Product selection (up to 8 per category)
- Display order management
- Preview functionality
- Drag and drop reordering

#### Display Component
**Location**: `frontend/src/components/AmazonStyleProductDisplay.jsx`

Features:
- Responsive product carousels
- Category-wise product display
- Left/right navigation
- React Router integration
- Image lazy loading
- Fallback placeholder images

### 4. Navigation Logic

#### Category Navigation
```javascript
// Format: /category-group/category-name
<Link 
  to={`/category-group/${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
>
```

#### Product Navigation
```javascript
// Format: /product/product-id
<Link
  to={`/product/${productId}`}
>
```

### 5. Image Handling

1. **Product Images**
   - Base Path: Configured in `config.IMAGE_PATHS`
   - Paths available: 
     ```javascript
     {
       products: 'products',
       properties: 'properties',
       usedProducts: 'used-products',
       vendorLogos: 'vendor-logos',
       profiles: 'profiles',
       homepageCategories: 'homepage-categories'
     }
     ```
   - Fallback: `/placeholder-product.jpg`
   - Utility: `getImageUrl('products', imagePath)`
   - Environment based URL configuration:
     ```javascript
     const getBaseUrl = () => {
       return import.meta.env.VITE_API_BASE_URL || 
              import.meta.env.VITE_API_URL || 
              (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
     };
     ```

2. **Error Handling**
   ```javascript
   onError={(e) => {
     e.target.src = '/uploads/products/placeholder-image.jpg';
   }}
   ```

## Implementation Steps

### 1. Admin Panel Setup
1. Navigate to Homepage Management
2. Select "Static Categories" tab
3. Add up to 4 categories
4. For each category:
   - Select main category
   - Choose up to 8 products
   - Set display order
   - Save changes

### 2. Frontend Display
1. Categories load in order
2. Each category shows:
   - Category name
   - "See all" link
   - Product carousel
   - Navigation arrows

### 3. Data Flow
1. Admin selections saved to MongoDB
2. API endpoints serve data
3. Frontend components fetch and display
4. Real-time updates with optimistic UI

## Best Practices

1. **Performance**
   - Image optimization
   - Lazy loading
   - Pagination/limiting
   - Caching headers

2. **Error Handling**
   - Fallback images
   - Loading states
   - Error boundaries
   - Validation messages

3. **Security**
   - Admin authentication
   - Input validation
   - XSS prevention
   - CSRF protection

## Configuration Options

### Backend
```javascript
const config = {
  maxCategories: 4,
  maxProductsPerCategory: 8,
  imagePath: '/uploads/products/',
  cacheTimeout: 3600
};
```

### Frontend
```javascript
const settings = {
  scrollAmount: 320,  // Width of one product + gap
  minProductsForArrows: 4,
  imageHeight: 'h-72',
  transitionDuration: 300
};
```

## Troubleshooting

1. **Images Not Loading**
   - Check image path configuration
   - Verify file permissions
   - Ensure proper encoding

2. **Navigation Issues**
   - Verify React Router setup
   - Check URL formatting
   - Validate category slugs

3. **Admin Panel**
   - Verify authentication
   - Check MongoDB connection
   - Validate input data
