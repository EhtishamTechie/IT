const mongoose = require('mongoose');

// VendorOrder Schema for multi-vendor order management
const vendorOrderSchema = new mongoose.Schema({
  parentOrderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  orderNumber: { 
    type: String, 
    required: true // Parent order number + vendor suffix (e.g., ORD-001-V1)
  },
  vendor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true 
  },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true }
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: String,
    price: Number,
    quantity: Number,
    itemTotal: Number,
    image: String,
    mainCategory: String,
    subCategory: String
  }],
  totalAmount: { type: Number, required: true },
  commissionAmount: { type: Number, default: 0 }, // 20% commission
  commissionReversed: { type: Boolean, default: false }, // Track if commission was reversed
  status: { 
    type: String, 
    enum: ['placed', 'accepted', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled', 'cancelled_by_customer'],
    default: 'placed'
  },
  vendorNotes: { type: String },
  trackingInfo: { type: String },
  
  // Cancellation fields
  cancelledBy: { 
    type: String, 
    enum: ['user', 'vendor', 'admin'], 
    required: false 
  },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
  
  // Mixed order splitting fields
  splitFromMixedOrder: { type: Boolean, default: false },
  estimatedDelivery: { type: Date },
  trackingNumber: { type: String },
  
  // Customer information (flattened for easier access)
  customerName: { type: String },
  customerEmail: { type: String },
  customerPhone: { type: String },
  customerAddress: { type: String },
  
  // Payment information
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  subtotal: { type: Number }, // Total amount for this vendor part
  
  // Timestamps for order lifecycle
  forwardedAt: { type: Date }, // Only set when admin manually forwards, no default
  isForwardedByAdmin: { type: Boolean, default: false }, // Flag to indicate manual admin forwarding
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  deliveredAt: { type: Date }
}, { timestamps: true });

// Index for better query performance
vendorOrderSchema.index({ vendor: 1, status: 1 });
vendorOrderSchema.index({ parentOrderId: 1 });
vendorOrderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('VendorOrder', vendorOrderSchema);
