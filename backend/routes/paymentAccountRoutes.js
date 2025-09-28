const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const {
  getAllPaymentAccounts,
  getActivePaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  getPaymentAccount
} = require('../controllers/paymentAccountController');

const router = express.Router();

// Ensure qr-codes upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'qr-codes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for QR code image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, name);
  }
});

// File filter for QR code images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Public routes
router.get('/active', getActivePaymentAccounts);

// Admin only routes
router.get('/', authenticateToken, authenticateAdmin, getAllPaymentAccounts);
router.get('/:id', authenticateToken, authenticateAdmin, getPaymentAccount);
router.post('/', 
  authenticateToken, 
  authenticateAdmin, 
  upload.single('qrCode'), 
  createPaymentAccount
);
router.put('/:id', 
  authenticateToken, 
  authenticateAdmin, 
  upload.single('qrCode'), 
  updatePaymentAccount
);
router.delete('/:id', authenticateToken, authenticateAdmin, deletePaymentAccount);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;
