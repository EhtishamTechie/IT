const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // Product Reference
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  
  // Vendor Reference
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor reference is required']
  },

  // Stock Information
  currentStock: {
    type: Number,
    required: [true, 'Current stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  
  reservedStock: {
    type: Number,
    default: 0,
    min: [0, 'Reserved stock cannot be negative']
  },
  
  availableStock: {
    type: Number,
    default: 0,
    min: [0, 'Available stock cannot be negative']
  },

  // Stock Thresholds
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, 'Low stock threshold cannot be negative']
  },
  
  outOfStockThreshold: {
    type: Number,
    default: 0,
    min: [0, 'Out of stock threshold cannot be negative']
  },
  
  maxStockLimit: {
    type: Number,
    default: null // null means unlimited
  },

  // Stock Status
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    default: 'in_stock'
  },
  
  // Automated stock management
  autoReorderEnabled: {
    type: Boolean,
    default: false
  },
  
  reorderPoint: {
    type: Number,
    default: 20,
    min: [0, 'Reorder point cannot be negative']
  },
  
  reorderQuantity: {
    type: Number,
    default: 50,
    min: [1, 'Reorder quantity must be at least 1']
  },

  // Cost Information
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  
  averageCostPrice: {
    type: Number,
    min: [0, 'Average cost price cannot be negative']
  },

  // Location Information
  warehouseLocation: {
    warehouse: {
      type: String,
      trim: true
    },
    aisle: {
      type: String,
      trim: true
    },
    shelf: {
      type: String,
      trim: true
    },
    bin: {
      type: String,
      trim: true
    }
  },

  // Batch/Lot Information
  batchInfo: [{
    batchNumber: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Batch quantity cannot be negative']
    },
    expiryDate: {
      type: Date
    },
    manufacturingDate: {
      type: Date
    },
    supplier: {
      type: String,
      trim: true
    },
    costPrice: {
      type: Number,
      min: [0, 'Batch cost price cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'damaged', 'returned'],
      default: 'active'
    }
  }],

  // Stock Movement History
  stockMovements: [{
    type: {
      type: String,
      enum: ['purchase', 'sale', 'return', 'adjustment', 'transfer', 'damage', 'expiry'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      trim: true
    },
    reference: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      },
      purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId
      },
      transferId: {
        type: mongoose.Schema.Types.ObjectId
      }
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  }],

  // Alerts and Notifications
  alerts: [{
    type: {
      type: String,
      enum: ['low_stock', 'out_of_stock', 'expired_batch', 'reorder_needed'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Supplier Information
  suppliers: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    leadTime: {
      type: Number, // in days
      default: 7
    },
    minimumOrderQuantity: {
      type: Number,
      default: 1
    },
    supplierSku: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Forecasting Data
  forecast: {
    averageDailySales: {
      type: Number,
      default: 0
    },
    averageWeeklySales: {
      type: Number,
      default: 0
    },
    averageMonthlySales: {
      type: Number,
      default: 0
    },
    seasonalityFactor: {
      type: Number,
      default: 1.0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Inventory Valuation
  valuation: {
    method: {
      type: String,
      enum: ['fifo', 'lifo', 'average_cost', 'specific_identification'],
      default: 'fifo'
    },
    totalValue: {
      type: Number,
      default: 0
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
  },

  // Quality Control
  qualityChecks: [{
    checkDate: {
      type: Date,
      required: true
    },
    checkType: {
      type: String,
      enum: ['incoming', 'periodic', 'pre_shipment', 'customer_return'],
      required: true
    },
    status: {
      type: String,
      enum: ['passed', 'failed', 'conditional'],
      required: true
    },
    notes: {
      type: String,
      trim: true
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Last activity tracking
  lastStockUpdate: {
    type: Date,
    default: Date.now
  },
  
  lastMovementDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for available stock calculation
inventorySchema.virtual('computedAvailableStock').get(function() {
  return Math.max(0, this.currentStock - this.reservedStock);
});

// Virtual for stock value
inventorySchema.virtual('stockValue').get(function() {
  return this.currentStock * (this.averageCostPrice || this.costPrice || 0);
});

// Virtual for days of stock remaining
inventorySchema.virtual('daysOfStockRemaining').get(function() {
  if (!this.forecast.averageDailySales || this.forecast.averageDailySales <= 0) {
    return Infinity;
  }
  return Math.floor(this.computedAvailableStock / this.forecast.averageDailySales);
});

// Virtual for stock status calculation
inventorySchema.virtual('computedStockStatus').get(function() {
  if (this.currentStock <= this.outOfStockThreshold) {
    return 'out_of_stock';
  } else if (this.currentStock <= this.lowStockThreshold) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
});

// Pre-save middleware to update available stock and status
inventorySchema.pre('save', function(next) {
  // Update available stock
  this.availableStock = Math.max(0, this.currentStock - this.reservedStock);
  
  // Update stock status if not manually set to discontinued
  if (this.stockStatus !== 'discontinued') {
    this.stockStatus = this.computedStockStatus;
  }
  
  // Update last stock update timestamp
  if (this.isModified('currentStock') || this.isModified('reservedStock')) {
    this.lastStockUpdate = new Date();
  }
  
  next();
});

// Method to add stock movement
inventorySchema.methods.addStockMovement = function(movementData) {
  this.stockMovements.push({
    ...movementData,
    timestamp: new Date()
  });
  
  // Update last movement date
  this.lastMovementDate = new Date();
  
  return this.save();
};

// Method to reserve stock
inventorySchema.methods.reserveStock = function(quantity, orderId) {
  if (quantity > this.availableStock) {
    throw new Error('Insufficient stock available for reservation');
  }
  
  this.reservedStock += quantity;
  
  // Add movement record
  this.stockMovements.push({
    type: 'sale',
    quantity: -quantity,
    reason: 'Stock reserved for order',
    reference: { orderId },
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to release reserved stock
inventorySchema.methods.releaseReservedStock = function(quantity, reason = 'Stock reservation released') {
  const releaseAmount = Math.min(quantity, this.reservedStock);
  this.reservedStock -= releaseAmount;
  
  // Add movement record
  this.stockMovements.push({
    type: 'adjustment',
    quantity: releaseAmount,
    reason,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to confirm sale and remove from current stock
inventorySchema.methods.confirmSale = function(quantity, orderId) {
  if (quantity > this.reservedStock) {
    throw new Error('Cannot confirm sale: insufficient reserved stock');
  }
  
  this.currentStock -= quantity;
  this.reservedStock -= quantity;
  
  // Add movement record
  this.stockMovements.push({
    type: 'sale',
    quantity: -quantity,
    reason: 'Sale confirmed',
    reference: { orderId },
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to add stock (purchase, return, adjustment)
inventorySchema.methods.addStock = function(quantity, type = 'purchase', reason, reference) {
  this.currentStock += quantity;
  
  // Add movement record
  this.stockMovements.push({
    type,
    quantity,
    reason,
    reference,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to check if reorder is needed
inventorySchema.methods.shouldReorder = function() {
  return this.autoReorderEnabled && this.availableStock <= this.reorderPoint;
};

// Method to create alert
inventorySchema.methods.createAlert = function(type, message, severity = 'medium') {
  // Check if similar alert already exists and is not acknowledged
  const existingAlert = this.alerts.find(alert => 
    alert.type === type && !alert.acknowledged
  );
  
  if (!existingAlert) {
    this.alerts.push({
      type,
      message,
      severity,
      createdAt: new Date()
    });
  }
  
  return this.save();
};

// Method to acknowledge alert
inventorySchema.methods.acknowledgeAlert = function(alertId, userId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
  }
  
  return this.save();
};

// Method to update forecast data
inventorySchema.methods.updateForecast = function(salesData) {
  this.forecast = {
    ...this.forecast,
    ...salesData,
    lastUpdated: new Date()
  };
  
  return this.save();
};

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = function(vendorId) {
  return this.find({
    vendor: vendorId,
    stockStatus: { $in: ['low_stock', 'out_of_stock'] }
  }).populate('product', 'name sku images');
};

// Static method to get items needing reorder
inventorySchema.statics.getReorderItems = function(vendorId) {
  return this.find({
    vendor: vendorId,
    autoReorderEnabled: true,
    $expr: { $lte: ['$availableStock', '$reorderPoint'] }
  }).populate('product', 'name sku');
};

// Static method to get inventory summary
inventorySchema.statics.getInventorySummary = async function(vendorId) {
  const pipeline = [
    { $match: { vendor: mongoose.Types.ObjectId(vendorId) } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalStock: { $sum: '$currentStock' },
        totalValue: { $sum: { $multiply: ['$currentStock', { $ifNull: ['$averageCostPrice', '$costPrice', 0] }] } },
        lowStockItems: {
          $sum: {
            $cond: [{ $eq: ['$stockStatus', 'low_stock'] }, 1, 0]
          }
        },
        outOfStockItems: {
          $sum: {
            $cond: [{ $eq: ['$stockStatus', 'out_of_stock'] }, 1, 0]
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalItems: 0,
    totalStock: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  };
};

// Indexes for better query performance
inventorySchema.index({ product: 1, vendor: 1 }, { unique: true });
inventorySchema.index({ vendor: 1 });
inventorySchema.index({ stockStatus: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ lastStockUpdate: -1 });
inventorySchema.index({ 'batchInfo.expiryDate': 1 });
inventorySchema.index({ 'alerts.acknowledged': 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
