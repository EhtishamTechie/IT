const Commission = require('../models/Commission');
const MonthlyCommission = require('../models/MonthlyCommission');
const CommissionService = require('../services/CommissionService');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CommissionConfig = require('../config/commission');
const mongoose = require('mongoose');

// @desc    Calculate commission for an order
// @route   POST /api/vendors/commissions/calculate
// @access  Private (System/Admin)
const calculateCommission = async (orderId, vendorId) => {
  try {
    // Get order details
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      throw new Error('Order not found');
    }

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Calculate commission for vendor products in this order
    let totalVendorAmount = 0;
    const vendorItems = [];

    for (const item of order.items) {
      if (item.product.vendor && item.product.vendor.toString() === vendorId.toString()) {
        const itemTotal = item.price * item.quantity;
        totalVendorAmount += itemTotal;
        vendorItems.push({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price,
          total: itemTotal
        });
      }
    }

    if (totalVendorAmount === 0) {
      return null; // No products from this vendor in the order
    }

    // Calculate commission - Always use global admin setting for consistency
    const commissionRate = CommissionConfig.COMMISSION_PERCENTAGE; // Use global admin setting
    const commissionAmount = (totalVendorAmount * commissionRate) / 100;
    const vendorEarnings = totalVendorAmount - commissionAmount;

    // Create commission record
    const commission = new Commission({
      vendor: vendorId,
      order: orderId,
      products: vendorItems,
      orderTotal: totalVendorAmount,
      commissionRate: commissionRate,
      commissionAmount: commissionAmount,
      vendorEarnings: vendorEarnings,
      status: 'pending',
      calculatedAt: new Date()
    });

    await commission.save();

    // Update vendor stats
    await Vendor.findByIdAndUpdate(vendorId, {
      $inc: {
        'stats.totalRevenue': totalVendorAmount,
        'stats.totalCommission': commissionAmount,
        'stats.totalOrders': 1
      }
    });

    return commission;

  } catch (error) {
    console.error('Calculate commission error:', error);
    throw error;
  }
};

// @desc    Get vendor commissions summary and monthly breakdown
// @route   GET /api/vendors/commissions
// @access  Private (Vendor)
const getVendorCommissions = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { period = 'month' } = req.query;
    
    console.log(`📊 Getting vendor commissions for vendor ${vendorId}, period: ${period}`);
    
    // Get commission summary using enhanced CommissionService
    const summary = await CommissionService.getVendorCommissionSummary(vendorId, period);
    
    // Get monthly reports for detailed breakdown
    const monthlyReports = await CommissionService.getVendorMonthlyReports(vendorId, period);
    
    res.json({
      success: true,
      data: {
        summary,
        monthlyReports,
        message: 'Commission data retrieved successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error getting vendor commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission data',
      error: error.message
    });
  }
};

// @desc    Get single commission details
// @route   GET /api/vendors/commissions/:id
// @access  Private (Vendor)
const getCommissionDetails = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const commissionId = req.params.id;

    const commission = await Commission.findOne({
      _id: commissionId,
      vendor: vendorId
    })
      .populate('order', 'orderNumber status createdAt customer')
      .populate('products.product', 'name image sku')
      .populate('vendor', 'businessName email');

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: 'Commission record not found'
      });
    }

    res.json({
      success: true,
      data: commission
    });

  } catch (error) {
    console.error('Get commission details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commission details',
      error: error.message
    });
  }
};

// @desc    Get commission analytics for vendor dashboard
// @route   GET /api/vendors/commissions/analytics
// @access  Private (Vendor)
const getCommissionAnalytics = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { period = 'month' } = req.query;
    
    console.log(`📈 Getting commission analytics for vendor ${vendorId}, period: ${period}`);
    
    // Get comprehensive commission data using enhanced CommissionService
    const summary = await CommissionService.getVendorCommissionSummary(vendorId, period);
    const monthlyReports = await CommissionService.getVendorMonthlyReports(vendorId, period);
    
    // Format data for analytics dashboard
    const analytics = {
      summary: {
        totalCommissionOwed: summary.totalCommissionOwed || 0,
        totalOrderValue: summary.totalOrderValue || 0,
        totalOrders: summary.totalOrders || 0,
        averageOrderValue: summary.averageOrderValue || 0,
        commissionRate: commissionRate // Use dynamic rate from vendor settings or global config
      },
      monthlyBreakdown: monthlyReports.map(report => ({
        month: report.month,
        year: report.year,
        totalCommission: report.totalCommission,
        totalOrders: report.totalOrders,
        paymentStatus: report.paymentStatus,
        paidToAdmin: report.paidToAdmin,
        pendingToAdmin: report.pendingToAdmin
      })),
      paymentSummary: {
        totalPaid: monthlyReports.reduce((sum, report) => sum + (report.paidToAdmin || 0), 0),
        totalPending: monthlyReports.reduce((sum, report) => sum + (report.pendingToAdmin || 0), 0),
        lastPaymentDate: monthlyReports
          .filter(report => report.paidToAdmin > 0)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]?.updatedAt || null
      }
    };
    
    res.json({
      success: true,
      data: {
        period,
        analytics,
        message: 'Commission analytics retrieved successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error getting commission analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission analytics',
      error: error.message
    });
  }
};

// @desc    Get monthly commission reports for vendor
// @route   GET /api/vendors/commissions/monthly
// @access  Private (Vendor)
const getMonthlyCommissionReports = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { 
      period = 'year',
      page = 1,
      limit = 12 
    } = req.query;
    
    console.log(`📅 Getting monthly commission reports for vendor ${vendorId}, period: ${period}, page: ${page}, limit: ${limit}`);
    
    // Get monthly reports using enhanced CommissionService with pagination
    const reportData = await CommissionService.getVendorMonthlyReports(vendorId, period, page, limit);
    
    res.json({
      success: true,
      data: {
        monthlyCommissions: reportData.monthlyCommissions,
        pagination: reportData.pagination,
        message: 'Monthly commission reports retrieved successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error getting monthly commission reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly commission reports',
      error: error.message
    });
  }
};

// @desc    Request payout
// @route   POST /api/vendors/commissions/request-payout
// @access  Private (Vendor)
const requestPayout = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { commissionIds, paymentMethod } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Commission IDs are required'
      });
    }

    // Validate commissions belong to vendor and are ready for payout
    const commissions = await Commission.find({
      _id: { $in: commissionIds },
      vendor: vendorId,
      status: 'confirmed'
    });

    if (commissions.length !== commissionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some commissions are not eligible for payout'
      });
    }

    // Calculate total payout amount
    const totalAmount = commissions.reduce((sum, comm) => sum + comm.vendorEarnings, 0);

    // Update commission status to payout_requested
    await Commission.updateMany(
      { _id: { $in: commissionIds } },
      { 
        status: 'payout_requested',
        payoutRequestedAt: new Date(),
        paymentMethod: paymentMethod || 'bank_transfer'
      }
    );

    res.json({
      success: true,
      message: 'Payout request submitted successfully',
      data: {
        commissionCount: commissions.length,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod || 'bank_transfer'
      }
    });

  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting payout',
      error: error.message
    });
  }
};

module.exports = {
  calculateCommission,
  getVendorCommissions,
  getCommissionDetails,
  getCommissionAnalytics,
  getMonthlyCommissionReports,
  requestPayout
};
