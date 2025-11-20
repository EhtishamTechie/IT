
// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   phone: { type: String, required: true },
//   address: { type: String, required: true },
//   city: { type: String, required: true },
//   paymentMethod: {
//     type: String,
//     enum: ["cash_on_delivery", "Bank Transfer", "JazzCash"],
//     required: true,
//   },
//   paymentProof: { type: String },
//   cart: [
//     {
//       title: String,
//       price: Number,
//       quantity: Number,
//       image: String,
//       mainCategory: String,
//       subCategory: String,
//     },
//   ],
//   status: {
//     type: String,
//     enum: ["Pending", "Confirmed", "Shipped", "Delivered"],
//     default: "Pending",
//   },
// }, { timestamps: true });

// module.exports = mongoose.model("Order", orderSchema);
const mongoose = require('mongoose');

// Enhanced Order Item Schema for multi-vendor support
const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // For backward compatibility
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // Vendor reference
  title: String,
  price: Number,
  shipping: { type: Number, default: 0 }, // Add shipping cost for each product
  quantity: Number,
  selectedSize: { type: String, default: null }, // Optional size selection for products
  itemTotal: { type: Number, default: 0 }, // New field: item total amount
  image: String,
  mainCategory: String,
  subCategory: String,
  // New fields for multi-vendor order management
  status: { 
    type: String, 
    enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_user'],
    default: 'placed'
  },
  commissionAmount: { type: Number, default: 0 }, // 20% commission for vendor products
  commissionReversed: { type: Boolean, default: false }, // Track if commission was reversed
  forwardedAt: { type: Date },
  deliveredAt: { type: Date },
  
  // Item-specific tracking fields
  handledBy: { type: String, enum: ['admin', 'vendor'] },
  assignedVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  trackingNumber: String,
  estimatedDelivery: Date,
  
  // Status history for this specific item
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: String,
    updatedByType: { type: String, enum: ['admin', 'vendor', 'system'] },
    notes: String
  }]
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  paymentMethod: {
    type: String,
    enum: ["cash_on_delivery", "Bank Transfer", "JazzCash", "EasyPaisa", "cash", "credit", "bank", "jazzcash", "easypaisa", "advance_payment"],
    required: true,
  },
  paymentProof: { type: String },
  
  // Advance Payment Fields
  selectedPaymentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentAccount',
    default: null
  },
  paymentReceipt: { 
    type: String, // Path to uploaded payment receipt
    default: null
  },
  advancePaymentAmount: {
    type: Number,
    default: 0
  },
  paymentVerified: {
    type: Boolean,
    default: false
  },
  paymentVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  paymentVerifiedAt: {
    type: Date,
    default: null
  },
  cart: [orderItemSchema], // Using enhanced schema
  
  // Shipping calculation fields
  shippingCost: { type: Number, default: 0 },
  freeShippingApplied: { type: Boolean, default: false },
  shippingCalculationMethod: { 
    type: String, 
    enum: ['max_product_shipping', 'free_shipping'],
    default: 'max_product_shipping'
  },
  
  // Modern unified status field - single source of truth
  status: {
    type: String,
    enum: ["placed", "processing", "shipped", "delivered", "cancelled", "cancelled_by_customer", "cancelled_by_user"],
    default: "placed",
  },
  
  // New fields for multi-vendor order management
  orderType: { 
    type: String, 
    enum: ['admin_only', 'vendor_only', 'mixed', 'legacy'],
    default: 'legacy' // Default for existing orders
  },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // For vendor_only orders
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'pending_verification', 'verified'],
    default: 'pending'
  },
  adminNotes: { type: String },
  vendorOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' }], // References to VendorOrder documents
  isForwardedToVendors: { type: Boolean, default: false }, // Track if admin has manually forwarded orders
  completionDetails: {
    adminCompleted: { type: Boolean, default: false },
    vendorCompletions: { type: Map, of: Boolean, default: new Map() } // vendorId -> completion status
  },

  // Mixed order splitting fields
  isSplitOrder: { type: Boolean, default: false },
  parentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // For split orders
  vendorOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' }, // Link to VendorOrder for vendor_part orders
  isPartialOrder: { type: Boolean, default: false }, // Indicates this is part of a split order
  partialOrderType: { 
    type: String, 
    enum: ['admin_part', 'vendor_part'],
    default: null
  },
  splitFromMixedOrder: { type: Boolean, default: false },
  orderSplitStatus: {
    type: String,
    enum: ['not_split', 'split_pending', 'split_completed'],
    default: 'not_split'
  },
  splitAt: { type: Date },
  splitBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, // Admin who split the order
  
  // Customer information fields (for consistency)
  customerName: { type: String }, // Alternative to 'name' field
  estimatedDelivery: { type: Date },
  trackingNumber: { type: String },
  
  // Existing cancellation fields - preserved
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
  cancelledBy: {
    type: String,
    enum: ["user", "admin"],
    default: null
  }
}, { timestamps: true });

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ email: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ vendor: 1 });
orderSchema.index({ orderType: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'cart.vendor': 1 }); // For vendor order queries
orderSchema.index({ isForwardedToVendors: 1, orderType: 1 }); // For order forwarding

module.exports = mongoose.model("Order", orderSchema);
