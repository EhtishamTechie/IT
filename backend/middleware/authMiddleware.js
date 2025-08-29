const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token and set user
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Find user
    const user = await User.findById(decoded.userId || decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🔍 Auth middleware - User from DB:', {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    // Attach user info to request
    req.user = {
      id: user._id,
      email: user.email,
      firstName: user.firstName || user.name,
      lastName: user.lastName || '',
      role: user.role,
      isAdmin: user.role === 'admin'
    };

    console.log('🔍 Auth middleware - Setting req.user:', req.user);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Admin only middleware
const adminOnly = async (req, res, next) => {
  try {
    console.log('🔐 AdminOnly middleware - req.user:', req.user);
    
    // Check if user is authenticated
    if (!req.user) {
      console.log('🔐 AdminOnly middleware - No user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('🔐 AdminOnly middleware - User role is not admin:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log('✅ AdminOnly middleware - Admin access granted');
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Optional authentication - sets user if token exists, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Find user
    const user = await User.findById(decoded.userId || decoded.id).select('-password');

    if (user) {
      req.user = {
        id: user._id,
        email: user.email,
        firstName: user.firstName || user.name,
        lastName: user.lastName || '',
        role: user.role,
        isAdmin: user.role === 'admin'
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  protect,
  adminOnly,
  optionalAuth
};
