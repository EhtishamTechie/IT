const Vendor = require('../models/Vendor');
const VendorApplication = require('../models/VendorApplication');
const Product = require('../models/Product');
const Commission = require('../models/Commission');
const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all vendor applications
// @route   GET /api/admin/vendor-applications
// @access  Private (Admin)
const getVendorApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy = 'applicationDate', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { businessName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { applicationId: new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const applications = await VendorApplication.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('reviewedBy', 'name email');

    const total = await VendorApplication.countDocuments(query);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalApplications: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get vendor applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor applications',
      error: error.message
    });
  }
};

// @desc    Get single vendor application
// @route   GET /api/admin/vendor-applications/:id
// @access  Private (Admin)
const getVendorApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;

    const application = await VendorApplication.findById(applicationId)
      .populate('reviewedBy', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Vendor application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Get vendor application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor application',
      error: error.message
    });
  }
};

// @desc    Approve vendor application
// @route   POST /api/admin/vendor-applications/:id/approve
// @access  Private (Admin)
const approveVendorApplication = async (req, res) => {
  try {
    console.log('🔍 Approve vendor application - req.user:', req.user);
    console.log('🔍 Approve vendor application - req.user.id:', req.user?.id);
    console.log('🔍 Approve vendor application - req.user.userId:', req.user?.userId);
    
    const applicationId = req.params.id;
    const adminId = req.user?.id || req.user?.userId;
    const { notes, password } = req.body;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required - admin ID not found'
      });
    }

    console.log('🔍 Searching for application with ID:', applicationId);

    // Get the application
    const application = await VendorApplication.findById(applicationId);
    console.log('🔍 Application found:', application ? 'YES' : 'NO');
    if (!application) {
      console.log('❌ Application not found');
      return res.status(404).json({
        success: false,
        message: 'Vendor application not found'
      });
    }

    console.log('🔍 Application status:', application.status);
    console.log('🔍 Application data:', {
      businessName: application.businessName,
      email: application.email,
      status: application.status
    });

    if (application.status !== 'pending' && application.status !== 'under_review' && application.status !== 'submitted') {
      console.log('❌ Application already processed');
      return res.status(400).json({
        success: false,
        message: 'Application has already been processed'
      });
    }

    console.log('🔍 Checking for existing vendor with email:', application.email);
    // Check if vendor account with this email already exists
    const existingVendor = await Vendor.findOne({ email: application.email });
    console.log('🔍 Existing vendor found:', existingVendor ? 'YES' : 'NO');
    if (existingVendor) {
      console.log('❌ Vendor already exists');
      return res.status(400).json({
        success: false,
        message: 'A vendor account with this email already exists'
      });
    }

    // Create vendor account
    const tempPassword = password || 'VendorPass123'; // Store temporarily for admin display
    const vendorData = {
      email: application.email,
      password: tempPassword,
      businessName: application.businessName,
      businessType: application.businessType,
      description: application.description,
      contactPerson: application.contactPerson,
      address: application.address,
      documents: {
        businessLicense: application.documents?.businessLicense?.path || '',
        taxId: application.taxId || '',
        bankStatement: application.documents?.bankStatement?.path || ''
      },
      categories: application.intendedCategories || application.categories || [],
      verificationStatus: 'approved',
      verifiedAt: new Date(),
      verifiedBy: adminId,
      verificationNotes: notes || 'Application approved by admin',
      // Store temp password for admin view (this will be cleared after first login)
      tempPasswordForAdmin: tempPassword
    };

    console.log('🔍 Creating vendor with data:', JSON.stringify(vendorData, null, 2));

    const vendor = new Vendor(vendorData);
    console.log('🔍 Vendor object created, attempting to save...');
    await vendor.save();
    console.log('✅ Vendor saved successfully with ID:', vendor._id);

    // Update application status
    application.status = 'approved';
    application.reviewedAt = new Date();
    application.reviewedBy = adminId;
    application.notes = notes || 'Application approved';
    application.vendorAccount = vendor._id;
    await application.save();

    console.log('✅ Application updated successfully');

    // Send approval notification email to vendor
    try {
      const approvalEmail = {
        to: vendor.email,
        subject: 'Vendor Application Approved - Welcome to International Tijarat!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Congratulations! Your Vendor Application Has Been Approved</h2>
            
            <p>Dear ${vendor.contactPerson.firstName} ${vendor.contactPerson.lastName},</p>
            
            <p>We're excited to inform you that your vendor application for <strong>${vendor.businessName}</strong> has been approved!</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Your Vendor Account Details:</h3>
              <p><strong>Business Name:</strong> ${vendor.businessName}</p>
              <p><strong>Email:</strong> ${vendor.email}</p>
              <p><strong>Login URL:</strong> <a href="http://localhost:5173/vendor/login" style="color: #2563eb;">http://localhost:5173/vendor/login</a></p>
              <p><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚠️ Important:</strong> Please change your password immediately after your first login for security purposes.</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Log in to your vendor dashboard using the credentials above</li>
              <li>Complete your vendor profile</li>
              <li>Start adding your products</li>
              <li>Configure your payment and shipping settings</li>
            </ol>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Welcome to the International Tijarat marketplace!</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 14px;">
              This is an automated message. Please do not reply to this email.<br>
              International Tijarat | support@internationaltijarat.com
            </p>
          </div>
        `
      };

      console.log('📧 Sending approval notification email to:', vendor.email);
      // For now, just log the email content (in production, integrate with actual email service)
      console.log('📧 Email content:', approvalEmail.subject);
      
    } catch (emailError) {
      console.error('❌ Error sending approval email:', emailError.message);
      // Don't fail the approval process if email fails
    }

    res.json({
      success: true,
      message: 'Vendor application approved successfully',
      data: {
        vendorId: vendor._id,
        applicationId: application._id,
        businessName: vendor.businessName,
        email: vendor.email,
        temporaryPassword: password || 'VendorPass123',
        loginUrl: 'http://localhost:5173/vendor/login',
        emailSent: true // In production, this would reflect actual email status
      }
    });

  } catch (error) {
    console.error('Approve vendor application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving vendor application',
      error: error.message
    });
  }
};

// @desc    Reject vendor application
// @route   POST /api/admin/vendor-applications/:id/reject
// @access  Private (Admin)
const rejectVendorApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const adminId = req.user.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Get the application
    const application = await VendorApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Vendor application not found'
      });
    }

    if (application.status !== 'pending' && application.status !== 'under_review' && application.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Application has already been processed'
      });
    }

    // Update application status
    application.status = 'rejected';
    application.reviewedAt = new Date();
    application.reviewedBy = adminId;
    application.notes = reason;
    await application.save();

    res.json({
      success: true,
      message: 'Vendor application rejected successfully',
      data: {
        applicationId: application._id,
        businessName: application.businessName
      }
    });

  } catch (error) {
    console.error('Reject vendor application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting vendor application',
      error: error.message
    });
  }
};

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private (Admin)
const getAllVendors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      verificationStatus, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Build query
    const query = {};
    
    if (status === 'active') {
      query.isActive = true;
      query.isSuspended = false;
    } else if (status === 'suspended') {
      query.isSuspended = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    }
    
    if (search) {
      query.$or = [
        { businessName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { 'contactPerson.firstName': new RegExp(search, 'i') },
        { 'contactPerson.lastName': new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const vendors = await Vendor.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('verifiedBy', 'name email');

    const total = await Vendor.countDocuments(query);

    res.json({
      success: true,
      data: {
        vendors,
        pagination: {
          currentPage: parseInt(page),
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
          pages: Math.ceil(total / limit),
          totalVendors: total,
          total: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendors',
      error: error.message
    });
  }
};

// @desc    Get single vendor
// @route   GET /api/admin/vendors/:id
// @access  Private (Admin)
const getVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;

    console.log('🔍 [ADMIN] Fetching vendor details for ID:', vendorId);

    // For admin, we can include more sensitive information including passwords
    const vendor = await Vendor.findById(vendorId)
      .select('+password +tempPasswordForAdmin') // Explicitly include password fields
      .populate('verifiedBy', 'name email');

    if (!vendor) {
      console.log('❌ [ADMIN] Vendor not found for ID:', vendorId);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    console.log('✅ [ADMIN] Found vendor:', {
      id: vendor._id,
      businessName: vendor.businessName,
      email: vendor.email,
      hasPassword: !!vendor.password
    });

    // Get vendor's products count by status
    const productStats = await Product.aggregate([
      { $match: { vendor: vendor._id } },
      { 
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const productStatusCounts = {};
    productStats.forEach(stat => {
      productStatusCounts[stat._id] = stat.count;
    });

    // Get vendor orders and revenue statistics
    const orderStats = await Order.aggregate([
      { $match: { 'items.vendor': vendor._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          avgOrderValue: { $avg: '$amount' }
        }
      }
    ]);

    // Format vendor data with admin-specific information
    const vendorData = {
      _id: vendor._id,
      businessName: vendor.businessName,
      email: vendor.email,
      businessType: vendor.businessType,
      description: vendor.description,
      categories: vendor.categories,
      contactPerson: vendor.contactPerson,
      address: vendor.address,
      verificationStatus: vendor.verificationStatus,
      isActive: vendor.isActive,
      isSuspended: vendor.isSuspended,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      verifiedBy: vendor.verifiedBy,
      settings: vendor.settings,
      
      // Admin-only information - show password for admin viewing
      currentPassword: vendor.tempPasswordForAdmin || 'Password changed before tracking - ask vendor to change password again',
      hasPassword: !!vendor.password, // Indicate if password exists
      
      // Statistics
      stats: {
        totalProducts: Object.values(productStatusCounts).reduce((sum, count) => sum + count, 0),
        totalOrders: orderStats[0]?.totalOrders || 0,
        totalRevenue: orderStats[0]?.totalRevenue || 0,
        averageOrderValue: orderStats[0]?.avgOrderValue || 0,
        averageRating: vendor.averageRating || 0
      }
    };

    console.log('📊 [ADMIN] Vendor data prepared:', {
      hasPassword: !!vendorData.currentPassword,
      totalProducts: vendorData.stats.totalProducts,
      totalOrders: vendorData.stats.totalOrders,
      totalRevenue: vendorData.stats.totalRevenue
    });

    res.json({
      success: true,
      data: vendorData
    });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor',
      error: error.message
    });
  }
};

// @desc    Suspend vendor
// @route   POST /api/admin/vendors/:id/suspend
// @access  Private (Admin)
const suspendVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    await vendor.suspend(reason);

    res.json({
      success: true,
      message: 'Vendor suspended successfully',
      data: {
        vendorId: vendor._id,
        businessName: vendor.businessName,
        suspensionReason: reason
      }
    });

  } catch (error) {
    console.error('Suspend vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending vendor',
      error: error.message
    });
  }
};

// @desc    Unsuspend vendor
// @route   POST /api/admin/vendors/:id/unsuspend
// @access  Private (Admin)
const unsuspendVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    await vendor.unsuspend();

    res.json({
      success: true,
      message: 'Vendor unsuspended successfully',
      data: {
        vendorId: vendor._id,
        businessName: vendor.businessName
      }
    });

  } catch (error) {
    console.error('Unsuspend vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsuspending vendor',
      error: error.message
    });
  }
};

// @desc    Update vendor commission rate
// @route   PUT /api/admin/vendors/:id/commission
// @access  Private (Admin)
const updateVendorCommission = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { commissionRate } = req.body;

    if (commissionRate === undefined || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be between 0 and 100'
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { 'settings.commissionRate': commissionRate },
      { new: true, select: 'businessName settings.commissionRate' }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      message: 'Commission rate updated successfully',
      data: {
        vendorId: vendor._id,
        businessName: vendor.businessName,
        commissionRate: vendor.settings.commissionRate
      }
    });

  } catch (error) {
    console.error('Update vendor commission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating commission rate',
      error: error.message
    });
  }
};

// @desc    Get vendor management stats
// @route   GET /api/admin/vendor-stats
// @access  Private (Admin)
const getVendorStats = async (req, res) => {
  try {
    // Get basic counts
    const totalVendors = await Vendor.countDocuments();
    const activeVendors = await Vendor.countDocuments({ 
      isActive: true, 
      isSuspended: false, 
      verificationStatus: 'approved' 
    });
    const pendingApplications = await VendorApplication.countDocuments({ status: 'pending' });
    const suspendedVendors = await Vendor.countDocuments({ isSuspended: true });

    // Get verification status breakdown
    const verificationStats = await Vendor.aggregate([
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get application status breakdown
    const applicationStats = await VendorApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format the data
    const verificationStatusCounts = {};
    verificationStats.forEach(stat => {
      verificationStatusCounts[stat._id] = stat.count;
    });

    const applicationStatusCounts = {};
    applicationStats.forEach(stat => {
      applicationStatusCounts[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalVendors,
          activeVendors,
          pendingApplications,
          suspendedVendors
        },
        verificationStatus: verificationStatusCounts,
        applicationStatus: applicationStatusCounts
      }
    });

  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor statistics',
      error: error.message
    });
  }
};

// @desc    Admin login as vendor (impersonation)
// @route   POST /api/admin/vendor-management/vendors/:id/login-as
// @access  Private (Admin)
const loginAsVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    console.log('🔑 [ADMIN LOGIN AS VENDOR] Starting impersonation for vendor:', vendorId);

    // Find the vendor
    let vendor = await Vendor.findById(vendorId).select('-password');
    let isUserVendor = false;

    // If not found in Vendor model, try User model
    if (!vendor) {
      console.log('🔍 [ADMIN LOGIN AS VENDOR] Not found in Vendor model, checking User model...');
      const userVendor = await User.findOne({ 
        _id: vendorId, 
        role: 'vendor' 
      }).select('-password');
      
      if (userVendor) {
        console.log('✅ [ADMIN LOGIN AS VENDOR] Found vendor in User model');
        isUserVendor = true;
        vendor = {
          _id: userVendor._id,
          email: userVendor.email,
          businessName: userVendor.name,
          verificationStatus: 'approved',
          isActive: true,
          isSuspended: false
        };
      }
    }

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Create admin impersonation token
    const impersonationToken = `admin-impersonating-${vendorId}`;
    
    console.log('✅ [ADMIN LOGIN AS VENDOR] Impersonation token created:', impersonationToken);

    res.json({
      success: true,
      message: 'Admin impersonation token created',
      data: {
        vendor: {
          id: vendor._id,
          email: vendor.email,
          businessName: vendor.businessName,
          verificationStatus: vendor.verificationStatus,
          isUserVendor: isUserVendor
        },
        token: impersonationToken,
        isAdminImpersonation: true
      }
    });

  } catch (error) {
    console.error('Admin login as vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin impersonation session',
      error: error.message
    });
  }
};

module.exports = {
  getVendorApplications,
  getVendorApplication,
  approveVendorApplication,
  rejectVendorApplication,
  getAllVendors,
  getVendor,
  suspendVendor,
  unsuspendVendor,
  updateVendorCommission,
  getVendorStats,
  loginAsVendor
};
