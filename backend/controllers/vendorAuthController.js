const Vendor = require('../models/Vendor');
const VendorApplication = require('../models/VendorApplication');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const constants = require('../config/constants');

// Generate JWT token for vendor
const generateToken = (vendorId) => {
  return jwt.sign(
    { vendorId, userType: 'vendor' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// @desc    Register new vendor application
// @route   POST /api/vendors/apply
// @access  Public
const applyAsVendor = async (req, res) => {
  try {
    const {
      email,
      businessName,
      businessType,
      contactPerson,
      address,
      description,
      categories,
      documents
    } = req.body;

    // Check if vendor already exists with this email
    const existingVendor = await Vendor.findOne({ email: email.toLowerCase() });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'A vendor account with this email already exists'
      });
    }

    // Check if application already exists
    const existingApplication = await VendorApplication.findOne({ 
      email: email.toLowerCase() 
    });
    if (existingApplication && existingApplication.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'An application with this email is already pending'
      });
    }

    // Create new vendor application
    const vendorApplication = new VendorApplication({
      email: email.toLowerCase(),
      businessName,
      businessType,
      contactPerson,
      address,
      description,
      intendedCategories: categories, // Map categories to intendedCategories
      documents,
      status: 'submitted', // Set status to submitted when application is complete
      applicationDate: new Date()
    });

    await vendorApplication.save();

    res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully',
      data: {
        applicationId: vendorApplication.applicationId,
        status: vendorApplication.status,
        submittedAt: vendorApplication.applicationDate
      }
    });

  } catch (error) {
    console.error('Vendor application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting vendor application',
      error: error.message
    });
  }
};

// @desc    Vendor login
// @route   POST /api/vendors/login
// @access  Public
const loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find vendor by email in Vendor model
    let vendor = await Vendor.findByEmail(email);
    let isUserVendor = false;
    
    // If not found in Vendor model, check User model
    if (!vendor) {
      console.log('🔍 Login - Not found in Vendor model, checking User model...');
      const userVendor = await User.findOne({ 
        email: email.toLowerCase(), 
        role: 'vendor' 
      });
      
      if (userVendor) {
        console.log('✅ Login - Found vendor in User model');
        isUserVendor = true;
        // Create a vendor-like object for the login process
        vendor = {
          _id: userVendor._id,
          email: userVendor.email,
          businessName: userVendor.name,
          verificationStatus: 'approved',
          isActive: true,
          isSuspended: false,
          comparePassword: async function(candidatePassword) {
            return await bcrypt.compare(candidatePassword, userVendor.password);
          },
          updateLastLogin: function() {
            // For User model, we can optionally update lastLogin if the field exists
            return Promise.resolve();
          }
        };
      }
    }
    
    if (!vendor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if vendor is active (skip validation for User model vendors)
    if (!isUserVendor && (!vendor.isActive || vendor.isSuspended)) {
      return res.status(403).json({
        success: false,
        message: 'Your vendor account is currently inactive or suspended'
      });
    }

    // Check if vendor is approved (skip validation for User model vendors)
    if (!isUserVendor && vendor.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your vendor account is ${vendor.verificationStatus}. Please wait for approval.`
      });
    }

    // Update last login
    await vendor.updateLastLogin();
    
    // Clear tempPasswordForAdmin only when admin is impersonating (security measure)
    // Do NOT clear when actual vendor logs in - admin needs to see the password
    if (req.headers['x-admin-impersonation'] && vendor.tempPasswordForAdmin) {
      vendor.tempPasswordForAdmin = null;
      await vendor.save({ validateBeforeSave: false });
      console.log('🔒 Cleared temporary admin password after admin impersonation for vendor:', vendor.email);
    }

    // Generate token
    const token = generateToken(vendor._id);

    // Ensure logo path is properly formatted
    let logoPath = vendor.logo;
    if (logoPath && !logoPath.startsWith('/uploads/')) {
      logoPath = `/uploads/vendor-logos/${logoPath}`;
      logoPath = logoPath
        .replace(/\/vendor-logos\/vendor-logos\//, '/vendor-logos/')
        .replace(/^\/uploads\/uploads\//, '/uploads/');
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        vendor: {
          id: vendor._id,
          email: vendor.email,
          businessName: vendor.businessName,
          verificationStatus: vendor.verificationStatus,
          accountStatus: isUserVendor ? 'active' : (vendor.accountStatus || 'active'),
          isUserVendor: isUserVendor, // Flag to indicate this is from User model
          logo: logoPath // Include properly formatted logo path
        },
        token
      }
    });

  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

// @desc    Get vendor profile
// @route   GET /api/vendors/profile
// @access  Private (Vendor)
const getVendorProfile = async (req, res) => {
  try {
    console.log('📋 Getting vendor profile for vendor ID:', req.vendor.id);
    
    // First try to find in Vendor model
    let vendor = await Vendor.findById(req.vendor.id)
      .select('-password')
      .populate('verifiedBy', 'name email');

    let isUserVendor = false;
    
    // If not found in Vendor model, check User model
    if (!vendor) {
      console.log('🔍 Profile - Not found in Vendor model, checking User model...');
      const userVendor = await User.findById(req.vendor.id).select('-password');
      
      if (userVendor && userVendor.role === 'vendor') {
        console.log('✅ Profile - Found vendor in User model');
        isUserVendor = true;
        
        // Create a vendor-like response structure from User model
        vendor = {
          _id: userVendor._id,
          email: userVendor.email,
          businessName: userVendor.name || userVendor.businessName,
          verificationStatus: 'approved',
          isActive: true,
          isSuspended: false,
          // Map flat User fields to nested Vendor structure for consistency
          contactPerson: {
            firstName: userVendor.contactPerson || userVendor.name || 'Not Provided',
            lastName: '',
            phone: userVendor.phone || '000-000-0000'
          },
          address: {
            street: userVendor.address || 'Not Provided',
            city: userVendor.city || 'Not Provided',
            state: userVendor.state || 'Not Provided',
            zipCode: userVendor.postalCode || '00000',
            country: userVendor.country || 'Pakistan'
          },
          documents: {
            taxId: userVendor.taxId || ''
          },
          bankDetails: {
            bankName: userVendor.bankName || userVendor.bankDetails?.bankName || '',
            accountNumber: userVendor.accountNumber || userVendor.bankDetails?.accountNumber || '',
            accountTitle: userVendor.accountTitle || userVendor.bankDetails?.accountTitle || ''
          },
          socialMedia: {
            website: userVendor.website || ''
          },
          businessType: userVendor.businessType || 'individual',
          description: userVendor.businessDescription || userVendor.description || '',
          logo: userVendor.logo || '',
          phone: userVendor.phone || '',
          // Additional compatibility fields
          businessDescription: userVendor.businessDescription || userVendor.description || '',
          website: userVendor.website || '',
          taxId: userVendor.taxId || '',
          city: userVendor.city || '',
          state: userVendor.state || '',
          postalCode: userVendor.postalCode || '',
          country: userVendor.country || 'Pakistan',
          bankName: userVendor.bankName || userVendor.bankDetails?.bankName || '',
          accountNumber: userVendor.accountNumber || userVendor.bankDetails?.accountNumber || '',
          accountTitle: userVendor.accountTitle || userVendor.bankDetails?.accountTitle || ''
        };
      }
    }

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Transform and standardize logo URL
    const vendorData = vendor.toObject ? vendor.toObject() : { ...vendor };
    let logoPath = vendorData.logo;
    if (logoPath && logoPath.trim() !== '') {
      // Clean up any malformed paths first
      logoPath = logoPath.replace(/undefined/g, '').replace(/\/+/g, '/');
      
      // If path doesn't start with /uploads/, add the proper prefix
      if (!logoPath.startsWith('/uploads/vendor-logos/') && !logoPath.startsWith('/uploads/')) {
        logoPath = `/uploads/vendor-logos/${logoPath.replace(/^\/+/, '')}`;
      }
      
      // Clean up any duplicate segments
      logoPath = logoPath
        .replace(/\/vendor-logos\/vendor-logos\//g, '/vendor-logos/')
        .replace(/\/uploads\/uploads\//g, '/uploads/')
        .replace(/\/+/g, '/'); // Replace multiple slashes with single slash
      
      // Store cleaned path
      vendorData.logo = logoPath;
      
      console.log('📸 Processed vendor logo path:', {
        original: vendor.logo,
        processed: logoPath
      });
    } else {
      vendorData.logo = ''; // Ensure empty string if no logo
    }

    console.log('📤 Sending vendor profile:', {
      id: vendorData._id,
      businessName: vendorData.businessName,
      logo: vendorData.logo,
      isUserVendor: isUserVendor
    });

    res.json({
      success: true,
      vendor: vendorData,
      isUserVendor: isUserVendor
    });

  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor profile',
      error: error.message
    });
  }
};

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
// @access  Private (Vendor)
const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const flatData = { ...req.body };

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete flatData.password;
    delete flatData.email;
    delete flatData.verificationStatus;
    delete flatData.verifiedAt;
    delete flatData.verifiedBy;
    delete flatData.stats;

    console.log('📝 Received profile update data:', JSON.stringify(flatData, null, 2));

    // First try to find in Vendor model
    let currentVendor = await Vendor.findById(vendorId);
    let isUserVendor = false;
    let updateResult;

    if (!currentVendor) {
      console.log('🔍 Update - Not found in Vendor model, checking User model...');
      const userVendor = await User.findById(vendorId);
      
      if (userVendor && userVendor.role === 'vendor') {
        console.log('✅ Update - Found vendor in User model, updating...');
        isUserVendor = true;
        
        // Build update data for User model (flat structure)
        const userUpdateData = {};
        
        // Basic information mapping
        if (flatData.businessName) userUpdateData.name = flatData.businessName;
        if (flatData.businessName) userUpdateData.businessName = flatData.businessName;
        if (flatData.contactPerson) userUpdateData.contactPerson = flatData.contactPerson;
        if (flatData.businessDescription) userUpdateData.businessDescription = flatData.businessDescription;
        if (flatData.businessType) userUpdateData.businessType = flatData.businessType;
        if (flatData.website) userUpdateData.website = flatData.website;
        if (flatData.phone) userUpdateData.phone = flatData.phone;
        if (flatData.logo) userUpdateData.logo = flatData.logo;
        
        // Address mapping (flat structure for User model)
        if (flatData.address) userUpdateData.address = flatData.address;
        if (flatData.city) userUpdateData.city = flatData.city;
        if (flatData.state) userUpdateData.state = flatData.state;
        if (flatData.postalCode) userUpdateData.postalCode = flatData.postalCode;
        if (flatData.country) userUpdateData.country = flatData.country;
        
        // Tax ID
        if (flatData.taxId) userUpdateData.taxId = flatData.taxId;
        
        // Bank details (flat structure for User model)
        if (flatData.bankDetails) {
          userUpdateData.bankName = flatData.bankDetails.bankName;
          userUpdateData.accountNumber = flatData.bankDetails.accountNumber;
          userUpdateData.accountTitle = flatData.bankDetails.accountTitle;
          // Also store as nested object for compatibility
          userUpdateData.bankDetails = flatData.bankDetails;
        }

        console.log('📝 User model update data:', JSON.stringify(userUpdateData, null, 2));

        updateResult = await User.findByIdAndUpdate(
          vendorId,
          userUpdateData,
          { new: true, runValidators: true }
        ).select('-password');

        if (!updateResult) {
          return res.status(404).json({
            success: false,
            message: 'User vendor not found'
          });
        }

        console.log('✅ User vendor profile updated successfully');

      } else {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found in either model'
        });
      }
    } else {
      console.log('✅ Update - Found vendor in Vendor model, updating...');
      
      // Map flat frontend data to nested backend structure for Vendor model
      const updateData = {};

      // Basic business information
      if (flatData.businessName) updateData.businessName = flatData.businessName;
      if (flatData.description || flatData.businessDescription) {
        updateData.description = flatData.description || flatData.businessDescription;
      }
      if (flatData.logo) updateData.logo = flatData.logo;
      
      // Map businessType to valid enum values
      if (flatData.businessType) {
        const typeMapping = {
          'manufacturer': 'company',
          'distributor': 'company', 
          'retailer': 'company',
          'wholesaler': 'company',
          'individual': 'individual',
          'company': 'company',
          'partnership': 'partnership'
        };
        updateData.businessType = typeMapping[flatData.businessType] || 'company';
      }

      // Map flat contact person data to nested structure
      updateData.contactPerson = {
        firstName: currentVendor.contactPerson?.firstName || 'Not Provided',
        lastName: currentVendor.contactPerson?.lastName || 'Provided',
        phone: currentVendor.contactPerson?.phone || '000-000-0000'
      };

      // Update contact person if new data provided
      if (flatData.contactPerson) {
        if (typeof flatData.contactPerson === 'string') {
          const names = flatData.contactPerson.split(' ');
          updateData.contactPerson.firstName = names[0] || updateData.contactPerson.firstName;
          updateData.contactPerson.lastName = names.slice(1).join(' ') || updateData.contactPerson.lastName;
        } else {
          updateData.contactPerson.firstName = flatData.contactPerson || updateData.contactPerson.firstName;
        }
      }
      
      if (flatData.phone) {
        updateData.contactPerson.phone = flatData.phone;
      }

      // Map flat address data to nested structure  
      updateData.address = {
        street: currentVendor.address?.street || 'Not Provided',
        city: currentVendor.address?.city || 'Not Provided', 
        state: currentVendor.address?.state || 'Not Provided',
        zipCode: currentVendor.address?.zipCode || '00000',
        country: currentVendor.address?.country || 'Pakistan'
      };

      // Update address if new data provided
      if (flatData.address) updateData.address.street = flatData.address;
      if (flatData.city) updateData.address.city = flatData.city;
      if (flatData.state) updateData.address.state = flatData.state;
      if (flatData.postalCode) updateData.address.zipCode = flatData.postalCode;
      if (flatData.country) updateData.address.country = flatData.country;

      // Handle documents/tax info
      if (flatData.taxId) {
        updateData.documents = {
          ...currentVendor.documents,
          taxId: flatData.taxId
        };
      }

      // Handle bank details
      if (flatData.bankDetails) {
        updateData.bankDetails = flatData.bankDetails;
      }

      // Handle social media/website
      if (flatData.website) {
        updateData.socialMedia = {
          ...currentVendor.socialMedia,
          website: flatData.website
        };
      }

      console.log('📝 Vendor model update data:', JSON.stringify(updateData, null, 2));

      updateResult = await Vendor.findByIdAndUpdate(
        vendorId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!updateResult) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      console.log('✅ Vendor profile updated successfully');
    }

    // Format response data consistently
    const responseData = isUserVendor ? {
      ...updateResult.toObject(),
      // Add compatibility fields for frontend
      contactPerson: {
        firstName: updateResult.contactPerson || updateResult.name || 'Not Provided',
        lastName: '',
        phone: updateResult.phone || '000-000-0000'
      },
      address: {
        street: updateResult.address || 'Not Provided',
        city: updateResult.city || 'Not Provided',
        state: updateResult.state || 'Not Provided',
        zipCode: updateResult.postalCode || '00000',
        country: updateResult.country || 'Pakistan'
      },
      documents: {
        taxId: updateResult.taxId || ''
      },
      socialMedia: {
        website: updateResult.website || ''
      }
    } : updateResult;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: responseData,
      vendor: responseData, // For compatibility
      isUserVendor: isUserVendor
    });

  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vendor profile',
      error: error.message
    });
  }
};

// @desc    Change vendor password
// @route   PUT /api/vendors/change-password
// @access  Private (Vendor)
const changeVendorPassword = async (req, res) => {
  console.log('🔐 [CHANGE PASSWORD] Request received');
  console.log('🔐 [CHANGE PASSWORD] Request method:', req.method);
  console.log('🔐 [CHANGE PASSWORD] Request URL:', req.url);
  console.log('🔐 [CHANGE PASSWORD] Headers:', {
    authorization: req.headers.authorization ? 'Bearer ***' : 'none',
    'content-type': req.headers['content-type']
  });
  console.log('🔐 [CHANGE PASSWORD] Body fields present:', {
    hasCurrentPassword: !!req.body?.currentPassword,
    hasNewPassword: !!req.body?.newPassword,
    hasConfirmPassword: !!req.body?.confirmPassword,
    currentPasswordLength: req.body?.currentPassword?.length || 0,
    newPasswordLength: req.body?.newPassword?.length || 0
  });
  console.log('🔐 [CHANGE PASSWORD] Vendor from token:', {
    vendorId: req.vendor?.id,
    vendorEmail: req.vendor?.email
  });

  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      console.log('❌ [CHANGE PASSWORD] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide current password, new password, and confirmation'
      });
    }

    if (newPassword !== confirmPassword) {
      console.log('❌ [CHANGE PASSWORD] Password confirmation mismatch');
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ [CHANGE PASSWORD] Password too short:', newPassword.length);
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    console.log('✅ [CHANGE PASSWORD] Validation passed, finding vendor...');
    // Get vendor
    const vendor = await Vendor.findById(req.vendor.id);
    if (!vendor) {
      console.log('❌ [CHANGE PASSWORD] Vendor not found:', req.vendor.id);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    console.log('✅ [CHANGE PASSWORD] Vendor found:', {
      id: vendor._id,
      email: vendor.email,
      businessName: vendor.businessName,
      hasPassword: !!vendor.password
    });

    console.log('🔍 [CHANGE PASSWORD] Checking current password...');
    // Check current password
    const isCurrentPasswordValid = await vendor.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      console.log('❌ [CHANGE PASSWORD] Current password is incorrect');
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    console.log('✅ [CHANGE PASSWORD] Current password verified, updating...');
    // Update password
    vendor.password = newPassword;
    // Also save the password for admin viewing
    vendor.tempPasswordForAdmin = newPassword;
    
    console.log('💾 [CHANGE PASSWORD] Saving vendor with new password...');
    await vendor.save();
    
    console.log('✅ [CHANGE PASSWORD] Password updated successfully for vendor:', vendor.email);
    console.log('✅ [CHANGE PASSWORD] tempPasswordForAdmin saved for admin viewing');

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('💥 [CHANGE PASSWORD] Error occurred:', error);
    console.error('💥 [CHANGE PASSWORD] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// @desc    Get vendor dashboard stats
// @route   GET /api/vendors/dashboard
// @access  Private (Vendor)
const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const mongoose = require('mongoose');
    const Product = require('../models/Product');
    const CommissionConfig = require('../config/commission');

    // Get vendor basic info with commission rate
    const vendor = await Vendor.findById(vendorId).select('businessName settings');
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get commission rate (vendor-specific or global default)
    const commissionRate = vendor.settings?.commissionRate || CommissionConfig.COMMISSION_PERCENTAGE;

    // Convert vendor ID to ObjectId for proper querying
    const vendorObjectId = typeof vendorId === 'string' 
      ? new mongoose.Types.ObjectId(vendorId) 
      : vendorId;

    // Get basic product stats for verification
    const products = await Product.find({ vendor: vendorObjectId });
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + (product.price || 0), 0);

    // Simple response with basic stats and commission rate for dashboard
    const dashboardData = {
      businessName: vendor.businessName,
      commissionRate: commissionRate,
      stats: {
        products: {
          total: totalProducts,
          totalValue: Math.round(totalValue * 100) / 100
        }
      },
      debug: {
        vendorId: vendorObjectId.toString(),
        productsFound: totalProducts,
        commissionRate: commissionRate + '%',
        message: 'Dashboard data with dynamic commission rate'
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get vendor dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// @desc    Check application status
// @route   GET /api/vendors/application-status/:applicationId
// @access  Public
const checkApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await VendorApplication.findOne({ applicationId })
      .select('-documents'); // Exclude documents for security

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: {
        applicationId: application.applicationId,
        status: application.status,
        businessName: application.businessName,
        submittedAt: application.applicationDate,
        reviewedAt: application.reviewedAt,
        notes: application.notes
      }
    });

  } catch (error) {
    console.error('Check application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking application status',
      error: error.message
    });
  }
};

// @desc    Upload vendor logo
// @route   POST /api/vendors/upload-logo
// @access  Private (Vendor)
const uploadVendorLogo = async (req, res) => {
  try {
    console.log('📥 Starting logo upload process...');
    const vendorId = req.vendor.id;
    console.log('🆔 Vendor ID:', vendorId);

    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No logo file provided'
      });
    }
    console.log('📁 Uploaded file details:', {
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const vendor = await Vendor.findById(vendorId).select('-password');
    
    if (!vendor) {
      // Clean up uploaded file if vendor not found
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Delete old logo file if it exists
    if (vendor.logo) {
      console.log('🖼️ Current vendor logo:', vendor.logo);
      try {
        // Clean up the path
        const oldPath = vendor.logo.replace(/^\/uploads\//, '');
        const oldLogoPath = path.join(__dirname, '../uploads', oldPath);
        
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
          console.log('✅ Successfully deleted old logo:', oldLogoPath);
        }
      } catch (error) {
        console.error('❌ Error deleting old logo:', error);
      }
    }

    // Store the standardized path in the database
    // Always use the format /uploads/vendor-logos/filename
    const relativePath = `/uploads/vendor-logos/${req.file.filename}`;
    console.log('📝 New logo path:', relativePath);
    
    vendor.logo = relativePath; // Store the full path with /uploads prefix
    await vendor.save();
    
    // Log stored path for debugging
    console.log('💾 Stored logo path in database:', vendor.logo);

    // Send the relative path in the response (frontend will handle full URL construction)
    console.log('🔗 Sending logo path:', relativePath);

    const response = {
      success: true,
      message: 'Logo uploaded successfully',
      logo: relativePath,
      logoPath: relativePath, // Add logoPath for compatibility
      data: {
        vendor: {
          ...vendor.toObject(),
          // Keep the relative path - frontend will handle URL construction
          logo: relativePath
        }
      }
    };
    console.log('📤 Sending response:', response);

    res.json(response);

  } catch (error) {
    console.error('Upload logo error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading logo',
      error: error.message
    });
  }
};

module.exports = {
  applyAsVendor,
  loginVendor,
  getVendorProfile,
  updateVendorProfile,
  changeVendorPassword,
  getVendorDashboard,
  checkApplicationStatus,
  uploadVendorLogo
};
