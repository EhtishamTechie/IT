const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get comprehensive dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get basic counts and revenue
    const [
      totalUsers,
      totalProducts, 
      totalOrders,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $nin: ['Cancelled', 'Rejected'] } } },
        { $unwind: '$cart' },
        { 
          $group: { 
            _id: null, 
            total: { 
              $sum: { 
                $multiply: ['$cart.price', '$cart.quantity'] 
              } 
            } 
          } 
        }
      ])
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id name email cart status createdAt');

    // Get recent products
    const recentProducts = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title mainCategory subCategory stock price');

    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get low stock products
    const lowStockProducts = await Product.find({
      isActive: true,
      stock: { $lt: 20 }
    }).countDocuments();

    // Get this month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      ordersThisMonth,
      revenueThisMonth,
      newUsersThisMonth
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startOfMonth },
            status: { $nin: ['Cancelled', 'Rejected'] }
          }
        },
        { $unwind: '$cart' },
        { 
          $group: { 
            _id: null, 
            total: { 
              $sum: { 
                $multiply: ['$cart.price', '$cart.quantity'] 
              } 
            } 
          } 
        }
      ]),
      User.countDocuments({ 
        createdAt: { $gte: startOfMonth },
        isActive: true 
      })
    ]);

    // Calculate growth percentages (comparing to last month)
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);

    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);
    lastMonthEnd.setHours(23, 59, 59, 999);

    const [
      ordersLastMonth,
      revenueLastMonth
    ] = await Promise.all([
      Order.countDocuments({ 
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
      }),
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
            status: { $nin: ['Cancelled', 'Rejected'] }
          }
        },
        { $unwind: '$cart' },
        { 
          $group: { 
            _id: null, 
            total: { 
              $sum: { 
                $multiply: ['$cart.price', '$cart.quantity'] 
              } 
            } 
          } 
        }
      ])
    ]);

    // Calculate growth rates
    const orderGrowth = ordersLastMonth > 0 
      ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth * 100).toFixed(1)
      : 0;

    const thisMonthRevenue = revenueThisMonth[0]?.total || 0;
    const lastMonthRevenue = revenueLastMonth[0]?.total || 0;
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // Format recent orders for frontend
    const formattedRecentOrders = recentOrders.map(order => {
      const orderTotal = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        id: order._id.toString(),
        customer: order.name || 'Unknown Customer',
        total: orderTotal,
        status: order.status.toLowerCase(),
        date: order.createdAt.toISOString().split('T')[0]
      };
    });

    // Format recent products for frontend
    const formattedRecentProducts = recentProducts.map(product => ({
      id: product._id.toString(),
      name: product.title,
      category: product.mainCategory,
      stock: product.stock,
      price: product.price
    }));

    res.json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersThisMonth,
        revenueThisMonth: thisMonthRevenue,
        newUsersThisMonth,
        lowStockProducts,
        orderGrowth: parseFloat(orderGrowth),
        revenueGrowth: parseFloat(revenueGrowth),
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item._id.toLowerCase()] = item.count;
          return acc;
        }, {}),
        recentOrders: formattedRecentOrders,
        recentProducts: formattedRecentProducts
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Get revenue calculation from delivered admin orders
const calculateRevenueFromDeliveredOrders = async (req, res) => {
  try {
    console.log('💰 [BACKEND REVENUE] Calculating revenue from delivered admin orders...');
    
    // Query for delivered admin orders
    const deliveredOrdersQuery = {
      status: 'delivered',
      $or: [
        // Admin-only orders (main orders only, no sub-orders)
        { 
          orderType: 'admin_only',
          parentOrderId: { $exists: false }
        },
        // Admin parts of mixed orders 
        { 
          partialOrderType: 'admin_part'
        }
      ]
    };
    
    console.log('💰 [BACKEND REVENUE] Query:', JSON.stringify(deliveredOrdersQuery, null, 2));
    
    // Get delivered orders with safe limit for performance
    const deliveredOrders = await Order.find(deliveredOrdersQuery)
      .populate('cart.productId', 'title price')
      .limit(10000) // Safe limit to prevent server crash
      .lean();
      
    console.log(`💰 [BACKEND REVENUE] Found ${deliveredOrders.length} delivered admin orders`);
    
    // Calculate total revenue
    let totalRevenue = 0;
    const orderDetails = [];
    
    deliveredOrders.forEach((order, index) => {
      let orderAmount = 0;
      
      // Calculate order amount using same logic as frontend
      if (order.cart && Array.isArray(order.cart)) {
        orderAmount = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      } else if (order.totalAmount) {
        orderAmount = parseFloat(order.totalAmount);
      } else if (order.total) {
        orderAmount = parseFloat(order.total);
      }
      
      if (orderAmount > 0) {
        totalRevenue += orderAmount;
        orderDetails.push({
          id: order._id.toString().slice(-8),
          orderNumber: order.orderNumber,
          amount: orderAmount,
          orderType: order.orderType || order.partialOrderType,
          createdAt: order.createdAt
        });
      }
      
      console.log(`💰 [BACKEND REVENUE] Order ${index + 1}: ${order.orderNumber} = $${orderAmount}`);
    });
    
    // Round to 2 decimal places
    totalRevenue = Math.round(totalRevenue * 100) / 100;
    
    console.log(`💰 [BACKEND REVENUE] TOTAL: $${totalRevenue} from ${deliveredOrders.length} delivered orders`);
    
    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue,
        deliveredOrders: deliveredOrders.length,
        orderDetails: orderDetails,
        calculatedAt: new Date().toISOString(),
        queryUsed: deliveredOrdersQuery
      }
    });
    
  } catch (error) {
    console.error('💰 [BACKEND REVENUE] Error calculating revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate revenue from delivered orders',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  calculateRevenueFromDeliveredOrders
};
