const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be longer than 200 characters']
  },
  description: { 
    type: String, 
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot be longer than 2000 characters']
  },
  price: { 
    type: Number, 
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    default: null
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot be more than 100%']
  },
  image: {
    type: String,
    required: false,
    default: 'placeholder-image.jpg'
  },
  images: [{
    type: String
  }],
  video: {
    type: String,
    required: false,
    default: null
  },
  category: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  }],
  mainCategory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  subCategory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  brand: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  keywords: [{
    type: String,
    trim: true
  }],
  // SEO Fields
  slug: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Slug cannot be longer than 100 characters']
  },
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot be longer than 60 characters']
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot be longer than 160 characters']
  },
  altText: {
    type: String,
    trim: true,
    maxlength: [125, 'Alt text cannot be longer than 125 characters']
  },
  // Enhanced image handling with SEO
  imageAltTexts: [{
    filename: String,
    altText: String,
    keywords: [String]
  }],
  // SEO Keywords specific for search optimization
  seoKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Canonical URL for duplicate content prevention
  canonicalUrl: {
    type: String,
    trim: true
  },
  // Schema.org structured data type
  schemaType: {
    type: String,
    default: 'Product',
    enum: ['Product', 'DigitalProduct', 'SoftwareApplication']
  },
  features: [{
    name: { type: String, required: true },
    value: { type: String, required: true }
  }],
  specifications: [{
    name: { type: String, required: true },
    value: { type: String, required: true }
  }],
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  vendorSku: {
    type: String,
    sparse: true
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  shipping: {
    type: Number,
    min: [0, 'Shipping cost cannot be negative'],
    default: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for product source identification
productSchema.virtual('productSource').get(function() {
  if (this.vendor) {
    return 'vendor';
  } else {
    return 'admin'; // International Tijarat
  }
});

// Virtual for source display name
productSchema.virtual('sourceDisplayName').get(function() {
  if (this.vendor && this.vendor.businessName) {
    return this.vendor.businessName;
  } else if (this.vendor) {
    return 'Vendor Product';
  } else {
    return 'International Tijarat';
  }
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= 10) return 'low-stock';
  return 'in-stock';
});

// Virtual for category path
productSchema.virtual('categoryPath').get(function() {
  if (this.category && this.category.length > 0) {
    return this.category.map(cat => {
      if (typeof cat === 'object' && cat.name) {
        return cat.name;
      }
      return cat;
    }).join(' > ');
  }
  return 'Uncategorized';
});

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
  if (this.discount > 0) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
});

// Index for better query performance
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ vendor: 1 });
productSchema.index({ category: 1 });
productSchema.index({ mainCategory: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ isActive: 1, isVisible: 1 });
productSchema.index({ createdAt: -1 });
// SEO Indexes
productSchema.index({ slug: 1 });
productSchema.index({ seoKeywords: 1 });
productSchema.index({ 'title': 'text', 'description': 'text', 'metaTitle': 'text', 'metaDescription': 'text' });

// Update timestamp on save
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-generate slug from title if not provided
productSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('title')) {
    if (!this.slug) {
      const { generateUniqueSlug } = require('../utils/seoUtils');
      try {
        this.slug = await generateUniqueSlug(this.title, this.constructor, this._id);
      } catch (error) {
        return next(error);
      }
    }
  }
  
  // Auto-generate meta title and description if not provided
  if (this.isNew || this.isModified('title')) {
    if (!this.metaTitle) {
      this.metaTitle = this.title.length > 60 ? 
        this.title.substring(0, 57) + '...' : 
        this.title;
    }
  }
  
  if (this.isNew || this.isModified('description')) {
    if (!this.metaDescription && this.description) {
      const { generateMetaDescription } = require('../utils/seoUtils');
      this.metaDescription = generateMetaDescription(this.description);
    }
  }
  
  // Auto-generate alt text if not provided
  if (this.isNew || this.isModified('title')) {
    if (!this.altText) {
      const { generateAltText } = require('../utils/seoUtils');
      this.altText = generateAltText(this.title);
    }
  }
  
  next();
});

module.exports = mongoose.model('Product', productSchema);
