const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const MonthlyCommission = require('../models/MonthlyCommission');
const Vendor = require('../models/Vendor');
const CommissionConfig = require('../config/commission');
const nodemailer = require('nodemailer');

// Helper function to calculate commission amount
const calculateCommissionAmount = (totalAmount) => {
  return totalAmount * CommissionConfig.VENDOR_COMMISSION_RATE;
};

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'internationaltijaratco@gmail.com',
    pass: process.env.EMAIL_PASS || 'vjlk swal olbh bopt'
  }
});

// @desc    Get comprehensive commission overview for all vendors with filters
// @route   GET /api/admin/commissions/overview
// @access  Private (Admin)
const getCommissionOverview = async (req, res) => {
  try {
    console.log('🔥 COMMISSION API CALLED - Route hit successfully!');
    console.log('🔥 Request query:', req.query);
    console.log('🔥 Request user:', req.user ? 'User exists' : 'No user found');
    
    const { 
      period = 'month', // 'month', '90days', 'year'
      status,
      search,
      sortBy = 'totalCommission',
      sortOrder = 'desc',
      page = 1,
      limit = 9 // 9 items per page for 3x3 grid
    } = req.query;

    console.log(`🔍 Admin: Getting commission overview with period: ${period}, page: ${page}, limit: ${limit}`);

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Calculate date range based on period filter
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

    console.log(`📅 Date range: ${startDate.toISOString()} to ${now.toISOString()}`);

    // Build vendor query with search
    const vendorQuery = { 
      verificationStatus: 'approved'
    };

    if (search) {
      vendorQuery.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { 'contactPerson.firstName': { $regex: search, $options: 'i' } },
        { 'contactPerson.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalVendors = await Vendor.countDocuments(vendorQuery);
    
    // Get vendors with pagination
    const vendors = await Vendor.find(vendorQuery)
      .select('_id businessName contactPerson email contactPhone status verificationStatus')
      .skip(skip)
      .limit(limitNum);

    console.log(`👥 Found ${vendors.length} vendors (page ${pageNum} of ${Math.ceil(totalVendors / limitNum)}, total: ${totalVendors})`);
    
    if (vendors.length > 0) {
      console.log('📋 Sample vendors with all fields:', vendors.slice(0, 3).map(v => ({
        id: v._id,
        businessName: v.businessName,
        email: v.email,
        verificationStatus: v.verificationStatus,
        contactPerson: v.contactPerson,
        hasBusinessName: !!v.businessName,
        businessNameLength: v.businessName ? v.businessName.length : 0,
        hasContactPerson: !!v.contactPerson,
        contactFirstName: v.contactPerson?.firstName,
        contactLastName: v.contactPerson?.lastName
      })));
    }

    if (totalVendors === 0) {
      console.log('⚠️  No approved vendors found in database');
      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalCommissionSum: 0,
            totalPaid: 0,
            totalPending: 0,
            activeVendors: 0,
            period: period,
            dateRange: { start: startDate, end: now }
          },
          vendorCommissions: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            totalVendors: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }

    const vendorCommissions = [];
    let totalPendingAll = 0;
    let totalPaidAll = 0;
    let totalCommissionAll = 0;

    // Calculate commission data for each vendor
    for (const vendor of vendors) {
      console.log(`\n🔍 Processing vendor: ${vendor.businessName} (${vendor._id})`);
      
      // Get VendorOrders for this vendor - ALL TIME to match vendor dashboard
      const vendorOrders = await VendorOrder.find({
        vendor: vendor._id
      });

      console.log(`📦 Found ${vendorOrders.length} VendorOrders for ${vendor.businessName} (all time)`);
      
      if (vendorOrders.length > 0) {
        console.log('📋 Sample orders:', vendorOrders.slice(0, 2).map(o => ({
          id: o._id,
          totalAmount: o.totalAmount,
          commissionAmount: o.commissionAmount,
          createdAt: o.createdAt
        })));
      }

      // Calculate total commission from orders - Check reversal status with dedicated flag
      const totalCommission = vendorOrders.reduce((sum, vo) => {
        let commission = 0;
        
        // If commission has been explicitly reversed, respect that
        if (vo.commissionReversed === true) {
          commission = 0;
          console.log(`  Order ${vo._id}: Commission REVERSED - showing $0`);
        }
        // For display purposes, calculate commission based on forwarded status
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

      console.log(`💰 Total commission for ${vendor.businessName}: $${totalCommission}`);

      // Get paid commission from MonthlyCommission records - ALL TIME to match vendor dashboard  
      let totalPaid = 0;
      try {
        const paidCommissions = await MonthlyCommission.find({
          vendor: vendor._id,
          paymentStatus: { $in: ['paid', 'processing'] }
        });

        totalPaid = paidCommissions.reduce((sum, mc) => sum + (mc.paidCommission || 0), 0);
        console.log(`✅ Total paid for ${vendor.businessName}: $${totalPaid} (from ${paidCommissions.length} records)`);
        
        if (paidCommissions.length > 0) {
          console.log('📋 Payment records:', paidCommissions.map(pc => ({
            month: pc.month,
            year: pc.year,
            paidCommission: pc.paidCommission,
            paymentStatus: pc.paymentStatus,
            lastPaymentDate: pc.lastPaymentDate
          })));
        }
      } catch (error) {
        console.log(`❌ Error getting paid commissions for vendor ${vendor._id}:`, error.message);
      }

      const pendingAmount = Math.max(0, totalCommission - totalPaid);

      // Apply search filter if provided
      if (search && !vendor.businessName.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }

      // Apply status filter if provided
      if (status) {
        if (status === 'pending' && pendingAmount === 0) continue;
        if (status === 'paid' && pendingAmount > 0) continue;
      }

      // Create a meaningful display name with proper fallback hierarchy
      const getVendorDisplayName = (vendor) => {
        console.log(`🔍 Resolving name for vendor ${vendor._id}:`, {
          businessName: vendor.businessName,
          email: vendor.email,
          contactPerson: vendor.contactPerson,
          hasBusinessName: !!vendor.businessName,
          businessNameLength: vendor.businessName ? vendor.businessName.length : 0
        });

        // Priority 1: businessName
        if (vendor.businessName && typeof vendor.businessName === 'string' && vendor.businessName.trim()) {
          const name = vendor.businessName.trim();
          console.log(`✅ Using business name: "${name}"`);
          return name;
        }
        
        // Priority 2: Contact person name
        if (vendor.contactPerson) {
          const firstName = vendor.contactPerson.firstName?.trim() || '';
          const lastName = vendor.contactPerson.lastName?.trim() || '';
          
          if (firstName && lastName) {
            const name = `${firstName} ${lastName}`;
            console.log(`✅ Using contact person full name: "${name}"`);
            return name;
          } else if (firstName) {
            console.log(`✅ Using contact person first name: "${firstName}"`);
            return firstName;
          } else if (lastName) {
            console.log(`✅ Using contact person last name: "${lastName}"`);
            return lastName;
          }
        }
        
        // Priority 3: Create meaningful name from email
        if (vendor.email && typeof vendor.email === 'string') {
          const emailPrefix = vendor.email.split('@')[0];
          
          // Try to extract business name from email
          if (emailPrefix.toLowerCase().includes('business') || 
              emailPrefix.toLowerCase().includes('company') || 
              emailPrefix.toLowerCase().includes('corp') ||
              emailPrefix.toLowerCase().includes('inc')) {
            const cleanPrefix = emailPrefix
              .replace(/[0-9]/g, '')
              .replace(/[._-]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (cleanPrefix.length > 3) {
              const name = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
              console.log(`✅ Using email-based business name: "${name}"`);
              return name;
            }
          }
          
          // Use email as last resort before vendor ID
          const name = `Business (${vendor.email})`;
          console.log(`⚠️ Using email fallback: "${name}"`);
          return name;
        }
        
        // Last resort: generate a readable vendor identifier
        const name = `Vendor ${vendor._id.toString().slice(-6)}`;
        console.log(`⚠️ Using vendor ID fallback: "${name}"`);
        return name;
      };

      const vendorData = {
        vendorId: vendor._id,
        businessName: getVendorDisplayName(vendor),
        email: vendor.email,
        phone: vendor.contactPhone,
        totalCommission: totalCommission,
        totalPaid: totalPaid,
        pendingAmount: pendingAmount,
        orderCount: vendorOrders.length,
        status: pendingAmount > 0 ? 'pending' : 'paid'
      };

      console.log(`📊 Vendor data for ${getVendorDisplayName(vendor)}:`, {
        vendorId: vendor._id,
        originalBusinessName: vendor.businessName,
        contactFirstName: vendor.contactPerson?.firstName,
        contactLastName: vendor.contactPerson?.lastName,
        finalDisplayName: vendorData.businessName,
        email: vendor.email,
        hasBusinessName: !!vendor.businessName,
        totalCommission,
        totalPaid,
        pendingAmount
      });

      vendorCommissions.push(vendorData);

      // Add to totals
      totalCommissionAll += totalCommission;
      totalPaidAll += totalPaid;
      totalPendingAll += pendingAmount;
    }

    // Sort vendors based on sortBy parameter
    const sortMultiplier = sortOrder === 'desc' ? -1 : 1;
    vendorCommissions.sort((a, b) => {
      if (sortBy === 'businessName') {
        return sortMultiplier * a.businessName.localeCompare(b.businessName);
      }
      return sortMultiplier * (a[sortBy] - b[sortBy]);
    });

    console.log(`📊 Commission Overview Summary:
    - Total Commission: $${totalCommissionAll.toFixed(2)}
    - Total Paid: $${totalPaidAll.toFixed(2)}
    - Total Pending: $${totalPendingAll.toFixed(2)}
    - Vendors with Data: ${vendorCommissions.length}`);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCommissionSum: totalCommissionAll, // Frontend expects this name
          totalPaid: totalPaidAll,
          totalPending: totalPendingAll,
          activeVendors: vendorCommissions.length, // Frontend expects this name
          period: period,
          dateRange: {
            start: startDate,
            end: now
          }
        },
        vendorCommissions: vendorCommissions, // Frontend expects this name
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalVendors / limitNum),
          totalVendors: totalVendors,
          hasNext: pageNum < Math.ceil(totalVendors / limitNum),
          hasPrev: pageNum > 1,
          itemsPerPage: limitNum
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin commission overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commission overview',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update vendor payment status
// @route   POST /api/admin/commissions/vendor/:vendorId/payment
// @access  Private (Admin)
const updateVendorPayment = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { amount = 0, period, year, month, notes } = req.body;

    console.log('🔄 Updating vendor payment:', { vendorId, amount, period, year, month, notes });

    // Validate vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Validate amount with default value of 0
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required and must be greater than 0'
      });
    }

    // Get current date for payment tracking
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    let targetYear, targetMonth;
    
    if (period === 'month' && year && month) {
      targetYear = parseInt(year);
      targetMonth = parseInt(month);
    } else {
      targetYear = currentYear;
      targetMonth = currentMonth;
    }

    // Check existing commission record to validate payment amount
    const existingCommission = await MonthlyCommission.findOne({
      vendor: vendorId,
      year: targetYear,
      month: targetMonth
    });

    // Calculate real-time commission to ensure accuracy
    let actualTotalCommission = 0;
    let currentPaid = 0;

    if (existingCommission) {
      currentPaid = parseFloat(existingCommission.paidCommission || 0);
      
      // Calculate actual commission from VendorOrders for this period
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      
      console.log('📅 Calculating real-time commission for validation:', {
        vendorId,
        period: `${targetMonth}/${targetYear}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const vendorOrders = await VendorOrder.find({
        vendor: vendorId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Calculate total commission from actual orders
      actualTotalCommission = vendorOrders.reduce((total, order) => {
        const orderCommission = order.commissionAmount || (order.isForwardedByAdmin || order.forwardedAt ? calculateCommissionAmount(order.totalAmount) : 0); // Calculate for forwarded orders
        return total + orderCommission;
      }, 0);

      console.log('💰 Real-time commission calculation:', {
        ordersFound: vendorOrders.length,
        calculatedCommission: actualTotalCommission,
        storedCommission: existingCommission.totalCommission || 0,
        commissionMismatch: actualTotalCommission !== (existingCommission.totalCommission || 0)
      });
    }

    // Use calculated commission for validation
    const remainingAmount = actualTotalCommission - currentPaid;

    console.log('💰 Payment validation debug:', {
      vendorId,
      paymentAmount,
      currentPaid,
      actualTotalCommission,
      storedTotalCommission: existingCommission?.totalCommission || 0,
      remainingAmount,
      exceedsLimit: paymentAmount > remainingAmount,
      // Round to 2 decimal places for comparison
      paymentAmountRounded: Math.round(paymentAmount * 100) / 100,
      remainingAmountRounded: Math.round(remainingAmount * 100) / 100
    });

    // Validate payment doesn't exceed pending amount (with small tolerance for floating point precision)
    const tolerance = 0.01; // 1 cent tolerance
    if (paymentAmount > (remainingAmount + tolerance)) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds pending commission amount ($${remainingAmount.toFixed(2)}). Total commission: $${actualTotalCommission.toFixed(2)}, Already paid: $${currentPaid.toFixed(2)}`,
        data: {
          totalCommission: actualTotalCommission.toFixed(2),
          alreadyPaid: currentPaid.toFixed(2),
          pendingAmount: remainingAmount.toFixed(2),
          attemptedPayment: paymentAmount.toFixed(2)
        }
      });
    }

    // Update or create monthly commission record
    let monthlyCommission;
    
    if (period === 'month' && year && month) {
      // For specific month payment
      console.log(`💰 Updating commission for specific month: ${targetMonth}/${targetYear}`);
      
      monthlyCommission = await MonthlyCommission.findOneAndUpdate(
        { 
          vendor: vendorId,
          year: targetYear,
          month: targetMonth
        },
        {
          $inc: {
            paidCommission: paymentAmount,      // ADD to existing paid amount
            pendingCommission: -paymentAmount   // Reduce pending by paid amount
          },
          $set: {
            totalCommission: actualTotalCommission, // Update with correct total commission
            lastPaymentDate: currentDate,
            paymentMethod: 'bank_transfer',
            adminNotes: notes || 'Payment marked as received by admin'
          }
        },
        { 
          upsert: true, 
          new: true 
        }
      );

      // Update payment status based on commission amounts
      if (monthlyCommission.paidCommission >= monthlyCommission.totalCommission) {
        monthlyCommission.paymentStatus = 'paid';
      } else if (monthlyCommission.paidCommission > 0) {
        monthlyCommission.paymentStatus = 'processing'; // Use 'processing' instead of 'partial'
      } else {
        monthlyCommission.paymentStatus = 'pending';
      }
      await monthlyCommission.save();
    } else {
      // For general payment, find existing records or create new one
      console.log(`💰 Creating general payment record for current period: ${currentMonth}/${currentYear}`);
      
      // Calculate actual commission for current period
      const currentPeriodStart = new Date(currentYear, currentMonth - 1, 1);
      const currentPeriodEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      
      const currentPeriodOrders = await VendorOrder.find({
        vendor: vendorId,
        createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
      });

      const currentPeriodCommission = currentPeriodOrders.reduce((total, order) => {
        return total + (order.commissionAmount || (order.isForwardedByAdmin || order.forwardedAt ? calculateCommissionAmount(order.totalAmount) : 0)); // Calculate for forwarded orders
      }, 0);
      
      monthlyCommission = await MonthlyCommission.findOneAndUpdate(
        { 
          vendor: vendorId,
          year: currentYear,
          month: currentMonth
        },
        {
          $inc: {
            paidCommission: paymentAmount       // ADD to existing paid amount
          },
          $set: {
            vendor: vendorId,
            year: currentYear,
            month: currentMonth,
            totalCommission: currentPeriodCommission, // Set correct total commission
            lastPaymentDate: currentDate,
            paymentMethod: 'bank_transfer',
            adminNotes: notes || 'Payment marked as received by admin'
          }
        },
        { 
          upsert: true, 
          new: true 
        }
      );

      // Update payment status based on commission amounts
      if (monthlyCommission.paidCommission >= monthlyCommission.totalCommission) {
        monthlyCommission.paymentStatus = 'paid';
      } else if (monthlyCommission.paidCommission > 0) {
        monthlyCommission.paymentStatus = 'processing'; // Use 'processing' instead of 'partial'
      } else {
        monthlyCommission.paymentStatus = 'pending';
      }
      await monthlyCommission.save();
    }

    console.log('✅ Payment record updated:', {
      vendorId: monthlyCommission.vendor,
      month: monthlyCommission.month,
      year: monthlyCommission.year,
      paidCommission: monthlyCommission.paidCommission,
      paymentStatus: monthlyCommission.paymentStatus,
      lastPaymentDate: monthlyCommission.lastPaymentDate
    });

    // Send success response
    res.json({
      success: true,
      message: `Payment of $${paymentAmount} marked successfully!`,
      data: {
        vendor: vendorId,
        amount: paymentAmount,
        paymentDate: currentDate,
        monthlyCommission: monthlyCommission
      }
    });

  } catch (error) {
    console.error('❌ Error updating vendor payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error.message
    });
  }
};

// @desc    Get detailed commission report for a specific vendor
// @route   GET /api/admin/commissions/vendor/:vendorId
// @access  Private (Admin)
const getVendorCommissionDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { 
      year = new Date().getFullYear(),
      startMonth = 1,
      endMonth = 12 
    } = req.query;

    // Get vendor info
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get monthly commissions
    const monthlyCommissions = await MonthlyCommission.find({
      vendor: vendorId,
      year: parseInt(year),
      month: { $gte: parseInt(startMonth), $lte: parseInt(endMonth) }
    }).sort({ year: -1, month: -1 });

    // Get vendor orders for commission calculation
    const vendorOrders = await VendorOrder.find({
      vendor: vendorId,
      createdAt: {
        $gte: new Date(year, startMonth - 1, 1),
        $lte: new Date(year, endMonth, 0)
      }
    }).populate('order');

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          phone: vendor.contactPhone
        },
        monthlyCommissions,
        vendorOrders: vendorOrders.map(vo => ({
          id: vo._id,
          orderId: vo.order?._id,
          totalAmount: vo.totalAmount,
          commissionAmount: vo.commissionAmount || (vo.isForwardedByAdmin || vo.forwardedAt ? calculateCommissionAmount(vo.totalAmount) : 0), // Calculate for forwarded orders
          status: vo.status,
          createdAt: vo.createdAt
        })),
        summary: {
          totalCommission: vendorOrders.reduce((sum, vo) => sum + (vo.commissionAmount || (vo.isForwardedByAdmin || vo.forwardedAt ? calculateCommissionAmount(vo.totalAmount) : 0)), 0), // Calculate for forwarded orders
          totalPaid: monthlyCommissions.reduce((sum, mc) => sum + (mc.isPaid ? mc.paidAmount : 0), 0),
          totalPending: vendorOrders.reduce((sum, vo) => sum + (vo.commissionAmount || (vo.isForwardedByAdmin || vo.forwardedAt ? calculateCommissionAmount(vo.totalAmount) : 0)), 0) - 
                       monthlyCommissions.reduce((sum, mc) => sum + (mc.isPaid ? mc.paidAmount : 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('Vendor commission details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor commission details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Process commission payment for a vendor
// @route   POST /api/admin/commissions/process-payment
// @access  Private (Admin)
const processCommissionPayment = async (req, res) => {
  try {
    const { vendorId, amount, month, year, paymentMethod, notes } = req.body;

    // Validate required fields
    if (!vendorId || !amount || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID, amount, month, and year are required'
      });
    }

    // Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Create or update monthly commission record
    const monthlyCommission = await MonthlyCommission.findOneAndUpdate(
      { vendor: vendorId, month: parseInt(month), year: parseInt(year) },
      {
        vendor: vendorId,
        month: parseInt(month),
        year: parseInt(year),
        paidAmount: parseFloat(amount),
        isPaid: true,
        paidDate: new Date(),
        paymentMethod: paymentMethod || 'manual',
        paymentNotes: notes || ''
      },
      { upsert: true, new: true }
    );

    // Send confirmation email to vendor
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: vendor.email,
        subject: 'Commission Payment Received',
        html: `
          <h2>Commission Payment Confirmation</h2>
          <p>Dear ${vendor.businessName},</p>
          <p>We have received your commission payment:</p>
          <ul>
            <li><strong>Amount:</strong> $${amount}</li>
            <li><strong>Period:</strong> ${month}/${year}</li>
            <li><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Thank you for your business!</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Commission payment processed successfully',
      data: monthlyCommission
    });

  } catch (error) {
    console.error('Process commission payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing commission payment',
      error: error.message
    });
  }
};

// @desc    Bulk process commission payments
// @route   POST /api/admin/commissions/bulk-process
// @access  Private (Admin)
const bulkProcessCommissionPayments = async (req, res) => {
  try {
    const { payments } = req.body; // Array of payment objects

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payments array is required'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const payment of payments) {
      try {
        const { vendorId, amount, month, year, paymentMethod, notes } = payment;

        // Validate payment data
        if (!vendorId || !amount || !month || !year) {
          results.failed.push({
            payment,
            error: 'Missing required fields'
          });
          continue;
        }

        // Process payment
        const monthlyCommission = await MonthlyCommission.findOneAndUpdate(
          { vendor: vendorId, month: parseInt(month), year: parseInt(year) },
          {
            vendor: vendorId,
            month: parseInt(month),
            year: parseInt(year),
            paidAmount: parseFloat(amount),
            isPaid: true,
            paidDate: new Date(),
            paymentMethod: paymentMethod || 'bulk',
            paymentNotes: notes || 'Bulk payment processing'
          },
          { upsert: true, new: true }
        );

        results.successful.push({
          payment,
          result: monthlyCommission
        });

      } catch (error) {
        results.failed.push({
          payment,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.successful.length} payments successfully, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    console.error('Bulk process commission payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing bulk commission payments',
      error: error.message
    });
  }
};

// @desc    Get commission analytics
// @route   GET /api/admin/commissions/analytics
// @access  Private (Admin)
const getCommissionAnalytics = async (req, res) => {
  try {
    const { period = 'year' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Get all vendor orders in the period
    const vendorOrders = await VendorOrder.find({
      createdAt: { $gte: startDate, $lte: now }
    }).populate('vendor');

    // Get all commission payments in the period
    const commissionPayments = await MonthlyCommission.find({
      isPaid: true,
      paidDate: { $gte: startDate, $lte: now }
    }).populate('vendor');

    // Calculate analytics
    const totalCommissionEarned = vendorOrders.reduce((sum, vo) => sum + (vo.commissionAmount || (vo.isForwardedByAdmin || vo.forwardedAt ? calculateCommissionAmount(vo.totalAmount) : 0)), 0); // Calculate for forwarded orders
    const totalCommissionPaid = commissionPayments.reduce((sum, cp) => sum + cp.paidAmount, 0);
    const totalCommissionPending = totalCommissionEarned - totalCommissionPaid;

    // Monthly breakdown
    const monthlyData = {};
    vendorOrders.forEach(vo => {
      const month = vo.createdAt.getMonth();
      const year = vo.createdAt.getFullYear();
      const key = `${year}-${month}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: month + 1,
          year,
          earned: 0,
          paid: 0
        };
      }
      
      monthlyData[key].earned += (vo.commissionAmount || (vo.isForwardedByAdmin || vo.forwardedAt ? calculateCommissionAmount(vo.totalAmount) : 0)); // Calculate for forwarded orders
    });

    commissionPayments.forEach(cp => {
      const month = cp.paidDate.getMonth();
      const year = cp.paidDate.getFullYear();
      const key = `${year}-${month}`;
      
      if (monthlyData[key]) {
        monthlyData[key].paid += cp.paidAmount;
      }
    });

    const monthlyBreakdown = Object.values(monthlyData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCommissionEarned,
          totalCommissionPaid,
          totalCommissionPending,
          collectionRate: totalCommissionEarned > 0 ? (totalCommissionPaid / totalCommissionEarned) * 100 : 0
        },
        monthlyBreakdown,
        period,
        dateRange: {
          start: startDate,
          end: now
        }
      }
    });

  } catch (error) {
    console.error('Commission analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commission analytics',
      error: error.message
    });
  }
};

// @desc    Reset vendor commission data
// @route   DELETE /api/admin/commissions/vendor/:vendorId/reset
// @access  Private (Admin)
const resetVendorCommission = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { confirmReset } = req.body;

    if (!confirmReset) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required to reset commission data'
      });
    }

    // Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Delete all monthly commission records for this vendor
    const deleteResult = await MonthlyCommission.deleteMany({ vendor: vendorId });

    const results = {
      vendorId,
      vendorName: vendor.businessName,
      deletedCommissionRecords: deleteResult.deletedCount,
      resetDate: new Date()
    };

    res.status(200).json({
      success: true,
      message: 'Vendor commission data reset successfully',
      data: results
    });

  } catch (error) {
    console.error('Reset vendor commission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting vendor commission',
      error: error.message
    });
  }
};

// @desc    Get commission configuration
// @route   GET /api/admin/commissions/config  
// @access  Private (Admin/Vendor)
const getCommissionConfig = async (req, res) => {
  try {
    console.log('🔧 Getting commission configuration...');
    
    // Return the current commission configuration
    res.status(200).json({
      success: true,
      data: {
        vendorCommissionRate: CommissionConfig.VENDOR_COMMISSION_RATE,
        description: 'Current commission rate for vendor orders',
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Commission config error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commission configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getCommissionOverview,
  updateVendorPayment,
  getVendorCommissionDetails,
  processCommissionPayment,
  bulkProcessCommissionPayments,
  getCommissionAnalytics,
  resetVendorCommission,
  getCommissionConfig,
  getCommissionSummary: getCommissionOverview,  // Alias for backward compatibility
  getCommissionSettings: getCommissionConfig,    // Alias for backward compatibility
  updateCommissionSettings: async (req, res) => {
    try {
      const { defaultRate } = req.body;
      
      if (defaultRate !== undefined) {
        CommissionConfig.VENDOR_COMMISSION_RATE = defaultRate / 100; // Convert percentage to decimal
      }

      res.json({
        success: true,
        data: {
          defaultRate: CommissionConfig.VENDOR_COMMISSION_RATE * 100, // Convert decimal to percentage
          updatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Update commission settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating commission settings',
        error: error.message
      });
    }
  }
};
