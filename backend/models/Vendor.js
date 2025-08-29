const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vendorSchema = new mongoose.Schema({
  // Authentication fields
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // Temporary password for admin view (cleared after first login)
  tempPasswordForAdmin: {
    type: String,
    default: null
  },
  
  // Business Information
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [100, 'Business name cannot be longer than 100 characters']
  },
  businessType: {
    type: String,
    enum: ['individual', 'company', 'partnership'],
    required: [true, 'Business type is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be longer than 1000 characters']
  },
  
  // Contact Information
  contactPerson: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot be longer than 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot be longer than 50 characters']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot be longer than 20 characters']
    }
  },
  
  // Business Address
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'United States'
    }
  },
  
  // Business Documents
  documents: {
    businessLicense: {
      type: String, // File path or URL
      required: false
    },
    taxId: {
      type: String,
      trim: true
    },
    bankStatement: {
      type: String, // File path or URL
      required: false
    }
  },
  
  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNotes: {
    type: String,
    trim: true
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference to admin who verified
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String,
    trim: true
  },
  
  // Business Settings
  settings: {
    commissionRate: {
      type: Number,
      default: 20, // Default 20% commission (matches global config)
      min: [0, 'Commission rate cannot be negative'],
      max: [100, 'Commission rate cannot exceed 100%']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    autoApproveProducts: {
      type: Boolean,
      default: false
    },
    shippingMethods: [{
      name: String,
      cost: Number,
      estimatedDays: String
    }]
  },
  
  // Payment Information
  paymentInfo: {
    bankDetails: {
      accountNumber: {
        type: String,
        trim: true
      },
      routingNumber: {
        type: String,
        trim: true
      },
      accountHolderName: {
        type: String,
        trim: true
      },
      bankName: {
        type: String,
        trim: true
      }
    },
    paypalEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    preferredPaymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paypal', 'check'],
      default: 'bank_transfer'
    }
  },
  
  // Business Categories
  categories: [{
    type: String,
    trim: true
  }],
  
  // Statistics (calculated fields)
  stats: {
    totalProducts: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalCommission: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot be more than 5']
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  
  // Profile
  logo: {
    type: String // File path or URL
  },
  coverImage: {
    type: String // File path or URL
  },
  
  // Social Media
  socialMedia: {
    website: String,
    facebook: String,
    instagram: String,
    twitter: String
  },
  
  // Timestamps
  lastLogin: {
    type: Date
  },
  
  // Application Date
  applicationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full business name
vendorSchema.virtual('fullContactName').get(function() {
  return `${this.contactPerson.firstName} ${this.contactPerson.lastName}`;
});

// Virtual for full address
vendorSchema.virtual('fullAddress').get(function() {
  const { street, city, state, zipCode, country } = this.address;
  return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
});

// Virtual for verification status display
vendorSchema.virtual('verificationStatusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending Review',
    'under_review': 'Under Review',
    'approved': 'Approved',
    'rejected': 'Rejected'
  };
  return statusMap[this.verificationStatus] || 'Unknown';
});

// Virtual for account status
vendorSchema.virtual('accountStatus').get(function() {
  if (this.isSuspended) return 'suspended';
  if (!this.isActive) return 'inactive';
  if (this.verificationStatus !== 'approved') return 'pending_verification';
  return 'active';
});

// Pre-save middleware to hash password
vendorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
vendorSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
vendorSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find by email
vendorSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active vendors
vendorSchema.statics.findActive = function() {
  return this.find({ 
    isActive: true, 
    isSuspended: false,
    verificationStatus: 'approved'
  });
};

// Static method to find vendors by verification status
vendorSchema.statics.findByVerificationStatus = function(status) {
  return this.find({ verificationStatus: status });
};

// Method to approve vendor
vendorSchema.methods.approve = function(adminId, notes = '') {
  this.verificationStatus = 'approved';
  this.verifiedAt = new Date();
  this.verifiedBy = adminId;
  this.verificationNotes = notes;
  return this.save();
};

// Method to reject vendor
vendorSchema.methods.reject = function(adminId, reason) {
  this.verificationStatus = 'rejected';
  this.verificationNotes = reason;
  this.verifiedBy = adminId;
  return this.save();
};

// Method to suspend vendor
vendorSchema.methods.suspend = function(reason) {
  this.isSuspended = true;
  this.suspensionReason = reason;
  return this.save();
};

// Method to unsuspend vendor
vendorSchema.methods.unsuspend = function() {
  this.isSuspended = false;
  this.suspensionReason = '';
  return this.save();
};

// Method to update stats
vendorSchema.methods.updateStats = function(newStats) {
  Object.assign(this.stats, newStats);
  return this.save();
};

// Indexes for better query performance
// email already has unique index from schema definition
vendorSchema.index({ businessName: 1 });
vendorSchema.index({ verificationStatus: 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({ isSuspended: 1 });
vendorSchema.index({ categories: 1 });
vendorSchema.index({ createdAt: -1 });
vendorSchema.index({ 'stats.averageRating': -1 });
vendorSchema.index({ 'stats.totalRevenue': -1 });

module.exports = mongoose.model('Vendor', vendorSchema);
