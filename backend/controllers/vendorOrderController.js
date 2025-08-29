const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const Vendor = require('../models/Vendor');
const MonthlyCommission = require('../models/MonthlyCommission');

// @desc    Get all vendor orders
// @route   GET /api/vendors/orders
// @access  Private (Vendor)
const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { page = 1, limit = 10, status, search } = req.query;
    
    console.log(`📋 Getting orders for vendor: ${vendorId}`);

    // Build query
    const query = { 'cart.vendor': vendorId };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('cart.vendor', 'businessName')
      .exec();

    const total = await Order.countDocuments(query);

    // Process orders to show only vendor-specific items
    const processedOrders = orders.map(order => {
      const vendorItems = order.cart.filter(item => 
        item.vendor && item.vendor._id.toString() === vendorId
      );
      
      const vendorSubtotal = vendorItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      return {
        ...order.toObject(),
        cart: vendorItems,
        vendorSubtotal,
        originalTotal: order.totalAmount,
        isVendorOrder: true
      };
    });

    res.json({
      success: true,
      data: {
        orders: processedOrders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor orders',
      error: error.message
    });
  }
};

// @desc    Get single vendor order
// @route   GET /api/vendors/orders/:id
// @access  Private (Vendor)
const getVendorOrder = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate('cart.vendor', 'businessName email')
      .populate('cart.productId', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Filter to show only vendor's items
    const vendorItems = order.cart.filter(item => 
      item.vendor && item.vendor._id.toString() === vendorId
    );

    if (vendorItems.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order'
      });
    }

    const vendorSubtotal = vendorItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    const processedOrder = {
      ...order.toObject(),
      vendorItems,
      vendorSubtotal,
      vendorId,
      orderType: 'legacy_order'
    };

    res.json({
      success: true,
      data: processedOrder
    });

  } catch (error) {
    console.error('Get vendor order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// ALL STATUS-RELATED FUNCTIONS REMOVED FOR CLEAN REBUILD
// This includes: updateOrderStatus, handleVendorOrderAction, bulkUpdateOrderStatus, etc.

// @desc    Get order analytics for vendor
// @route   GET /api/vendors/orders/analytics
// @access  Private (Vendor)
const getOrderAnalytics = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y

    console.log(`📊 Getting order analytics for vendor: ${vendorId}, period: ${period}`);

    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get orders containing vendor items
    const orders = await Order.find({
      'cart.vendor': vendorId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    // Calculate analytics
    let totalOrders = 0;
    let totalRevenue = 0;
    let statusDistribution = {
      placed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    orders.forEach(order => {
      const vendorItems = order.cart.filter(item => 
        item.vendor && item.vendor.toString() === vendorId
      );
      
      if (vendorItems.length > 0) {
        totalOrders++;
        const vendorRevenue = vendorItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );
        totalRevenue += vendorRevenue;

        // Count status distribution
        const orderStatus = order.status || 'placed';
        if (statusDistribution.hasOwnProperty(orderStatus.toLowerCase())) {
          statusDistribution[orderStatus.toLowerCase()]++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalOrders,
          totalRevenue,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        statusDistribution,
        dateRange: {
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('❌ Get order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order analytics',
      error: error.message
    });
  }
};

// Commission functions remain unchanged...

// @desc    Get vendor commission summary
// @route   GET /api/vendors/commissions
// @access  Private (Vendor)
const getVendorCommissionSummary = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { period = 'month' } = req.query; // month, 90days, year
    console.log(`🔍 Getting commission summary for vendor: ${vendorId}, period: ${period}`);
    
    // Calculate date range based on period filter
    let startDate = new Date();
    let endDate = new Date();
    
    switch (period) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get commission data from MonthlyCommission collection
    const commissions = await MonthlyCommission.find({
      vendor: vendorId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ year: -1, month: -1 });

    // Calculate totals
    const totalCommission = commissions.reduce((sum, c) => sum + (c.totalCommission || 0), 0);
    const totalRevenue = commissions.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    const totalOrders = commissions.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
    const totalPaidToAdmin = commissions.reduce((sum, c) => sum + (c.paidToAdmin || 0), 0);

    // Calculate pending amount (total commission - paid to admin)
    const pendingToAdmin = Math.max(0, totalCommission - totalPaidToAdmin);

    console.log(`💰 Commission Summary for vendor ${vendorId}:`, {
      totalCommission,
      totalRevenue,
      totalOrders,
      totalPaidToAdmin,
      pendingToAdmin
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalCommission,
          totalRevenue,
          totalOrders,
          totalPaidToAdmin,
          pendingAmountToAdmin: pendingToAdmin,
          period
        },
        monthlyBreakdown: commissions.map(c => ({
          month: c.month,
          year: c.year,
          commission: c.totalCommission || 0,
          revenue: c.totalRevenue || 0,
          orders: c.totalOrders || 0,
          paidToAdmin: c.paidToAdmin || 0,
          pendingToAdmin: Math.max(0, (c.totalCommission || 0) - (c.paidToAdmin || 0))
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get vendor commission summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commission summary',
      error: error.message
    });
  }
};

// @desc    Get vendor monthly commissions
// @route   GET /api/vendors/commissions/monthly
// @access  Private (Vendor)  
const getVendorMonthlyCommissions = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { year = new Date().getFullYear() } = req.query;
    
    console.log(`📅 Getting monthly commissions for vendor: ${vendorId}, year: ${year}`);

    // Get all monthly commission records for the vendor for the specified year
    const monthlyCommissions = await MonthlyCommission.find({
      vendor: vendorId,
      year: parseInt(year)
    }).sort({ month: 1 });

    // Create array for all 12 months
    const monthlyData = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      const existingData = monthlyCommissions.find(mc => mc.month === monthNumber);
      
      if (existingData) {
        const totalCommissionSum = existingData.totalCommission || 0;
        const totalPaidToAdmin = existingData.paidToAdmin || 0;
        const pendingAmountToAdmin = Math.max(0, totalCommissionSum - totalPaidToAdmin);
        
        return {
          month: monthNumber,
          monthName: new Date(0, index).toLocaleString('default', { month: 'long' }),
          year: parseInt(year),
          totalCommission: totalCommissionSum,
          totalRevenue: existingData.totalRevenue || 0,
          totalOrders: existingData.totalOrders || 0,
          paidToAdmin: totalPaidToAdmin,
          pendingAmountToAdmin,
          status: isCurrentMonth ? 'current' : (pendingAmountToAdmin > 0 ? 'pending' : 'completed')
        };
      } else {
        return {
          month: monthNumber,
          monthName: new Date(0, index).toLocaleString('default', { month: 'long' }),
          year: parseInt(year),
          totalCommission: 0,
          totalRevenue: 0,
          totalOrders: 0,
          paidToAdmin: 0,
          pendingAmountToAdmin: 0,
          status: 'no_data'
        };
      }
    });

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        monthlyCommissions: monthlyData
      }
    });

  } catch (error) {
    console.error('❌ Get vendor monthly commissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly commissions',
      error: error.message
    });
  }
};

// @desc    Get vendor commission details
// @route   GET /api/vendors/commissions/:month/:year
// @access  Private (Vendor)
const getVendorCommission = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { month, year } = req.params;
    
    console.log(`📋 Getting commission details for vendor: ${vendorId}, month: ${month}, year: ${year}`);

    // Get the monthly commission record
    const monthlyCommission = await MonthlyCommission.findOne({
      vendor: vendorId,
      month: parseInt(month),
      year: parseInt(year)
    }).populate('orders');

    if (!monthlyCommission) {
      return res.json({
        success: true,
        data: {
          month: parseInt(month),
          year: parseInt(year),
          totalCommission: 0,
          totalRevenue: 0,
          totalOrders: 0,
          orders: [],
          commissionBreakdown: {
            rate: 20, // Default commission rate
            totalOrderValue: 0,
            commissionAmount: 0
          }
        }
      });
    }

    // Get detailed commission breakdown
    const vendorOrders = await VendorOrder.find({
      vendor: vendorId,
      $expr: {
        $and: [
          { $eq: [{ $month: '$createdAt' }, parseInt(month)] },
          { $eq: [{ $year: '$createdAt' }, parseInt(year)] }
        ]
      }
    }).populate('parentOrderId', 'orderNumber customer');

    const detailedOrders = vendorOrders.map(order => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || 'N/A',
      totalAmount: order.totalAmount || 0,
      commissionAmount: order.commissionAmount || 0,
      commissionRate: order.commission?.rate || 20,
      status: commission.paymentStatus || 'pending',
      createdAt: order.createdAt,
      items: order.items || []
    }));

    res.json({
      success: true,
      data: {
        month: parseInt(month),
        year: parseInt(year),
        totalCommission: monthlyCommission.totalCommission || 0,
        totalRevenue: monthlyCommission.totalRevenue || 0,
        totalOrders: monthlyCommission.totalOrders || 0,
        paidToAdmin: monthlyCommission.paidToAdmin || 0,
        pendingToAdmin: Math.max(0, (monthlyCommission.totalCommission || 0) - (monthlyCommission.paidToAdmin || 0)),
        orders: detailedOrders,
        paymentStatus: breakdown?.paymentStatus || 'pending'
      }
    });

  } catch (error) {
    console.error('❌ Get vendor commission details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commission details',
      error: error.message
    });
  }
};

// @desc    Export vendor commission report
// @route   GET /api/vendors/commissions/export
// @access  Private (Vendor)
const exportVendorCommissionReport = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { startDate, endDate, format = 'json' } = req.query;
    
    console.log(`📊 Exporting commission report for vendor: ${vendorId}`);

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get commission data
    const commissions = await MonthlyCommission.find({
      vendor: vendorId,
      ...dateFilter
    }).sort({ year: -1, month: -1 });

    const reportData = commissions.map(commission => ({
      month: commission.month,
      year: commission.year,
      totalCommission: commission.totalCommission || 0,
      totalRevenue: commission.totalRevenue || 0,
      totalOrders: commission.totalOrders || 0,
      paidToAdmin: commission.paidToAdmin || 0,
      pendingToAdmin: Math.max(0, (commission.totalCommission || 0) - (commission.paidToAdmin || 0)),
      paymentStatus: commission.paymentStatus || 'pending'
    }));

    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = 'Month,Year,Total Commission,Total Revenue,Total Orders,Paid to Admin,Pending to Admin,Payment Status\n';
      const csvData = reportData.map(row => 
        `${row.month},${row.year},${row.totalCommission},${row.totalRevenue},${row.totalOrders},${row.paidToAdmin},${row.pendingToAdmin},${row.paymentStatus}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="commission-report-${vendorId}.csv"`);
      res.send(csvHeaders + csvData);
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: {
          vendor: vendorId,
          reportPeriod: { startDate, endDate },
          commissions: reportData,
          summary: {
            totalCommission: reportData.reduce((sum, row) => sum + row.totalCommission, 0),
            totalRevenue: reportData.reduce((sum, row) => sum + row.totalRevenue, 0),
            totalOrders: reportData.reduce((sum, row) => sum + row.totalOrders, 0),
            totalPaidToAdmin: reportData.reduce((sum, row) => sum + row.paidToAdmin, 0),
            totalPendingToAdmin: reportData.reduce((sum, row) => sum + row.pendingToAdmin, 0)
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Export commission report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting commission report',
      error: error.message
    });
  }
};

module.exports = {
  getVendorOrders,
  getVendorOrder,
  // updateOrderStatus, // REMOVED - Status changing disabled
  // updateOrderTracking, // REMOVED - Status changing disabled
  // bulkUpdateOrderStatus, // REMOVED - Status changing disabled
  getOrderAnalytics,
  // handleVendorOrderAction, // REMOVED - Status changing disabled
  // updateVendorOrderStatus, // REMOVED - Status changing disabled
  getVendorCommissionSummary,
  getVendorMonthlyCommissions,
  getVendorCommission,
  exportVendorCommissionReport
};
