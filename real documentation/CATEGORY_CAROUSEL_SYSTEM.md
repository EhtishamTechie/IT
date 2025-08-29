# Category Carousel System Documentation

## Overview
The Category Carousel is an interactive component that displays all available categories in an infinite-scroll carousel format. It provides an engaging way for users to browse and access different product categories.

## System Components

### 1. Database Integration

#### Category Schema
**Location**: `backend/models/Category.js`
```javascript
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // null for admin-created categories
  },
  createdByType: {
    type: String,
    enum: ['admin', 'vendor'],
    default: 'admin'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ name: 1 });
```

### 2. API Endpoints

#### Backend Routes
**Location**: `backend/routes/categoryRoutes.js`

1. `GET /api/categories`
   - Returns all categories
   - Optional parent category filtering
   - Populated with parent category info

2. `GET /api/categories/:id/products`
   - Returns products for a specific category
   - Supports pagination and filtering
   - Returns sample images for category display

### 3. Frontend Components

#### Main Component
**Location**: `frontend/src/components/CategoryCarousel.jsx`

Features:
- Infinite scroll carousel
- Auto-play functionality
- Pause on hover
- Responsive design
- Dynamic gradient generation
- Image lazy loading

### 4. Component Structure

#### Visual Elements
1. **Header Section**
   ```jsx
   <div className="text-center mb-12">
     <div className="inline-flex bg-orange-100 text-orange-600">
       <span>Explore Categories</span>
     </div>
     <h2>Shop by Category</h2>
   </div>
   ```

2. **Carousel Container**
   ```jsx
   <div className="carousel-container">
     <div className="animate-infinite-scroll">
       {categories.map((category) => (
         <CategoryCard />
       ))}
     </div>
   </div>
   ```

#### Animation System
```css
@keyframes infinite-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-${categoriesWidth}px); }
}

.animate-infinite-scroll {
  animation: infinite-scroll 40s linear infinite;
}
```

### 5. Navigation Logic

#### Category Group Navigation
```javascript
// Format: /category-group/category-slug
const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
<Link to={`/category-group/${slug}`}>
```

### 6. Image Handling

1. **Category Images**
   - Dynamic fetching from first product
   - Fallback system
   - Lazy loading
   - Error handling

2. **Gradient System**
```javascript
const gradients = {
  'Electronics': 'from-blue-500 to-indigo-600',
  'Fashion': 'from-pink-500 to-rose-600',
  // ... other category gradients
};
```

## Implementation Details

### 1. Category Loading Process
1. Fetch categories from API
2. For each category:
   - Fetch sample product image
   - Generate gradient
   - Create slug
   - Setup navigation

### 2. Animation System
1. Triple the category array
2. Calculate total width
3. Apply infinite scroll animation
4. Handle pause/resume
5. Manage hover states

### 3. Error Handling
1. Image loading fallbacks
2. Category data validation
3. Navigation error prevention
4. Loading state management

## Best Practices

### 1. Performance Optimization
- Image lazy loading
- Animation performance
- DOM recycling
- Memory management

### 2. User Experience
- Smooth scrolling
- Responsive design
- Interactive feedback
- Loading states

### 3. Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

## Configuration Options

### Component Settings
```javascript
const settings = {
  animationDuration: 40, // seconds
  autoPlay: true,
  pauseOnHover: true,
  imageSize: {
    width: 300,
    height: 300
  }
};

// API Configuration (from config.js)
export const config = {
  BASE_URL: getBaseUrl(),
  API_BASE_URL: `${getBaseUrl()}/api`,
  UPLOADS_URL: `${getBaseUrl()}`,
  APP_NAME: import.meta.env.VITE_APP_NAME || 'International Tijarat',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  IMAGE_PATHS: {
    products: 'products',
    properties: 'properties',
    usedProducts: 'used-products',
    vendorLogos: 'vendor-logos',
    profiles: 'profiles',
    homepageCategories: 'homepage-categories'
  }
};
```

### Style Configuration
```javascript
const styles = {
  cardWidth: 240,
  cardHeight: 320,
  gapSize: 16,
  borderRadius: 16,
  shadowDepth: 'shadow-lg'
};
```

## State Management

### 1. Component States
```javascript
const [isPaused, setIsPaused] = useState(false);
const [categories, setCategories] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

### 2. Image States
```javascript
const [failedImages, setFailedImages] = useState(new Set());
const [loadedImages, setLoadedImages] = useState(new Set());
```

## Event Handlers

### 1. Mouse Interaction
```javascript
const handleMouseEnter = () => setIsPaused(true);
const handleMouseLeave = () => setIsPaused(false);
```

### 2. Image Handling
```javascript
const handleImageError = (categoryId) => {
  setFailedImages(prev => new Set([...prev, categoryId]));
};

const handleImageLoad = (categoryId) => {
  setLoadedImages(prev => new Set([...prev, categoryId]));
};
```

## Troubleshooting Guide

### 1. Animation Issues
- Check CSS animation properties
- Verify container width calculations
- Monitor performance metrics
- Debug pause/resume functionality

### 2. Image Problems
- Verify image paths
- Check fallback system
- Monitor loading states
- Validate image dimensions

### 3. Navigation Errors
- Verify route configuration
- Check slug generation
- Validate category data
- Monitor link behavior

## Maintenance and Updates

### 1. Regular Tasks
- Update gradients for new categories
- Optimize images
- Review animation performance
- Update fallback systems

### 2. Code Updates
- Keep dependencies current
- Monitor browser compatibility
- Update animation timings
- Refresh design elements
