# Homepage Card Management System - Complete Documentation

## Overview
The Homepage Card Management System provides a dynamic, configurable interface for displaying featured category cards on the website homepage. It supports two types of cards: single category cards with main images and multi-subcategory cards displaying 4 subcategory items each.

## System Architecture

### Backend Components

#### 1. Data Model (`backend/models/HomepageCard.js`)
```javascript
// Main schema structure
const homepageCardSchema = {
  title: String (required, trimmed),
  type: Enum['main-category', 'subcategories'],
  order: Number (1-4, unique),
  mainCategory: ObjectId (ref: Category),
  mainImage: String (required for main-category type),
  subcategoryItems: Array of subcategoryItemSchema,
  linkText: String (default: 'Shop now'),
  isActive: Boolean (default: true),
  timestamps: true
}

const subcategoryItemSchema = {
  name: String (required),
  image: String (required),
  category: ObjectId (ref: Category, required)
}
```

**Validation Rules:**
- Order must be between 1-4 and unique
- Main image required only for 'main-category' type
- Subcategories type must have exactly 4 subcategory items
- Main image not allowed for 'subcategories' type

**Indexes:**
- Composite index on `{ order: 1, isActive: 1 }` for performance

#### 2. API Routes (`backend/routes/homepageCardRoutes.js`)

**File Upload Configuration:**
- Storage: `backend/uploads/homepage-cards/`
- Filename pattern: `card-{timestamp}-{random}.{ext}`
- Size limit: 5MB per file
- File filter: Images only

**Endpoints:**

##### GET `/api/homepage/cards`
- **Purpose:** Fetch active homepage cards for public display
- **Authentication:** None required
- **Response:** Array of active cards sorted by order
- **Population:** Includes mainCategory and subcategoryItems.category names

##### GET `/api/homepage/cards/admin`
- **Purpose:** Fetch all cards (including inactive) for admin management
- **Authentication:** Admin required (`authenticateAdmin`)
- **Response:** All cards with full population
- **Usage:** Admin interface card listing

##### POST `/api/homepage/cards`
- **Purpose:** Create new homepage card
- **Authentication:** Admin required
- **File Upload:** Supports multiple image fields:
  - `mainImage`: For main-category type
  - `subcategoryImage1-4`: For subcategory items
- **Request Body:**
  ```javascript
  {
    title: String,
    type: 'main-category' | 'subcategories',
    order: Number (1-4),
    mainCategory: String (Category ID),
    linkText: String,
    subcategoryData: JSON String (for subcategories type)
  }
  ```
- **Validation:** Order uniqueness, category existence, image requirements
- **File Handling:** Automatic filename generation and storage

##### PUT `/api/homepage/cards/:id`
- **Purpose:** Update existing homepage card
- **Authentication:** Admin required
- **File Upload:** Same as POST (optional for updates)
- **Features:**
  - Preserves existing images if no new files uploaded
  - Validates order changes for conflicts
  - Updates subcategory items with new images
- **Order Management:** Automatic reordering when order conflicts occur

##### DELETE `/api/homepage/cards/:id`
- **Purpose:** Delete homepage card and associated files
- **Authentication:** Admin required
- **File Cleanup:** Removes all associated image files from filesystem
- **Error Handling:** Continues deletion even if file cleanup fails

### Frontend Components

#### 1. Public Display Component (`frontend/src/components/DynamicHomepageCards.jsx`)

**Features:**
- **Caching System:** 30-second cache to reduce API calls
- **Responsive Design:** Grid layout adapting to screen sizes
- **Loading States:** Skeleton loading animation
- **Placeholder Cards:** Default display for unconfigured positions
- **Image Handling:** Automatic URL generation for all image types

**Grid Layout:**
- Mobile: 1 column
- Tablet: 2 columns  
- Desktop: 4 columns
- All positions (1-4) always displayed

**Card Types Rendering:**
- **Main Category:** Single large image with title and category link
- **Subcategories:** Grid of 4 subcategory items with individual images and links

**URL Generation:**
```javascript
// Category URLs
getCategoryUrl(categoryId, categoryName) => 
  `/category-group/${sanitized-category-name}`

// Image URLs
getCardImageUrl(card) => `/api/images/homepage-cards/${filename}`
getSubcategoryImageUrl(item) => `/api/images/homepage-cards/${filename}`
```

#### 2. Admin Management Interface (`frontend/src/components/admin/homepage/CardManagement.jsx`)

**Core Functionality:**
- **CRUD Operations:** Complete create, read, update, delete for cards
- **Category Integration:** Fetches both admin and vendor categories
- **Image Management:** Upload, preview, and replacement of images
- **Order Management:** Drag-and-drop reordering (planned feature)
- **Form Validation:** Client-side validation before submission

**State Management:**
```javascript
const state = {
  cards: Array,           // Current cards
  categories: Array,      // All available categories
  categoryMap: Object,    // MainCategory ID -> Subcategories array
  subcategories: Object,  // Cached subcategories by main category
  formData: Object,       // Current form state
  images: Object,         // File inputs for uploads
  loading: Boolean,
  error: String,
  isModalOpen: Boolean,
  editingCard: Object
}
```

**Category Management:**
- Combines admin and vendor categories for comprehensive selection
- Builds category map for parent-child relationships
- Dynamic subcategory loading based on main category selection

**Form Handling:**
- **Two Card Types:** Toggle between main-category and subcategories
- **Dynamic Form Fields:** Form adapts based on selected card type
- **Image Previews:** Real-time preview of uploaded images
- **Validation:** Required field validation and file type checking

**Modal System:**
- Create new card modal
- Edit existing card modal
- Delete confirmation dialogs
- Image preview modals

#### 3. Admin Page Integration (`frontend/src/pages/Admin/HomepageManagement.jsx`)

**Tab System:**
- Multiple homepage management tabs
- Card Management as dedicated tab
- Integrated with main admin navigation

**Navigation Path:**
`Admin Dashboard → Homepage Management → Cards Settings`

## API Integration Patterns

### Image Serving
```javascript
// Backend image serving (configured in main API routes)
GET /api/images/homepage-cards/:filename
- Serves images from backend/uploads/homepage-cards/
- Content-Type: Automatic based on file extension
- Error handling for missing files
```

### Frontend API Usage
```javascript
// API configuration
import API from '../../../api';
import { getApiUrl, getImageUrl } from '../../../config';

// Fetch cards
const response = await API.get(getApiUrl('homepage/cards'));

// Create card with files
const formData = new FormData();
formData.append('title', cardData.title);
formData.append('mainImage', imageFile);
await API.post(getApiUrl('homepage/cards'), formData);

// Image URL generation
const imageUrl = getImageUrl('homepage-cards', filename);
```

## File Structure

```
backend/
├── models/
│   └── HomepageCard.js           # Data model with validation
├── routes/
│   └── homepageCardRoutes.js     # API endpoints with file upload
├── uploads/
│   └── homepage-cards/           # Image storage directory
└── middleware/
    ├── auth.js                   # Admin authentication
    └── uploadMiddleware.js       # File upload configuration

frontend/
├── src/
│   ├── components/
│   │   ├── DynamicHomepageCards.jsx     # Public display component
│   │   ├── HeroSection.jsx              # Contains card display
│   │   └── admin/
│   │       ├── homepage/
│   │       │   └── CardManagement.jsx   # Admin interface
│   │       ├── LoadingState.jsx         # Loading component
│   │       └── ErrorState.jsx           # Error component
│   ├── pages/
│   │   └── Admin/
│   │       ├── HomepageManagement.jsx   # Admin page container
│   │       └── homepage/
│   │           └── index.jsx            # Homepage admin routing
│   ├── api/                             # API configuration
│   └── config/                          # URL generation utilities
```

## Data Flow

### Card Creation Process:
1. **Admin opens CardManagement interface**
2. **Fetches all categories (admin + vendor)**
3. **Builds category map for subcategory relationships**
4. **User fills form and uploads images**
5. **Form validation on frontend**
6. **FormData creation with files and metadata**
7. **API call to POST /api/homepage/cards**
8. **Backend validation and file processing**
9. **Database record creation**
10. **Success response triggers UI update**

### Card Display Process:
1. **DynamicHomepageCards component mounts**
2. **Checks cache for existing data**
3. **Fetches from GET /api/homepage/cards if needed**
4. **Renders 4-position grid with cards or placeholders**
5. **Generates image URLs using configuration**
6. **Handles click navigation to category pages**

## Security Features

### Authentication
- **Admin routes protected** with `authenticateAdmin` middleware
- **Public display routes** accessible without authentication
- **File upload** restricted to admin users only

### File Upload Security
- **File type validation:** Images only
- **Size limits:** 5MB per file
- **Filename sanitization:** Timestamp + random suffix
- **Directory isolation:** Separate upload directory

### Input Validation
- **Backend validation:** Mongoose schema validation
- **Frontend validation:** Form field requirements
- **Category existence checks:** Validates referenced categories exist
- **Order uniqueness:** Prevents duplicate card positions

## Error Handling

### Backend Error Responses
```javascript
{
  success: false,
  message: "Descriptive error message",
  error: "Detailed error for debugging" // Development only
}
```

### Frontend Error Handling
- **Network errors:** API connection failures
- **Validation errors:** Form field validation
- **File upload errors:** Size, type, upload failures  
- **User feedback:** Toast notifications for all operations

### File System Errors
- **Upload failures:** Proper error response with cleanup
- **Delete operations:** Continue even if file cleanup fails
- **Missing files:** Graceful handling in image serving

## Performance Optimizations

### Caching Strategy
- **Frontend caching:** 30-second cache for card data
- **Database indexing:** Optimized queries with compound indexes
- **Image optimization:** Direct file serving without processing

### Query Optimization
- **Population strategy:** Only populate required fields
- **Sorting:** Database-level sorting by order
- **Active filtering:** Filter inactive cards at database level

### Frontend Performance
- **Lazy loading:** Images loaded as needed
- **Responsive images:** Appropriate sizing for different screens
- **Loading states:** Skeleton animations during data fetch

## Integration Points

### Category System Integration
- **Depends on Category model** for validation and population
- **Uses both admin and vendor categories** for comprehensive selection
- **Category URL generation** for navigation links

### Authentication System Integration
- **Leverages existing admin auth middleware**
- **Session-based admin authentication**
- **Role-based access control**

### Image Management Integration
- **Uses shared upload middleware**
- **Integrates with image serving system**
- **Consistent URL generation patterns**

## Usage Examples

### Creating a Main Category Card
```javascript
// Admin form data
const cardData = {
  title: "Electronics",
  type: "main-category", 
  order: 1,
  mainCategory: "60f7b3b3c9a6b12345678901",
  linkText: "Shop Electronics"
};

// With main image file
const formData = new FormData();
Object.keys(cardData).forEach(key => 
  formData.append(key, cardData[key])
);
formData.append('mainImage', imageFile);
```

### Creating a Subcategories Card
```javascript
// Admin form data with subcategories
const cardData = {
  title: "Fashion Categories",
  type: "subcategories",
  order: 2, 
  mainCategory: "60f7b3b3c9a6b12345678902",
  subcategoryData: JSON.stringify([
    { name: "Men's Clothing", categoryId: "..." },
    { name: "Women's Clothing", categoryId: "..." },
    { name: "Shoes", categoryId: "..." },
    { name: "Accessories", categoryId: "..." }
  ])
};

// With 4 subcategory images
formData.append('subcategoryImage1', image1File);
formData.append('subcategoryImage2', image2File);
formData.append('subcategoryImage3', image3File);
formData.append('subcategoryImage4', image4File);
```

## Future Enhancements

### Planned Features
- **Drag-and-drop reordering:** Visual order management
- **Image editing:** Crop, resize, filters
- **Bulk operations:** Multiple card management
- **Preview mode:** Live preview before publishing
- **Analytics integration:** Card performance tracking
- **A/B testing:** Multiple card versions

### Scalability Considerations
- **CDN integration:** Image delivery optimization
- **Caching layers:** Redis for card data
- **Database sharding:** Large-scale deployments
- **API versioning:** Backward compatibility

## Troubleshooting Guide

### Common Issues
1. **Images not displaying:** Check file permissions and upload directory
2. **Order conflicts:** Validate unique order constraints
3. **Category not found:** Ensure referenced categories exist
4. **Upload failures:** Check file size and type restrictions
5. **Cache issues:** Clear browser cache or wait for cache expiration

### Debug Information
- **Frontend console:** Component-level debugging enabled
- **Backend logging:** Request/response logging for API calls
- **File system monitoring:** Upload and delete operation logs
- **Database queries:** Mongoose debug mode available

This documentation provides complete coverage of the Homepage Card Management System, including all routes, endpoints, file structures, logic flows, and integration patterns as requested.
