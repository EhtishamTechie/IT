const Commission = require('../models/Commission');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const CommissionConfig = require('../config/commission');

class CommissionService {
  /**
   * Calculate and create commission records when an order is completed
   * @param {Object} order - The completed order object
   */
  static async calculateOrderCommissions(order) {
    try {
      console.log(`[COMMISSION] Processing commissions for order ${order.orderNumber}`);
      
      // Group cart items by vendor
      const vendorItems = new Map();
      
      for (const item of order.cart) {
        if (item.vendor) {
          const vendorId = item.vendor.toString();
          if (!vendorItems.has(vendorId)) {
            vendorItems.set(vendorId, []);
          }
          vendorItems.get(vendorId).push(item);
        }
      }

      const commissionRecords = [];

      // Create commission records for each vendor
      for (const [vendorId, items] of vendorItems) {
        try {
          const vendor = await Vendor.findById(vendorId);
          if (!vendor) {
            console.warn(`[COMMISSION] Vendor ${vendorId} not found, skipping commission`);
            continue;
          }

          // Calculate vendor subtotal
          const vendorSubtotal = items.reduce((sum, item) => sum + item.total, 0);
          
          // Get commission rate from global config or vendor settings
          const commissionRate = vendor.settings?.commissionRate || CommissionConfig.COMMISSION_PERCENTAGE;
          const commissionAmount = (vendorSubtotal * commissionRate) / 100;
          const vendorEarnings = vendorSubtotal - commissionAmount;

          // Create commission record
          const commission = new Commission({
            vendor: vendorId,
            order: order._id,
            period: {
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              week: this.getWeekOfYear(new Date())
            },
            orderNumber: order.orderNumber,
            products: items.map(item => ({
              product: item.productId,
              productName: item.title,
              quantity: item.quantity,
              price: item.price,
              total: item.total
            })),
            amounts: {
              orderTotal: vendorSubtotal,
              commissionRate: commissionRate,
              commissionAmount: commissionAmount,
              vendorEarnings: vendorEarnings,
              taxes: 0, // Can be calculated based on vendor location
              adjustments: 0
            },
            status: 'pending',
            paymentStatus: 'pending',
            calculatedAt: new Date(),
            customer: {
              name: order.customerInfo?.name || order.name,
              email: order.customerInfo?.email || order.email
            }
          });

          await commission.save();
          commissionRecords.push(commission);

          // Update vendor statistics
          await this.updateVendorStats(vendorId, {
            orderAmount: vendorSubtotal,
            commissionAmount: commissionAmount,
            earnings: vendorEarnings
          });

          console.log(`[COMMISSION] Created commission record for vendor ${vendor.businessName}: $${vendorEarnings.toFixed(2)}`);

        } catch (vendorError) {
          console.error(`[COMMISSION] Error processing vendor ${vendorId}:`, vendorError);
        }
      }

      return {
        success: true,
        commissions: commissionRecords,
        message: `Created ${commissionRecords.length} commission records`
      };

    } catch (error) {
      console.error('[COMMISSION] Error calculating order commissions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update vendor statistics after commission calculation
   * @param {String} vendorId - Vendor ID
   * @param {Object} amounts - Amount details
   */
  static async updateVendorStats(vendorId, amounts) {
    try {
      await Vendor.findByIdAndUpdate(vendorId, {
        $inc: {
          'stats.totalRevenue': amounts.orderAmount,
          'stats.totalCommission': amounts.commissionAmount,
          'stats.totalOrders': 1
        },
        'stats.lastOrderDate': new Date()
      });
    } catch (error) {
      console.error(`[COMMISSION] Error updating vendor stats for ${vendorId}:`, error);
    }
  }

  /**
   * Get week number of the year
   * @param {Date} date - Date object
   * @returns {Number} Week number
   */
  static getWeekOfYear(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Process commission when order status changes to delivered
   * @param {String} orderId - Order ID
   */
  static async processDeliveredOrder(orderId) {
    try {
      const order = await Order.findById(orderId).populate('cart.vendor');
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Only process if order is delivered and not already processed
      if (order.status === 'Delivered') {
        const existingCommissions = await Commission.find({ order: orderId });
        if (existingCommissions.length === 0) {
          return await this.calculateOrderCommissions(order);
        } else {
          // Update commission status to confirmed
          await Commission.updateMany(
            { order: orderId },
            { 
              status: 'confirmed',
              confirmedAt: new Date()
            }
          );
          return { success: true, message: 'Commission status updated to confirmed' };
        }
      }

      return { success: true, message: 'Order not eligible for commission processing' };
    } catch (error) {
      console.error('[COMMISSION] Error processing delivered order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate commission amount from order total using vendor's individual rate
   * @param {number} orderAmount - Total order amount
   * @param {ObjectId} vendorId - Vendor ID to get commission rate
   * @returns {number} Commission amount (rounded to 2 decimal places)
   */
  static async calculateCommission(orderAmount, vendorId = null) {
    if (!orderAmount || orderAmount <= 0) return 0;
    
    let commissionRate = CommissionConfig.VENDOR_COMMISSION_RATE; // Use dynamic rate from config 
    
    // If vendorId provided, get their specific commission rate
    if (vendorId) {
      try {
        const Vendor = require('../models/Vendor');
        const vendor = await Vendor.findById(vendorId).select('settings.commissionRate');
        if (vendor && vendor.settings && vendor.settings.commissionRate !== undefined) {
          commissionRate = vendor.settings.commissionRate / 100; // Convert percentage to decimal
        }
      } catch (error) {
        console.warn('Warning: Could not fetch vendor commission rate, using default:', error.message);
      }
    }
    
    return Math.round(orderAmount * commissionRate * 100) / 100;
  }
  
  /**
   * Calculate vendor amount after commission deduction
   * @param {number} orderAmount - Total order amount
   * @param {ObjectId} vendorId - Vendor ID to get commission rate
   * @returns {number} Amount vendor receives after commission
   */
  static async calculateVendorAmount(orderAmount, vendorId = null) {
    if (!orderAmount || orderAmount <= 0) return 0;
    const commission = await this.calculateCommission(orderAmount, vendorId);
    return Math.round((orderAmount - commission) * 100) / 100;
  }

  /**
   * Update monthly commission tracking when order is completed
   * @param {string} vendorId - Vendor ObjectId
   * @param {string} vendorOrderId - VendorOrder ObjectId
   * @param {number} amount - Order total amount
   * @returns {Object} Updated MonthlyCommission document
   */
  static async updateMonthlyCommission(vendorId, vendorOrderId, amount) {
    try {
      const MonthlyCommission = require('../models/MonthlyCommission');
      
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      
      const commissionAmount = this.calculateCommission(amount);
      
      console.log(`💰 Adding commission tracking: Vendor ${vendorId}, Amount: $${amount}, Commission: $${commissionAmount}`);
      
      const monthlyCommission = await MonthlyCommission.findOneAndUpdate(
        { vendor: vendorId, month, year },
        {
          $addToSet: { orders: vendorOrderId },
          $inc: {
            totalCommission: commissionAmount,
            totalRevenue: amount,
            totalOrders: 1,
            pendingToAdmin: commissionAmount
          }
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Monthly commission updated for ${month}/${year}`);
      return monthlyCommission;
    } catch (error) {
      console.error('❌ Error updating monthly commission:', error);
      throw error;
    }
  }

  /**
   * Remove commission tracking when order is cancelled/rejected
   * @param {string} vendorId - Vendor ObjectId
   * @param {string} vendorOrderId - VendorOrder ObjectId
   * @param {number} amount - Order total amount
   * @param {Date} orderDate - Original order creation date
   */
  static async removeFromMonthlyCommission(vendorId, vendorOrderId, amount, orderDate = new Date()) {
    try {
      const MonthlyCommission = require('../models/MonthlyCommission');
      
      const month = orderDate.getMonth() + 1;
      const year = orderDate.getFullYear();
      
      const commissionAmount = this.calculateCommission(amount);
      
      console.log(`💸 Removing commission tracking: Vendor ${vendorId}, Amount: $${amount}, Commission: $${commissionAmount}`);
      
      await MonthlyCommission.findOneAndUpdate(
        { vendor: vendorId, month, year },
        {
          $pull: { orders: vendorOrderId },
          $inc: {
            totalCommission: -commissionAmount,
            totalRevenue: -amount,
            totalOrders: -1,
            pendingToAdmin: -commissionAmount
          }
        }
      );
      
      console.log(`✅ Commission removed from ${month}/${year}`);
    } catch (error) {
      console.error('❌ Error removing commission:', error);
      throw error;
    }
  }

  /**
   * Get commission summary for vendor
   * @param {string} vendorId - Vendor ObjectId
   * @param {string} period - Period filter (month|90days|year)
   * @returns {Object} Commission summary
   */
  static async getVendorCommissionSummary(vendorId, period = 'month') {
    try {
      const MonthlyCommission = require('../models/MonthlyCommission');
      
      let dateFilter = {};
      const now = new Date();
      
      switch (period) {
        case 'month':
          dateFilter = {
            month: now.getMonth() + 1,
            year: now.getFullYear()
          };
          break;
        case '90days':
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          dateFilter = {
            $or: [
              { year: { $gt: threeMonthsAgo.getFullYear() } },
              { 
                year: threeMonthsAgo.getFullYear(),
                month: { $gte: threeMonthsAgo.getMonth() + 1 }
              }
            ]
          };
          break;
        case 'year':
          dateFilter = { year: now.getFullYear() };
          break;
      }
      
      const commissions = await MonthlyCommission.find({
        vendor: vendorId,
        ...dateFilter
      });
      
      const summary = commissions.reduce((acc, comm) => ({
        totalCommission: acc.totalCommission + (comm.totalCommission || 0),
        totalPaidToAdmin: acc.totalPaidToAdmin + (comm.paidToAdmin || 0),
        pendingAmountToAdmin: acc.pendingAmountToAdmin + (comm.pendingToAdmin || 0),
        totalRevenue: acc.totalRevenue + (comm.totalRevenue || 0),
        totalOrders: acc.totalOrders + (comm.totalOrders || 0)
      }), { 
        totalCommission: 0, 
        totalPaidToAdmin: 0, 
        pendingAmountToAdmin: 0,
        totalRevenue: 0,
        totalOrders: 0
      });
      
      return summary;
    } catch (error) {
      console.error('❌ Error getting commission summary:', error);
      throw error;
    }
  }

  /**
   * Get monthly commission breakdown for vendor
   * @param {string} vendorId - Vendor ObjectId
   * @param {string} period - Period filter (month|90days|year)
   * @returns {Array} Monthly commission reports
   */
  static async getVendorMonthlyReports(vendorId, period = 'month', page = 1, limit = 12) {
    try {
      const MonthlyCommission = require('../models/MonthlyCommission');
      
      let dateFilter = {};
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Determine date range based on period
      switch (period) {
        case 'month':
          dateFilter = {
            month: currentMonth,
            year: currentYear
          };
          break;
        case '90days':
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          dateFilter = {
            $or: [
              { year: { $gt: threeMonthsAgo.getFullYear() } },
              { 
                year: threeMonthsAgo.getFullYear(),
                month: { $gte: threeMonthsAgo.getMonth() + 1 }
              }
            ]
          };
          break;
        case 'year':
          // For year filter, get all historical data to show pagination
          dateFilter = {};
          break;
      }
      
      // Get total count for pagination
      const totalReports = await MonthlyCommission.countDocuments({
        vendor: vendorId,
        ...dateFilter
      });
      
      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(totalReports / limitNum);
      
      // Get commission records with pagination, sorted by current month first
      let commissions = await MonthlyCommission.find({
        vendor: vendorId,
        ...dateFilter
      });
      
      // Custom sort: current month first, then by year/month descending
      commissions.sort((a, b) => {
        const aIsCurrent = (a.month === currentMonth && a.year === currentYear);
        const bIsCurrent = (b.month === currentMonth && b.year === currentYear);
        
        // Current month always comes first
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
        
        // If both are current or both are not current, sort by year/month desc
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      // Apply pagination manually after sorting
      const paginatedCommissions = commissions.slice(skip, skip + limitNum);
      
      const reports = paginatedCommissions.map(comm => {
        const isCurrentMonth = comm.month === currentMonth && comm.year === currentYear;
        const isCompletedMonth = comm.year < currentYear || (comm.year === currentYear && comm.month < currentMonth);
        const pendingToAdmin = Math.max(0, (comm.totalCommission || 0) - (comm.paidToAdmin || 0));
        
        return {
          month: comm.month,
          year: comm.year,
          monthName: new Date(comm.year, comm.month - 1, 1).toLocaleString('default', { month: 'long' }),
          totalCommission: comm.totalCommission || 0,
          paidToAdmin: comm.paidToAdmin || 0,
          totalOrders: comm.totalOrders || 0,
          pendingAmountToAdmin: pendingToAdmin,
          isCompleted: isCompletedMonth,
          status: isCurrentMonth ? 'current' : 
                  isCompletedMonth ? 
                    (pendingToAdmin > 0 ? 'pending' : 'completed') : 
                    'current',
          paymentStatus: comm.paymentStatus || 'pending',
          paymentHistory: comm.paymentHistory || []
        };
      });
      
      return {
        monthlyCommissions: reports,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalReports: totalReports,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      };
    } catch (error) {
      console.error('❌ Error getting monthly reports:', error);
      throw error;
    }
  }

  /**
   * Record commission payment from vendor to admin
   * @param {string} vendorId - Vendor ObjectId
   * @param {number} month - Payment month (1-12)
   * @param {number} year - Payment year
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {string} notes - Payment notes
   * @param {string} updatedBy - Admin user ID
   */
  static async recordPayment(vendorId, month, year, amount, method, notes, updatedBy) {
    try {
      const MonthlyCommission = require('../models/MonthlyCommission');
      
      console.log(`💳 Recording payment: Vendor ${vendorId}, ${month}/${year}, Amount: $${amount}`);
      
      const monthlyCommission = await MonthlyCommission.findOne({
        vendor: vendorId, 
        month, 
        year 
      });
      
      if (!monthlyCommission) {
        throw new Error(`No commission record found for ${month}/${year}`);
      }
      
      // Add to payment history
      monthlyCommission.paymentHistory.push({
        amount,
        paidAt: new Date(),
        method,
        notes,
        updatedBy
      });
      
      // Update payment amounts
      monthlyCommission.paidToAdmin += amount;
      monthlyCommission.pendingToAdmin = Math.max(0, monthlyCommission.totalCommission - monthlyCommission.paidToAdmin);
      
      // Update payment status
      if (monthlyCommission.pendingToAdmin === 0) {
        monthlyCommission.paymentStatus = 'completed';
        monthlyCommission.isCompleted = true;
      } else if (monthlyCommission.paidToAdmin > 0) {
        monthlyCommission.paymentStatus = 'partial';
      }
      
      await monthlyCommission.save();
      
      console.log(`✅ Payment recorded successfully`);
      return monthlyCommission;
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      throw error;
    }
  }
}

module.exports = CommissionService;
