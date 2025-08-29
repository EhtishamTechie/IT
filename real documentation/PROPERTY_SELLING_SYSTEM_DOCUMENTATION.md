# Property Selling System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [User Workflows](#user-workflows)
7. [Admin Management](#admin-management)
8. [Authentication & Authorization](#authentication--authorization)
9. [File Upload System](#file-upload-system)
10. [WhatsApp Integration](#whatsapp-integration)
11. [Error Handling](#error-handling)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

---

## System Overview

The Property Selling System is a comprehensive real estate platform that allows users to:
- List properties for sale or rent
- Browse and search available properties
- Contact sellers through WhatsApp integration
- Manage property listings (for sellers)
- Admin approval workflow for property listings

### Key Features
- **Property Submission**: Users can submit detailed property listings with multiple images
- **Admin Approval**: All properties require admin approval before going live
- **Search & Filter**: Advanced filtering by type, location, price, bedrooms, etc.
- **Image Management**: Multiple image upload with preview functionality
- **WhatsApp Integration**: Direct contact through WhatsApp with pre-filled messages
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Status Management**: Track property status (pending, approved, sold, etc.)

---

## Architecture

### Technology Stack
- **Frontend**: React.js with Vite, Tailwind CSS, Lucide React icons
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Local file system with multer
- **Communication**: WhatsApp Business API integration

### System Architecture
```
Frontend (React) ↔ REST API (Express) ↔ Database (MongoDB)
                      ↕
                File Storage (Local)
                      ↕
             WhatsApp Integration
```

---

## Database Schema

### Property Model
```javascript
const PropertySchema = new mongoose.Schema({
  // Basic Information
  title: { type: String, required: true },
  description: { type: String, required: true },
  propertyType: { 
    type: String, 
    required: true,
    enum: ['House', 'Apartment', 'Villa', 'Townhouse', 'Office', 'Shop', 'Warehouse', 'Plot', 'Agricultural Land', 'Industrial Land', 'Commercial Building']
  },
  
  // Pricing & Area
  price: { type: Number, required: true },
  area: {
    value: { type: Number, required: true },
    unit: { 
      type: String, 
      required: true, 
      enum: ['sqft', 'marla', 'kanal', 'acre'] 
    }
  },
  
  // Property Details
  bedrooms: Number,
  bathrooms: Number,
  propertyAge: {
    type: String,
    enum: ['New Construction', 'Under 5 Years', '5-10 Years', '10-20 Years', 'Over 20 Years']
  },
  furnishing: {
    type: String,
    enum: ['Fully Furnished', 'Semi Furnished', 'Unfurnished']
  },
  
  // Location
  address: { type: String, required: true },
  city: { type: String, required: true },
  area_name: { type: String, required: true },
  
  // Features & Images
  features: [String],
  images: [String], // URLs to uploaded images
  
  // Seller Information
  submittedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sellerContact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sold'],
    default: 'pending'
  },
  listingType: {
    type: String,
    enum: ['Sale', 'Rent'],
    default: 'Sale'
  },
  
  // Admin Fields
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  
  // Analytics
  views: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  propertyId: { type: String, unique: true }, // Auto-generated ID
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

---

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Get Public Properties
```
GET /api/properties/public
Query Parameters:
- page: number (default: 1)
- limit: number (default: 12)
- propertyType: string
- city: string
- minPrice: number
- maxPrice: number
- bedrooms: number
- listingType: string
- sort: string (price_asc, price_desc, area_asc, area_desc, featured)

Response:
{
  "success": true,
  "data": [Property],
  "pagination": {
    "page": 1,
    "pages": 5,
    "total": 50,
    "limit": 12
  }
}
```

#### Get Property Details
```
GET /api/properties/public/:id

Response:
{
  "success": true,
  "data": Property
}
```

### Protected Endpoints (User Authentication Required)

#### Submit Property
```
POST /api/properties/submit
Headers: Authorization: Bearer <token>
Body: FormData with property details and images

Response:
{
  "success": true,
  "message": "Property submitted successfully",
  "data": {
    "propertyId": "IT-202508-0001"
  }
}
```

#### Get User's Properties
```
GET /api/properties/user/my-listings
Headers: Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [Property]
}
```

#### Update Property Price
```
PATCH /api/properties/user/:id/reduce-price
Headers: Authorization: Bearer <token>
Body: { "newPrice": 1500000 }

Response:
{
  "success": true,
  "message": "Property price updated successfully"
}
```

#### Mark Property as Sold
```
PATCH /api/properties/user/:id/mark-sold
Headers: Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Property marked as sold successfully"
}
```

### Admin Endpoints (Admin Authentication Required)

#### Get All Properties for Review
```
GET /api/admin/properties
Headers: Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": [Property]
}
```

#### Approve Property
```
POST /api/admin/properties/:id/approve
Headers: Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "message": "Property approved successfully"
}
```

#### Reject Property
```
POST /api/admin/properties/:id/reject
Headers: Authorization: Bearer <admin-token>
Body: { "reason": "Incomplete information" }

Response:
{
  "success": true,
  "message": "Property rejected successfully"
}
```

---

## Frontend Components

### Core Components

#### 1. Properties.jsx
**Purpose**: Public property listing page with search and filter functionality
**Location**: `/src/pages/Properties.jsx`
**Features**:
- Property grid display
- Advanced filtering (type, city, price range, bedrooms)
- Search functionality
- WhatsApp contact integration
- Responsive design

**Key Functions**:
```javascript
fetchProperties() // Fetch properties from API
handleFilterChange() // Update filters
formatPrice() // Format price display (Cr, Lac, K)
```

#### 2. SellProperty.jsx
**Purpose**: Property submission form and seller dashboard
**Location**: `/src/pages/SellProperty.jsx`
**Features**:
- Multi-step property submission form
- Image upload with preview
- User's property listings
- Property management (price reduction, mark as sold)
- Form validation with WhatsApp number validation

**Key Functions**:
```javascript
handleSubmit() // Submit property form
handleImageUpload() // Process image uploads
fetchUserProperties() // Get user's properties
markAsSold() // Mark property as sold
handlePriceReduction() // Reduce property price
```

#### 3. PropertyDetailPage.jsx
**Purpose**: Detailed property view page
**Location**: `/src/pages/PropertyDetailPage.jsx`
**Features**:
- Full property information display
- Image gallery with navigation
- Contact information
- WhatsApp and phone integration
- Property features display

**Key Functions**:
```javascript
fetchPropertyDetails() // Get property details
handleWhatsAppContact() // Open WhatsApp with message
formatPrice() // Price formatting
```

#### 4. Admin/PropertyManagement.jsx
**Purpose**: Admin interface for property approval
**Location**: `/src/pages/Admin/PropertyManagement.jsx`
**Features**:
- Property review interface
- Approval/rejection functionality
- Property status management
- Admin notes

**Key Functions**:
```javascript
fetchProperties() // Get properties for review
approveProperty() // Approve property
rejectProperty() // Reject property with reason
```

### Utility Components

#### WhatsApp Integration
**File**: `/src/utils/whatsappUtils.js`
**Functions**:
```javascript
validateWhatsAppNumber(number) // Validate phone format
formatWhatsAppNumber(number) // Format for API
createWhatsAppURL(number, message) // Generate WhatsApp URL
```

---

## User Workflows

### Property Listing Workflow

1. **User Registration/Login**
   - User creates account or logs in
   - Authentication token stored

2. **Property Submission**
   - User navigates to "Sell Property" page
   - Fills form with property details (auto-populated user info)
   - Uploads property images (max 10)
   - Submits form for review

3. **Admin Review**
   - Property appears in admin panel as "pending"
   - Admin reviews details and images
   - Admin either approves or rejects with reason

4. **Property Goes Live**
   - Approved properties appear on public listings
   - Users can search, filter, and contact seller

5. **Property Management**
   - Seller can view analytics
   - Seller can reduce price
   - Seller can mark as sold

### Property Search Workflow

1. **Browse Properties**
   - User visits properties page
   - Views grid of available properties (no prices shown)

2. **Apply Filters**
   - Filter by property type
   - Filter by city/location
   - Filter by bedrooms
   - Search by keywords

3. **View Details**
   - Click on property card
   - View full property details
   - See image gallery
   - View contact information (no prices)

4. **Contact Seller**
   - Click WhatsApp button
   - Pre-filled message opens
   - Direct communication with seller

---

## Admin Management

### Admin Dashboard Features

1. **Property Review Queue**
   - View all pending properties
   - Sort by submission date
   - Quick preview of property details

2. **Approval Process**
   - Review property information
   - Check uploaded images
   - Verify contact details
   - Approve or reject with comments

3. **Property Analytics**
   - View total properties by status
   - Track approval rates
   - Monitor popular property types

### Admin Controls

```javascript
// Admin Property Controller Functions
getAllProperties() // Get all properties for review
getPropertyForReview() // Get specific property details
approveProperty() // Approve property listing
rejectProperty() // Reject with reason
updatePropertyStatus() // Change property status
```

---

## Authentication & Authorization

### User Authentication
- JWT-based authentication
- Token stored in localStorage
- Auto-refresh mechanism
- Password hashing with bcrypt

### Admin Authentication
- Separate admin authentication
- Role-based access control
- Admin token validation
- Protected admin routes

### Authorization Middleware
```javascript
// User Authentication
const authenticateToken = (req, res, next) => {
  // Verify user JWT token
}

// Admin Authentication
const authAdmin = (req, res, next) => {
  // Verify admin JWT token and role
}
```

---

## File Upload System

### Image Upload Configuration
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/properties/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'property-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});
```

### Image Processing
- Automatic file naming with timestamps
- File type validation
- Size limitations
- Error handling for upload failures

---

## WhatsApp Integration

### Contact System
```javascript
const handleWhatsAppContact = (property) => {
  const message = encodeURIComponent(
    `Hi, I'm interested in your property: ${property.title}\n\n` +
    `Property ID: ${property.propertyId}\n` +
    `Location: ${property.area_name}, ${property.city}\n\n` +
    `Please share more details.`
  );
  window.open(`https://wa.me/923005567507?text=${message}`, '_blank');
};
```

### Features
- Pre-filled messages with property details
- Seller contact information
- Direct WhatsApp link generation
- Mobile-optimized contact flow

---

## Error Handling

### Frontend Error Handling
```javascript
// API Error Handling
try {
  const response = await axios.get('/api/properties/public');
  if (response.data.success) {
    setProperties(response.data.data || []);
  } else {
    setProperties([]);
  }
} catch (error) {
  console.error('Error fetching properties:', error);
  setProperties([]); // Ensure properties is always an array
}
```

### Backend Error Handling
```javascript
// Express Error Middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});
```

### Common Error Scenarios
1. **Network Failures**: Graceful degradation with loading states
2. **Authentication Errors**: Redirect to login page
3. **Validation Errors**: Form-specific error messages
4. **File Upload Errors**: Size and type validation
5. **Database Errors**: Proper error responses

---

## Testing

### Frontend Testing
```bash
# Run component tests
npm test

# Run e2e tests
npm run test:e2e
```

### Backend Testing
```bash
# Run API tests
npm run test:api

# Test specific endpoints
curl -X GET "http://localhost:5000/api/properties/public"
```

### Test Scenarios
1. **Property Submission**: Valid and invalid form data
2. **Image Upload**: Various file types and sizes
3. **Search Functionality**: Filter combinations
4. **Admin Approval**: Approve/reject workflows
5. **Authentication**: Token validation and expiry

---

## Deployment

### Environment Setup
```bash
# Backend Environment Variables
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/internationaltijarat
JWT_SECRET=your-secret-key
UPLOAD_DIR=uploads/

# Frontend Environment Variables
VITE_API_URL=http://localhost:5000
```

### Build Process
```bash
# Frontend Build
cd frontend
npm run build

# Backend Setup
cd backend
npm install --production
```

### Production Considerations
1. **File Storage**: Consider cloud storage (AWS S3, Cloudinary)
2. **Database**: MongoDB Atlas for production
3. **Image Optimization**: Compress images for web
4. **CDN**: Use CDN for static assets
5. **SSL**: HTTPS for secure communication

---

## Troubleshooting

### Common Issues

#### 1. Properties Not Showing
**Problem**: Properties page shows "No properties found"
**Solution**: 
- Check API response format (expects `data` field)
- Verify properties have status 'approved'
- Check network connectivity

#### 2. Images Not Loading
**Problem**: Property images not displaying
**Solution**:
- Verify image URLs in database
- Check upload directory permissions
- Ensure correct base URL configuration

#### 3. WhatsApp Links Not Working
**Problem**: WhatsApp button doesn't open app
**Solution**:
- Verify phone number format
- Check WhatsApp URL encoding
- Test on different devices

#### 4. Form Default Values Not Loading
**Problem**: User details not auto-filling in forms
**Solution**:
- Check user authentication status
- Verify user object structure
- Ensure useEffect hooks are running

### Debug Commands
```javascript
// Debug user data
console.log('User object:', user);
console.log('Form data:', formData);

// Debug API responses
console.log('API response:', response.data);

// Debug authentication
console.log('Token:', localStorage.getItem('token'));
```

---

## Performance Optimization

### Frontend Optimization
1. **Lazy Loading**: Load images on scroll
2. **Pagination**: Limit properties per page
3. **Caching**: Cache API responses
4. **Code Splitting**: Split components for faster loading

### Backend Optimization
1. **Database Indexing**: Index frequently queried fields
2. **Image Compression**: Optimize uploaded images
3. **API Caching**: Cache frequently requested data
4. **Query Optimization**: Efficient MongoDB queries

---

## Security Considerations

### Data Protection
1. **Input Validation**: Validate all form inputs
2. **File Upload Security**: Restrict file types and sizes
3. **SQL Injection Prevention**: Use parameterized queries
4. **XSS Protection**: Sanitize user inputs

### Authentication Security
1. **Token Expiry**: Implement token refresh
2. **Password Hashing**: Use bcrypt for passwords
3. **Rate Limiting**: Prevent API abuse
4. **CORS Configuration**: Restrict cross-origin requests

---

## Future Enhancements

### Planned Features
1. **Advanced Search**: Location-based search with maps
2. **Property Comparison**: Compare multiple properties
3. **Saved Searches**: Email alerts for new matches
4. **Virtual Tours**: 360° property views
5. **Mortgage Calculator**: Built-in financing tools

### Technical Improvements
1. **Microservices**: Split into smaller services
2. **Real-time Updates**: WebSocket for live updates
3. **Mobile App**: React Native application
4. **AI Integration**: Property value estimation
5. **Analytics Dashboard**: Detailed property analytics

---

## Conclusion

The Property Selling System provides a comprehensive platform for real estate transactions with a focus on user experience, security, and scalability. The modular architecture allows for easy maintenance and future enhancements while maintaining high performance and reliability.

For technical support or feature requests, please refer to the development team or create an issue in the project repository.

---

**Document Version**: 1.0  
**Last Updated**: August 14, 2025  
**Authors**: Development Team  
**Review Date**: September 14, 2025
