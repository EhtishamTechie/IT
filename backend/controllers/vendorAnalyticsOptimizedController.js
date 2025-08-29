const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder'); 
const Product = require('../models/Product');

// @desc    Get vendor analytics data (OPTIMIZED)
// @route   GET /api/vendor/analytics/analytics-stats
// @access  Private (Vendor)
const getVendorAnalyticsStats = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const timeRange = parseInt(req.query.timeRange) || 30; // Default 30 days
    
    console.log(`📊 Getting optimized analytics for vendor: ${vendorId}, timeRange: ${timeRange} days`);

    const now = new Date();
    const startDate = new Date(now.getTime() - timeRange * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 1. GET ALL VENDOR ORDERS (same logic as dashboard)
    let allOrders = [];
    const commissionRate = 20;
    const commissionDecimal = commissionRate / 100;

    // Get VendorOrder documents
    try {
      const vendorOrders = await VendorOrder.find({ 
        $or: [
          { vendor: vendorId },
          { vendorId: vendorId }
        ]
      }).sort({ createdAt: -1 });

      vendorOrders.forEach(vo => {
        allOrders.push({
          _id: vo._id,
          orderNumber: vo.orderNumber,
          status: vo.status,
          totalAmount: vo.totalAmount,
          items: vo.items || vo.vendorItems || [],
          createdAt: vo.createdAt,
          deliveredAt: vo.deliveredAt,
          orderType: 'vendor_order',
          customer: vo.customer,
          cancelledBy: vo.cancelledBy
        });
      });
    } catch (error) {
      console.error('Error getting vendor orders:', error);
    }

    // Get regular orders with vendor assignments
    try {
      const regularOrders = await Order.find({}).sort({ createdAt: -1 });

      regularOrders.forEach(order => {
        const vendorItems = order.cart.filter(item => {
          const itemVendor = item.vendor || item.assignedVendor;
          return itemVendor && itemVendor.toString() === vendorId;
        });

        if (vendorItems.length > 0) {
          const vendorTotal = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          allOrders.push({
            _id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: vendorTotal,
            items: vendorItems,
            createdAt: order.createdAt,
            deliveredAt: order.deliveredAt,
            orderType: 'legacy_order',
            customer: {
              name: order.customerName || order.name,
              email: order.email
            },
            cancelledBy: order.cancelledBy
          });
        }
      });
    } catch (error) {
      console.error('Error getting regular orders:', error);
    }

    // 2. GET VENDOR PRODUCTS
    const products = await Product.find({ vendor: vendorId });

    console.log(`📊 Analytics data: ${allOrders.length} orders, ${products.length} products`);

    // 3. CALCULATE ANALYTICS STATISTICS

    // Filter orders by time range
    const ordersInRange = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate;
    });

    const deliveredOrders = ordersInRange.filter(order => order.status?.toLowerCase() === 'delivered');
    const deliveredOrdersThisMonth = deliveredOrders.filter(order => {
      const orderDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
      return orderDate >= thisMonthStart;
    });

    // Revenue calculations
    let totalRevenue = 0;
    let monthlyRevenue = 0;

    deliveredOrders.forEach(order => {
      const orderRevenue = order.totalAmount || 0;
      const netRevenue = orderRevenue * (1 - commissionDecimal);
      totalRevenue += netRevenue;

      const orderDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
      if (orderDate >= thisMonthStart) {
        monthlyRevenue += netRevenue;
      }
    });

    // Products sold calculation
    let productsSold = 0;
    deliveredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        productsSold += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });

    // Daily sales data for charts (last timeRange days)
    const salesData = [];
    const revenueData = [];
    
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = deliveredOrders.filter(order => {
        const orderDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
        return orderDate.toISOString().split('T')[0] === dateStr;
      });

      const dayRevenue = dayOrders.reduce((sum, order) => {
        const orderRevenue = order.totalAmount || 0;
        return sum + (orderRevenue * (1 - commissionDecimal));
      }, 0);

      const dayProductsSold = dayOrders.reduce((sum, order) => {
        if (order.items && Array.isArray(order.items)) {
          return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
        }
        return sum;
      }, 0);

      salesData.push({
        date: dateStr,
        sales: dayProductsSold,
        orders: dayOrders.length,
        revenue: Math.round(dayRevenue * 100) / 100
      });

      revenueData.push({
        date: dateStr,
        revenue: Math.round(dayRevenue * 100) / 100,
        orders: dayOrders.length
      });
    }

    // Order status breakdown (all 5 statuses)
    const orderStatusBreakdown = {};
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled', 'cancelled_by_customer'];
    
    // Initialize all statuses to 0
    validStatuses.forEach(status => {
      orderStatusBreakdown[status] = 0;
    });

    // Count orders by status
    ordersInRange.forEach(order => {
      const status = order.status?.toLowerCase().replace(/\s+/g, '_') || 'processing';
      const normalizedStatus = status === 'cancelled by customer' ? 'cancelled_by_customer' : status;
      
      if (validStatuses.includes(normalizedStatus)) {
        orderStatusBreakdown[normalizedStatus]++;
      } else {
        // Default unknown statuses to processing
        orderStatusBreakdown['processing']++;
      }
    });

    // Create order status data for charts
    const orderStatusData = [
      { name: 'Processing', value: orderStatusBreakdown.processing, color: '#F59E0B' },
      { name: 'Shipped', value: orderStatusBreakdown.shipped, color: '#3B82F6' },
      { name: 'Delivered', value: orderStatusBreakdown.delivered, color: '#10B981' },
      { name: 'Cancelled', value: orderStatusBreakdown.cancelled, color: '#EF4444' },
      { name: 'Cancelled by Customer', value: orderStatusBreakdown.cancelled_by_customer, color: '#9CA3AF' }
    ].filter(item => item.value > 0);

    // Stock analysis
    const stockData = {
      totalProducts: products.length,
      inStock: products.filter(p => (p.stock || 0) > 10).length,
      lowStock: products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length,
      outOfStock: products.filter(p => (p.stock || 0) === 0).length
    };

    const stockStatusData = [
      { name: 'In Stock', value: stockData.inStock, color: '#10B981' },
      { name: 'Low Stock', value: stockData.lowStock, color: '#F59E0B' },
      { name: 'Out of Stock', value: stockData.outOfStock, color: '#EF4444' }
    ].filter(item => item.value > 0);

    // Top products analysis (include revenue)
    const productSalesMap = {};
    deliveredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.product?._id || item.productId || item._id;
          const productName = item.product?.title || item.name || item.title || 'Unknown Product';
          
          if (!productSalesMap[productId]) {
            productSalesMap[productId] = {
              name: productName,
              sales: 0,
              revenue: 0,
              orders: 0
            };
          }
          
          const itemRevenue = (item.price || 0) * (item.quantity || 0);
          const netItemRevenue = itemRevenue * (1 - commissionDecimal);
          
          productSalesMap[productId].sales += item.quantity || 0;
          productSalesMap[productId].revenue += netItemRevenue;
          productSalesMap[productId].orders += 1;
        });
      }
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue) // Sort by revenue instead of sales
      .slice(0, 10)
      .map(product => ({
        ...product,
        revenue: Math.round(product.revenue * 100) / 100
      }));

    // Category analysis
    const categoryMap = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = {
          name: category,
          products: 0,
          totalValue: 0
        };
      }
      categoryMap[category].products += 1;
      categoryMap[category].totalValue += product.price || 0;
    });

    const categoryData = Object.values(categoryMap).map(cat => ({
      ...cat,
      totalValue: Math.round(cat.totalValue * 100) / 100
    }));

    // Performance metrics
    const totalOrders = ordersInRange.length;
    const conversionRate = totalOrders > 0 ? (deliveredOrders.length / totalOrders) * 100 : 0;
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
    const repeatCustomers = new Set();
    const customerOrderCount = {};

    deliveredOrders.forEach(order => {
      const customerId = order.customer?.email || order.email || order.customer?.id;
      if (customerId) {
        customerOrderCount[customerId] = (customerOrderCount[customerId] || 0) + 1;
        if (customerOrderCount[customerId] > 1) {
          repeatCustomers.add(customerId);
        }
      }
    });

    const repeatCustomerRate = Object.keys(customerOrderCount).length > 0 
      ? (repeatCustomers.size / Object.keys(customerOrderCount).length) * 100 
      : 0;

    // Compile final analytics
    const analyticsStats = {
      summary: {
        totalOrders: ordersInRange.length,
        deliveredOrders: deliveredOrders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        productsSold: productsSold,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        repeatCustomerRate: Math.round(repeatCustomerRate * 100) / 100
      },
      charts: {
        salesData,
        revenueData,
        topProducts,
        categoryData,
        orderStatusData,
        stockData: stockStatusData
      },
      period: {
        timeRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        thisMonthStart: thisMonthStart.toISOString()
      }
    };

    console.log('📊 Analytics stats calculated:', analyticsStats.summary);

    res.json({
      success: true,
      data: {
        analytics: analyticsStats,
        calculatedAt: new Date(),
        timeRange: `${timeRange} days`
      }
    });

  } catch (error) {
    console.error('❌ Analytics calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating analytics statistics',
      error: error.message
    });
  }
};

module.exports = {
  getVendorAnalyticsStats
};
