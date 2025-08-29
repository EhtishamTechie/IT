// Dashboard Statistics Controller - Optimized for Performance
const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');

// @desc    Get vendor dashboard statistics (OPTIMIZED)
// @route   GET /api/vendors/dashboard-stats
// @access  Private (Vendor)
const getVendorDashboardStats = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log(`📊 Getting dashboard stats for vendor: ${vendorId}`);
    
    // Get current date for month calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Parallel aggregation queries for optimal performance
    const [vendorOrderStats, regularOrderStats] = await Promise.all([
      // VendorOrder statistics
      VendorOrder.aggregate([
        {
          $match: {
            $or: [
              { vendor: vendorId },
              { vendorId: vendorId }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            completedOrders: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
            },
            cancelledByCustomer: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled_by_customer"] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
            },
            thisMonthOrders: {
              $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] }
            },
            thisMonthRevenue: {
              $sum: { 
                $cond: [
                  { $gte: ["$createdAt", startOfMonth] }, 
                  "$totalAmount", 
                  0
                ] 
              }
            },
            todayOrders: {
              $sum: { $cond: [{ $gte: ["$createdAt", startOfDay] }, 1, 0] }
            },
            // Status breakdown
            statusBreakdown: {
              $push: {
                status: "$status",
                amount: "$totalAmount"
              }
            }
          }
        }
      ]),

      // Regular Order statistics (legacy orders with vendor assignments)
      Order.aggregate([
        {
          $match: {
            $or: [
              { 'cart.vendor': vendorId },
              { 'cart.assignedVendor': vendorId }
            ]
          }
        },
        {
          $unwind: "$cart"
        },
        {
          $match: {
            $or: [
              { 'cart.vendor': vendorId },
              { 'cart.assignedVendor': vendorId }
            ]
          }
        },
        {
          $group: {
            _id: "$_id",
            status: { $first: "$status" },
            createdAt: { $first: "$createdAt" },
            vendorTotal: {
              $sum: { $multiply: ["$cart.price", "$cart.quantity"] }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$vendorTotal" },
            completedOrders: {
              $sum: { $cond: [{ $in: ["$status", ["delivered", "Delivered"]] }, 1, 0] }
            },
            cancelledByCustomer: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled_by_customer"] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $in: ["$status", ["cancelled", "Cancelled"]] }, 1, 0] }
            },
            thisMonthOrders: {
              $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] }
            },
            thisMonthRevenue: {
              $sum: { 
                $cond: [
                  { $gte: ["$createdAt", startOfMonth] }, 
                  "$vendorTotal", 
                  0
                ] 
              }
            },
            todayOrders: {
              $sum: { $cond: [{ $gte: ["$createdAt", startOfDay] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Combine statistics from both sources
    const vendorStats = vendorOrderStats[0] || {};
    const regularStats = regularOrderStats[0] || {};

    const combinedStats = {
      orders: {
        total: (vendorStats.totalOrders || 0) + (regularStats.totalOrders || 0),
        completed: (vendorStats.completedOrders || 0) + (regularStats.completedOrders || 0),
        cancelledByCustomer: (vendorStats.cancelledByCustomer || 0) + (regularStats.cancelledByCustomer || 0),
        cancelled: (vendorStats.cancelledOrders || 0) + (regularStats.cancelledOrders || 0),
        thisMonth: (vendorStats.thisMonthOrders || 0) + (regularStats.thisMonthOrders || 0),
        today: (vendorStats.todayOrders || 0) + (regularStats.todayOrders || 0)
      },
      revenue: {
        total: (vendorStats.totalRevenue || 0) + (regularStats.totalRevenue || 0),
        thisMonth: (vendorStats.thisMonthRevenue || 0) + (regularStats.thisMonthRevenue || 0),
        avgOrderValue: 0 // Will calculate below
      },
      performance: {
        completionRate: 0, // Will calculate below
        cancellationRate: 0 // Will calculate below
      },
      timestamp: new Date()
    };

    // Calculate derived metrics
    if (combinedStats.orders.total > 0) {
      combinedStats.revenue.avgOrderValue = combinedStats.revenue.total / combinedStats.orders.total;
      combinedStats.performance.completionRate = (combinedStats.orders.completed / combinedStats.orders.total) * 100;
      combinedStats.performance.cancellationRate = ((combinedStats.orders.cancelled + combinedStats.orders.cancelledByCustomer) / combinedStats.orders.total) * 100;
    }

    console.log(`📊 Dashboard stats calculated:`, {
      totalOrders: combinedStats.orders.total,
      totalRevenue: combinedStats.revenue.total,
      completionRate: combinedStats.performance.completionRate.toFixed(1) + '%'
    });

    res.json({
      success: true,
      data: combinedStats
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

module.exports = {
  getVendorDashboardStats
};
