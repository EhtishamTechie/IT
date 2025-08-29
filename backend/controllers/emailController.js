// Email controller for handling email notifications
const jwt = require('jsonwebtoken');

// Mock email database (in memory for testing)
let mockEmails = [
  {
    _id: 'email_001',
    messageId: 'msg_1746456789_abc123',
    to: 'john@example.com',
    from: {
      email: 'noreply@internationaltijarat.com',
      name: 'International Tijarat'
    },
    subject: 'Order Confirmation - IT-1746456789',
    template: 'order_confirmation',
    orderNumber: 'IT-1746456789',
    status: 'delivered',
    timestamp: new Date('2025-01-25T10:35:00Z'),
    readAt: new Date('2025-01-25T11:00:00Z')
  },
  {
    _id: 'email_002',
    messageId: 'msg_1746456788_def456',
    to: 'john@example.com',
    from: {
      email: 'noreply@internationaltijarat.com',
      name: 'International Tijarat'
    },
    subject: 'Welcome to International Tijarat!',
    template: 'welcome',
    status: 'delivered',
    timestamp: new Date('2025-01-20T09:15:00Z'),
    readAt: new Date('2025-01-20T09:45:00Z')
  }
];

// Mock email service configuration
const emailConfig = {
  provider: 'mock', // In real app: 'sendgrid', 'mailgun', 'ses', etc.
  apiKey: process.env.EMAIL_API_KEY || 'mock_api_key',
  fromEmail: process.env.FROM_EMAIL || 'noreply@internationaltijarat.com',
  fromName: process.env.FROM_NAME || 'International Tijarat'
};

// Send email
const sendEmail = async (req, res) => {
  try {
    const {
      to,
      from,
      subject,
      html,
      text,
      template,
      orderNumber,
      status
    } = req.body;

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create email record
    const newEmail = {
      _id: `email_${Date.now()}`,
      messageId,
      to,
      from: from || {
        email: emailConfig.fromEmail,
        name: emailConfig.fromName
      },
      subject,
      html,
      text,
      template,
      orderNumber,
      status: status || 'sent',
      timestamp: new Date()
    };

    // Simulate delivery (90% success rate)
    const delivered = Math.random() > 0.1;
    newEmail.status = delivered ? 'delivered' : 'failed';

    if (!delivered) {
      newEmail.error = 'Delivery failed - Invalid email address';
    }

    mockEmails.push(newEmail);

    // Log email sending (for development)
    console.log(`📧 Email ${delivered ? 'sent' : 'failed'}: ${subject} to ${to}`);

    res.status(201).json({
      success: delivered,
      messageId,
      status: newEmail.status,
      timestamp: newEmail.timestamp,
      error: newEmail.error
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending email',
      error: error.message 
    });
  }
};

// Get email history for a user
const getEmailHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // In a real app, you'd get user email from user ID
    // For mock, we'll return all emails for demo
    const userEmails = mockEmails.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json(userEmails);
  } catch (error) {
    console.error('Get email history error:', error);
    res.status(500).json({ message: 'Error fetching email history' });
  }
};

// Get all emails (admin only)
const getAllEmails = async (req, res) => {
  try {
    const { template, status, limit = 50 } = req.query;

    let filteredEmails = [...mockEmails];

    // Filter by template
    if (template) {
      filteredEmails = filteredEmails.filter(email => email.template === template);
    }

    // Filter by status
    if (status) {
      filteredEmails = filteredEmails.filter(email => email.status === status);
    }

    // Sort by timestamp (newest first)
    filteredEmails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    filteredEmails = filteredEmails.slice(0, parseInt(limit));

    res.json(filteredEmails);
  } catch (error) {
    console.error('Get all emails error:', error);
    res.status(500).json({ message: 'Error fetching emails' });
  }
};

// Mark email as read
const markEmailAsRead = async (req, res) => {
  try {
    const { emailId } = req.params;

    const email = mockEmails.find(e => e._id === emailId);
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }

    email.readAt = new Date();

    res.json({
      message: 'Email marked as read',
      readAt: email.readAt
    });
  } catch (error) {
    console.error('Mark email as read error:', error);
    res.status(500).json({ message: 'Error marking email as read' });
  }
};

// Get email analytics
const getEmailAnalytics = async (req, res) => {
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

    // Filter emails in date range
    const periodEmails = mockEmails.filter(
      email => new Date(email.timestamp) >= startDate
    );

    // Calculate analytics
    const totalSent = periodEmails.length;
    const delivered = periodEmails.filter(e => e.status === 'delivered').length;
    const failed = periodEmails.filter(e => e.status === 'failed').length;
    const opened = periodEmails.filter(e => e.readAt).length;

    // Template breakdown
    const templateStats = {};
    periodEmails.forEach(email => {
      if (!templateStats[email.template]) {
        templateStats[email.template] = {
          sent: 0,
          delivered: 0,
          opened: 0,
          deliveryRate: 0,
          openRate: 0
        };
      }
      
      templateStats[email.template].sent++;
      if (email.status === 'delivered') {
        templateStats[email.template].delivered++;
      }
      if (email.readAt) {
        templateStats[email.template].opened++;
      }
    });

    // Calculate rates for each template
    Object.keys(templateStats).forEach(template => {
      const stats = templateStats[template];
      stats.deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
      stats.openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
    });

    const analytics = {
      period,
      totalSent,
      delivered,
      failed,
      opened,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      templateStats
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get email analytics error:', error);
    res.status(500).json({ message: 'Error fetching email analytics' });
  }
};

// Resend email
const resendEmail = async (req, res) => {
  try {
    const { emailId } = req.params;

    const originalEmail = mockEmails.find(e => e._id === emailId);
    if (!originalEmail) {
      return res.status(404).json({ message: 'Original email not found' });
    }

    // Create new email record for resend
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const resendEmail = {
      ...originalEmail,
      _id: `email_${Date.now()}`,
      messageId,
      status: 'sent',
      timestamp: new Date(),
      resendOf: originalEmail._id
    };

    // Simulate delivery
    const delivered = Math.random() > 0.1;
    resendEmail.status = delivered ? 'delivered' : 'failed';

    mockEmails.push(resendEmail);

    res.json({
      success: delivered,
      messageId,
      status: resendEmail.status,
      timestamp: resendEmail.timestamp
    });
  } catch (error) {
    console.error('Resend email error:', error);
    res.status(500).json({ message: 'Error resending email' });
  }
};

module.exports = {
  sendEmail,
  getEmailHistory,
  getAllEmails,
  markEmailAsRead,
  getEmailAnalytics,
  resendEmail
};
