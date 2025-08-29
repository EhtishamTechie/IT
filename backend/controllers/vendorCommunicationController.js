const CustomerInquiry = require('../models/CustomerInquiry');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// @desc    Get vendor inquiries
// @route   GET /api/vendors/inquiries
// @access  Private (Vendor)
const getVendorInquiries = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      category,
      search,
      sortBy = 'lastActivityAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { vendor: vendorId };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { subject: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { customerEmail: new RegExp(search, 'i') },
        { inquiryId: new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        {
          path: 'customer',
          select: 'firstName lastName email'
        },
        {
          path: 'relatedProduct',
          select: 'name images sku'
        },
        {
          path: 'relatedOrder',
          select: 'orderNumber status'
        }
      ]
    };

    const inquiries = await CustomerInquiry.paginate(query, options);

    res.json({
      success: true,
      data: {
        inquiries: inquiries.docs,
        pagination: {
          page: inquiries.page,
          pages: inquiries.totalPages,
          total: inquiries.totalDocs,
          limit: inquiries.limit
        }
      }
    });

  } catch (error) {
    console.error('Get vendor inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiries',
      error: error.message
    });
  }
};

// @desc    Get single inquiry
// @route   GET /api/vendors/inquiries/:id
// @access  Private (Vendor)
const getInquiry = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const inquiryId = req.params.id;

    const inquiry = await CustomerInquiry.findOne({
      _id: inquiryId,
      vendor: vendorId
    }).populate([
      {
        path: 'customer',
        select: 'firstName lastName email phone'
      },
      {
        path: 'relatedProduct',
        select: 'name images sku price'
      },
      {
        path: 'relatedOrder',
        select: 'orderNumber status items createdAt'
      },
      {
        path: 'assignedTo',
        select: 'firstName lastName email'
      }
    ]);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Mark customer messages as read
    await inquiry.markAsRead('vendor');

    res.json({
      success: true,
      data: inquiry
    });

  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry',
      error: error.message
    });
  }
};

// @desc    Create new inquiry (from customer)
// @route   POST /api/vendors/inquiries
// @access  Public
const createInquiry = async (req, res) => {
  try {
    const {
      vendorId,
      customerEmail,
      customerName,
      customerPhone,
      subject,
      category,
      message,
      relatedProductId,
      relatedOrderId,
      priority = 'medium'
    } = req.body;

    // Validate vendor exists
    const vendorExists = await mongoose.model('Vendor').findById(vendorId);
    if (!vendorExists) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Create inquiry
    const inquiry = new CustomerInquiry({
      vendor: vendorId,
      customerEmail,
      customerName,
      customerPhone,
      subject,
      category,
      priority,
      relatedProduct: relatedProductId,
      relatedOrder: relatedOrderId,
      customer: req.user?.id // Will be null for guest inquiries
    });

    // Add initial message
    await inquiry.addMessage({
      sender: 'customer',
      senderName: customerName,
      content: message
    });

    await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Inquiry created successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating inquiry',
      error: error.message
    });
  }
};

// @desc    Reply to inquiry
// @route   POST /api/vendors/inquiries/:id/reply
// @access  Private (Vendor)
const replyToInquiry = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const inquiryId = req.params.id;
    const { message, attachments = [] } = req.body;

    const inquiry = await CustomerInquiry.findOne({
      _id: inquiryId,
      vendor: vendorId
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Add vendor reply
    await inquiry.addMessage({
      sender: 'vendor',
      senderName: req.vendor.businessName,
      content: message,
      attachments
    });

    // Update status if it was waiting for vendor response
    if (inquiry.status === 'open') {
      inquiry.status = 'in_progress';
      await inquiry.save();
    }

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Reply to inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reply',
      error: error.message
    });
  }
};

// @desc    Update inquiry status
// @route   PUT /api/vendors/inquiries/:id/status
// @access  Private (Vendor)
const updateInquiryStatus = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const inquiryId = req.params.id;
    const { status, resolution } = req.body;

    const inquiry = await CustomerInquiry.findOne({
      _id: inquiryId,
      vendor: vendorId
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Update status
    await inquiry.updateStatus(status, req.vendor.id);

    // Add resolution summary if provided
    if (resolution && (status === 'resolved' || status === 'closed')) {
      inquiry.resolution.summary = resolution;
      await inquiry.save();
    }

    res.json({
      success: true,
      message: 'Inquiry status updated successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inquiry status',
      error: error.message
    });
  }
};

// @desc    Assign inquiry
// @route   PUT /api/vendors/inquiries/:id/assign
// @access  Private (Vendor)
const assignInquiry = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const inquiryId = req.params.id;
    const { assignedTo } = req.body;

    const inquiry = await CustomerInquiry.findOne({
      _id: inquiryId,
      vendor: vendorId
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    await inquiry.assignTo(assignedTo);

    res.json({
      success: true,
      message: 'Inquiry assigned successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Assign inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning inquiry',
      error: error.message
    });
  }
};

// @desc    Add internal note
// @route   POST /api/vendors/inquiries/:id/notes
// @access  Private (Vendor)
const addInternalNote = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const inquiryId = req.params.id;
    const { note } = req.body;

    const inquiry = await CustomerInquiry.findOne({
      _id: inquiryId,
      vendor: vendorId
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    await inquiry.addInternalNote(note, req.vendor.id);

    res.json({
      success: true,
      message: 'Internal note added successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Add internal note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding internal note',
      error: error.message
    });
  }
};

// @desc    Get inquiry statistics
// @route   GET /api/vendors/inquiries/stats
// @access  Private (Vendor)
const getInquiryStats = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { timeRange = '30' } = req.query;

    const stats = await CustomerInquiry.getVendorStats(vendorId, parseInt(timeRange));

    // Get category breakdown
    const categoryStats = await CustomerInquiry.aggregate([
      {
        $match: {
          vendor: mongoose.Types.ObjectId(vendorId),
          createdAt: {
            $gte: new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get daily inquiry counts
    const dailyStats = await CustomerInquiry.aggregate([
      {
        $match: {
          vendor: mongoose.Types.ObjectId(vendorId),
          createdAt: {
            $gte: new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats,
        categoryBreakdown: categoryStats,
        dailyTrends: dailyStats
      }
    });

  } catch (error) {
    console.error('Get inquiry stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry statistics',
      error: error.message
    });
  }
};

// @desc    Bulk update inquiries
// @route   PUT /api/vendors/inquiries/bulk
// @access  Private (Vendor)
const bulkUpdateInquiries = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { inquiryIds, action, value } = req.body;

    if (!inquiryIds || !Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry IDs array is required'
      });
    }

    const updateQuery = { vendor: vendorId, _id: { $in: inquiryIds } };
    let updateData = {};

    switch (action) {
      case 'status':
        updateData.status = value;
        break;
      case 'priority':
        updateData.priority = value;
        break;
      case 'assign':
        updateData.assignedTo = value;
        updateData.assignedAt = new Date();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    const result = await CustomerInquiry.updateMany(updateQuery, updateData);

    res.json({
      success: true,
      message: `${result.modifiedCount} inquiries updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Bulk update inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inquiries',
      error: error.message
    });
  }
};

module.exports = {
  getVendorInquiries,
  getInquiry,
  createInquiry,
  replyToInquiry,
  updateInquiryStatus,
  assignInquiry,
  addInternalNote,
  getInquiryStats,
  bulkUpdateInquiries
};
