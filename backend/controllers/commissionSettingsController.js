const CommissionConfig = require('../config/commission');
const Order = require('../models/Order');

// @desc    Get current commission settings
// @route   GET /api/admin/commission/settings
// @access  Private (Admin)
const getCommissionSettings = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        commissionPercentage: CommissionConfig.COMMISSION_PERCENTAGE,
        commissionRate: CommissionConfig.VENDOR_COMMISSION_RATE
      }
    });
  } catch (error) {
    console.error('Error getting commission settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission settings'
    });
  }
};

// @desc    Get commission overview
// @route   GET /api/admin/commissions/overview
// @access  Private (Admin)
const getCommissionOverview = async (req, res) => {
  try {
    const { period = 'month', page = 1, limit = 9 } = req.query;
    
    // Get all vendors
    const vendors = await Vendor.find({ isActive: true });
    
    // Get commission data for each vendor
    const commissionPromises = vendors.map(async (vendor) => {
      const totalCommission = await MonthlyCommission.aggregate([
        { $match: { vendor: vendor._id } },
        { $group: { _id: null, total: { $sum: "$totalCommission" } } }
      ]);

      const paidCommission = await MonthlyCommission.aggregate([
        { $match: { vendor: vendor._id } },
        { $group: { _id: null, total: { $sum: "$paidCommission" } } }
      ]);
      
      return {
        vendorId: vendor._id,
        businessName: vendor.businessName,
        email: vendor.email,
        totalCommission: totalCommission[0]?.total || 0,
        totalPaid: paidCommission[0]?.total || 0,
        pendingAmount: (totalCommission[0]?.total || 0) - (paidCommission[0]?.total || 0),
        orderCount: 0 // You may want to add actual order count here
      };
    });

    const vendorCommissions = await Promise.all(commissionPromises);
    
    // Calculate totals
    const totalCommissions = vendorCommissions.reduce((sum, vc) => sum + vc.totalCommission, 0);
    const thisMonth = vendorCommissions.reduce((sum, vc) => sum + vc.pendingAmount, 0);
    const lastMonth = vendorCommissions.reduce((sum, vc) => sum + vc.totalPaid, 0);
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : '+0.0';

    // Add pagination
    const start = (page - 1) * limit;
    const paginatedVendors = vendorCommissions.slice(start, start + limit);
    const totalPages = Math.ceil(vendorCommissions.length / limit);
    
    const commissionData = {
      totalCommissions,
      thisMonth,
      lastMonth,
      growth: `${growth}%`,
      commissions: paginatedVendors,
      totalPages,
      currentPage: page
    };
    
    res.json({
      success: true,
      data: commissionData
    });
  } catch (error) {
    console.error('Error getting commission overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission overview'
    });
  }
};

// @desc    Get vendor commissions  
// @route   GET /api/admin/commissions/vendors/:vendorId
// @access  Private (Admin)
const getVendorCommissions = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Mock vendor commission data
    const vendorCommissions = {
      totalCommissions: 450.00,
      thisMonth: 150.00,
      commissions: []
    };
    
    res.json({
      success: true,
      data: vendorCommissions
    });
  } catch (error) {
    console.error('Error getting vendor commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vendor commissions'
    });
  }
};

// @desc    Update commission settings
// @route   PUT /api/admin/commission/settings
// @access  Private (Admin)
const updateCommissionSettings = async (req, res) => {
  try {
    const { commissionPercentage } = req.body;

    // Validate input
    if (typeof commissionPercentage !== 'number' || commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Commission percentage must be a number between 0 and 100'
      });
    }

    // Update the commission configuration
    const newCommissionRate = commissionPercentage / 100;
    
    // Update the configuration object
    CommissionConfig.COMMISSION_PERCENTAGE = commissionPercentage;
    CommissionConfig.VENDOR_COMMISSION_RATE = newCommissionRate;
    CommissionConfig.ADMIN_COMMISSION_RATE = newCommissionRate;

    console.log(`✅ Commission rate updated to ${commissionPercentage}% (${newCommissionRate})`);

    res.json({
      success: true,
      message: `Commission rate updated to ${commissionPercentage}%`,
      data: {
        commissionPercentage: CommissionConfig.COMMISSION_PERCENTAGE,
        commissionRate: CommissionConfig.VENDOR_COMMISSION_RATE
      }
    });
  } catch (error) {
    console.error('Error updating commission settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update commission settings'
    });
  }
};

module.exports = {
  getCommissionSettings,
  updateCommissionSettings,
  getCommissionOverview,
  getVendorCommissions
};
