const Property = require('../models/Property');
const User = require('../models/User');
const { getImageUrl } = require('../config/serverConfig');

const normalizePropertyData = (property) => {
  const normalized = property.toObject ? property.toObject() : { ...property };
  
  if (normalized.images && Array.isArray(normalized.images)) {
    normalized.images = normalized.images.map(img => getImageUrl('properties', img));
  }
  
  return normalized;
};

// Get all properties for admin review
const getAllProperties = async (req, res) => {
  try {
    console.log('📋 Admin Properties Request:', {
      query: req.query,
      user: req.user
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.propertyType && req.query.propertyType !== 'all') {
      filter.propertyType = req.query.propertyType;
    }

    if (req.query.city && req.query.city !== 'all') {
      filter.city = new RegExp(req.query.city, 'i');
    }

    if (req.query.search) {
      filter.$or = [
        { title: new RegExp(req.query.search, 'i') },
        { address: new RegExp(req.query.search, 'i') },
        { propertyId: new RegExp(req.query.search, 'i') }
      ];
    }

    console.log('🔍 Property Filter:', filter);

    const properties = await Property.find(filter)
      .populate('submittedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log('📊 Properties Found:', properties.length);

    const total = await Property.countDocuments(filter);

    // Get statistics
    const stats = await Property.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$price' }
        }
      }
    ]);

    const statistics = {
      total: total,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      approved: stats.find(s => s._id === 'approved')?.count || 0,
      rejected: stats.find(s => s._id === 'rejected')?.count || 0,
      sold: stats.find(s => s._id === 'sold')?.count || 0,
      totalValue: stats.reduce((sum, s) => sum + (s.totalValue || 0), 0)
    };

    // Normalize property data including image URLs
    const normalizedProperties = properties.map(prop => normalizePropertyData(prop));

    res.json({
      success: true,
      properties: normalizedProperties,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      },
      statistics
    });

  } catch (error) {
    console.error('Error fetching properties for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties'
    });
  }
};

// Get property details for admin review
const getPropertyForReview = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id)
      .populate('submittedBy', 'firstName lastName email phone createdAt')
      .lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      property: property  // Changed from 'data' to 'property' to match frontend expectation
    });

  } catch (error) {
    console.error('Error fetching property for review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property details'
    });
  }
};

// Approve property
const approveProperty = async (req, res) => {
  try {
    console.log('🟢 Approve property request received');
    console.log('📝 Request params:', req.params);
    console.log('👤 Request user:', req.user);
    console.log('📄 Request body:', req.body);
    
    const { id } = req.params;
    const adminId = req.user.userId; // Fixed: using req.user instead of req.admin

    const property = await Property.findById(id);

    if (!property) {
      console.log('❌ Property not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.status !== 'pending') {
      console.log('❌ Property status is not pending:', property.status);
      return res.status(400).json({
        success: false,
        message: 'Property is not in pending status'
      });
    }

    console.log('✅ Property found, updating status...');
    property.status = 'approved';
    property.approvedBy = adminId;
    property.approvedAt = new Date();
    property.adminNotes = (req.body && req.body.notes) ? req.body.notes : 'Property approved by admin';

    await property.save();
    console.log('✅ Property approved successfully');

    // TODO: Send approval email to property owner
    // await sendPropertyApprovalEmail(property);

    res.json({
      success: true,
      message: 'Property approved successfully',
      data: {
        id: property._id,
        propertyId: property.propertyId,
        status: property.status
      }
    });

  } catch (error) {
    console.error('Error approving property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve property'
    });
  }
};

// Reject property
const rejectProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user.userId; // Fixed: using req.user instead of req.admin

    if (!adminNotes || adminNotes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for rejection'
      });
    }

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Property is not in pending status'
      });
    }

    property.status = 'rejected';
    property.adminNotes = adminNotes.trim();
    property.approvedBy = adminId;
    property.approvedAt = new Date();

    await property.save();

    // TODO: Send rejection email to property owner
    // await sendPropertyRejectionEmail(property, adminNotes);

    res.json({
      success: true,
      message: 'Property rejected successfully',
      data: {
        id: property._id,
        propertyId: property.propertyId,
        status: property.status
      }
    });

  } catch (error) {
    console.error('Error rejecting property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject property'
    });
  }
};

// Update property status (general)
const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user.userId; // Fixed: using req.user instead of req.admin

    const validStatuses = ['pending', 'approved', 'rejected', 'sold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const oldStatus = property.status;
    property.status = status;
    property.adminNotes = notes || property.adminNotes;
    
    if (status === 'approved' && oldStatus !== 'approved') {
      property.approvedBy = adminId;
      property.approvedAt = new Date();
    }

    await property.save();

    res.json({
      success: true,
      message: `Property status updated to ${status} successfully`,
      data: {
        id: property._id,
        propertyId: property.propertyId,
        status: property.status,
        oldStatus
      }
    });

  } catch (error) {
    console.error('Error updating property status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property status'
    });
  }
};

// Delete property (admin only)
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // TODO: Delete associated images from filesystem
    // property.images.forEach(imageUrl => {
    //   const filename = path.basename(imageUrl);
    //   const filePath = path.join(__dirname, '../uploads/properties/', filename);
    //   if (fs.existsSync(filePath)) {
    //     fs.unlinkSync(filePath);
    //   }
    // });

    await Property.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property'
    });
  }
};

// Get property statistics for dashboard
const getPropertyStatistics = async (req, res) => {
  try {
    const totalProperties = await Property.countDocuments();
    const pendingProperties = await Property.countDocuments({ status: 'pending' });
    const approvedProperties = await Property.countDocuments({ status: 'approved' });
    const rejectedProperties = await Property.countDocuments({ status: 'rejected' });
    const soldProperties = await Property.countDocuments({ status: 'sold' });

    // Monthly statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlySubmissions = await Property.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const monthlyApprovals = await Property.countDocuments({
      status: 'approved',
      approvedAt: { $gte: thirtyDaysAgo }
    });

    // Property type distribution
    const typeDistribution = await Property.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$propertyType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // City distribution
    const cityDistribution = await Property.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Average property value
    const valueStats = await Property.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: null,
          averagePrice: { $avg: '$price' },
          totalValue: { $sum: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalProperties,
          pending: pendingProperties,
          approved: approvedProperties,
          rejected: rejectedProperties,
          sold: soldProperties
        },
        monthly: {
          submissions: monthlySubmissions,
          approvals: monthlyApprovals
        },
        distribution: {
          byType: typeDistribution,
          byCity: cityDistribution
        },
        values: valueStats[0] || {
          averagePrice: 0,
          totalValue: 0,
          minPrice: 0,
          maxPrice: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching property statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property statistics'
    });
  }
};

module.exports = {
  getAllProperties,
  getPropertyForReview,
  approveProperty,
  rejectProperty,
  updatePropertyStatus,
  deleteProperty,
  getPropertyStatistics
};
