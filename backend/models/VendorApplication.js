const mongoose = require('mongoose');

const vendorApplicationSchema = new mongoose.Schema({
  // Application Information
  applicationId: {
    type: String,
    unique: true,
    required: false // Will be auto-generated
  },
  
  // Applicant Information
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
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
  
  // Categories vendor wants to sell in
  intendedCategories: [{
    type: String,
    trim: true
  }],
  
  // Business Experience
  businessExperience: {
    yearsInBusiness: {
      type: Number,
      min: [0, 'Years in business cannot be negative']
    },
    previousMarketplaces: [{
      name: String,
      duration: String,
      rating: Number
    }],
    estimatedMonthlyVolume: {
      type: Number,
      min: [0, 'Monthly volume cannot be negative']
    }
  },
  
  // Documents Submitted
  documents: {
    businessLicense: {
      filename: String,
      path: String,
      uploadedAt: Date
    },
    taxId: {
      value: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    bankStatement: {
      filename: String,
      path: String,
      uploadedAt: Date
    },
    identityProof: {
      filename: String,
      path: String,
      uploadedAt: Date
    }
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'more_info_required'],
    default: 'draft'
  },
  
  // Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference to admin who reviewed
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  
  // Additional Information Requests
  additionalInfoRequests: [{
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'provided', 'not_applicable'],
      default: 'pending'
    },
    response: {
      message: String,
      documents: [{
        filename: String,
        path: String,
        uploadedAt: Date
      }],
      respondedAt: Date
    }
  }],
  
  // Communication Log
  communications: [{
    from: {
      type: String,
      enum: ['applicant', 'admin'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      filename: String,
      path: String
    }]
  }],
  
  // Application Progress
  completionPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Completion percentage cannot be negative'],
    max: [100, 'Completion percentage cannot exceed 100%']
  },
  
  // Submission Information
  submittedAt: {
    type: Date
  },
  
  // IP Address and User Agent for security
  applicationMeta: {
    ipAddress: String,
    userAgent: String,
    referrer: String
  },
  
  // Follow-up Information
  followUpDate: {
    type: Date
  },
  followUpNotes: {
    type: String,
    trim: true
  },
  
  // If approved, reference to created vendor account
  vendorAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  
  // Terms and Conditions Acceptance
  termsAccepted: {
    accepted: {
      type: Boolean,
      required: true,
      default: false
    },
    acceptedAt: Date,
    version: String // Terms version accepted
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate unique application ID before saving
vendorApplicationSchema.pre('save', function(next) {
  if (!this.applicationId) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.applicationId = `VA${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Virtual for full contact name
vendorApplicationSchema.virtual('fullContactName').get(function() {
  return `${this.contactPerson.firstName} ${this.contactPerson.lastName}`;
});

// Virtual for full address
vendorApplicationSchema.virtual('fullAddress').get(function() {
  const { street, city, state, zipCode, country } = this.address;
  return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
});

// Virtual for status display
vendorApplicationSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'under_review': 'Under Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'more_info_required': 'More Information Required'
  };
  return statusMap[this.status] || 'Unknown';
});

// Virtual for days since submission
vendorApplicationSchema.virtual('daysSinceSubmission').get(function() {
  if (!this.submittedAt) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.submittedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to submit application
vendorApplicationSchema.methods.submit = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  return this.save();
};

// Method to approve application
vendorApplicationSchema.methods.approve = function(adminId, notes = '') {
  this.status = 'approved';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

// Method to reject application
vendorApplicationSchema.methods.reject = function(adminId, reason) {
  this.status = 'rejected';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method to request more information
vendorApplicationSchema.methods.requestMoreInfo = function(adminId, message) {
  this.status = 'more_info_required';
  this.additionalInfoRequests.push({
    requestedBy: adminId,
    message: message
  });
  return this.save();
};

// Method to add communication
vendorApplicationSchema.methods.addCommunication = function(from, message, attachments = []) {
  this.communications.push({
    from,
    message,
    attachments
  });
  return this.save();
};

// Method to calculate completion percentage
vendorApplicationSchema.methods.calculateCompletion = function() {
  let completed = 0;
  const total = 10; // Total number of required fields/sections
  
  // Check required fields
  if (this.businessName) completed++;
  if (this.businessType) completed++;
  if (this.contactPerson.firstName && this.contactPerson.lastName) completed++;
  if (this.contactPerson.phone) completed++;
  if (this.address.street && this.address.city && this.address.state) completed++;
  if (this.intendedCategories.length > 0) completed++;
  if (this.businessExperience.yearsInBusiness !== undefined) completed++;
  if (this.documents.businessLicense.path) completed++;
  if (this.documents.taxId.value) completed++;
  if (this.termsAccepted.accepted) completed++;
  
  this.completionPercentage = Math.round((completed / total) * 100);
  return this.completionPercentage;
};

// Static method to find by status
vendorApplicationSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

// Static method to find pending applications
vendorApplicationSchema.statics.findPending = function() {
  return this.find({ 
    status: { $in: ['submitted', 'under_review', 'more_info_required'] }
  }).sort({ submittedAt: 1 });
};

// Static method to find applications requiring follow-up
vendorApplicationSchema.statics.findRequiringFollowUp = function() {
  const today = new Date();
  return this.find({
    followUpDate: { $lte: today },
    status: { $in: ['submitted', 'under_review', 'more_info_required'] }
  });
};

// Indexes for better query performance
vendorApplicationSchema.index({ email: 1 });
vendorApplicationSchema.index({ status: 1 });
vendorApplicationSchema.index({ submittedAt: -1 });
vendorApplicationSchema.index({ reviewedAt: -1 });
vendorApplicationSchema.index({ followUpDate: 1 });
vendorApplicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VendorApplication', vendorApplicationSchema);
