# Wholesale Supplier Multiple Product Images System

## 📋 Overview

This document provides comprehensive documentation for the **Multiple Product Images System** implemented for wholesale suppliers on the International Tijarat e-commerce platform. The system allows wholesale suppliers to showcase multiple product images (up to 10 images per supplier) with advanced image optimization using AVIF, WebP, and responsive image variants.

---

## 🎯 Key Features

### 1. **Multiple Image Upload**
- Upload up to **10 product images** per wholesale supplier
- Maximum file size: **5MB per image**
- Supported formats: JPEG, PNG, GIF, WebP
- Drag-and-drop reordering capability
- Individual image deletion

### 2. **Advanced Image Optimization**
Each uploaded image is automatically optimized and generates:
- **AVIF format** (best compression, modern browsers)
  - 300px width variant
  - 600px width variant
- **WebP format** (excellent compression, wide browser support)
  - 300px width variant
  - 600px width variant
- **JPEG format** (universal fallback)
  - 300px width variant
  - 600px width variant

### 3. **Admin Management Interface**
- Upload multiple images at once
- Live preview gallery with thumbnails
- Drag-and-drop to reorder images
- Delete individual images
- Visual indicators for new vs existing images
- Upload progress and validation

### 4. **Public Display**
- Clean product gallery (2x2 grid showing first 4 images)
- Click to open full-screen lightbox viewer
- Keyboard navigation (Arrow keys, ESC)
- Automatic responsive image loading (AVIF → WebP → JPEG)
- SEO-optimized alt text for all images

---

## 📊 Database Schema

### WholesaleSupplier Model Extension

```javascript
// backend/models/WholesaleSupplier.js

const productImages = [{
  // Original uploaded file
  filename: {
    type: String,
    required: true
  },
  
  // User's original filename
  originalName: {
    type: String
  },
  
  // Optimized variant paths
  optimized: {
    avif_300: String,  // 300px AVIF variant
    avif_600: String,  // 600px AVIF variant
    webp_300: String,  // 300px WebP variant
    webp_600: String,  // 600px WebP variant
    jpg_300: String,   // 300px JPEG variant
    jpg_600: String    // 600px JPEG variant
  },
  
  // SEO alt text
  altText: {
    type: String
  },
  
  // Display order for sorting
  displayOrder: {
    type: Number,
    default: 0
  }
}];
```

**Note:** The `profileImage` field is preserved for backward compatibility and can be used for supplier logo.

---

## 🔧 Backend Implementation

### 1. Upload Middleware

**File:** `backend/middleware/uploadMiddleware.js`

```javascript
const uploadWholesaleSupplierProductImages = multer({
  storage: wholesaleSupplierStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB per file
    files: 10                    // Maximum 10 images
  }
}).array('productImages', 10);
```

**Key Points:**
- Field name: `productImages` (must match frontend FormData field)
- Storage: `uploads/wholesale-suppliers/`
- Array upload: Accepts multiple files
- Validation: Image types only (JPEG, PNG, GIF, WebP)

### 2. Controller Functions

**File:** `backend/controllers/wholesaleController.js`

#### a) Add Supplier with Product Images

```javascript
const addSupplier = async (req, res) => {
  try {
    // Process each uploaded file
    let productImages = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploadPath = path.join(__dirname, '../uploads/wholesale-suppliers', file.filename);
        
        // Optimize image with AVIF, WebP, and responsive variants
        const optimizationResult = await optimizeImage(uploadPath, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 85,
          generateWebP: true,
          generateAVIF: true,
          generateResponsive: true,
          responsiveSizes: [300, 600]
        });

        // Store optimized filenames
        productImages.push({
          filename: file.filename,
          originalName: file.originalname,
          optimized: {
            avif_300: optimizationResult.responsive.avif.find(f => f.includes('300w')),
            avif_600: optimizationResult.responsive.avif.find(f => f.includes('600w')),
            webp_300: optimizationResult.responsive.webp.find(f => f.includes('300w')),
            webp_600: optimizationResult.responsive.webp.find(f => f.includes('600w')),
            jpg_300: optimizationResult.responsive.original.find(f => f.includes('300w')),
            jpg_600: optimizationResult.responsive.original.find(f => f.includes('600w'))
          },
          altText: `${supplierName} ${categoryName} product image ${i + 1}`,
          displayOrder: i
        });
      }
    }

    // Save supplier with product images
    const supplier = new WholesaleSupplier({
      ...otherFields,
      productImages
    });
    await supplier.save();
  }
};
```

**Optimization Settings:**
- **Max dimensions:** 1200x1200px
- **Quality:** 85 (balance between quality and file size)
- **AVIF settings:** Quality 65, effort 2, chromaSubsampling 4:2:0
- **WebP settings:** Quality 80, effort 4
- **Responsive sizes:** 300px, 600px widths

#### b) Update Supplier (Add More Images)

```javascript
const updateSupplier = async (req, res) => {
  const supplier = await WholesaleSupplier.findById(req.params.id);
  const existingImages = supplier.productImages || [];
  
  // Process new uploaded images
  let newProductImages = [];
  if (req.files && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      // Same optimization process as addSupplier
      // displayOrder = existingImages.length + i
    }
  }
  
  // Merge existing and new images
  supplier.productImages = [...existingImages, ...newProductImages];
  await supplier.save();
};
```

**Key Behavior:**
- Preserves existing images
- Appends new images to the end
- Updates displayOrder sequentially

#### c) Delete Product Image

```javascript
const deleteProductImage = async (req, res) => {
  const { id, imageId } = req.params;
  const supplier = await WholesaleSupplier.findById(id);
  
  // Find the image
  const imageIndex = supplier.productImages.findIndex(img => img._id.toString() === imageId);
  const image = supplier.productImages[imageIndex];
  
  // Delete all variant files from disk
  const filesToDelete = [
    image.filename,
    image.optimized?.avif_300,
    image.optimized?.avif_600,
    image.optimized?.webp_300,
    image.optimized?.webp_600,
    image.optimized?.jpg_300,
    image.optimized?.jpg_600
  ].filter(Boolean);
  
  for (const file of filesToDelete) {
    const filePath = path.join(__dirname, '../uploads/wholesale-suppliers', path.basename(file));
    await fs.unlink(filePath).catch(err => console.error('Error deleting file:', err));
  }
  
  // Remove from array and reorder
  supplier.productImages.splice(imageIndex, 1);
  supplier.productImages.forEach((img, idx) => {
    img.displayOrder = idx;
  });
  
  await supplier.save();
};
```

**Deletion Process:**
1. Validates supplier and image existence
2. Deletes original + all 6 optimized variants from disk
3. Removes image from productImages array
4. Reorders remaining images (0, 1, 2, ...)
5. Saves updated supplier

#### d) Reorder Product Images

```javascript
const reorderProductImages = async (req, res) => {
  const { imageOrder } = req.body;  // Array: ["id3", "id1", "id2", ...]
  const supplier = await WholesaleSupplier.findById(req.params.id);
  
  // Reorder based on provided sequence
  const reorderedImages = [];
  imageOrder.forEach((imageId, index) => {
    const image = supplier.productImages.find(img => img._id.toString() === imageId);
    if (image) {
      image.displayOrder = index;
      reorderedImages.push(image);
    }
  });
  
  supplier.productImages = reorderedImages;
  await supplier.save();
};
```

**Request Body:**
```json
{
  "imageOrder": [
    "675a1b2c3d4e5f6g7h8i9j0k",
    "675b2c3d4e5f6g7h8i9j0k1l",
    "675c3d4e5f6g7h8i9j0k1l2m"
  ]
}
```

### 3. API Routes

**File:** `backend/routes/wholesale.js`

```javascript
// Public routes
router.get('/suppliers', getSuppliers);
router.get('/suppliers/category/:categoryName', getSuppliersByCategory);

// Admin routes (require authAdmin middleware)
router.post('/admin/suppliers', 
  authAdmin, 
  uploadWholesaleSupplierProductImages,  // Multiple image upload
  handleUploadError,
  addSupplier
);

router.put('/admin/suppliers/:id', 
  authAdmin, 
  uploadWholesaleSupplierProductImages,  // Multiple image upload
  handleUploadError,
  updateSupplier
);

router.delete('/admin/suppliers/:id/images/:imageId', 
  authAdmin, 
  deleteProductImage
);

router.patch('/admin/suppliers/:id/images/reorder', 
  authAdmin, 
  reorderProductImages
);
```

**Endpoint Summary:**

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/admin/suppliers` | Add supplier with images | Admin |
| PUT | `/admin/suppliers/:id` | Update supplier (add more images) | Admin |
| DELETE | `/admin/suppliers/:id/images/:imageId` | Delete single image | Admin |
| PATCH | `/admin/suppliers/:id/images/reorder` | Reorder images | Admin |

---

## 🎨 Frontend Implementation

### 1. Admin Management Interface

**File:** `frontend/src/pages/Admin/WholesaleManagement.jsx`

#### State Management

```javascript
// Product image preview states
const [productImagePreviews, setProductImagePreviews] = useState([]);
const [existingProductImages, setExistingProductImages] = useState([]);
const [draggedImageIndex, setDraggedImageIndex] = useState(null);

// Form data with product images
const [formData, setFormData] = useState({
  // ... other fields
  productImages: []
});
```

#### Image Upload Handler

```javascript
const handleProductImagesChange = (e) => {
  const files = Array.from(e.target.files);
  
  // Limit to 10 images total
  const remainingSlots = 10 - existingProductImages.length - productImagePreviews.length;
  const filesToAdd = files.slice(0, remainingSlots);
  
  if (files.length > remainingSlots) {
    alert(`You can only upload ${remainingSlots} more image(s). Maximum 10 images allowed.`);
  }
  
  // Create previews
  const newPreviews = filesToAdd.map((file, index) => ({
    id: `preview-${Date.now()}-${index}`,
    file,
    preview: URL.createObjectURL(file),
    isNew: true
  }));
  
  setProductImagePreviews([...productImagePreviews, ...newPreviews]);
  setFormData({...formData, productImages: [...formData.productImages, ...filesToAdd]});
};
```

#### Delete Image Handlers

```javascript
// Remove preview (new uploads)
const removePreviewImage = (previewId) => {
  const updatedPreviews = productImagePreviews.filter(p => p.id !== previewId);
  const updatedFiles = formData.productImages.filter((_, index) => {
    const preview = productImagePreviews[index];
    return preview && preview.id !== previewId;
  });
  
  setProductImagePreviews(updatedPreviews);
  setFormData({...formData, productImages: updatedFiles});
};

// Delete existing image (API call)
const deleteExistingImage = async (imageId) => {
  if (!window.confirm('Are you sure you want to delete this image?')) return;
  
  try {
    const token = localStorage.getItem('adminToken');
    await axios.delete(
      `${getApiUrl()}/wholesale/admin/suppliers/${editingSupplier._id}/images/${imageId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    setExistingProductImages(existingProductImages.filter(img => img._id !== imageId));
    alert('Image deleted successfully!');
  } catch (error) {
    console.error('Error deleting image:', error);
    alert('Failed to delete image');
  }
};
```

#### Drag-and-Drop Reordering

```javascript
const handleDragStart = (index) => {
  setDraggedImageIndex(index);
};

const handleDragOver = (e, index) => {
  e.preventDefault();
  if (draggedImageIndex === null || draggedImageIndex === index) return;
  
  // Reorder preview images
  const newPreviews = [...productImagePreviews];
  const draggedItem = newPreviews[draggedImageIndex];
  newPreviews.splice(draggedImageIndex, 1);
  newPreviews.splice(index, 0, draggedItem);
  
  setProductImagePreviews(newPreviews);
  setDraggedImageIndex(index);
};

const handleDragEnd = () => {
  setDraggedImageIndex(null);
};
```

#### Form Submission

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const submitData = new FormData();
  
  // Add all form fields
  submitData.append('categoryName', formData.categoryName);
  // ... other fields
  
  // Add product images
  if (formData.productImages && formData.productImages.length > 0) {
    formData.productImages.forEach((file) => {
      submitData.append('productImages', file);
    });
  }
  
  await axios[method](url, submitData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
};
```

#### UI Components

**File Input Section:**
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Product Images (Max 10)
    <span className="text-xs text-gray-500 ml-2">Show your product portfolio</span>
  </label>
  
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={handleProductImagesChange}
    disabled={existingProductImages.length + productImagePreviews.length >= 10}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
  />
  
  <p className="text-xs text-gray-500 mt-1">
    {existingProductImages.length + productImagePreviews.length}/10 images uploaded
  </p>
</div>
```

**Preview Gallery:**
```jsx
<div className="grid grid-cols-3 md:grid-cols-4 gap-3">
  {/* Existing Images */}
  {existingProductImages.map((image, index) => (
    <div key={image._id} className="relative group aspect-square">
      <img
        src={getImageUrl('wholesale-suppliers', image.optimized?.jpg_300 || image.filename)}
        alt={image.altText}
        className="w-full h-full object-cover rounded-lg"
      />
      
      {/* Delete Button */}
      <button
        onClick={() => deleteExistingImage(image._id)}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Display Order Badge */}
      <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
        #{index + 1}
      </div>
    </div>
  ))}

  {/* New Image Previews (Draggable) */}
  {productImagePreviews.map((preview, index) => (
    <div
      key={preview.id}
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragEnd={handleDragEnd}
      className="relative group aspect-square cursor-move"
    >
      <img src={preview.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
      
      {/* Drag Handle */}
      <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white rounded p-1 opacity-0 group-hover:opacity-100">
        <GripVertical className="w-4 h-4" />
      </div>
      
      {/* Delete Button */}
      <button
        onClick={() => removePreviewImage(preview.id)}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* NEW Badge */}
      <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
        NEW
      </div>
    </div>
  ))}
</div>
```

### 2. Public Display Interface

**File:** `frontend/src/pages/ContactWholeseller.jsx`

#### Lightbox State

```javascript
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxImages, setLightboxImages] = useState([]);
const [lightboxIndex, setLightboxIndex] = useState(0);
```

#### Lightbox Functions

```javascript
const openLightbox = (images, index) => {
  setLightboxImages(images);
  setLightboxIndex(index);
  setLightboxOpen(true);
};

const closeLightbox = () => {
  setLightboxOpen(false);
  setLightboxImages([]);
  setLightboxIndex(0);
};

const nextImage = () => {
  setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
};

const prevImage = () => {
  setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
};
```

#### Keyboard Navigation

```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [lightboxOpen, lightboxImages]);
```

#### Product Gallery Display

```jsx
<div className="flex-shrink-0">
  {supplier.productImages && supplier.productImages.length > 0 ? (
    /* Product Gallery - 2x2 Grid */
    <div className="grid grid-cols-2 gap-1 w-32">
      {supplier.productImages.slice(0, 4).map((image, idx) => (
        <div 
          key={idx}
          className="relative aspect-square rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
          onClick={() => openLightbox(supplier.productImages, idx)}
        >
          <picture>
            {/* AVIF - Best compression for modern browsers */}
            <source 
              srcSet={`${getImageUrl('wholesale-suppliers', image.optimized?.avif_300)} 300w`}
              type="image/avif"
            />
            
            {/* WebP - Good compression with wide support */}
            <source 
              srcSet={`${getImageUrl('wholesale-suppliers', image.optimized?.webp_300)} 300w`}
              type="image/webp"
            />
            
            {/* JPEG - Universal fallback */}
            <img
              src={getImageUrl('wholesale-suppliers', image.optimized?.jpg_300 || image.filename)}
              alt={image.altText || `${supplier.supplierName} product`}
              className="w-full h-full object-cover"
            />
          </picture>
          
          {/* Zoom icon on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
            <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ))}
      
      {/* +N more indicator */}
      {supplier.productImages.length > 4 && (
        <div 
          className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded cursor-pointer"
          onClick={() => openLightbox(supplier.productImages, 0)}
        >
          +{supplier.productImages.length - 4}
        </div>
      )}
    </div>
  ) : supplier.profileImage ? (
    /* Fallback to profile logo */
    <img
      src={getImageUrl('wholesale-suppliers', supplier.profileImage)}
      alt={`${supplier.supplierName} logo`}
      className="w-24 h-24 object-contain rounded-lg border-2 border-gray-200"
    />
  ) : (
    /* Default icon */
    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
      <Store className="w-12 h-12 text-white" />
    </div>
  )}
</div>
```

#### Lightbox Modal

```jsx
{lightboxOpen && (
  <div 
    className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
    onClick={closeLightbox}
  >
    {/* Close Button */}
    <button onClick={closeLightbox} className="absolute top-4 right-4 text-white hover:text-gray-300">
      <X className="w-8 h-8" />
    </button>

    {/* Previous Button */}
    {lightboxImages.length > 1 && (
      <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 text-white">
        <ChevronLeft className="w-12 h-12" />
      </button>
    )}

    {/* Image Container */}
    <div className="max-w-5xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
      <picture>
        {/* Use 600px variants for lightbox */}
        <source 
          srcSet={`${getImageUrl('wholesale-suppliers', lightboxImages[lightboxIndex]?.optimized?.avif_600)} 600w`}
          type="image/avif"
        />
        <source 
          srcSet={`${getImageUrl('wholesale-suppliers', lightboxImages[lightboxIndex]?.optimized?.webp_600)} 600w`}
          type="image/webp"
        />
        <img
          src={getImageUrl('wholesale-suppliers', lightboxImages[lightboxIndex]?.optimized?.jpg_600 || lightboxImages[lightboxIndex]?.filename)}
          alt={lightboxImages[lightboxIndex]?.altText || 'Product image'}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
      </picture>
      
      {/* Image Counter */}
      <div className="text-center text-white mt-4">
        <p className="text-sm">{lightboxIndex + 1} / {lightboxImages.length}</p>
        {lightboxImages[lightboxIndex]?.altText && (
          <p className="text-sm text-gray-300 mt-2">
            {lightboxImages[lightboxIndex].altText}
          </p>
        )}
      </div>
    </div>

    {/* Next Button */}
    {lightboxImages.length > 1 && (
      <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 text-white">
        <ChevronRight className="w-12 h-12" />
      </button>
    )}
  </div>
)}
```

---

## 🚀 User Workflows

### Admin Workflow: Add Supplier with Product Images

1. **Navigate to Admin Panel**
   - Go to Admin > Wholesale Management
   - Click "Add New Supplier" button

2. **Fill Supplier Details**
   - Enter required fields (Supplier Name, Category, Contact Info)
   - Upload profile logo (optional, for branding)

3. **Upload Product Images**
   - Click "Product Images (Max 10)" file input
   - Select multiple images (Ctrl+Click or Shift+Click)
   - System validates: Max 10 images, 5MB each
   - Preview thumbnails appear immediately

4. **Manage Uploaded Images**
   - **Reorder:** Drag and drop thumbnails to change order
   - **Delete:** Hover over image, click X button
   - **Add More:** Select file input again (if under 10 limit)

5. **Submit**
   - Click "Save Supplier" button
   - Backend processes images (optimization takes 2-5 seconds per image)
   - Success message: "Supplier added successfully!"
   - Images are now optimized and stored

### Admin Workflow: Edit Supplier (Add More Images)

1. **Open Edit Modal**
   - Click "Edit" button on supplier row
   - Modal loads with existing data
   - Existing product images display at top of gallery

2. **Add More Images**
   - Existing images show with blue border + "#1, #2" badges
   - New uploads show with orange border + "NEW" badge
   - Drag-and-drop only works on NEW images
   - Can add up to (10 - existing count) more images

3. **Delete Existing Images**
   - Hover over existing image
   - Click red X button
   - Confirm deletion
   - Image and all variants deleted from server

4. **Save Changes**
   - New images append to existing images
   - Display order continues from last existing image

### Public User Workflow: View Product Gallery

1. **Browse Wholesale Suppliers**
   - Navigate to "Contact Wholeseller" page
   - Browse by category or search

2. **View Product Gallery**
   - Each supplier card shows 2x2 grid (first 4 images)
   - "+N more" badge if more than 4 images
   - Hover shows zoom icon

3. **Open Lightbox**
   - Click any product image
   - Full-screen lightbox opens
   - High-quality 600px variant loads

4. **Navigate Images**
   - **Mouse:** Click left/right arrows
   - **Keyboard:** Arrow Left/Right keys
   - **Close:** Click X button, press ESC, or click outside image

5. **Contact Supplier**
   - Close lightbox
   - Use WhatsApp, Call, or Email buttons

---

## 📈 Performance Optimization

### Image Loading Strategy

```
Priority 1: AVIF (Best compression, ~60% smaller than JPEG)
    ↓ (If not supported)
Priority 2: WebP (Good compression, ~30% smaller than JPEG)
    ↓ (If not supported)
Priority 3: JPEG (Universal fallback)
```

### Responsive Loading

| Screen Size | Image Variant | Format Priority |
|-------------|---------------|-----------------|
| Mobile (< 640px) | 300w | AVIF → WebP → JPEG |
| Tablet (640-1024px) | 600w | AVIF → WebP → JPEG |
| Desktop (> 1024px) | 600w | AVIF → WebP → JPEG |

### File Size Comparison (Example)

| Original JPEG | AVIF 300w | AVIF 600w | WebP 300w | WebP 600w | JPEG 300w | JPEG 600w |
|---------------|-----------|-----------|-----------|-----------|-----------|-----------|
| 2.5 MB | 45 KB | 120 KB | 68 KB | 180 KB | 95 KB | 250 KB |
| **Savings** | **98%** | **95%** | **97%** | **93%** | **96%** | **90%** |

### Optimization Settings

```javascript
{
  maxWidth: 1200,          // Maximum width before resizing
  maxHeight: 1200,         // Maximum height before resizing
  quality: 85,             // JPEG quality (1-100)
  generateWebP: true,      // Generate WebP variants
  generateAVIF: true,      // Generate AVIF variants
  generateResponsive: true,
  responsiveSizes: [300, 600],  // Responsive breakpoints
  
  // AVIF-specific settings
  avif: {
    quality: 65,
    effort: 2,              // Encoding effort (0-9, higher = slower but smaller)
    chromaSubsampling: '4:2:0'
  },
  
  // WebP-specific settings
  webp: {
    quality: 80,
    effort: 4
  }
}
```

---

## 🔒 Security & Validation

### File Upload Validation

**Middleware:** `imageFileFilter` in `uploadMiddleware.js`

```javascript
const imageFileFilter = (req, file, cb) => {
  // Check mimetype
  if (file.mimetype.startsWith('image/')) {
    // Allow: image/jpeg, image/png, image/gif, image/webp
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
```

**Validation Rules:**
- ✅ **File type:** JPEG, PNG, GIF, WebP only
- ✅ **File size:** Maximum 5MB per file
- ✅ **File count:** Maximum 10 images per supplier
- ✅ **Filename sanitization:** Multer generates unique filenames
- ✅ **Path traversal prevention:** Basename extraction before file operations

### Authorization

All admin routes require `authAdmin` middleware:

```javascript
router.post('/admin/suppliers', 
  authAdmin,  // Validates JWT token, checks admin role
  uploadWholesaleSupplierProductImages,
  handleUploadError,
  addSupplier
);
```

### Error Handling

```javascript
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'File size exceeds 5MB limit' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 10 files allowed' 
      });
    }
  }
  next(err);
};
```

---

## 🧪 Testing

### Manual Testing Checklist

#### Admin Interface

- [ ] **Upload single image** (1 image)
- [ ] **Upload multiple images** (2-10 images)
- [ ] **Upload exceeding limit** (attempt 11+ images, should show error)
- [ ] **Upload oversized file** (>5MB, should show error)
- [ ] **Upload non-image file** (.txt, .pdf, should reject)
- [ ] **Drag-and-drop reorder** (change order, verify persistence)
- [ ] **Delete new preview** (before saving, should remove from preview)
- [ ] **Delete existing image** (after saving, should delete from server)
- [ ] **Edit supplier** (add more images, should append to existing)
- [ ] **Image counter display** (X/10 images uploaded)
- [ ] **Preview gallery display** (thumbnails should load)
- [ ] **Form submission** (all images should upload)

#### Public Interface

- [ ] **Product gallery display** (2x2 grid shows first 4 images)
- [ ] **+N more indicator** (shows if more than 4 images)
- [ ] **Click to open lightbox** (full-screen modal opens)
- [ ] **Lightbox navigation** (left/right arrows work)
- [ ] **Keyboard navigation** (Arrow keys, ESC key)
- [ ] **Image counter** (1/5, 2/5, etc.)
- [ ] **Alt text display** (SEO text shows in lightbox)
- [ ] **Close lightbox** (X button, ESC key, click outside)
- [ ] **Responsive images** (AVIF/WebP/JPEG fallback)
- [ ] **Fallback to logo** (if no product images, show profile logo)
- [ ] **Default icon** (if no images at all, show Store icon)

#### Performance Testing

- [ ] **Page load time** (measure initial load)
- [ ] **Image optimization** (verify AVIF/WebP generated)
- [ ] **File size reduction** (check savings percentage in logs)
- [ ] **Lazy loading** (images load on demand)
- [ ] **Browser compatibility** (test on Chrome, Firefox, Safari, Edge)
- [ ] **Mobile responsiveness** (test on phone/tablet)

### API Testing (Postman/Thunder Client)

#### 1. Add Supplier with Images

```
POST /api/wholesale/admin/suppliers
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Body (form-data):
- categoryName: "Electronics"
- supplierName: "ABC Electronics"
- contactNumber: "1234567890"
- whatsappNumber: "1234567890"
- productImages: [file1.jpg, file2.jpg, file3.jpg]
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Supplier added successfully",
  "data": {
    "_id": "675a1b2c3d4e5f6g7h8i9j0k",
    "supplierName": "ABC Electronics",
    "productImages": [
      {
        "filename": "wholesale-suppliers-1234567890.jpg",
        "originalName": "file1.jpg",
        "optimized": {
          "avif_300": "wholesale-suppliers-1234567890-300w.avif",
          "avif_600": "wholesale-suppliers-1234567890-600w.avif",
          "webp_300": "wholesale-suppliers-1234567890-300w.webp",
          "webp_600": "wholesale-suppliers-1234567890-600w.webp",
          "jpg_300": "wholesale-suppliers-1234567890-300w.jpg",
          "jpg_600": "wholesale-suppliers-1234567890-600w.jpg"
        },
        "altText": "ABC Electronics Electronics product image 1",
        "displayOrder": 0
      }
      // ... more images
    ]
  }
}
```

#### 2. Update Supplier (Add More Images)

```
PUT /api/wholesale/admin/suppliers/:id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Body (form-data):
- productImages: [file4.jpg, file5.jpg]
```

**Expected Behavior:**
- Existing images preserved
- New images appended
- Display order continues from last existing image

#### 3. Delete Product Image

```
DELETE /api/wholesale/admin/suppliers/:id/images/:imageId
Authorization: Bearer <admin_token>
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Product image deleted successfully",
  "data": {
    "productImages": [
      // Remaining images with reordered displayOrder
    ]
  }
}
```

#### 4. Reorder Product Images

```
PATCH /api/wholesale/admin/suppliers/:id/images/reorder
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  "imageOrder": [
    "675c3d4e5f6g7h8i9j0k1l2m",
    "675a1b2c3d4e5f6g7h8i9j0k",
    "675b2c3d4e5f6g7h8i9j0k1l"
  ]
}
```

---

## 🐛 Troubleshooting

### Issue: Images Not Uploading

**Symptoms:**
- File input not accepting files
- "Maximum 10 images" error immediately

**Diagnosis:**
```javascript
console.log('Existing images:', existingProductImages.length);
console.log('Preview images:', productImagePreviews.length);
console.log('Total:', existingProductImages.length + productImagePreviews.length);
```

**Solution:**
- Check if already at 10 image limit
- Verify file input not disabled
- Check browser console for JavaScript errors

### Issue: Optimization Failing

**Symptoms:**
- Images upload but no optimized variants
- Console error: "Sharp optimization failed"

**Diagnosis:**
```bash
# Check Sharp installation
cd backend
npm list sharp

# Check file permissions
ls -la uploads/wholesale-suppliers/
```

**Solution:**
```bash
# Reinstall Sharp with platform-specific binaries
cd backend
npm uninstall sharp
npm install sharp --platform=linux --arch=x64
```

### Issue: Drag-and-Drop Not Working

**Symptoms:**
- Images not reordering when dragged
- No visual feedback during drag

**Diagnosis:**
- Check `draggable` attribute on preview divs
- Verify drag event handlers attached
- Check `draggedImageIndex` state updates

**Solution:**
```javascript
// Ensure draggable attribute is set
<div 
  draggable={true}  // Must be boolean true, not string "true"
  onDragStart={() => handleDragStart(index)}
  // ...
>
```

### Issue: Lightbox Not Opening

**Symptoms:**
- Clicking image does nothing
- Lightbox stays closed

**Diagnosis:**
```javascript
// Add console logs
const openLightbox = (images, index) => {
  console.log('Opening lightbox with images:', images);
  console.log('Starting at index:', index);
  // ...
};
```

**Solution:**
- Verify `onClick` handler on image div
- Check `lightboxOpen` state updates
- Ensure `lightboxImages` array populated

### Issue: Wrong Image Format Loading

**Symptoms:**
- JPEG loading instead of AVIF/WebP
- Slow load times

**Diagnosis:**
```javascript
// Check browser support
console.log('AVIF support:', document.createElement('canvas').toDataURL('image/avif').indexOf('data:image/avif') === 0);
console.log('WebP support:', document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0);
```

**Solution:**
- Verify `<picture>` element structure
- Check `<source>` order (AVIF first, WebP second, JPEG last)
- Ensure correct MIME types: `type="image/avif"`

---

## 📊 Database Queries

### Get Supplier with Product Images

```javascript
const supplier = await WholesaleSupplier.findById(supplierId)
  .select('supplierName categoryName productImages profileImage')
  .lean();

console.log(supplier.productImages);
// [
//   {
//     filename: 'wholesale-suppliers-1234567890.jpg',
//     optimized: { avif_300: '...', avif_600: '...', ... },
//     altText: 'Product description',
//     displayOrder: 0
//   }
// ]
```

### Get All Suppliers Grouped by Category

```javascript
const pipeline = [
  { $match: { isActive: true } },
  {
    $group: {
      _id: '$categoryName',
      suppliers: { $push: '$$ROOT' }
    }
  },
  { $sort: { '_id': 1 } }
];

const suppliers = await WholesaleSupplier.aggregate(pipeline);
```

### Update Product Image Alt Text

```javascript
const supplier = await WholesaleSupplier.findById(supplierId);
const image = supplier.productImages.id(imageId);
image.altText = 'New alt text';
await supplier.save();
```

---

## 🔄 Migration Guide

### Migrating Existing Suppliers

If you have existing suppliers with only `profileImage`, they will continue to work. The system is **backward compatible**.

**Migration Script** (if you want to move profile images to product images):

```javascript
// backend/scripts/migrate-profile-to-product-images.js

const WholesaleSupplier = require('../models/WholesaleSupplier');

async function migrateProfileImages() {
  const suppliers = await WholesaleSupplier.find({ 
    profileImage: { $exists: true, $ne: null },
    productImages: { $size: 0 }
  });

  for (const supplier of suppliers) {
    // Move profile image to product images
    supplier.productImages = [{
      filename: supplier.profileImage,
      originalName: supplier.profileImage,
      optimized: {},
      altText: `${supplier.supplierName} logo`,
      displayOrder: 0
    }];
    
    await supplier.save();
    console.log(`✅ Migrated ${supplier.supplierName}`);
  }

  console.log(`\n✅ Migration complete! Migrated ${suppliers.length} suppliers.`);
}

migrateProfileImages().catch(console.error);
```

**Run Migration:**
```bash
cd backend
node scripts/migrate-profile-to-product-images.js
```

---

## 📚 Related Documentation

- **Image Optimization System:** See `IMAGE_OPTIMIZATION_GUIDE.md`
- **Admin Panel Overview:** See `ADMIN_PANEL_QUICK_REFERENCE.md`
- **API Reference:** See `API_DOCUMENTATION.md`
- **Performance Optimization:** See `PERFORMANCE_OPTIMIZATION_PLAN.md`

---

## 🎓 Best Practices

### For Admins

1. **Image Selection**
   - Use high-quality product images (min 800x800px)
   - Avoid images with text overlays
   - Use consistent lighting and backgrounds
   - Show products from multiple angles

2. **Image Ordering**
   - Place hero/primary image first
   - Group similar products together
   - End with supporting images (certifications, factory, etc.)

3. **Alt Text**
   - Auto-generated format: `{SupplierName} {Category} product image {N}`
   - Descriptive and SEO-friendly
   - Includes category and supplier name

4. **File Management**
   - Delete unused images to save storage
   - Reorder images for better visual flow
   - Maximum 10 images per supplier (quality over quantity)

### For Developers

1. **Error Handling**
   - Always wrap file operations in try-catch
   - Log errors with context
   - Provide user-friendly error messages

2. **Performance**
   - Use responsive images (AVIF → WebP → JPEG)
   - Lazy load images below the fold
   - Optimize for mobile-first

3. **Security**
   - Validate file types (mimetype + extension)
   - Sanitize filenames
   - Use authentication for admin routes

4. **Code Maintainability**
   - Extract common logic into utility functions
   - Document complex image processing
   - Use consistent naming conventions

---

## 📞 Support

For issues or questions:
- **Email:** support@internationaltijarat.com
- **Developer:** Check `backend/controllers/wholesaleController.js` for implementation details
- **Frontend:** Check `frontend/src/pages/Admin/WholesaleManagement.jsx` for UI logic

---

**Last Updated:** May 2024  
**Version:** 1.0.0  
**Author:** International Tijarat Development Team
