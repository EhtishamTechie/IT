const mongoose = require('mongoose');

const homepageCategorySchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

homepageCategorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const HomepageCategory = mongoose.model('HomepageCategory', homepageCategorySchema);

module.exports = HomepageCategory;
