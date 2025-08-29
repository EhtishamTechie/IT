const Order = require('../models/Order');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const CommissionConfig = require('../config/commission');
const mongoose = require('mongoose');

// @desc    Get comprehensive analytics data
// @route   GET /api/vendors/analytics
// @access  Private (Vendor)
const getAnalytics = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { timeRange = '30', startDate, endDate } = req.query;

    // Calculate date range
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const days = parseInt(timeRange);
      const start = new Date();
      start.setDate(start.getDate() - days);
      dateFilter = {
        createdAt: { $gte: start }
      };
    }

    // Get orders for the period
    const orders = await Order.find({
      'items.vendor': vendorId,
      ...dateFilter
    }).populate('items.product', 'name category');

    // Get vendor products
    const products = await Product.find({ vendor: vendorId });

    // Calculate overview metrics
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalProducts = products.length;
    let activeProducts = products.filter(p => p.status === 'active').length;
    let lowStockItems = products.filter(p => p.stock <= 10).length;
    let outOfStockItems = products.filter(p => p.stock === 0).length;
    let totalCommission = 0;

    const categoryRevenue = {};
    const dailyRevenue = {};
    const productPerformance = {};

    orders.forEach(order => {
      const vendorItems = order.items.filter(item => 
        item.vendor && item.vendor.toString() === vendorId
      );
      
      const orderSubtotal = vendorItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );
      
      // Use dynamic commission rate from config
      const commission = orderSubtotal * CommissionConfig.VENDOR_COMMISSION_RATE;
      const netRevenue = orderSubtotal - commission;
      
      totalRevenue += netRevenue; // Use net revenue after commission
      totalCommission += commission;

      // Daily revenue tracking
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += orderSubtotal;

      // Category and product performance
      vendorItems.forEach(item => {
        if (item.product) {
          const category = item.product.category || 'uncategorized';
          if (!categoryRevenue[category]) {
            categoryRevenue[category] = 0;
          }
          categoryRevenue[category] += item.price * item.quantity;

          const productId = item.product._id.toString();
          if (!productPerformance[productId]) {
            productPerformance[productId] = {
              name: item.product.name,
              sales: 0,
              revenue: 0,
              category: category
            };
          }
          productPerformance[productId].sales += item.quantity;
          productPerformance[productId].revenue += item.price * item.quantity;
        }
      });
    });

    // Calculate growth rates (mock data for now)
    const revenueGrowth = Math.random() * 0.3; // 0-30% growth
    const orderGrowth = Math.random() * 0.25; // 0-25% growth
    const aovGrowth = Math.random() * 0.15; // 0-15% growth

    // Format sales trends
    const salesTrends = Object.entries(dailyRevenue)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue
      }));

    // Format order trends
    const orderTrends = salesTrends.map(item => ({
      ...item,
      orders: Math.ceil(item.revenue / (totalRevenue / totalOrders || 100))
    }));

    // Top products
    const topProducts = Object.values(productPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(product => ({
        name: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
        sales: product.sales
      }));

    // Revenue breakdown by category
    const revenueBreakdown = Object.entries(categoryRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Product performance details
    const productPerformanceDetails = Object.values(productPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)
      .map(product => {
        const productDoc = products.find(p => p.name === product.name);
        return {
          ...product,
          sku: productDoc?.sku || 'N/A',
          stock: productDoc?.stock || 0,
          views: Math.floor(Math.random() * 1000), // Mock data
          conversionRate: Math.random() * 0.1, // Mock data
          image: productDoc?.images?.[0] || null
        };
      });

    // Customer insights (mock data for now)
    const customerInsights = {
      totalCustomers: Math.floor(totalOrders * 0.7), // Assuming some repeat customers
      newCustomers: Math.floor(totalOrders * 0.4),
      repeatCustomerRate: 0.3,
      lifetimeValue: totalRevenue / Math.max(Math.floor(totalOrders * 0.7), 1)
    };

    const analyticsData = {
      overview: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalRevenue / Math.max(totalOrders, 1),
        activeProducts,
        totalProducts,
        lowStockItems,
        outOfStockItems,
        revenueGrowth,
        orderGrowth,
        aovGrowth,
        bestSellingProduct: topProducts[0]?.name || 'N/A',
        conversionRate: Math.random() * 0.05, // Mock data
        grossRevenue: totalRevenue,
        totalCommission,
        netEarnings: totalRevenue - totalCommission,
        profitMargin: totalRevenue > 0 ? (totalRevenue - totalCommission) / totalRevenue : 0
      },
      salesTrends,
      orderTrends,
      topProducts,
      revenueBreakdown,
      productPerformance: productPerformanceDetails,
      customerInsights
    };

    res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data',
      error: error.message
    });
  }
};

// @desc    Get sales report data
// @route   GET /api/vendors/sales-report
// @access  Private (Vendor)
const getSalesReport = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { 
      reportType = 'summary',
      timeRange = '30',
      startDate,
      endDate,
      category,
      status
    } = req.query;

    // Calculate date range
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const days = parseInt(timeRange);
      const start = new Date();
      start.setDate(start.getDate() - days);
      dateFilter = {
        createdAt: { $gte: start }
      };
    }

    // Build query
    const query = {
      'items.vendor': vendorId,
      ...dateFilter
    };

    if (status) {
      query.status = status;
    }

    // Get orders
    let orders = await Order.find(query).populate('items.product', 'name category images');

    // Filter by category if specified
    if (category) {
      orders = orders.filter(order => 
        order.items.some(item => 
          item.vendor && 
          item.vendor.toString() === vendorId && 
          item.product?.category === category
        )
      );
    }

    // Calculate summary metrics
    let totalSales = 0;
    let ordersCount = orders.length;
    let unitsSold = 0;
    const dailySales = {};
    const categorySales = {};
    const productSales = {};
    const customerData = {};

    orders.forEach(order => {
      const vendorItems = order.items.filter(item => 
        item.vendor && item.vendor.toString() === vendorId
      );
      
      const orderSubtotal = vendorItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );
      
      totalSales += orderSubtotal;

      // Count units sold
      vendorItems.forEach(item => {
        unitsSold += item.quantity;
        
        // Product performance
        const productId = item.product?._id?.toString();
        if (productId && item.product) {
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.product.name,
              category: item.product.category || 'uncategorized',
              unitsSold: 0,
              revenue: 0,
              averagePrice: 0,
              growth: Math.random() * 0.4 - 0.2, // -20% to +20%
              image: item.product.images?.[0] || null
            };
          }
          productSales[productId].unitsSold += item.quantity;
          productSales[productId].revenue += item.price * item.quantity;
          productSales[productId].averagePrice = productSales[productId].revenue / productSales[productId].unitsSold;
        }

        // Category sales
        const category = item.product?.category || 'uncategorized';
        if (!categorySales[category]) {
          categorySales[category] = 0;
        }
        categorySales[category] += item.price * item.quantity;
      });

      // Daily sales
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = 0;
      }
      dailySales[date] += orderSubtotal;

      // Customer analysis
      const customerEmail = order.user?.email || order.email || 'guest';
      if (!customerData[customerEmail]) {
        customerData[customerEmail] = {
          name: order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}` : order.name || 'Guest',
          email: customerEmail,
          ordersCount: 0,
          totalSpent: 0,
          lastOrder: order.createdAt
        };
      }
      customerData[customerEmail].ordersCount += 1;
      customerData[customerEmail].totalSpent += orderSubtotal;
      if (order.createdAt > customerData[customerEmail].lastOrder) {
        customerData[customerEmail].lastOrder = order.createdAt;
      }
    });

    // Format data
    const summary = {
      totalSales,
      ordersCount,
      averageOrder: totalSales / Math.max(ordersCount, 1),
      unitsSold
    };

    const dailySalesArray = Object.entries(dailySales)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, sales]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales
      }));

    const categorySalesArray = Object.entries(categorySales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const productSalesArray = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue);

    const topCustomers = Object.values(customerData)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20)
      .map(customer => ({
        ...customer,
        averageOrder: customer.totalSpent / customer.ordersCount
      }));

    const reportData = {
      summary,
      dailySales: dailySalesArray,
      categorySales: categorySalesArray,
      productSales: productSalesArray,
      topCustomers,
      customerAnalysis: Object.values(customerData),
      salesTrends: dailySalesArray
    };

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales report',
      error: error.message
    });
  }
};

// @desc    Get performance metrics
// @route   GET /api/vendors/performance
// @access  Private (Vendor)
const getPerformanceMetrics = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { timeRange = '30', comparison = 'previous_period' } = req.query;

    const days = parseInt(timeRange);
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - days);
    
    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - (days * 2));
    const previousEnd = new Date();
    previousEnd.setDate(previousEnd.getDate() - days);

    // Get current period orders
    const currentOrders = await Order.find({
      'items.vendor': vendorId,
      createdAt: { $gte: currentStart }
    }).populate('items.product');

    // Get previous period orders for comparison
    const previousOrders = await Order.find({
      'items.vendor': vendorId,
      createdAt: { $gte: previousStart, $lte: previousEnd }
    }).populate('items.product');

    // Calculate current metrics
    const currentMetrics = calculatePeriodMetrics(currentOrders, vendorId);
    const previousMetrics = calculatePeriodMetrics(previousOrders, vendorId);

    // Calculate comparisons
    const comparisons = {
      revenue: {
        change: calculateChange(currentMetrics.revenue, previousMetrics.revenue)
      },
      orders: {
        change: calculateChange(currentMetrics.orders, previousMetrics.orders)
      },
      products: {
        change: calculateChange(currentMetrics.productsSold, previousMetrics.productsSold)
      },
      customers: {
        change: calculateChange(currentMetrics.newCustomers, previousMetrics.newCustomers)
      }
    };

    // Generate trends data
    const trends = generateTrendsData(currentOrders, days, vendorId);

    // Calculate KPIs
    const kpis = {
      averageOrderValue: currentMetrics.averageOrderValue,
      aovChange: calculateChange(currentMetrics.averageOrderValue, previousMetrics.averageOrderValue),
      customerAcquisitionCost: 25 + Math.random() * 10, // Mock data
      cacChange: Math.random() * 0.2 - 0.1,
      customerLifetimeValue: currentMetrics.revenue / Math.max(currentMetrics.uniqueCustomers, 1),
      clvChange: Math.random() * 0.15,
      returnOnInvestment: Math.random() * 0.3 + 0.1,
      roiChange: Math.random() * 0.1 - 0.05
    };

    // Mock goals data
    const goals = {
      revenue: {
        target: 10000,
        current: currentMetrics.revenue,
        progress: Math.min(currentMetrics.revenue / 10000, 1)
      },
      orders: {
        target: 100,
        current: currentMetrics.orders,
        progress: Math.min(currentMetrics.orders / 100, 1)
      },
      customers: {
        target: 50,
        current: currentMetrics.newCustomers,
        progress: Math.min(currentMetrics.newCustomers / 50, 1)
      }
    };

    // Generate insights
    const insights = generateInsights(currentMetrics, previousMetrics, comparisons);

    const performanceData = {
      overview: currentMetrics,
      comparisons,
      trends,
      kpis,
      goals,
      insights
    };

    res.json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching performance metrics',
      error: error.message
    });
  }
};

// Helper function to calculate metrics for a period
const calculatePeriodMetrics = (orders, vendorId) => {
  let revenue = 0;
  let productsSold = 0;
  const customers = new Set();

  orders.forEach(order => {
    const vendorItems = order.items.filter(item => 
      item.vendor && item.vendor.toString() === vendorId
    );
    
    const orderSubtotal = vendorItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    revenue += orderSubtotal;
    productsSold += vendorItems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (order.user?.email) {
      customers.add(order.user.email);
    } else if (order.email) {
      customers.add(order.email);
    }
  });

  return {
    revenue,
    orders: orders.length,
    productsSold,
    newCustomers: customers.size,
    uniqueCustomers: customers.size,
    averageOrderValue: revenue / Math.max(orders.length, 1),
    conversionRate: Math.random() * 0.05, // Mock data
    retentionRate: Math.random() * 0.4 + 0.6 // Mock data
  };
};

// Helper function to calculate percentage change
const calculateChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 1 : 0;
  return (current - previous) / previous;
};

// Helper function to generate trends data
const generateTrendsData = (orders, days, vendorId) => {
  const dailyData = {};
  
  orders.forEach(order => {
    const date = order.createdAt.toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { revenue: 0, orders: 0, customers: new Set() };
    }
    
    const vendorItems = order.items.filter(item => 
      item.vendor && item.vendor.toString() === vendorId
    );
    
    const orderSubtotal = vendorItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    dailyData[date].revenue += orderSubtotal;
    dailyData[date].orders += 1;
    if (order.user?.email) {
      dailyData[date].customers.add(order.user.email);
    }
  });

  // Fill in missing dates
  const trends = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    trends.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: dailyData[dateStr]?.revenue || 0,
      orders: dailyData[dateStr]?.orders || 0,
      customers: dailyData[dateStr]?.customers?.size || 0
    });
  }

  return trends;
};

// Helper function to generate insights
const generateInsights = (current, previous, comparisons) => {
  const insights = [];

  if (comparisons.revenue.change > 0.1) {
    insights.push({
      type: 'positive',
      title: 'Strong Revenue Growth',
      description: `Revenue increased by ${(comparisons.revenue.change * 100).toFixed(1)}% compared to the previous period.`,
      action: 'Consider increasing inventory for top-performing products.'
    });
  }

  if (comparisons.orders.change < -0.05) {
    insights.push({
      type: 'negative',
      title: 'Declining Order Volume',
      description: `Order count decreased by ${Math.abs(comparisons.orders.change * 100).toFixed(1)}% compared to the previous period.`,
      action: 'Review marketing strategies and consider promotional campaigns.'
    });
  }

  if (current.averageOrderValue > 50) {
    insights.push({
      type: 'positive',
      title: 'Healthy Average Order Value',
      description: `Your average order value of $${current.averageOrderValue.toFixed(2)} is performing well.`,
      action: 'Consider upselling strategies to increase it further.'
    });
  }

  return insights;
};

// @desc    Export sales report
// @route   GET /api/vendors/sales-report/export
// @access  Private (Vendor)
const exportSalesReport = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    // For now, return a simple response
    // In a real implementation, you would generate CSV/PDF files
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
      res.send('Date,Order ID,Customer,Amount,Status\n2024-01-01,12345,John Doe,$150.00,Delivered\n');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
      res.send('PDF content would go here');
    }
  } catch (error) {
    console.error('Export sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting sales report',
      error: error.message
    });
  }
};

module.exports = {
  getAnalytics,
  getSalesReport,
  getPerformanceMetrics,
  exportSalesReport
};
