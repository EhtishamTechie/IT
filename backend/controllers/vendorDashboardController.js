const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get comprehensive vendor dashboard statistics
// @route   GET /api/vendors/dashboard/stats
// @access  Private (Vendor)
const getVendorDashboardStats = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log(`📊 Calculating dashboard stats for vendor: ${vendorId}`);
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    console.log(`📅 This month period: ${thisMonthStart.toISOString()} to ${now.toISOString()}`);

    // 1. GET ALL VENDOR ORDERS (not paginated for statistics)
    let allOrders = [];

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
          status: vo.status,
          totalAmount: vo.totalAmount,
          items: vo.items || vo.vendorItems || [],
          createdAt: vo.createdAt,
          deliveredAt: vo.deliveredAt,
          customer: vo.customer,
          email: vo.customer?.email || vo.email,
          customerName: vo.customer?.name || vo.customerName,
          cancelledBy: vo.cancelledBy
        });
      });

      console.log(`📦 Found ${vendorOrders.length} VendorOrder documents`);
    } catch (error) {
      console.error('Error getting VendorOrders:', error);
    }

    // Get regular orders with vendor assignments  
    try {
      const regularOrders = await Order.find({
        $or: [
          { 'cart.vendor': vendorId },
          { 'cart.assignedVendor': vendorId }
        ]
      }).populate('cart.productId', 'title images');

      regularOrders.forEach(order => {
        const vendorItems = order.cart.filter(item => {
          const itemVendor = item.vendor || item.assignedVendor;
          return itemVendor && itemVendor.toString() === vendorId;
        });

        if (vendorItems.length > 0) {
          const vendorTotal = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          allOrders.push({
            _id: order._id,
            status: order.status,
            totalAmount: vendorTotal,
            items: vendorItems,
            createdAt: order.createdAt,
            deliveredAt: order.deliveredAt,
            customer: {
              name: order.customerName || order.name,
              email: order.email
            },
            email: order.email,
            customerName: order.customerName || order.name,
            cancelledBy: order.cancelledBy
          });
        }
      });

      console.log(`📋 Found ${regularOrders.length} regular orders with vendor assignments`);
    } catch (error) {
      console.error('Error getting regular orders:', error);
    }

    console.log(`📊 Total orders for calculation: ${allOrders.length}`);

    // 2. GET VENDOR PRODUCTS
    const products = await Product.find({ vendor: vendorId });
    console.log(`🏷️ Found ${products.length} products`);

    // 3. GET VENDOR COMMISSION RATE (default 20% if not found)
    const commissionRate = 20; // You can make this dynamic based on vendor data
    const commissionDecimal = commissionRate / 100;

    // 4. CALCULATE ORDER STATISTICS
    const orderStats = {
      total: allOrders.length,
      completed: allOrders.filter(order => order.status?.toLowerCase() === 'delivered').length,
      cancelled: allOrders.filter(order => order.status?.toLowerCase() === 'cancelled').length,
      cancelledByCustomer: allOrders.filter(order => order.status?.toLowerCase() === 'cancelled_by_customer').length
    };

    // 5. CALCULATE DELIVERED ORDERS THIS MONTH
    const deliveredOrdersThisMonth = allOrders.filter(order => {
      if (order.status?.toLowerCase() !== 'delivered') return false;
      
      const orderDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
      return orderDate >= thisMonthStart;
    });

    console.log(`📅 Delivered orders this month: ${deliveredOrdersThisMonth.length}`);

    // 6. CALCULATE REVENUE STATISTICS
    let totalRevenue = 0;
    let thisMonthRevenue = 0;

    allOrders.forEach(order => {
      if (order.status?.toLowerCase() === 'delivered') {
        const orderRevenue = order.totalAmount || 0;
        const netRevenue = orderRevenue * (1 - commissionDecimal);
        totalRevenue += netRevenue;

        const orderDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
        if (orderDate >= thisMonthStart) {
          thisMonthRevenue += netRevenue;
        }
      }
    });

    // 7. CALCULATE PRODUCT STATISTICS
    const totalProductValue = products.reduce((sum, product) => sum + (product.price || 0), 0);
    
    // Calculate products sold this month from delivered orders
    let productsSoldThisMonth = 0;
    deliveredOrdersThisMonth.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        productsSoldThisMonth += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });

    const outOfStockProducts = products.filter(product => (product.stock || 0) === 0).length;
    const lowStockProducts = products.filter(product => (product.stock || 0) < 5 && (product.stock || 0) > 0).length;

    // 8. CALCULATE CUSTOMER STATISTICS
    const uniqueCustomers = new Set();
    const activeCustomersThisMonth = new Set();
    
    allOrders.forEach(order => {
      if (order.status?.toLowerCase() === 'delivered') {
        const customerId = order.customer?.email || order.email || 
                          order.customer?.name || order.customerName;
        
        if (customerId) {
          uniqueCustomers.add(customerId);
          
          const orderDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
          if (orderDate >= thisMonthStart) {
            activeCustomersThisMonth.add(customerId);
          }
        }
      }
    });

    // 9. CALCULATE PERFORMANCE METRICS
    const avgOrderValue = orderStats.completed > 0 ? totalRevenue / orderStats.completed : 0;
    const conversionRate = orderStats.total > 0 ? (orderStats.completed / orderStats.total) * 100 : 0;

    // 10. COMPILE FINAL STATISTICS
    const stats = {
      orders: {
        total: orderStats.total,
        completed: orderStats.completed,
        cancelled: orderStats.cancelled,
        cancelledByCustomer: orderStats.cancelledByCustomer
      },
      products: {
        total: products.length,
        totalValue: Math.round(totalProductValue * 100) / 100,
        soldThisMonth: productsSoldThisMonth,
        outOfStock: outOfStockProducts,
        lowStock: lowStockProducts
      },
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        thisMonth: Math.round(thisMonthRevenue * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        commissionRate: commissionRate
      },
      customers: {
        total: uniqueCustomers.size,
        thisMonth: activeCustomersThisMonth.size
      },
      performance: {
        conversionRate: Math.round(conversionRate * 100) / 100,
        monthlyGrowth: deliveredOrdersThisMonth.length
      }
    };

    console.log('📊 Final calculated statistics:', stats);

    res.json({
      success: true,
      data: {
        stats,
        calculatedAt: new Date(),
        period: {
          thisMonthStart,
          now
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating dashboard statistics',
      error: error.message
    });
  }
};

module.exports = {
  getVendorDashboardStats
};
