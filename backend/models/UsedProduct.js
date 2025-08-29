const mongoose = require('mongoose');

const usedProductSchema = new mongoose.Schema({
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Product Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'Vehicles',
      'Electronics', 
      'Furniture',
      'Home Appliances',
      'Sports & Recreation',
      'Books & Media',
      'Clothing & Accessories',
      'Tools & Equipment',
      'Other'
    ]
  },
  
  price: {
    type: Number,
    required: true,
    min: 0
  },
  
  condition: {
    type: String,
    required: true,
    enum: ['Excellent', 'Good', 'Fair', 'Poor']
  },
  
  // Product Images
  images: [{
    type: String, // URLs to uploaded images
    required: true
  }],
  
  // Contact Information
  contactPhone: {
    type: String,
    required: true
  },
  
  contactEmail: {
    type: String,
    required: true
  },
  
  location: {
    type: String,
    required: true
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sold'],
    default: 'pending'
  },

  soldDate: {
    type: Date
  },

  priceHistory: [{
    oldPrice: {
      type: Number,
      required: true
    },
    newPrice: {
      type: Number,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Admin Review
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  rejectedAt: {
    type: Date
  },
  
  // Additional Details
  yearOfPurchase: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear()
  },
  
  brand: {
    type: String,
    trim: true
  },
  
  model: {
    type: String,
    trim: true
  },
  
  // Search and Display
  featured: {
    type: Boolean,
    default: false
  },
  
  views: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
usedProductSchema.index({ status: 1, createdAt: -1 });
usedProductSchema.index({ category: 1, status: 1 });
usedProductSchema.index({ user: 1, status: 1 });
usedProductSchema.index({ price: 1, status: 1 });

// Pre-save middleware to update timestamps
usedProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted price
usedProductSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.price);
});

// Virtual for time since creation
usedProductSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
});

// Ensure virtuals are included in JSON output
usedProductSchema.set('toJSON', { virtuals: true });
usedProductSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UsedProduct', usedProductSchema);
