const mongoose = require('mongoose');

const homepageStaticCategorySchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  displayOrder: {
    type: Number,
    required: true
  },
  selectedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

// Validation for max 8 products
homepageStaticCategorySchema.path('selectedProducts').validate(function(value) {
  return value.length <= 8;
}, 'A static category cannot have more than 8 products');

module.exports = mongoose.model('HomepageStaticCategory', homepageStaticCategorySchema);
