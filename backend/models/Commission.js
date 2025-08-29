const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  // Reference Information
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  
  // Commission Calculation Details
  orderAmount: {
    type: Number,
    required: [true, 'Order amount is required'],
    min: [0, 'Order amount cannot be negative']
  },
  commissionRate: {
    type: Number,
    required: [true, 'Commission rate is required'],
    min: [0, 'Commission rate cannot be negative'],
    max: [100, 'Commission rate cannot exceed 100%']
  },
  commissionAmount: {
    type: Number,
    required: [true, 'Commission amount is required'],
    min: [0, 'Commission amount cannot be negative']
  },
  vendorEarnings: {
    type: Number,
    required: [true, 'Vendor earnings is required'],
    min: [0, 'Vendor earnings cannot be negative']
  },
  
  // Quantity and Item Details
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  
  // Additional Fees and Adjustments
  processingFee: {
    type: Number,
    default: 0,
    min: [0, 'Processing fee cannot be negative']
  },
  transactionFee: {
    type: Number,
    default: 0,
    min: [0, 'Transaction fee cannot be negative']
  },
  adjustments: [{
    type: {
      type: String,
      enum: ['discount', 'refund', 'penalty', 'bonus', 'fee'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Final Amounts
  finalCommissionAmount: {
    type: Number,
    required: [true, 'Final commission amount is required']
  },
  finalVendorEarnings: {
    type: Number,
    required: [true, 'Final vendor earnings is required']
  },
  
  // Status and Payment Information
  status: {
    type: String,
    enum: ['pending', 'calculated', 'paid', 'disputed', 'refunded'],
    default: 'pending'
  },
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'on_hold'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'check', 'store_credit'],
    default: 'bank_transfer'
  },
  paymentDate: {
    type: Date
  },
  paymentReference: {
    type: String,
    trim: true
  },
  
  // Period Information
  calculationPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      default: 'monthly'
    }
  },
  
  // Currency
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Order Status at Time of Calculation
  orderStatus: {
    type: String,
    required: [true, 'Order status is required']
  },
  
  // Dispute Information
  disputes: [{
    reason: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'rejected'],
      default: 'open'
    },
    raisedBy: {
      type: String,
      enum: ['vendor', 'admin', 'customer'],
      required: true
    },
    raisedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date
    },
    resolution: {
      type: String,
      trim: true
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Notes and Comments
  notes: {
    type: String,
    trim: true
  },
  
  // Calculation Metadata
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  calculatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recalculatedAt: {
    type: Date
  },
  recalculatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Tax Information
  taxInfo: {
    isTaxable: {
      type: Boolean,
      default: true
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative']
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for commission percentage as string
commissionSchema.virtual('commissionPercentage').get(function() {
  return `${this.commissionRate}%`;
});

// Virtual for total adjustments amount
commissionSchema.virtual('totalAdjustments').get(function() {
  return this.adjustments.reduce((total, adj) => {
    return adj.type === 'bonus' ? total + adj.amount : total - adj.amount;
  }, 0);
});

// Virtual for net earnings after all fees and adjustments
commissionSchema.virtual('netEarnings').get(function() {
  return this.finalVendorEarnings - this.processingFee - this.transactionFee;
});

// Virtual for profit margin
commissionSchema.virtual('profitMargin').get(function() {
  if (this.orderAmount === 0) return 0;
  return ((this.finalVendorEarnings / this.orderAmount) * 100).toFixed(2);
});

// Pre-save middleware to calculate final amounts
commissionSchema.pre('save', function(next) {
  // Calculate base commission and vendor earnings
  this.commissionAmount = (this.orderAmount * this.commissionRate) / 100;
  this.vendorEarnings = this.orderAmount - this.commissionAmount;
  
  // Apply adjustments
  const totalAdjustments = this.adjustments.reduce((total, adj) => {
    return adj.type === 'bonus' ? total + adj.amount : total - adj.amount;
  }, 0);
  
  // Calculate final amounts
  this.finalCommissionAmount = this.commissionAmount - totalAdjustments;
  this.finalVendorEarnings = this.vendorEarnings + totalAdjustments;
  
  // Ensure final amounts are not negative
  this.finalCommissionAmount = Math.max(0, this.finalCommissionAmount);
  this.finalVendorEarnings = Math.max(0, this.finalVendorEarnings);
  
  next();
});

// Instance methods

// Method to add adjustment
commissionSchema.methods.addAdjustment = function(type, amount, reason, appliedBy) {
  this.adjustments.push({
    type,
    amount,
    reason,
    appliedBy
  });
  return this.save();
};

// Method to mark as paid
commissionSchema.methods.markAsPaid = function(paymentMethod, paymentReference) {
  this.status = 'paid';
  this.paymentStatus = 'completed';
  this.paymentMethod = paymentMethod;
  this.paymentReference = paymentReference;
  this.paymentDate = new Date();
  return this.save();
};

// Method to raise dispute
commissionSchema.methods.raiseDispute = function(reason, raisedBy) {
  this.status = 'disputed';
  this.disputes.push({
    reason,
    raisedBy
  });
  return this.save();
};

// Method to resolve dispute
commissionSchema.methods.resolveDispute = function(disputeId, resolution, resolvedBy) {
  const dispute = this.disputes.id(disputeId);
  if (dispute) {
    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedBy = resolvedBy;
    dispute.resolvedAt = new Date();
    
    // Check if all disputes are resolved
    const openDisputes = this.disputes.filter(d => d.status === 'open' || d.status === 'investigating');
    if (openDisputes.length === 0) {
      this.status = 'calculated';
    }
  }
  return this.save();
};

// Method to recalculate commission
commissionSchema.methods.recalculate = function(newRate, recalculatedBy) {
  this.commissionRate = newRate;
  this.recalculatedAt = new Date();
  this.recalculatedBy = recalculatedBy;
  return this.save();
};

// Static methods

// Find commissions by vendor
commissionSchema.statics.findByVendor = function(vendorId, startDate, endDate) {
  const query = { vendor: vendorId };
  if (startDate && endDate) {
    query.calculatedAt = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).populate('order product');
};

// Find commissions by status
commissionSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

// Find pending payments
commissionSchema.statics.findPendingPayments = function() {
  return this.find({ 
    status: 'calculated',
    paymentStatus: 'pending'
  }).populate('vendor order product');
};

// Calculate total commission for a period
commissionSchema.statics.calculateTotalCommission = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        calculatedAt: { $gte: startDate, $lte: endDate },
        status: { $ne: 'refunded' }
      }
    },
    {
      $group: {
        _id: null,
        totalCommission: { $sum: '$finalCommissionAmount' },
        totalVendorEarnings: { $sum: '$finalVendorEarnings' },
        totalOrders: { $sum: 1 },
        averageCommissionRate: { $avg: '$commissionRate' }
      }
    }
  ]);
};

// Calculate vendor earnings for a period
commissionSchema.statics.calculateVendorEarnings = function(vendorId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        vendor: mongoose.Types.ObjectId(vendorId),
        calculatedAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['calculated', 'paid'] }
      }
    },
    {
      $group: {
        _id: '$vendor',
        totalEarnings: { $sum: '$finalVendorEarnings' },
        totalCommission: { $sum: '$finalCommissionAmount' },
        totalOrders: { $sum: 1 },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'completed'] }, '$finalVendorEarnings', 0]
          }
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$finalVendorEarnings', 0]
          }
        }
      }
    }
  ]);
};

// Indexes for better query performance
commissionSchema.index({ vendor: 1 });
commissionSchema.index({ order: 1 });
commissionSchema.index({ product: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ paymentStatus: 1 });
commissionSchema.index({ calculatedAt: -1 });
commissionSchema.index({ paymentDate: -1 });
commissionSchema.index({ vendor: 1, status: 1 });
commissionSchema.index({ vendor: 1, calculatedAt: -1 });
commissionSchema.index({ 'calculationPeriod.startDate': 1, 'calculationPeriod.endDate': 1 });

module.exports = mongoose.model('Commission', commissionSchema);
