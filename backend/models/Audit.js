const mongoose = require('mongoose');

// Audit Trail Schema for tracking system changes
const auditSchema = new mongoose.Schema({
  // Type of audit event
  type: { 
    type: String, 
    required: true,
    enum: ['stock_change', 'commission_payment', 'order_status', 'vendor_action', 'admin_action', 'system_action']
  },
  
  // Entity being audited
  entityType: { 
    type: String, 
    required: true,
    enum: ['product', 'order', 'vendor_order', 'commission', 'monthly_commission', 'vendor', 'user']
  },
  entityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  
  // Action performed
  action: { 
    type: String, 
    required: true,
    enum: ['create', 'update', 'delete', 'deduct', 'restore', 'payment', 'status_change', 'forward', 'approve', 'reject']
  },
  
  // Change tracking
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  
  // Reason and context
  reason: { 
    type: String, 
    required: true 
  },
  
  // Who performed the action
  performedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  performedByType: { 
    type: String, 
    required: true,
    enum: ['admin', 'vendor', 'system', 'customer']
  },
  
  // Additional metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    orderNumber: String,
    vendorOrderNumber: String,
    stockQuantity: Number,
    commissionAmount: Number,
    previousStatus: String,
    newStatus: String,
    affectedProducts: [String],
    notes: String
  }
}, { timestamps: true });

// Indexes for better query performance
auditSchema.index({ entityType: 1, entityId: 1 });
auditSchema.index({ type: 1, action: 1 });
auditSchema.index({ performedBy: 1, performedByType: 1 });
auditSchema.index({ createdAt: -1 }); // For recent activity queries

// Static method to log audit events
auditSchema.statics.logEvent = async function(eventData) {
  try {
    const audit = new this(eventData);
    await audit.save();
    return audit;
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw error to avoid breaking main functionality
    return null;
  }
};

// Static method to log stock changes
auditSchema.statics.logStockChange = async function(productId, oldQuantity, newQuantity, action, performedBy, performedByType, reason, metadata = {}) {
  return this.logEvent({
    type: 'stock_change',
    entityType: 'product',
    entityId: productId,
    action: action, // 'deduct' or 'restore'
    oldValue: { stock: oldQuantity },
    newValue: { stock: newQuantity },
    reason,
    performedBy,
    performedByType,
    metadata: {
      ...metadata,
      stockQuantity: newQuantity - oldQuantity
    }
  });
};

// Static method to log order status changes
auditSchema.statics.logOrderStatusChange = async function(orderId, oldStatus, newStatus, performedBy, performedByType, reason, metadata = {}) {
  return this.logEvent({
    type: 'order_status',
    entityType: 'order',
    entityId: orderId,
    action: 'status_change',
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    reason,
    performedBy,
    performedByType,
    metadata: {
      ...metadata,
      previousStatus: oldStatus,
      newStatus: newStatus
    }
  });
};

// Static method to log commission payments
auditSchema.statics.logCommissionPayment = async function(commissionId, amount, performedBy, reason, metadata = {}) {
  return this.logEvent({
    type: 'commission_payment',
    entityType: 'commission',
    entityId: commissionId,
    action: 'payment',
    oldValue: { status: 'pending' },
    newValue: { status: 'paid' },
    reason,
    performedBy,
    performedByType: 'admin',
    metadata: {
      ...metadata,
      commissionAmount: amount
    }
  });
};

// Static method to log admin actions
auditSchema.statics.logAdminAction = async function(entityType, entityId, action, adminId, reason, oldValue = null, newValue = null, metadata = {}) {
  return this.logEvent({
    type: 'admin_action',
    entityType,
    entityId,
    action,
    oldValue,
    newValue,
    reason,
    performedBy: adminId,
    performedByType: 'admin',
    metadata
  });
};

module.exports = mongoose.model('Audit', auditSchema);
