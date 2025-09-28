const Newsletter = require('../models/Newsletter');
const { validationResult } = require('express-validator');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
const subscribeToNewsletter = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate email format (additional server-side validation)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if email is already subscribed
    const isAlreadySubscribed = await Newsletter.isEmailSubscribed(email);
    if (isAlreadySubscribed) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }

    // Subscribe the email
    const subscription = await Newsletter.subscribeEmail({
      email,
      source: 'website_footer',
      ipAddress,
      userAgent
    });

    console.log(`📧 New newsletter subscription: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter!',
      data: {
        email: subscription.email,
        subscribedAt: subscription.subscribedAt
      }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    if (error.message === 'Email is already subscribed to newsletter') {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter. Please try again.'
    });
  }
};

// @desc    Unsubscribe from newsletter
// @route   POST /api/newsletter/unsubscribe
// @access  Public
const unsubscribeFromNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const unsubscribed = await Newsletter.unsubscribeEmail(email);
    
    if (!unsubscribed) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in newsletter subscriptions'
      });
    }

    console.log(`📧 Newsletter unsubscription: ${email}`);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe. Please try again.'
    });
  }
};

// @desc    Get newsletter statistics
// @route   GET /api/newsletter/stats
// @access  Private (Admin)
const getNewsletterStats = async (req, res) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments({ isActive: true });
    const totalUnsubscribed = await Newsletter.countDocuments({ isActive: false });
    const totalEmails = await Newsletter.countDocuments();

    // Get recent subscriptions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSubscriptions = await Newsletter.countDocuments({
      isActive: true,
      subscribedAt: { $gte: thirtyDaysAgo }
    });

    // Get subscriptions by source
    const subscriptionsBySource = await Newsletter.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalSubscribers,
        totalUnsubscribed,
        totalEmails,
        recentSubscriptions,
        subscriptionsBySource
      }
    });

  } catch (error) {
    console.error('Newsletter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newsletter statistics'
    });
  }
};

// @desc    Get all newsletter subscriptions (Admin)
// @route   GET /api/admin/newsletter/subscriptions
// @access  Private (Admin)
const getNewsletterSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || 'all'; // 'all', 'active', 'inactive'
    const sortBy = req.query.sortBy || 'subscribedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // Add search filter
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }
    
    // Add status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Get total count for pagination
    const totalSubscriptions = await Newsletter.countDocuments(query);
    const totalPages = Math.ceil(totalSubscriptions / limit);

    // Get subscriptions with pagination and sorting
    const subscriptions = await Newsletter.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalSubscriptions,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get newsletter subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newsletter subscriptions'
    });
  }
};

// @desc    Export newsletter subscriptions to CSV
// @route   GET /api/admin/newsletter/export
// @access  Private (Admin)
const exportNewsletterSubscriptions = async (req, res) => {
  try {
    const status = req.query.status || 'active'; // 'all', 'active', 'inactive'
    
    // Build query
    let query = {};
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Get all subscriptions
    const subscriptions = await Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .select('email subscribedAt isActive source ipAddress')
      .lean();

    // Create CSV content
    let csvContent = 'Email,Subscription Date,Status,Source,IP Address\n';
    
    subscriptions.forEach(subscription => {
      const email = subscription.email;
      const date = new Date(subscription.subscribedAt).toLocaleDateString();
      const status = subscription.isActive ? 'Active' : 'Inactive';
      const source = subscription.source || 'website_footer';
      const ip = subscription.ipAddress || 'Unknown';
      
      csvContent += `"${email}","${date}","${status}","${source}","${ip}"\n`;
    });

    // Set response headers for CSV download
    const fileName = `newsletter_subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    console.log(`📧 Newsletter export: ${subscriptions.length} emails exported`);

    res.send(csvContent);

  } catch (error) {
    console.error('Newsletter export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export newsletter subscriptions'
    });
  }
};

// @desc    Delete newsletter subscription (Admin)
// @route   DELETE /api/admin/newsletter/subscriptions/:id
// @access  Private (Admin)
const deleteNewsletterSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Newsletter.findByIdAndDelete(id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter subscription not found'
      });
    }

    console.log(`📧 Newsletter subscription deleted: ${subscription.email}`);

    res.json({
      success: true,
      message: 'Newsletter subscription deleted successfully'
    });

  } catch (error) {
    console.error('Delete newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete newsletter subscription'
    });
  }
};

module.exports = {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterStats,
  getNewsletterSubscriptions,
  exportNewsletterSubscriptions,
  deleteNewsletterSubscription
};