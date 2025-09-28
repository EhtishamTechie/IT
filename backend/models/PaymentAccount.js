const mongoose = require('mongoose');

const paymentAccountSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Account title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be longer than 100 characters']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true,
    maxlength: [50, 'Account number cannot be longer than 50 characters']
  },
  paymentType: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: ['JazzCash', 'EasyPaisa', 'Bank Transfer'],
    default: 'JazzCash'
  },
  qrCode: {
    type: String,
    required: [true, 'QR code image is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Instructions cannot be longer than 500 characters'],
    default: 'Please transfer the advance payment and upload the receipt screenshot.'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
paymentAccountSchema.index({ isActive: 1, displayOrder: 1 });
paymentAccountSchema.index({ paymentType: 1, isActive: 1 });

// Static method to get active accounts
paymentAccountSchema.statics.getActiveAccounts = function() {
  return this.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
};

module.exports = mongoose.model('PaymentAccount', paymentAccountSchema);
