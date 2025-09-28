const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const Vendor = require('../models/Vendor');
const MonthlyCommission = require('../models/MonthlyCommission');
const CommissionConfig = require('../config/commission');

// @desc    Get all vendor orders
// @route   GET /api/vendors/orders
// @access  Private (Vendor)
const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.vendor.id;    console.log(`📦 DEBUG: Found ${vendorOrders.length} VendorOrders (all time)`);
    
    if (vendorOrders.length > 0) {
      console.log('📋 DEBUG: Sample orders:', vendorOrders.slice(0, 2).map(o => ({
        id: o._id,
        totalAmount: o.totalAmount,
        commissionAmount: o.commissionAmount,
        commissionReversed: o.commissionReversed,
        isForwardedByAdmin: o.isForwardedByAdmin,
        forwardedAt: o.forwardedAt,
        createdAt: o.createdAt
      })));
    }
    
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

    console.log(`🔍 Getting order ${orderId} for vendor ${vendorId}`);

    // First, try to find in VendorOrder collection (new system)
    const VendorOrder = require('../models/VendorOrder');
    
    let vendorOrder;
    try {
      vendorOrder = await VendorOrder.findOne({
        _id: orderId,
        $or: [
          { vendor: vendorId },
          { vendorId: vendorId }
        ]
      }).populate('parentOrderId', 'orderNumber');

      if (vendorOrder) {
        console.log('✅ Found VendorOrder document');
        console.log('🔍 VendorOrder data:', {
          id: vendorOrder._id,
          orderNumber: vendorOrder.orderNumber,
          status: vendorOrder.status,
          customerName: vendorOrder.customerName,
          itemsCount: vendorOrder.items?.length || 0,
          customer: vendorOrder.customer
        });
        
        const processedVendorOrder = {
          _id: vendorOrder._id,
          orderNumber: vendorOrder.orderNumber,
          customerName: vendorOrder.customer?.name || vendorOrder.customerName,
          name: vendorOrder.customer?.name || vendorOrder.customerName,
          email: vendorOrder.customer?.email || vendorOrder.email,
          phone: vendorOrder.customer?.phone || vendorOrder.phone,
          address: vendorOrder.customer?.address || vendorOrder.address,
          city: vendorOrder.customer?.city || vendorOrder.city,
          status: vendorOrder.status,
          totalAmount: vendorOrder.totalAmount,
          vendorItems: vendorOrder.items || vendorOrder.vendorItems || [],
          vendorSubtotal: vendorOrder.totalAmount,
          vendorId: vendorId,
          orderType: 'vendor_order',
          createdAt: vendorOrder.createdAt,
          customer: vendorOrder.customer || {
            name: vendorOrder.customerName,
            email: vendorOrder.email,
            phone: vendorOrder.phone,
            address: vendorOrder.address,
            city: vendorOrder.city
          }
        };

        console.log('📦 Sending processed vendor order response');
        console.log('📦 Response data keys:', Object.keys(processedVendorOrder));
        
        return res.json({
          success: true,
          data: processedVendorOrder
        });
      }
    } catch (vendorOrderError) {
      console.log('⚠️ Error checking VendorOrder collection:', vendorOrderError.message);
    }

    // If not found in VendorOrder, try regular Order collection (legacy system)
    console.log('🔍 Checking regular Order collection...');
    
    const order = await Order.findById(orderId)
      .populate('cart.vendor', 'businessName email')
      .populate('cart.productId', 'name images');

    if (!order) {
      console.log('❌ Order not found in either collection');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('✅ Found regular Order document');

    // Filter to show only vendor's items
    const vendorItems = order.cart.filter(item => 
      item.vendor && item.vendor._id.toString() === vendorId
    );

    if (vendorItems.length === 0) {
      console.log('❌ Vendor has no items in this order');
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

// ✅ VENDOR STATUS MANAGEMENT RESTORED
// Simple vendor status management using clean 6-status system

// @desc    Handle vendor order actions (accept, ship, deliver, etc.)
// @route   PUT /api/vendors/orders/:id/vendor-action
// @access  Private (Vendor)
const handleVendorOrderAction = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const orderId = req.params.id;
    const { action, reason } = req.body;

    console.log(`🏪 Vendor ${vendorId} taking action '${action}' on order ${orderId}`);

    // Map vendor actions to order statuses
    const actionStatusMap = {
      'accept': 'processing',     // Vendor accepts the order
      'process': 'processing',    // Vendor is processing
      'ship': 'shipped',          // Vendor ships the order
      'deliver': 'delivered',     // Vendor marks as delivered
      'reject': 'cancelled'       // Vendor rejects the order
    };

    const newStatus = actionStatusMap[action];
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Use: ${Object.keys(actionStatusMap).join(', ')}`
      });
    }

    // Find the order first
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // 🚫 PREVENT STATUS CHANGES IF CUSTOMER CANCELLED THE ORDER
    const customerCancelledStatuses = ['cancelled_by_customer', 'cancelled_by_user'];
    if (customerCancelledStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of order that was cancelled by customer. Current status: ${order.status}`,
        currentStatus: order.status,
        cancelledBy: order.cancelledBy,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason
      });
    }

    // Verify vendor has items in this order
    const vendorItems = order.cart.filter(item => 
      item.vendor && item.vendor.toString() === vendorId
    );
    
    if (vendorItems.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have any items in this order'
      });
    }

    // Update order status directly (simplified approach)
    const oldStatus = order.status;
    order.status = newStatus;
    order.statusUpdatedAt = new Date();
    
    // 📦 RESTORE STOCK IF VENDOR REJECTS THE ORDER
    if (action === 'reject' && oldStatus !== 'cancelled') {
      console.log('📦 Vendor rejected order - restoring stock...');
      
      // Import StockManager
      const StockManager = require('../services/StockManager');
      
      // Restore stock for vendor's items only
      for (const item of vendorItems) {
        if (item.productId) {
          try {
            await StockManager.restoreStock(item.productId, item.quantity);
            console.log(`📈 Stock restored for ${item.title}: +${item.quantity}`);
          } catch (stockError) {
            console.error(`Error restoring stock for product ${item.productId}:`, stockError);
          }
        }
      }
      
      // Set rejection metadata
      order.cancelledBy = 'vendor';
      order.cancelledAt = new Date();
      order.cancellationReason = reason || 'Rejected by vendor';
    }
    
    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: newStatus,
      updatedAt: new Date(),
      updatedBy: vendorId,
      updatedByType: 'vendor',
      notes: reason || `Vendor ${action} action`
    });

    await order.save();

    console.log(`✅ Order ${orderId} status updated from ${oldStatus} to ${newStatus} by vendor ${vendorId}`);

    // Send email notification for vendor order status change
    if (oldStatus !== newStatus && order.email) {
      try {
        const { emailService } = require('../services/emailService');
        await emailService.sendOrderStatusUpdate(order.email, order, newStatus, oldStatus);
        console.log(`📧 [EMAIL] Vendor order status update email sent for ${order.orderNumber}: ${oldStatus} → ${newStatus}`);
      } catch (emailError) {
        console.error('❌ [EMAIL] Failed to send vendor order status update email:', emailError);
        // Don't fail the operation if email fails
      }
    }

    res.json({
      success: true,
      message: `Order ${action} successfully`,
      data: {
        orderId,
        action,
        oldStatus,
        newStatus,
        updatedBy: 'vendor'
      }
    });

  } catch (error) {
    console.error('❌ Vendor order action error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing vendor action',
      error: error.message
    });
  }
};

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
    
    console.log(`📊 DEBUG: Vendor object:`, req.vendor);
    
    // Get vendor's commission rate
    const vendor = await Vendor.findById(vendorId).select('settings.commissionRate businessName');
    console.log(`🏪 DEBUG: Vendor found:`, vendor);
    console.log(`💰 DEBUG: Vendor commission rate:`, vendor?.settings?.commissionRate);
    
    // Calculate date range based on period filter (SAME AS ADMIN LOGIC)
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '90days':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
        break;
    }

    console.log(`📅 DEBUG: Date range - Start: ${startDate}, End: ${now}`);

    // Get VendorOrders for this vendor within the period (SAME AS ADMIN LOGIC)
    const vendorOrders = await VendorOrder.find({
      vendor: vendorId
    });

    console.log(`� DEBUG: Found ${vendorOrders.length} VendorOrders in period`);
    
    if (vendorOrders.length > 0) {
      console.log('📋 DEBUG: Sample orders:', vendorOrders.slice(0, 2).map(o => ({
        id: o._id,
        totalAmount: o.totalAmount,
        commissionAmount: o.commissionAmount,
        isForwardedByAdmin: o.isForwardedByAdmin,
        forwardedAt: o.forwardedAt,
        createdAt: o.createdAt
      })));
    }

    // Calculate total commission from orders - UPDATED LOGIC TO MATCH ADMIN
    const CommissionConfig = require('../config/commission');
    const totalCommission = vendorOrders.reduce((sum, vo) => {
      let commission = 0;
      
      // If commission has been explicitly reversed, respect that
      if (vo.commissionReversed === true) {
        commission = 0;
        console.log(`  Order ${vo._id}: Commission REVERSED - showing $0`);
      }
      // Use explicit positive commissionAmount values if available
      else if (vo.commissionAmount && vo.commissionAmount > 0) {
        commission = vo.commissionAmount;
        console.log(`  Order ${vo._id}: Using explicit commission amount: $${commission}`);
      }
      // If order was manually forwarded by admin or has forwardedAt date, calculate commission
      else if (vo.isForwardedByAdmin || vo.forwardedAt) {
        commission = vo.totalAmount * CommissionConfig.VENDOR_COMMISSION_RATE; // Dynamic commission for forwarded orders
        console.log(`  Order ${vo._id}: CALCULATED - Total: $${vo.totalAmount}, Rate: ${CommissionConfig.VENDOR_COMMISSION_RATE}, Commission: $${commission}`);
      }
      // Auto-created orders that haven't been forwarded get 0 commission
      else {
        commission = 0;
        console.log(`  Order ${vo._id}: NOT FORWARDED - Commission: $0`);
      }
      
      console.log(`  Order ${vo._id}: $${vo.totalAmount} → Forwarded: ${!!(vo.isForwardedByAdmin || vo.forwardedAt)} → CommissionReversed: ${vo.commissionReversed} → CommissionAmount: ${vo.commissionAmount} → Final Commission: $${commission}`);
      return sum + commission;
    }, 0);

    console.log(`💰 DEBUG: Total commission calculated: $${totalCommission}`);

    // Get paid commission from MonthlyCommission records - ALL TIME to match admin logic
    let totalPaidToAdmin = 0;
    try {
      const paidCommissions = await MonthlyCommission.find({
        vendor: vendorId,
        paymentStatus: { $in: ['paid', 'processing'] }
      });

      totalPaidToAdmin = paidCommissions.reduce((sum, mc) => sum + (mc.paidCommission || 0), 0);
      console.log(`✅ DEBUG: Total paid: $${totalPaidToAdmin} (from ${paidCommissions.length} records)`);
      
    } catch (error) {
      console.log(`❌ DEBUG: Error getting paid commissions:`, error.message);
    }

    const pendingToAdmin = Math.max(0, totalCommission - totalPaidToAdmin);
    const totalRevenue = vendorOrders.reduce((sum, vo) => sum + (vo.totalAmount || 0), 0);
    const totalOrders = vendorOrders.length;

    console.log(`💰 Commission Summary for vendor ${vendorId}:`, {
      totalCommission,
      totalRevenue,
      totalOrders,
      totalPaidToAdmin,
      pendingToAdmin
    });

    const responseData = {
      summary: {
        totalCommission,
        totalRevenue,
        totalOrders,
        totalPaidToAdmin,
        pendingAmountToAdmin: pendingToAdmin,
        period,
        vendorCommissionRate: CommissionConfig.COMMISSION_PERCENTAGE
      }
    };

    console.log(`📤 DEBUG: Sending response data:`, JSON.stringify(responseData, null, 2));

    res.json({
      success: true,
      data: responseData
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
    const { year = new Date().getFullYear(), page = 1, limit = 6 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log(`📅 Getting monthly commissions for vendor: ${vendorId}, year: ${year}, page: ${page}, limit: ${limit}`);
    console.log(`📊 DEBUG: Full request query:`, req.query);
    console.log(`📊 DEBUG: Vendor object:`, req.vendor);

    // Get vendor's commission rate
    const vendor = await Vendor.findById(vendorId).select('settings.commissionRate businessName');
    console.log(`🏪 DEBUG: Vendor found:`, vendor);
    console.log(`💰 DEBUG: Vendor commission rate:`, vendor?.settings?.commissionRate);

    const CommissionConfig = require('../config/commission');
    
    // Get current month and year for status calculation
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`📅 DEBUG: Current date - Month: ${currentMonth}, Year: ${currentYear}`);

    // Create array for all 12 months - START WITH CURRENT MONTH FIRST
    const monthOrder = [];
    
    // Add current month first, then future months for this year
    for (let i = currentMonth; i <= 12; i++) {
      monthOrder.push(i);
    }
    
    // Then add past months for this year
    for (let i = 1; i < currentMonth; i++) {
      monthOrder.push(i);
    }

    console.log(`� DEBUG: Month order (current first):`, monthOrder);

    const monthlyData = [];

    for (const monthNumber of monthOrder) {
      console.log(`📊 DEBUG: Processing month ${monthNumber}...`);
      
      // Calculate date range for this specific month
      const monthStart = new Date(parseInt(year), monthNumber - 1, 1);
      const monthEnd = new Date(parseInt(year), monthNumber, 0, 23, 59, 59, 999);
      
      console.log(`📅 DEBUG: Month ${monthNumber} range: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);

      // Get VendorOrders for this month (SAME LOGIC AS ADMIN)
      const vendorOrders = await VendorOrder.find({
        vendor: vendorId,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });

      console.log(`� DEBUG: Found ${vendorOrders.length} VendorOrders for month ${monthNumber}`);

      // Calculate commission for this month - UPDATED LOGIC TO MATCH ADMIN
      const monthCommission = vendorOrders.reduce((sum, vo) => {
        let commission = 0;
        
        // If commission has been explicitly reversed, respect that
        if (vo.commissionReversed === true) {
          commission = 0;
          console.log(`  Month ${monthNumber} Order ${vo._id}: Commission REVERSED - showing $0`);
        }
        // If commissionAmount is explicitly set and > 0, use it
        else if (vo.commissionAmount && vo.commissionAmount > 0) {
          commission = vo.commissionAmount;
          console.log(`  Month ${monthNumber} Order ${vo._id}: Using explicit commission amount: $${commission}`);
        }
        // If order was manually forwarded by admin or has forwardedAt date, calculate commission
        else if (vo.isForwardedByAdmin || vo.forwardedAt) {
          commission = vo.totalAmount * CommissionConfig.VENDOR_COMMISSION_RATE;
          console.log(`  Month ${monthNumber} Order ${vo._id}: CALCULATED - Total: $${vo.totalAmount}, Rate: ${CommissionConfig.VENDOR_COMMISSION_RATE}, Commission: $${commission}`);
        }
        // Auto-created orders that haven't been forwarded get 0 commission
        else {
          commission = 0;
          console.log(`  Month ${monthNumber} Order ${vo._id}: NOT FORWARDED - Commission: $0`);
        }
        
        return sum + commission;
      }, 0);

      // Calculate revenue and orders
      const monthRevenue = vendorOrders.reduce((sum, vo) => sum + (vo.totalAmount || 0), 0);
      const monthOrders = vendorOrders.length;

      // Get paid amount for this month from MonthlyCommission records
      let monthPaidToAdmin = 0;
      try {
        const paidCommissions = await MonthlyCommission.find({
          vendor: vendorId,
          month: monthNumber,
          year: parseInt(year),
          paymentStatus: { $in: ['paid', 'processing'] }
        });

        monthPaidToAdmin = paidCommissions.reduce((sum, mc) => sum + (mc.paidCommission || 0), 0);
      } catch (error) {
        console.log(`❌ DEBUG: Error getting paid commissions for month ${monthNumber}:`, error.message);
      }

      const pendingAmountToAdmin = Math.max(0, monthCommission - monthPaidToAdmin);
      const isCurrentMonth = monthNumber === currentMonth && parseInt(year) === currentYear;
      
      console.log(`📊 DEBUG: Month ${monthNumber} calculations:`, {
        monthCommission,
        monthRevenue,
        monthOrders,
        monthPaidToAdmin,
        pendingAmountToAdmin,
        isCurrentMonth
      });

      const monthData = {
        month: monthNumber,
        monthName: new Date(0, monthNumber - 1).toLocaleString('default', { month: 'long' }),
        year: parseInt(year),
        totalCommission: monthCommission,
        totalRevenue: monthRevenue,
        totalOrders: monthOrders,
        paidToAdmin: monthPaidToAdmin,
        pendingAmountToAdmin,
        status: isCurrentMonth ? 'current' : (pendingAmountToAdmin > 0 ? 'pending' : (monthCommission > 0 ? 'completed' : 'no_data'))
      };

      // Only add months with data or current month
      if (monthCommission > 0 || monthOrders > 0 || isCurrentMonth) {
        monthlyData.push(monthData);
      }
    }

    console.log(`📤 DEBUG: Monthly data array length: ${monthlyData.length}`);
    console.log(`📤 DEBUG: Sample monthly data entries:`, monthlyData.slice(0, 3));
    
    // Apply pagination
    const totalReports = monthlyData.length;
    const totalPages = Math.ceil(totalReports / parseInt(limit));
    const paginatedReports = monthlyData.slice(skip, skip + parseInt(limit));
    
    console.log(`📄 Pagination: ${paginatedReports.length} reports (Page ${page} of ${totalPages})`);

    const responseData = {
      year: parseInt(year),
      monthlyCommissions: paginatedReports,
      vendorCommissionRate: CommissionConfig.COMMISSION_PERCENTAGE,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalReports: totalReports,
        reportsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1
      }
    };

    console.log(`📤 DEBUG: Sending monthly commissions response:`, JSON.stringify(responseData, null, 2));

    res.json({
      success: true,
      data: responseData
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

    // Get vendor's commission rate
    const vendor = await Vendor.findById(vendorId).select('settings.commissionRate');
    const vendorCommissionRate = CommissionConfig.COMMISSION_PERCENTAGE; // Use global admin setting

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
            rate: vendorCommissionRate, // Use vendor's individual commission rate
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
      commissionRate: order.commission?.rate || vendorCommissionRate, // Use vendor's rate as fallback
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
  getOrderAnalytics,
  handleVendorOrderAction,  // ✅ RESTORED
  getVendorCommissionSummary,
  getVendorMonthlyCommissions,
  getVendorCommission,
  exportVendorCommissionReport
};
