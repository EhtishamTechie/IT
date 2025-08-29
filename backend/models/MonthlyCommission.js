const mongoose = require('mongoose');

// Monthly Commission Tracking Schema - For admin reporting and vendor payment management
const monthlyCommissionSchema = new mongoose.Schema({
  vendor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true 
  },
  month: { 
    type: Number, 
    required: true,
    min: 1,
    max: 12
  },
  year: { 
    type: Number, 
    required: true,
    min: 2020
  },
  
  // Order and Sales Metrics
  totalOrders: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 }, // 20% commission as per plan
  
  // Payment Status
  paidCommission: { type: Number, default: 0 },
  pendingCommission: { type: Number, default: 0 },
  lastPaymentDate: { type: Date },
  paymentMethod: { 
    type: String,
    enum: ['bank_transfer', 'paypal', 'check', 'store_credit'],
    default: 'bank_transfer'
  },
  
  // Transaction Records
  transactions: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'paid'],
      default: 'pending'
    }
  }],
  
  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'disputed'],
    default: 'pending'
  },
  
  // Admin Notes and References
  paymentReference: { type: String },
  adminNotes: { type: String }
}, { timestamps: true });

// Compound index for unique vendor-month-year combination
monthlyCommissionSchema.index({ vendor: 1, month: 1, year: 1 }, { unique: true });

// Indexes for better query performance
monthlyCommissionSchema.index({ vendor: 1, paymentStatus: 1 });
monthlyCommissionSchema.index({ month: 1, year: 1 });
monthlyCommissionSchema.index({ paymentStatus: 1 });

// Update pending commission whenever document is saved
monthlyCommissionSchema.pre('save', function(next) {
  this.pendingCommission = this.totalCommission - this.paidCommission;
  next();
});

// Static method to create or update monthly commission record
monthlyCommissionSchema.statics.updateMonthlyCommission = async function(vendorId, orderAmount, commissionAmount, orderId, vendorOrderId = null) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const filter = { vendor: vendorId, month, year };
  const update = {
    $inc: {
      totalOrders: 1,
      totalSales: orderAmount,
      totalCommission: commissionAmount
    },
    $push: {
      transactions: {
        orderId,
        vendorOrderId,
        amount: commissionAmount,
        date: now,
        status: 'pending'
      }
    }
  };
  
  return this.findOneAndUpdate(filter, update, { 
    upsert: true, 
    new: true,
    setDefaultsOnInsert: true 
  });
};

// Static method to mark commission as paid
monthlyCommissionSchema.statics.markAsPaid = async function(vendorId, month, year, amount, paymentMethod, paymentReference) {
  return this.findOneAndUpdate(
    { vendor: vendorId, month, year },
    {
      $inc: { paidCommission: amount },
      $set: {
        lastPaymentDate: new Date(),
        paymentMethod,
        paymentReference,
        paymentStatus: 'paid'
      }
    },
    { new: true }
  );
};

module.exports = mongoose.model('MonthlyCommission', monthlyCommissionSchema);
