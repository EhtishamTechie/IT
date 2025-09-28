const mongoose = require('mongoose');

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
  seoKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  canonicalUrl: {
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
  // Track who created the category
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

// Index for better query performance
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ name: 1 });
// SEO Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ seoKeywords: 1 });
categorySchema.index({ 'name': 'text', 'description': 'text', 'metaTitle': 'text', 'metaDescription': 'text' });

// Auto-generate slug from name if not provided
categorySchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('name')) {
    if (!this.slug) {
      const { generateUniqueSlug } = require('../utils/seoUtils');
      try {
        this.slug = await generateUniqueSlug(this.name, this.constructor, this._id);
      } catch (error) {
        return next(error);
      }
    }
  }
  
  // Auto-generate meta title and description if not provided
  if (this.isNew || this.isModified('name')) {
    if (!this.metaTitle) {
      this.metaTitle = this.name.length > 60 ? 
        this.name.substring(0, 57) + '...' : 
        this.name;
    }
  }
  
  if (this.isNew || this.isModified('description')) {
    if (!this.metaDescription && this.description) {
      const { generateMetaDescription } = require('../utils/seoUtils');
      this.metaDescription = generateMetaDescription(this.description);
    }
  }
  
  next();
});

module.exports = mongoose.model('Category', categorySchema);
