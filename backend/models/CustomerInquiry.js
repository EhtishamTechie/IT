const mongoose = require('mongoose');

const customerInquirySchema = new mongoose.Schema({
  // Basic Information
  inquiryId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Customer Information
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for guest inquiries
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  
  // Vendor Information
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  
  // Inquiry Details
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Subject cannot be longer than 200 characters']
  },
  category: {
    type: String,
    enum: ['product_inquiry', 'order_support', 'shipping', 'return_refund', 'technical', 'billing', 'general'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Related References
  relatedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Status and Workflow
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
    default: 'open'
  },
  
  // Messages Thread
  messages: [{
    messageId: {
      type: String,
      required: true
    },
    sender: {
      type: String,
      enum: ['customer', 'vendor'],
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Message cannot be longer than 2000 characters']
    },
    attachments: [{
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      url: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  
  // Assignment and Handling
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Vendor staff member
  },
  assignedAt: {
    type: Date
  },
  
  // Resolution Information
  resolution: {
    summary: {
      type: String,
      trim: true
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    },
    resolutionTime: {
      type: Number // in minutes
    }
  },
  
  // Customer Satisfaction
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    submittedAt: {
      type: Date
    }
  },
  
  // Metadata
  source: {
    type: String,
    enum: ['website', 'email', 'phone', 'chat'],
    default: 'website'
  },
  tags: [{
    type: String,
    trim: true
  }],
  internalNotes: [{
    note: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  firstResponseAt: {
    type: Date
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for response time
customerInquirySchema.virtual('responseTime').get(function() {
  if (this.firstResponseAt && this.createdAt) {
    return Math.round((this.firstResponseAt - this.createdAt) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for total resolution time
customerInquirySchema.virtual('totalResolutionTime').get(function() {
  if (this.resolution.resolvedAt && this.createdAt) {
    return Math.round((this.resolution.resolvedAt - this.createdAt) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for unread messages count
customerInquirySchema.virtual('unreadMessagesCount').get(function() {
  return this.messages.filter(msg => !msg.isRead && msg.sender === 'customer').length;
});

// Virtual for last message
customerInquirySchema.virtual('lastMessage').get(function() {
  if (this.messages.length > 0) {
    return this.messages[this.messages.length - 1];
  }
  return null;
});

// Virtual for priority color
customerInquirySchema.virtual('priorityColor').get(function() {
  const colors = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    urgent: 'red'
  };
  return colors[this.priority] || 'gray';
});

// Pre-save middleware to generate inquiry ID
customerInquirySchema.pre('save', async function(next) {
  if (this.isNew && !this.inquiryId) {
    const count = await this.constructor.countDocuments();
    this.inquiryId = `INQ-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Update last activity
  this.lastActivityAt = new Date();
  
  next();
});

// Method to add message
customerInquirySchema.methods.addMessage = function(messageData) {
  const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const message = {
    messageId,
    sender: messageData.sender,
    senderName: messageData.senderName,
    content: messageData.content,
    attachments: messageData.attachments || [],
    timestamp: new Date(),
    isRead: false
  };
  
  this.messages.push(message);
  
  // Set first response time for vendor
  if (messageData.sender === 'vendor' && !this.firstResponseAt) {
    this.firstResponseAt = new Date();
  }
  
  return this.save();
};

// Method to mark messages as read
customerInquirySchema.methods.markAsRead = function(sender) {
  this.messages.forEach(msg => {
    if (msg.sender !== sender) {
      msg.isRead = true;
    }
  });
  return this.save();
};

// Method to update status
customerInquirySchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  
  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolution.resolvedBy = userId;
    this.resolution.resolvedAt = new Date();
    this.resolution.resolutionTime = this.totalResolutionTime;
  }
  
  return this.save();
};

// Method to assign inquiry
customerInquirySchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  return this.save();
};

// Method to add internal note
customerInquirySchema.methods.addInternalNote = function(note, userId) {
  this.internalNotes.push({
    note,
    createdBy: userId,
    createdAt: new Date()
  });
  return this.save();
};

// Method to submit feedback
customerInquirySchema.methods.submitFeedback = function(rating, comment) {
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date()
  };
  return this.save();
};

// Static method to find by vendor
customerInquirySchema.statics.findByVendor = function(vendorId, options = {}) {
  const query = { vendor: vendorId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query).sort({ lastActivityAt: -1 });
};

// Static method to get vendor statistics
customerInquirySchema.statics.getVendorStats = async function(vendorId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  const stats = await this.aggregate([
    {
      $match: {
        vendor: mongoose.Types.ObjectId(vendorId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalInquiries: { $sum: 1 },
        openInquiries: {
          $sum: {
            $cond: [{ $in: ['$status', ['open', 'in_progress', 'waiting_customer']] }, 1, 0]
          }
        },
        resolvedInquiries: {
          $sum: {
            $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0]
          }
        },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $ne: ['$firstResponseAt', null] },
              { $divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 1000 * 60] },
              null
            ]
          }
        },
        avgResolutionTime: {
          $avg: '$resolution.resolutionTime'
        },
        avgRating: { $avg: '$feedback.rating' }
      }
    }
  ]);
  
  return stats[0] || {
    totalInquiries: 0,
    openInquiries: 0,
    resolvedInquiries: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    avgRating: 0
  };
};

// Indexes for better performance
customerInquirySchema.index({ vendor: 1, status: 1 });
customerInquirySchema.index({ vendor: 1, createdAt: -1 });
customerInquirySchema.index({ customerEmail: 1 });
customerInquirySchema.index({ status: 1, priority: 1 });
customerInquirySchema.index({ assignedTo: 1 });
customerInquirySchema.index({ lastActivityAt: -1 });

module.exports = mongoose.model('CustomerInquiry', customerInquirySchema);
