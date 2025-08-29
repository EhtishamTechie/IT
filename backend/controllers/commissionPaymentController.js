const CommissionPayment = require('../models/CommissionPayment');
const Commission = require('../models/Commission');
const Vendor = require('../models/Vendor');

// Generate commission payment for a vendor
const generateCommissionPayment = async (req, res) => {
  try {
    const { vendorId, startDate, endDate } = req.body;
    const adminId = req.user.id; // Assuming admin authentication middleware
    
    if (!vendorId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID, start date, and end date are required'
      });
    }
    
    const payment = await CommissionPayment.generatePaymentForVendor(
      vendorId,
      new Date(startDate),
      new Date(endDate),
      adminId
    );
    
    res.status(201).json({
      success: true,
      message: 'Commission payment generated successfully',
      payment
    });
  } catch (error) {
    console.error('Error generating commission payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate commission payment'
    });
  }
};

// Get all commission payments
const getCommissionPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    
    // Apply filters
    if (req.query.vendor) {
      filter.vendor = req.query.vendor;
    }
    
    if (req.query.status) {
      filter.paymentStatus = req.query.status;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    const payments = await CommissionPayment.find(filter)
      .populate('vendor', 'businessName email contactPhone')
      .populate('generatedBy', 'name email')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalPayments = await CommissionPayment.countDocuments(filter);
    
    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNextPage: page < Math.ceil(totalPayments / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching commission payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission payments'
    });
  }
};

// Get commission payment by ID
const getCommissionPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await CommissionPayment.findById(id)
      .populate('vendor', 'businessName email contactPhone rating address')
      .populate('generatedBy', 'name email')
      .populate('processedBy', 'name email')
      .populate('orders.orderId', 'orderNumber customerInfo totalAmount status');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Commission payment not found'
      });
    }
    
    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error fetching commission payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission payment'
    });
  }
};

// Process commission payment
const processCommissionPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentDetails } = req.body;
    const adminId = req.user.id;
    
    if (!paymentMethod || !paymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and payment details are required'
      });
    }
    
    const paymentData = {
      ...paymentDetails,
      paymentDate: new Date()
    };
    
    const payment = await CommissionPayment.processPayment(id, paymentData, adminId);
    
    res.json({
      success: true,
      message: 'Commission payment processed successfully',
      payment
    });
  } catch (error) {
    console.error('Error processing commission payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process commission payment'
    });
  }
};

// Get vendor commission payments (for vendor dashboard)
const getVendorCommissionPayments = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.params.vendorId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }
    
    const filter = { vendor: vendorId };
    
    if (req.query.status) {
      filter.paymentStatus = req.query.status;
    }
    
    const payments = await CommissionPayment.find(filter)
      .populate('generatedBy', 'name')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalPayments = await CommissionPayment.countDocuments(filter);
    
    // Calculate summary stats
    const stats = await CommissionPayment.aggregate([
      { $match: { vendor: vendorId } },
      {
        $group: {
          _id: '$paymentStatus',
          totalAmount: { $sum: '$totalCommission' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const summary = {
      totalEarnings: 0,
      paidAmount: 0,
      pendingAmount: 0,
      totalPayments: totalPayments
    };
    
    stats.forEach(stat => {
      summary.totalEarnings += stat.totalAmount;
      if (stat._id === 'paid') {
        summary.paidAmount = stat.totalAmount;
      } else if (stat._id === 'pending') {
        summary.pendingAmount = stat.totalAmount;
      }
    });
    
    res.json({
      success: true,
      payments,
      summary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNextPage: page < Math.ceil(totalPayments / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching vendor commission payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor commission payments'
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'processing', 'paid', 'failed', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }
    
    const payment = await CommissionPayment.findByIdAndUpdate(
      id,
      { 
        paymentStatus: status, 
        notes: notes || '',
        ...(status === 'paid' && { 'paymentDetails.paymentDate': new Date() })
      },
      { new: true }
    ).populate('vendor', 'businessName email');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Commission payment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Payment status updated successfully',
      payment
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
};

// Get commission payment statistics
const getCommissionPaymentStats = async (req, res) => {
  try {
    const stats = await CommissionPayment.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          totalAmount: { $sum: '$totalCommission' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$totalCommission' }
        }
      }
    ]);
    
    const monthlyStats = await CommissionPayment.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAmount: { $sum: '$totalCommission' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    const vendorStats = await CommissionPayment.aggregate([
      {
        $group: {
          _id: '$vendor',
          totalEarnings: { $sum: '$totalCommission' },
          totalPayments: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      { $unwind: '$vendorInfo' },
      {
        $project: {
          vendorName: '$vendorInfo.businessName',
          totalEarnings: 1,
          totalPayments: 1
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      stats: {
        byStatus: stats,
        monthly: monthlyStats,
        topVendors: vendorStats
      }
    });
  } catch (error) {
    console.error('Error fetching commission payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission payment statistics'
    });
  }
};

module.exports = {
  generateCommissionPayment,
  getCommissionPayments,
  getCommissionPaymentById,
  processCommissionPayment,
  getVendorCommissionPayments,
  updatePaymentStatus,
  getCommissionPaymentStats
};
