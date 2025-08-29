const mongoose = require('mongoose');

const commissionPaymentSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  paymentPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  orders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    orderNumber: String,
    commissionAmount: {
      type: Number,
      required: true
    },
    totalOrderValue: {
      type: Number,
      required: true
    },
    commissionRate: {
      type: Number,
      required: true
    },
    processedDate: {
      type: Date,
      default: Date.now
    }
  }],
  totalCommission: {
    type: Number,
    required: true
  },
  totalOrders: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'disputed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'stripe', 'manual'],
    default: 'bank_transfer'
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    paymentReference: String,
    bankDetails: {
      accountNumber: String,
      routingNumber: String,
      bankName: String
    },
    paypalEmail: String,
    notes: String
  },
  fees: {
    processingFee: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },
  netPayment: {
    type: Number,
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin who generated the payment
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin who processed the payment
  },
  notes: {
    type: String,
    trim: true
  },
  documents: [{
    type: String // URLs to payment receipts, invoices, etc.
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
commissionPaymentSchema.index({ vendor: 1 });
commissionPaymentSchema.index({ paymentStatus: 1 });
commissionPaymentSchema.index({ 'paymentPeriod.startDate': 1, 'paymentPeriod.endDate': 1 });
commissionPaymentSchema.index({ createdAt: -1 });

// Calculate net payment before saving
commissionPaymentSchema.pre('save', function(next) {
  this.netPayment = this.totalCommission - this.fees.totalFees;
  this.fees.totalFees = this.fees.processingFee + this.fees.platformFee;
  next();
});

// Virtual for payment period display
commissionPaymentSchema.virtual('paymentPeriodDisplay').get(function() {
  const start = this.paymentPeriod.startDate.toLocaleDateString();
  const end = this.paymentPeriod.endDate.toLocaleDateString();
  return `${start} - ${end}`;
});

// Static method to generate commission payment for a vendor
commissionPaymentSchema.statics.generatePaymentForVendor = async function(vendorId, startDate, endDate, adminId) {
  const Commission = mongoose.model('Commission');
  const Vendor = mongoose.model('Vendor');
  
  // Get all unpaid commissions for the vendor in the period
  const commissions = await Commission.find({
    vendor: vendorId,
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'pending'
  }).populate('order');
  
  if (commissions.length === 0) {
    throw new Error('No pending commissions found for this vendor in the specified period');
  }
  
  // Get vendor details
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }
  
  // Calculate totals
  const totalCommission = commissions.reduce((sum, comm) => sum + comm.amount, 0);
  const totalOrders = commissions.length;
  
  // Create payment record
  const payment = new this({
    vendor: vendorId,
    paymentPeriod: { startDate, endDate },
    orders: commissions.map(comm => ({
      orderId: comm.order._id,
      orderNumber: comm.order.orderNumber,
      commissionAmount: comm.amount,
      totalOrderValue: comm.orderValue,
      commissionRate: comm.rate,
      processedDate: comm.createdAt
    })),
    totalCommission,
    totalOrders,
    fees: {
      processingFee: totalCommission * 0.03, // 3% processing fee
      platformFee: totalCommission * 0.02, // 2% platform fee
    },
    generatedBy: adminId
  });
  
  await payment.save();
  
  // Mark commissions as processing
  await Commission.updateMany(
    { _id: { $in: commissions.map(c => c._id) } },
    { paymentStatus: 'processing' }
  );
  
  return payment;
};

// Static method to process payment
commissionPaymentSchema.statics.processPayment = async function(paymentId, paymentDetails, adminId) {
  const payment = await this.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }
  
  if (payment.paymentStatus !== 'pending') {
    throw new Error('Payment has already been processed');
  }
  
  payment.paymentStatus = 'paid';
  payment.paymentDetails = paymentDetails;
  payment.processedBy = adminId;
  
  await payment.save();
  
  // Mark all related commissions as paid
  const Commission = mongoose.model('Commission');
  await Commission.updateMany(
    { 
      vendor: payment.vendor,
      createdAt: { 
        $gte: payment.paymentPeriod.startDate, 
        $lte: payment.paymentPeriod.endDate 
      },
      paymentStatus: 'processing'
    },
    { paymentStatus: 'paid' }
  );
  
  return payment;
};

module.exports = mongoose.model('CommissionPayment', commissionPaymentSchema);
