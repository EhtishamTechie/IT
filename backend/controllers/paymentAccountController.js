const PaymentAccount = require('../models/PaymentAccount');
const path = require('path');
const fs = require('fs');

// Get all payment accounts (admin only)
const getAllPaymentAccounts = async (req, res) => {
  try {
    const accounts = await PaymentAccount.find()
      .populate('createdBy', 'name email')
      .sort({ displayOrder: 1, createdAt: -1 });
    
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error fetching payment accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment accounts',
      error: error.message
    });
  }
};

// Get active payment accounts (public)
const getActivePaymentAccounts = async (req, res) => {
  try {
    const accounts = await PaymentAccount.getActiveAccounts();
    
    // Add full URL for QR codes
    const accountsWithUrls = accounts.map(account => ({
      ...account.toObject(),
      qrCodeUrl: `${req.protocol}://${req.get('host')}/${account.qrCode}`
    }));
    
    res.json({
      success: true,
      data: accountsWithUrls
    });
  } catch (error) {
    console.error('Error fetching active payment accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active payment accounts',
      error: error.message
    });
  }
};

// Create new payment account (admin only)
const createPaymentAccount = async (req, res) => {
  try {
    const { title, accountNumber, paymentType, instructions, displayOrder } = req.body;
    
    // Validate required fields
    if (!title || !accountNumber || !paymentType) {
      return res.status(400).json({
        success: false,
        message: 'Title, account number, and payment type are required'
      });
    }
    
    // Check if QR code file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'QR code image is required'
      });
    }
    
    // Create new payment account
    const paymentAccount = new PaymentAccount({
      title,
      accountNumber,
      paymentType,
      qrCode: `uploads/qr-codes/${req.file.filename}`, // Store just the relative path
      instructions: instructions || 'Please transfer the advance payment and upload the receipt screenshot.',
      displayOrder: displayOrder || 0,
      createdBy: req.user.id || req.user.userId
    });
    
    const savedAccount = await paymentAccount.save();
    await savedAccount.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Payment account created successfully',
      data: savedAccount
    });
  } catch (error) {
    console.error('Error creating payment account:', error);
    
    // Clean up uploaded file if account creation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment account',
      error: error.message
    });
  }
};

// Update payment account (admin only)
const updatePaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, accountNumber, paymentType, instructions, displayOrder, isActive } = req.body;
    
    const account = await PaymentAccount.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Payment account not found'
      });
    }
    
    // Update fields
    if (title !== undefined) account.title = title;
    if (accountNumber !== undefined) account.accountNumber = accountNumber;
    if (paymentType !== undefined) account.paymentType = paymentType;
    if (instructions !== undefined) account.instructions = instructions;
    if (displayOrder !== undefined) account.displayOrder = displayOrder;
    if (isActive !== undefined) account.isActive = isActive;
    
    // Update QR code if new file uploaded
    if (req.file) {
      // Delete old QR code file
      const oldQrPath = path.join(__dirname, '..', account.qrCode);
      if (fs.existsSync(oldQrPath)) {
        fs.unlinkSync(oldQrPath);
      }
      
      account.qrCode = `uploads/qr-codes/${req.file.filename}`;
    }
    
    const updatedAccount = await account.save();
    await updatedAccount.populate('createdBy', 'name email');
    
    res.json({
      success: true,
      message: 'Payment account updated successfully',
      data: updatedAccount
    });
  } catch (error) {
    console.error('Error updating payment account:', error);
    
    // Clean up uploaded file if update failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update payment account',
      error: error.message
    });
  }
};

// Delete payment account (admin only)
const deletePaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await PaymentAccount.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Payment account not found'
      });
    }
    
    // Delete QR code file
    const qrPath = path.join(__dirname, '..', account.qrCode);
    if (fs.existsSync(qrPath)) {
      fs.unlinkSync(qrPath);
    }
    
    await PaymentAccount.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Payment account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment account',
      error: error.message
    });
  }
};

// Get single payment account (admin only)
const getPaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await PaymentAccount.findById(id)
      .populate('createdBy', 'name email');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Payment account not found'
      });
    }
    
    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error fetching payment account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment account',
      error: error.message
    });
  }
};

module.exports = {
  getAllPaymentAccounts,
  getActivePaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  getPaymentAccount
};
