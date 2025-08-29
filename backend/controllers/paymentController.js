// Payment controller for handling payment operations
const jwt = require('jsonwebtoken');

// Mock payments database (in memory for testing)
let mockPayments = [
  {
    _id: 'payment_001',
    transactionId: 'txn_1746456789_abc123',
    amount: 299.99,
    currency: 'USD',
    status: 'completed',
    paymentMethod: 'credit_card',
    processingFee: 9.00,
    netAmount: 290.99,
    userId: 'user_001',
    orderNumber: 'IT-1746456789',
    timestamp: new Date('2025-01-25T10:30:00Z')
  },
  {
    _id: 'payment_002',
    transactionId: 'pp_1746456788_def456',
    amount: 156.50,
    currency: 'USD',
    status: 'completed',
    paymentMethod: 'paypal',
    processingFee: 5.62,
    netAmount: 150.88,
    userId: 'user_001',
    orderNumber: 'IT-1746456788',
    timestamp: new Date('2025-01-24T14:15:00Z')
  }
];

// Mock refunds database
let mockRefunds = [
  {
    _id: 'refund_001',
    refundId: 'ref_1746456787_ghi789',
    originalTransactionId: 'txn_1746456789_abc123',
    amount: 99.99,
    status: 'refunded',
    reason: 'Customer request',
    timestamp: new Date('2025-01-26T09:20:00Z')
  }
];

// Store payment record
const storePayment = async (req, res) => {
  try {
    const {
      transactionId,
      amount,
      currency,
      status,
      paymentMethod,
      processingFee,
      netAmount,
      orderNumber
    } = req.body;

    // Get user from token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mock_secret');
    const userId = decoded.user.id;

    const newPayment = {
      _id: `payment_${Date.now()}`,
      transactionId,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      status,
      paymentMethod,
      processingFee: parseFloat(processingFee),
      netAmount: parseFloat(netAmount),
      userId,
      orderNumber,
      timestamp: new Date()
    };

    mockPayments.push(newPayment);

    res.status(201).json({
      message: 'Payment record stored successfully',
      payment: newPayment
    });
  } catch (error) {
    console.error('Store payment error:', error);
    res.status(500).json({ message: 'Error storing payment record' });
  }
};

// Get payment history for a user
const getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user payments
    const userPayments = mockPayments.filter(payment => payment.userId === userId);

    // Sort by timestamp (newest first)
    userPayments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(userPayments);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
};

// Get all payments (admin only)
const getAllPayments = async (req, res) => {
  try {
    // Sort by timestamp (newest first)
    const sortedPayments = [...mockPayments].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json(sortedPayments);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
};

// Process refund
const processRefund = async (req, res) => {
  try {
    const {
      refundId,
      originalTransactionId,
      amount,
      reason,
      status
    } = req.body;

    // Find original payment
    const originalPayment = mockPayments.find(
      payment => payment.transactionId === originalTransactionId
    );

    if (!originalPayment) {
      return res.status(404).json({ message: 'Original payment not found' });
    }

    // Create refund record
    const newRefund = {
      _id: `refund_${Date.now()}`,
      refundId,
      originalTransactionId,
      amount: parseFloat(amount),
      status,
      reason,
      timestamp: new Date()
    };

    mockRefunds.push(newRefund);

    // Update original payment status if full refund
    if (parseFloat(amount) >= originalPayment.amount) {
      originalPayment.status = 'refunded';
    }

    res.status(201).json({
      message: 'Refund processed successfully',
      refund: newRefund
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Error processing refund' });
  }
};

// Get refund history
const getRefunds = async (req, res) => {
  try {
    // Sort by timestamp (newest first)
    const sortedRefunds = [...mockRefunds].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json(sortedRefunds);
  } catch (error) {
    console.error('Get refunds error:', error);
    res.status(500).json({ message: 'Error fetching refunds' });
  }
};

// Get payment analytics
const getPaymentAnalytics = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // 30days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Filter payments in date range
    const periodPayments = mockPayments.filter(
      payment => new Date(payment.timestamp) >= startDate
    );

    // Calculate analytics
    const totalRevenue = periodPayments.reduce((sum, payment) => 
      payment.status === 'completed' ? sum + payment.amount : sum, 0
    );

    const totalTransactions = periodPayments.filter(
      payment => payment.status === 'completed'
    ).length;

    const averageTransactionValue = totalTransactions > 0 ? 
      totalRevenue / totalTransactions : 0;

    const totalFees = periodPayments.reduce((sum, payment) => 
      payment.status === 'completed' ? sum + payment.processingFee : sum, 0
    );

    // Payment method breakdown
    const paymentMethods = {};
    periodPayments.forEach(payment => {
      if (payment.status === 'completed') {
        paymentMethods[payment.paymentMethod] = 
          (paymentMethods[payment.paymentMethod] || 0) + payment.amount;
      }
    });

    // Failed payments
    const failedPayments = periodPayments.filter(
      payment => payment.status === 'failed'
    ).length;

    const analytics = {
      period,
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      totalFees,
      netRevenue: totalRevenue - totalFees,
      paymentMethods,
      failedPayments,
      successRate: totalTransactions + failedPayments > 0 ? 
        (totalTransactions / (totalTransactions + failedPayments)) * 100 : 100
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({ message: 'Error fetching payment analytics' });
  }
};

module.exports = {
  storePayment,
  getPaymentHistory,
  getAllPayments,
  processRefund,
  getRefunds,
  getPaymentAnalytics
};
