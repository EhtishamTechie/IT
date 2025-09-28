const mongoose = require('mongoose');

const footerCategoriesSchema = new mongoose.Schema({
  categories: [{
    type: String,
    required: true
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one configuration exists
footerCategoriesSchema.statics.getConfiguration = async function() {
  let config = await this.findOne();
  if (!config) {
    // Create default configuration
    config = await this.create({
      categories: [
        'Electronics',
        'Fashion',
        'Home & Garden',
        'Sports & Outdoors',
        'Books & Media',
        'Health & Beauty',
        'Automotive',
        'Business & Industrial'
      ],
      updatedBy: 'system'
    });
  }
  return config;
};

footerCategoriesSchema.statics.updateConfiguration = async function(categories, updatedBy) {
  const config = await this.findOne();
  if (config) {
    config.categories = categories;
    config.updatedBy = updatedBy;
    config.lastUpdated = new Date();
    return await config.save();
  } else {
    return await this.create({
      categories,
      updatedBy
    });
  }
};

module.exports = mongoose.model('FooterCategories', footerCategoriesSchema);