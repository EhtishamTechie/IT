const express = require('express');
const router = express.Router();
const { 
  sendCustomerVerificationOTP,
  sendVendorVerificationOTP
} = require('../services/emailService');
const otpService = require('../services/otpService');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

/**
 * Send OTP for customer email verification
 * POST /api/email-verification/send-customer-otp
 */
router.post('/send-customer-otp', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please try logging in.'
      });
    }

    // Check rate limiting
    const rateLimitCheck = otpService.canRequestOTP(email, 'customer');
    if (!rateLimitCheck.canRequest) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message,
        remainingTime: rateLimitCheck.remainingTime
      });
    }

    // Generate and send OTP
    const otp = otpService.generateOTP(email, 'customer');
    await emailService.sendCustomerVerificationOTP(email, otp, name);

    res.json({
      success: true,
      message: 'Verification code sent to your email address',
      email: email
    });

  } catch (error) {
    console.error('❌ Error sending customer OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code. Please try again.'
    });
  }
});

/**
 * Send OTP for vendor email verification
 * POST /api/email-verification/send-vendor-otp
 */
router.post('/send-vendor-otp', async (req, res) => {
  try {
    const { email, businessName } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid business email address'
      });
    }

    // Check if email already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Business email is already registered. Please try logging in or use a different email.'
      });
    }

    // Check rate limiting
    const rateLimitCheck = otpService.canRequestOTP(email, 'vendor');
    if (!rateLimitCheck.canRequest) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message,
        remainingTime: rateLimitCheck.remainingTime
      });
    }

    // Generate and send OTP
    const otp = otpService.generateOTP(email, 'vendor');
    await emailService.sendVendorVerificationOTP(email, otp, businessName);

    res.json({
      success: true,
      message: 'Verification code sent to your business email address',
      email: email
    });

  } catch (error) {
    console.error('❌ Error sending vendor OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code. Please try again.'
    });
  }
});

/**
 * Verify OTP for customer
 * POST /api/email-verification/verify-customer-otp
 */
router.post('/verify-customer-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verification = otpService.verifyOTP(email, otp, 'customer');
    
    if (!verification.success) {
      return res.status(400).json(verification);
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now complete your registration.',
      verified: true
    });

  } catch (error) {
    console.error('❌ Error verifying customer OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code. Please try again.'
    });
  }
});

/**
 * Verify OTP for vendor
 * POST /api/email-verification/verify-vendor-otp
 */
router.post('/verify-vendor-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verification = otpService.verifyOTP(email, otp, 'vendor');
    
    if (!verification.success) {
      return res.status(400).json(verification);
    }

    res.json({
      success: true,
      message: 'Business email verified successfully! You can now complete your vendor application.',
      verified: true
    });

  } catch (error) {
    console.error('❌ Error verifying vendor OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code. Please try again.'
    });
  }
});

/**
 * Resend OTP
 * POST /api/email-verification/resend-otp
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, type, name, businessName } = req.body;

    if (!email || !type) {
      return res.status(400).json({
        success: false,
        message: 'Email and type are required'
      });
    }

    if (!['customer', 'vendor'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "customer" or "vendor"'
      });
    }

    // Check rate limiting
    const rateLimitCheck = otpService.canRequestOTP(email, type);
    if (!rateLimitCheck.canRequest) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message,
        remainingTime: rateLimitCheck.remainingTime
      });
    }

    // Generate and send new OTP
    const otp = otpService.generateOTP(email, type);
    
    if (type === 'customer') {
      await sendCustomerVerificationOTP(email, otp, name);
    } else {
      await sendVendorVerificationOTP(email, otp, businessName);
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email address'
    });

  } catch (error) {
    console.error('❌ Error resending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code. Please try again.'
    });
  }
});

/**
 * Get OTP status (for debugging - remove in production)
 * GET /api/email-verification/status/:email/:type
 */
router.get('/status/:email/:type', async (req, res) => {
  try {
    const { email, type } = req.params;
    
    if (!['customer', 'vendor'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type'
      });
    }

    const status = otpService.getOTPStatus(email, type);
    const stats = otpService.getStats();

    res.json({
      success: true,
      otpStatus: status,
      systemStats: stats
    });

  } catch (error) {
    console.error('❌ Error getting OTP status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OTP status'
    });
  }
});

module.exports = router;
