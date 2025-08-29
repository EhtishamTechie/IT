const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Basic Property Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  propertyType: {
    type: String,
    required: true,
    enum: [
      'House',
      'Apartment',
      'Villa',
      'Townhouse',
      'Office',
      'Shop',
      'Warehouse',
      'Plot',
      'Agricultural Land',
      'Industrial Land',
      'Commercial Building'
    ]
  },
  
  // Property Details
  price: {
    type: Number,
    required: true,
    min: 0
  },
  area: {
    value: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true,
      enum: ['sqft', 'marla', 'kanal', 'acre']
    }
  },
  bedrooms: {
    type: Number,
    min: 0,
    max: 20
  },
  bathrooms: {
    type: Number,
    min: 0,
    max: 20
  },
  propertyAge: {
    type: String,
    enum: ['New Construction', 'Under 5 Years', '5-10 Years', '10-20 Years', 'Over 20 Years']
  },
  furnishing: {
    type: String,
    enum: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'],
    default: 'Unfurnished'  // Set a default value
  },
  
  // Location Information
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  area_name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Property Features
  features: [{
    type: String,
    enum: [
      'Parking',
      'Garden',
      'Balcony',
      'Elevator',
      'Security',
      'Swimming Pool',
      'Gym',
      'Backup Generator',
      'Solar System',
      'Servant Quarter',
      'Store Room',
      'Basement',
      'Roof Access',
      'Corner Property',
      'Main Road Access',
      'Near School',
      'Near Hospital',
      'Near Market'
    ]
  }],
  
  // Contact Information (Seller's - for internal use only)
  sellerContact: {
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Images
  images: [{
    type: String,
    required: true
  }],
  
  // System Fields
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sold'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  
  // Professional Real Estate Fields
  propertyId: {
    type: String,
    unique: true
  },
  listingType: {
    type: String,
    enum: ['Sale', 'Rent'],
    default: 'Sale'
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate unique property ID before saving
propertySchema.pre('save', async function(next) {
  if (!this.propertyId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearMonthPrefix = `IT-${year}${month}-`;
    
    // Find the highest number for the current month
    const latestProperty = await this.constructor.findOne(
      { propertyId: new RegExp(`^${yearMonthPrefix}\\d{4}$`) },
      { propertyId: 1 },
      { sort: { propertyId: -1 } }
    );
    
    let nextNumber = 1;
    if (latestProperty && latestProperty.propertyId) {
      const currentNumber = parseInt(latestProperty.propertyId.split('-')[2]);
      nextNumber = currentNumber + 1;
    }
    
    this.propertyId = `${yearMonthPrefix}${String(nextNumber).padStart(4, '0')}`;
  }
  next();
});

// Index for better search performance
propertySchema.index({ propertyType: 1, city: 1, status: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ createdAt: -1 });
// propertyId already has unique index from schema definition

module.exports = mongoose.model('Property', propertySchema);
