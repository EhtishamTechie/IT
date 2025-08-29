const mongoose = require('mongoose');

const subcategoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }
});

const homepageCardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['main-category', 'subcategories'], // main-category for single image, subcategories for 4 subcategory items
    required: true
  },
  order: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 4
  },
  mainCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  mainImage: {
    type: String,
    required: function() {
      return this.type === 'main-category';
    }
  },
  subcategoryItems: {
    type: [subcategoryItemSchema],
    validate: {
      validator: function(items) {
        if (this.type === 'subcategories') {
          return items && items.length === 4;
        }
        return !items || items.length === 0;
      },
      message: 'Subcategory type cards must have exactly 4 subcategory items'
    }
  },
  linkText: {
    type: String,
    default: 'Shop now'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
homepageCardSchema.index({ order: 1, isActive: 1 });

module.exports = mongoose.model('HomepageCard', homepageCardSchema);
