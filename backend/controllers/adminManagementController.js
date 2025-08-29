const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Get all admin users
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      admins,
      count: admins.length
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin users',
      error: error.message
    });
  }
};

// Create new admin user
const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create new admin user (password will be hashed by pre-save middleware)
    const newAdmin = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: password,
      role: 'admin',
      isActive: true,
      emailVerified: true // Auto-verify admin accounts
    });

    await newAdmin.save();

    // Return admin data without password
    const adminData = await User.findById(newAdmin._id).select('-password');


    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      admin: adminData
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
};

// Update admin user
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;
    const currentAdminId = req.user?.id;

    // Prevent admin from deactivating themselves
    if (id === currentAdminId && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Check if email already exists (excluding current user)
    if (email) {
      const existingUser = await User.findOne({
        _id: { $ne: id },
        email: email.toLowerCase()
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update admin
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedAdmin = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }


    res.json({
      success: true,
      message: 'Admin user updated successfully',
      admin: updatedAdmin
    });

  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin user',
      error: error.message
    });
  }
};

// Reset admin password
const resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatedAdmin = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }


    res.json({
      success: true,
      message: 'Admin password reset successfully'
    });

  } catch (error) {
    console.error('Error resetting admin password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset admin password',
      error: error.message
    });
  }
};

// Delete admin user
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user?.id;

    // Prevent admin from deleting themselves
    if (id === currentAdminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const deletedAdmin = await User.findByIdAndDelete(id);

    if (!deletedAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }


    res.json({
      success: true,
      message: 'Admin user deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin user',
      error: error.message
    });
  }
};

module.exports = {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  resetAdminPassword,
  deleteAdmin
};
