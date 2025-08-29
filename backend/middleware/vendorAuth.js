const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const User = require('../models/User');

// Protect vendor routes - verify JWT token and get vendor
const protectVendor = async (req, res, next) => {
  try {
    let token;

    console.log('🔑 [VENDOR AUTH MIDDLEWARE] Processing request:', {
      url: req.url,
      method: req.method,
      hasAdminImpersonation: req.headers['x-admin-impersonation'] === 'true',
      hasAdminToken: !!req.headers['x-admin-token'],
      hasAuthorization: !!req.headers.authorization,
      adminTokenPreview: req.headers['x-admin-token'] ? 
        (req.headers['x-admin-token'].startsWith('admin-impersonating-') ? 'admin-impersonating-token' : 'other-token') : 'none'
    });

    // Check for admin impersonation first
    if (req.headers['x-admin-impersonation'] === 'true' && req.headers['x-admin-token']) {
      console.log('🔑 [VENDOR AUTH MIDDLEWARE] ✅ Admin impersonation detected');
      
      const adminToken = req.headers['x-admin-token'];
      
      // Extract vendor ID from admin impersonation token
      if (adminToken.startsWith('admin-impersonating-')) {
        const vendorId = adminToken.replace('admin-impersonating-', '');
        console.log('🔑 [VENDOR AUTH MIDDLEWARE] Admin impersonating vendor:', vendorId);
        
        // Look up the vendor being impersonated
        let vendor = await Vendor.findById(vendorId).select('-password');
        
        if (!vendor) {
          // Try User model
          console.log('🔑 [VENDOR AUTH MIDDLEWARE] Vendor not found in Vendor model, trying User model...');
          const userVendor = await User.findOne({ 
            _id: vendorId, 
            role: 'vendor' 
          }).select('-password');
          
          if (userVendor) {
            console.log('🔑 [VENDOR AUTH MIDDLEWARE] Found vendor in User model:', userVendor.email);
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
          console.error('🔑 [VENDOR AUTH MIDDLEWARE] ❌ Vendor not found for admin impersonation:', vendorId);
          return res.status(404).json({
            success: false,
            message: 'Vendor not found for admin impersonation.'
          });
        }
        
        // Set vendor in request for admin impersonation (bypass all checks)
        req.vendor = {
          id: vendor._id,
          email: vendor.email,
          businessName: vendor.businessName,
          verificationStatus: vendor.verificationStatus,
          isAdminViewing: true
        };
        
        console.log('✅ [VENDOR AUTH MIDDLEWARE] Admin impersonation success for vendor:', req.vendor.businessName);
        return next();
      } else {
        console.error('🔑 [VENDOR AUTH MIDDLEWARE] ❌ Invalid admin impersonation token format');
        return res.status(400).json({
          success: false,
          message: 'Invalid admin impersonation token format.'
        });
      }
    }

    // Regular JWT token handling
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      console.log('🔐 VendorAuth - Token decoded:', { vendorId: decoded.vendorId, userType: decoded.userType });

      // Check if this is a vendor token
      if (decoded.userType !== 'vendor') {
        console.log('❌ VendorAuth - Invalid token type:', decoded.userType);
        return res.status(403).json({
          success: false,
          message: 'Access denied. Invalid token type.'
        });
      }

      // First try to get vendor from Vendor model
      let vendor = await Vendor.findById(decoded.vendorId).select('-password');

      // If not found in Vendor model, try User model with role='vendor'
      if (!vendor) {
        console.log('🔍 VendorAuth - Not found in Vendor model, checking User model...');
        const userVendor = await User.findOne({ 
          _id: decoded.vendorId, 
          role: 'vendor' 
        }).select('-password');
        
        if (userVendor) {
          console.log('✅ VendorAuth - Found vendor in User model');
          // Create a vendor-like object from User model
          vendor = {
            _id: userVendor._id,
            email: userVendor.email,
            businessName: userVendor.name, // Use name as business name
            verificationStatus: 'approved', // Assume approved if in User model
            isActive: userVendor.isVerified || true,
            isSuspended: false
          };
        }
      }

      console.log('🔍 VendorAuth - Vendor lookup result:', vendor ? {
        id: vendor._id,
        businessName: vendor.businessName,
        verificationStatus: vendor.verificationStatus,
        isActive: vendor.isActive,
        isSuspended: vendor.isSuspended
      } : 'NOT FOUND');

      if (!vendor) {
        console.log('❌ VendorAuth - Vendor not found in either model for ID:', decoded.vendorId);
        return res.status(401).json({
          success: false,
          message: 'Access denied. Vendor not found.'
        });
      }

      // Check if vendor is active (skip for User model vendors)
      if (vendor.isActive !== undefined && (!vendor.isActive || vendor.isSuspended)) {
        console.log('❌ VendorAuth - Vendor inactive/suspended:', { isActive: vendor.isActive, isSuspended: vendor.isSuspended });
        return res.status(403).json({
          success: false,
          message: 'Access denied. Your vendor account is inactive or suspended.'
        });
      }

      // Check if vendor is approved (skip for User model vendors)
      if (vendor.verificationStatus !== 'approved') {
        console.log('❌ VendorAuth - Vendor not approved:', vendor.verificationStatus);
        return res.status(403).json({
          success: false,
          message: `Access denied. Your vendor account is ${vendor.verificationStatus}.`
        });
      }

      // Add vendor to request object
      req.vendor = {
        id: vendor._id,
        email: vendor.email,
        businessName: vendor.businessName,
        verificationStatus: vendor.verificationStatus
      };

      console.log('✅ VendorAuth - Success! Set req.vendor:', { id: req.vendor.id, businessName: req.vendor.businessName });

      next();

    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }

  } catch (error) {
    console.error('Vendor auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

// Middleware to check if vendor can manage products (approved vendors only)
const requireApprovedVendor = async (req, res, next) => {
  try {
    // First try Vendor model
    let vendor = await Vendor.findById(req.vendor.id);
    
    // If not found in Vendor model, try User model
    if (!vendor) {
      const userVendor = await User.findOne({ 
        _id: req.vendor.id, 
        role: 'vendor' 
      });
      
      if (userVendor) {
        // For User model vendors, assume they are approved if they exist
        return next();
      }
    }

    if (!vendor || vendor.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only approved vendors can perform this action.'
      });
    }

    next();
  } catch (error) {
    console.error('Approved vendor check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authorization check',
      error: error.message
    });
  }
};

// Middleware to check if vendor account is not suspended
const requireActiveVendor = async (req, res, next) => {
  try {
    // First try Vendor model
    let vendor = await Vendor.findById(req.vendor.id);
    
    // If not found in Vendor model, try User model
    if (!vendor) {
      const userVendor = await User.findOne({ 
        _id: req.vendor.id, 
        role: 'vendor' 
      });
      
      if (userVendor) {
        // For User model vendors, assume they are active if they exist and are verified
        if (userVendor.isVerified !== false) {
          return next();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Your vendor account is not verified.'
          });
        }
      }
    }

    if (!vendor || vendor.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your vendor account is suspended.'
      });
    }

    if (!vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your vendor account is inactive.'
      });
    }

    next();
  } catch (error) {
    console.error('Active vendor check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authorization check',
      error: error.message
    });
  }
};

module.exports = {
  protectVendor,
  requireApprovedVendor,
  requireActiveVendor,
  verifyVendor: protectVendor // Alias for consistency
};
