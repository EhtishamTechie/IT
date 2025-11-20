const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productData: {
    // Store essential product data to handle cases where product might be deleted
    _id: String,
    title: String,
    price: Number,
    image: String,
    currency: String,
    inStock: { type: Boolean, default: true },
    stock: { type: Number, default: 0 }, // Add stock field
    brand: String,
    category: String,
    // CRITICAL: Add vendor and handling information for order processing
    vendor: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null 
    },
    handledBy: { 
      type: String, 
      enum: ['admin', 'vendor'],
      default: 'admin'
    },
    assignedVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor', 
      default: null
    },
    // Additional fields for complete order processing
    weight: { type: Number, default: null },
    dimensions: {
      type: {
        length: { type: Number, default: null },
        width: { type: Number, default: null }, 
        height: { type: Number, default: null }
      },
      default: null
    },
    shipping: {
      type: Number,
      min: 0,
      default: 0
    },
    sku: { type: String, default: null },
    vendorSku: { type: String, default: null }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  selectedSize: {
    type: String,
    default: null
  },
  price: {
    type: Number,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Update totals before saving
cartSchema.pre('save', function() {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.updatedAt = new Date();
});

// Index for performance
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Cart', cartSchema);
