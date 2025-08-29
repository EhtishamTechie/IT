const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const authAdmin = require('../middleware/authAdmin');

// Get all users (Admin only) - WITH PAGINATION - FIXED ROUTE PATH
router.get('/', authAdmin, async (req, res) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter conditions
    const filter = {};
    
    // Role filter
    if (req.query.role && req.query.role !== 'all') {
      filter.role = req.query.role;
    }
    
    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { name: searchRegex }
      ];
    }
    
    // Date filters
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      if (req.query.fromDate) {
        filter.createdAt.$gte = new Date(req.query.fromDate);
      }
      if (req.query.toDate) {
        filter.createdAt.$lte = new Date(req.query.toDate);
      }
    }
    
    console.log('👥 [ADMIN USERS] Pagination:', { page, limit, skip });
    console.log('👥 [ADMIN USERS] Filter:', filter);
    
    // Get users with pagination
    const users = await User.find(filter, '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Calculate order statistics for each user
    const Order = require('../models/Order');
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const orders = await Order.find({ email: user.email });
      const orderCount = orders.length;
      const totalSpent = orders.reduce((total, order) => {
        const orderTotal = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return total + orderTotal;
      }, 0);
      
      return {
        ...user,
        orderCount,
        totalSpent
      };
    }));
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);
    
    console.log('✅ [ADMIN USERS] Success:', { 
      usersFound: usersWithStats.length, 
      totalUsers, 
      totalPages 
    });
    
    res.json({
      success: true,
      users: usersWithStats,
      totalUsers,
      totalPages,
      currentPage: page,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalUsers,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ [ADMIN USERS] Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
});

// Get specific user by ID (Admin only)
router.get('/users/:id', authAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      });
    }
    
    const user = await User.findById(userId).select('-password');
    
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Import Order model to calculate user statistics
    const Order = require('../models/Order');

    // Calculate user statistics
    const orders = await Order.find({ email: user.email });
    const orderCount = orders.length;
    
    // Calculate total spent
    const totalSpent = orders.reduce((total, order) => {
      const orderTotal = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return total + orderTotal;
    }, 0);

    // Add calculated fields to user object
    const userWithStats = {
      ...user.toObject(),
      orderCount,
      totalSpent
    };

    res.json({ 
      success: true, 
      user: userWithStats 
    });
  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user details' 
    });
  }
});

// Get user orders by user ID (Admin only) with pagination
router.get('/users/:id/orders', authAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // First check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Import Order model
    const Order = require('../models/Order');

    // Find orders by user email (since orders are linked by email, not user ID) with pagination
    const orders = await Order.find({ email: user.email })
      .populate('cart.productId', 'title image price mainCategory subCategory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments({ email: user.email });
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({ 
      success: true, 
      orders: orders,
      totalOrders,
      totalPages,
      currentPage: page,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalOrders,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user orders',
      error: error.message 
    });
  }
});

// Create new user (Admin only)
router.post('/users', authAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'customer',
      phone,
      address
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user (Admin only)
router.put('/users/:id', authAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    const userId = req.params.id;

    const updateData = { name, email, role, phone, address };

    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;
