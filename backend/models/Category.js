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

module.exports = mongoose.model('Category', categorySchema);
