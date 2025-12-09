const mongoose = require('mongoose');

const wholesaleSupplierSchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
    trim: true
  },
  categoryDescription: {
    type: String,
    trim: true
  },
  supplierName: {
    type: String,
    required: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: null,
    trim: true
  },
  productImages: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String
    },
    optimized: {
      avif_300: String,
      avif_600: String,
      webp_300: String,
      webp_600: String,
      jpg_300: String,
      jpg_600: String
    },
    altText: String,
    displayOrder: {
      type: Number,
      default: 0
    }
  }],
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  specialties: [{
    type: String,
    trim: true
  }],
  minimumOrderQuantity: {
    type: String,
    trim: true
  },
  deliveryAreas: [{
    type: String,
    trim: true
  }],
  businessHours: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
wholesaleSupplierSchema.index({ categoryName: 1 });
wholesaleSupplierSchema.index({ supplierName: 1 });
wholesaleSupplierSchema.index({ isActive: 1 });

module.exports = mongoose.model('WholesaleSupplier', wholesaleSupplierSchema);
