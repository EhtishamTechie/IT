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
