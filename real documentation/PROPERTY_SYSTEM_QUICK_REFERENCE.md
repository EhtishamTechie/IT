# Property Selling System - Quick Reference Guide

## 🚀 Quick Start

### Development Setup
```bash
# Backend
cd backend
npm install
npm start  # Runs on http://localhost:5000

# Frontend  
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

### Environment Variables
```bash
# Backend (.env)
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/internationaltijarat
JWT_SECRET=your-secret-key

# Frontend (.env)
VITE_API_URL=http://localhost:5000
```

---

## 📋 Key API Endpoints

### Public Endpoints
```
GET  /api/properties/public              # Get all approved properties
GET  /api/properties/public/:id          # Get property details
```

### User Endpoints (Requires Auth)
```
POST /api/properties/submit              # Submit new property
GET  /api/properties/user/my-listings    # Get user's properties
PATCH /api/properties/user/:id/reduce-price  # Reduce property price
PATCH /api/properties/user/:id/mark-sold     # Mark property as sold
```

### Admin Endpoints (Requires Admin Auth)
```
GET  /api/admin/properties               # Get properties for review
POST /api/admin/properties/:id/approve  # Approve property
POST /api/admin/properties/:id/reject   # Reject property
```

---

## 🗂️ File Structure

```
src/
├── pages/
│   ├── Properties.jsx              # Public property listings
│   ├── PropertyDetailPage.jsx      # Property detail view
│   ├── SellProperty.jsx           # Property submission & seller dashboard
│   └── Admin/
│       └── PropertyManagement.jsx  # Admin property review
├── contexts/
│   └── AuthContext.jsx            # Authentication context
├── utils/
│   └── whatsappUtils.js           # WhatsApp integration utilities
└── components/
    └── [Various UI components]
```

---

## 🔧 Common Development Tasks

### Adding New Property Field
1. **Backend**: Update Property schema in `models/Property.js`
2. **Frontend**: Add field to form in `SellProperty.jsx`
3. **API**: Update validation in `propertyController.js`
4. **Display**: Add field to `PropertyDetailPage.jsx`

### Modifying Search Filters
1. **Backend**: Update filter logic in `getPublicProperties()` 
2. **Frontend**: Add filter UI in `Properties.jsx`
3. **Update**: Modify `handleFilterChange()` function

### Updating WhatsApp Message Template
**File**: `PropertyDetailPage.jsx` → `handleWhatsAppContact()`
```javascript
const message = encodeURIComponent(
  `Your custom message template here`
);
```

---

## 🐛 Common Issues & Solutions

### Issue: Properties not showing
**Check**: 
- API response format (`response.data.data`)
- Property status is 'approved'
- Database connection

### Issue: Images not loading  
**Check**:
- Upload directory permissions
- Image URL format in database
- File path configuration

### Issue: Form default values not working
**Check**:
- User authentication status
- useEffect dependencies
- User object structure

---

## 🎨 Styling Guide

### Color Scheme
- **Primary**: Orange (`bg-orange-600`, `text-orange-600`)
- **Success**: Green (`bg-green-600`)
- **Secondary**: Gray (`bg-gray-100`, `text-gray-600`)
- **WhatsApp**: Green (`bg-green-500`)

### Button Patterns
```jsx
// Primary Action
className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded"

// WhatsApp Button
className="bg-green-500 hover:bg-green-600 text-white"

// Secondary Action  
className="bg-gray-100 hover:bg-gray-200 text-gray-700"
```

---

## 📱 WhatsApp Integration

### Contact Number
Current: `+92 300 5567507`

### Message Template
```javascript
const message = `Hi, I'm interested in your property: ${property.title}

Property ID: ${property.propertyId}
Location: ${property.area_name}, ${property.city}

Please share more details.`;
```

### Implementation
```javascript
const handleWhatsAppContact = () => {
  const message = encodeURIComponent(messageTemplate);
  window.open(`https://wa.me/923005567507?text=${message}`, '_blank');
};
```

---

## 🔒 Authentication Flow

### User Auth
1. User logs in → JWT token generated
2. Token stored in localStorage
3. Token sent in Authorization header
4. Middleware validates token

### Admin Auth  
1. Admin logs in → Admin JWT token
2. Admin token has role verification
3. Protected admin routes check role

---

## 📊 Database Schema Quick Reference

### Property Model Key Fields
```javascript
{
  title: String,
  description: String,
  propertyType: Enum,
  price: Number,
  area: { value: Number, unit: String },
  bedrooms: Number,
  bathrooms: Number,
  address: String,
  city: String,
  area_name: String,
  features: [String],
  images: [String],
  status: Enum ['pending', 'approved', 'rejected', 'sold'],
  submittedBy: ObjectId,
  sellerContact: Object,
  propertyId: String (auto-generated),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing Commands

### Quick API Tests
```bash
# Test public properties
curl http://localhost:5000/api/properties/public

# Test property details
curl http://localhost:5000/api/properties/public/:id

# Test with auth (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/properties/user/my-listings
```

### Frontend Tests
```bash
npm test                 # Run component tests
npm run test:e2e        # Run end-to-end tests
```

---

## 📝 Form Validation Rules

### Property Submission
- **Title**: Required, min 5 chars
- **Description**: Required, min 20 chars  
- **Price**: Required, numeric, > 0
- **Images**: Required, max 10 files, 5MB each
- **Phone**: WhatsApp format validation
- **Area**: Required, numeric

### WhatsApp Number Formats
```
Valid formats:
+923001234567
923001234567  
03001234567
```

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Update environment variables
- [ ] Test all API endpoints
- [ ] Verify image upload functionality
- [ ] Check WhatsApp integration
- [ ] Validate form submissions
- [ ] Test admin approval flow

### Production Setup
- [ ] Configure MongoDB URI
- [ ] Set up file storage (local/cloud)
- [ ] Configure SSL certificates
- [ ] Set up monitoring
- [ ] Configure backups

---

## 📞 Support Contacts

- **Development Team**: [Contact Information]
- **System Admin**: [Contact Information]  
- **WhatsApp Support**: +92 300 5567507

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2025 | Initial property system implementation |
| 1.1 | Aug 2025 | Added admin approval workflow |
| 1.2 | Aug 2025 | WhatsApp integration & UI improvements |

---

**Last Updated**: August 14, 2025  
**Quick Reference Version**: 1.0
