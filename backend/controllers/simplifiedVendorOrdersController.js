// Simple and Clean Vendor Orders Controller
const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');

// @desc    Get vendor orders (SIMPLIFIED)
// @route   GET /api/vendors/orders  
// @access  Private (Vendor)
const getSimplifiedVendorOrders = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log(`🔍 Getting orders for vendor: ${vendorId}`);
    
    // Extract pagination and filtering parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;
    
    console.log(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);
    console.log(`🔍 Filters: status=${status}, search=${search}`);

    let allOrders = [];

    // 1. Get VendorOrder documents (new system)
    try {
      const vendorOrders = await VendorOrder.find({ 
        $or: [
          { vendor: vendorId },
          { vendorId: vendorId }
        ]
      })
      .populate('parentOrderId', 'orderNumber')
      .sort({ createdAt: -1 });

      console.log(`📦 Found ${vendorOrders.length} VendorOrder documents`);

      vendorOrders.forEach(vo => {
        allOrders.push({
          _id: vo._id,
          orderNumber: vo.orderNumber,
          customerName: vo.customer?.name || vo.customerName,
          customer: vo.customer,
          email: vo.customer?.email || vo.email,
          phone: vo.customer?.phone || vo.phone,
          address: vo.customer?.address || vo.address,
          status: vo.status,
          totalAmount: vo.totalAmount,
          items: vo.items || vo.vendorItems || [],
          createdAt: vo.createdAt,
          orderType: 'vendor_order',
          // Add cancellation details for proper vendor dashboard display
          cancelledBy: vo.cancelledBy,
          cancelledAt: vo.cancelledAt,
          cancellationReason: vo.cancellationReason
        });
      });
    } catch (error) {
      console.error('Error getting VendorOrders:', error);
    }

    // 2. Get regular orders with vendor assignments
    try {
      const regularOrders = await Order.find({
        $or: [
          { 'cart.vendor': vendorId },
          { 'cart.assignedVendor': vendorId }
        ]
      })
      .populate('cart.productId', 'title images')
      .populate('cart.assignedVendor', 'businessName')
      .sort({ createdAt: -1 });

      console.log(`📋 Found ${regularOrders.length} regular orders with vendor assignments`);

      regularOrders.forEach(order => {
        // Filter items for this vendor
        const vendorItems = order.cart.filter(item => {
          const itemVendor = item.vendor || item.assignedVendor;
          return itemVendor && itemVendor.toString() === vendorId;
        });

        if (vendorItems.length > 0) {
          const vendorTotal = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          allOrders.push({
            _id: order._id,
            orderNumber: order.orderNumber,
            customerName: order.customerName || order.name,
            customer: {
              name: order.customerName || order.name,
              email: order.email,
              phone: order.phone,
              address: order.address
            },
            email: order.email,
            phone: order.phone,
            address: order.address,
            status: order.status,
            totalAmount: vendorTotal,
            items: vendorItems,
            cart: vendorItems,
            createdAt: order.createdAt,
            orderType: 'legacy_order',
            // Add cancellation details for proper vendor dashboard display
            cancelledBy: order.cancelledBy,
            cancelledAt: order.cancelledAt,
            cancellationReason: order.cancellationReason
          });
        }
      });
    } catch (error) {
      console.error('Error getting regular orders:', error);
    }

    // Sort by creation date (newest first)
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply filtering
    let filteredOrders = allOrders;
    
    // Status filter (case-insensitive and handle special cases)
    if (status && status !== 'all') {
      filteredOrders = filteredOrders.filter(order => {
        const orderStatus = order.status?.toLowerCase();
        const filterStatus = status.toLowerCase();
        
        // Handle special case for cancelled orders
        if (filterStatus === 'cancelled_by_customer') {
          return orderStatus === 'cancelled_by_customer' || 
                 (orderStatus === 'cancelled' && order.cancelledBy === 'user');
        }
        
        // Handle general status matching (case-insensitive)
        return orderStatus === filterStatus;
      });
    }
    
    // Search filter (order number, customer name, email)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredOrders = filteredOrders.filter(order =>
        (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
        (order.email && order.email.toLowerCase().includes(searchLower))
      );
    }
    
    console.log(`🔍 Filtered orders: ${filteredOrders.length} (from ${allOrders.length} total)`);
    
    // Apply pagination
    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / limit);
    const paginatedOrders = filteredOrders.slice(skip, skip + limit);
    
    console.log(`📄 Paginated result: ${paginatedOrders.length} orders (Page ${page} of ${totalPages})`);

    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalOrders: totalOrders,
          ordersPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Get vendor orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor orders',
      error: error.message
    });
  }
};

module.exports = {
  getSimplifiedVendorOrders
};
