const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authAdmin = require("../middleware/authAdmin"); // Add admin auth middleware

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Email and password are required" 
    });
  }
  
  try {
    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }
    
    if (user.role !== "admin") {
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. Admin privileges required." 
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: "Account is deactivated" 
      });
    }

    // Compare password using bcryptjs (same as User model)
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        userId: user._id, // For compatibility with other middleware
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: "7d" }
    );

    res.json({ 
      success: true,
      message: "Login successful",
      token, 
      admin: { 
        id: user._id,
        name: user.name, 
        email: user.email, 
        role: user.role,
        lastLogin: user.lastLogin
      } 
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// Get admin profile - NEW ROUTE
router.get("/profile", authAdmin, async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId;
    const admin = await User.findById(adminId).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin profile",
      error: error.message
    });
  }
});

module.exports = router;