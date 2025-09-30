const UsedProduct = require('../models/UsedProduct');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { validateWhatsAppNumber, formatWhatsAppNumber } = require('../utils/whatsappUtils');
const { getImageUrl } = require('../config/serverConfig');
const { emailService } = require('../services/emailService');

// Helper function to transform used product data with normalized image URLs

// Helper function to transform used product data with normalized image URLs
const transformUsedProductData = (product) => {
  if (!product) return null;
  
  const productObj = product.toObject ? product.toObject() : { ...product };
  
  return {
    ...productObj,
    images: productObj.images ? productObj.images.map(img => getImageUrl('usedProducts', img)) : []
  };
};

// Configure email transporter with fallback for development
const transporter = emailService.transporter || nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'shami537uet@gmail.com',
    pass: process.env.EMAIL_PASS || 'vjlk swal olbh bopt'
  }
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/used-products');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'used-product-' + uniqueSuffix + path.extname(file.originalname);
    // Just store the filename
    if (!req.uploadedFiles) req.uploadedFiles = [];
    req.uploadedFiles.push(filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 6 // Maximum 6 images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Submit Used Product Request
const submitUsedProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      price,
      condition,
      contactPhone,
      contactEmail,
      location,
      yearOfPurchase,
      brand,
      model
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !price || !condition || !contactPhone || !contactEmail || !location) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate WhatsApp number format
    if (!validateWhatsAppNumber(contactPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid WhatsApp number (e.g., +923001234567, 923001234567, or 03001234567)'
      });
    }

    // Format the WhatsApp number for consistent storage
    const formattedPhone = formatWhatsAppNumber(contactPhone);

    // Get uploaded filenames
    const images = req.files ? req.files.map(file => file.filename) : [];
    
    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }

    // Create new used product request
    const usedProduct = new UsedProduct({
      user: req.user.id,
      title,
      description,
      category,
      price: parseFloat(price),
      condition,
      contactPhone: formattedPhone,
      contactEmail,
      location,
      images,
      yearOfPurchase: yearOfPurchase ? parseInt(yearOfPurchase) : undefined,
      brand,
      model,
      status: 'pending'
    });

    await usedProduct.save();

    // Transform product to include full image URLs
    const transformedProduct = transformUsedProductData(usedProduct);

    try {
      // Send confirmation email to user
      await sendConfirmationEmail(req.user.email, usedProduct);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the submission if email fails
    }

    try {
      // Notify admin (optional)
      await notifyAdminNewSubmission(usedProduct);
    } catch (emailError) {
      console.error('Error notifying admin:', emailError);
      // Don't fail the submission if admin notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Used product submitted successfully! We will review it within 24-48 hours.',
      data: transformedProduct
    });

  } catch (error) {
    console.error('Submit used product error:', error);
    
    // If it's not an email error, it's a more serious issue
    if (error.code !== 'EAUTH') {
      res.status(500).json({
        success: false,
        message: 'Error submitting used product',
        error: error.message
      });
    } else {
      // If it's an email error, the product was still saved
      res.status(201).json({
        success: true,
        message: 'Used product submitted successfully, but there was an issue sending email notifications.',
        data: transformUsedProductData(usedProduct)
      });
    }
  }
};

// Get all approved used products (Public)
const getApprovedUsedProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, condition, page = 1, limit = 12, sort = '-createdAt' } = req.query;
    
    const filter = { status: 'approved' };
    
    // Apply filters
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (condition && condition !== 'all') {
      filter.condition = condition;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const usedProducts = await UsedProduct.find(filter)
      .populate('user', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UsedProduct.countDocuments(filter);

    // Transform products to include full image URLs
    const transformedProducts = usedProducts.map(transformUsedProductData);

    res.json({
      success: true,
      data: transformedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get approved used products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching used products',
      error: error.message
    });
  }
};

// Get single used product details
const getUsedProductById = async (req, res) => {
  try {
    const usedProduct = await UsedProduct.findById(req.params.id)
      .populate('user', 'firstName lastName email phone');

    if (!usedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Used product not found'
      });
    }

    // Only show approved products to public, or owned products to the user
    if (usedProduct.status !== 'approved' && usedProduct.user._id.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Increment view count
    await UsedProduct.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    // Transform product to include full image URLs
    const transformedProduct = transformUsedProductData(usedProduct);

    res.json({
      success: true,
      data: transformedProduct
    });

  } catch (error) {
    console.error('Get used product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching used product details',
      error: error.message
    });
  }
};

// Get single used product details (Public access for approved products only)
const getUsedProductByIdPublic = async (req, res) => {
  try {
    const usedProduct = await UsedProduct.findById(req.params.id)
      .populate('user', 'firstName lastName');

    if (!usedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Used product not found'
      });
    }

    // Only show approved products to public
    if (usedProduct.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Product not available for public viewing'
      });
    }

    // Increment view count
    await UsedProduct.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    // Transform product to include full image URLs
    const transformedProduct = transformUsedProductData(usedProduct);

    res.json({
      success: true,
      data: transformedProduct
    });

  } catch (error) {
    console.error('Get used product by ID (public) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching used product details',
      error: error.message
    });
  }
};

// Get user's used product submissions
const getUserUsedProducts = async (req, res) => {
  try {
    const usedProducts = await UsedProduct.find({ user: req.user.id })
      .sort('-createdAt');

    // Transform products to include full image URLs
    const transformedProducts = usedProducts.map(transformUsedProductData);

    res.json({
      success: true,
      data: transformedProducts
    });

  } catch (error) {
    console.error('Get user used products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your used products',
      error: error.message
    });
  }
};

// ADMIN FUNCTIONS

// Get pending used product requests
const getPendingRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pendingRequests = await UsedProduct.find({ status: 'pending' })
      .populate('user', 'firstName lastName email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UsedProduct.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: pendingRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending requests',
      error: error.message
    });
  }
};

// Approve used product request
const approveUsedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const usedProduct = await UsedProduct.findById(id).populate('user');
    
    if (!usedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Used product not found'
      });
    }

    if (usedProduct.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Product has already been reviewed'
      });
    }

    // Images are already in the final location, no need to move them
    // Just ensure the directory exists for consistency
    try {
      await fs.mkdir(path.join(__dirname, '../uploads/used-products'), { recursive: true });
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
    }

    // Update status
    usedProduct.status = 'approved';
    usedProduct.approvedBy = req.user.id;
    usedProduct.approvedAt = new Date();
    if (adminNotes) usedProduct.adminNotes = adminNotes;

    await usedProduct.save();

    // Send approval email
    await sendApprovalEmail(usedProduct.user.email, usedProduct);

    res.json({
      success: true,
      message: 'Used product approved successfully',
      data: usedProduct
    });

  } catch (error) {
    console.error('Approve used product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving used product',
      error: error.message
    });
  }
};

// Reject used product request
const rejectUsedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const usedProduct = await UsedProduct.findById(id).populate('user');
    
    if (!usedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Used product not found'
      });
    }

    if (usedProduct.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Product has already been reviewed'
      });
    }

    // Delete images from temp directory
    const promises = usedProduct.images.map(async (imagePath) => {
      const filename = path.basename(imagePath);
      const tempPath = path.join(__dirname, '../uploads/temp', filename);
      
      try {
        await fs.unlink(tempPath);
      } catch (error) {
        console.error('Error deleting temp file:', error);
        // Ignore if file doesn't exist
      }
    });
    
    await Promise.all(promises);

    // Update status
    usedProduct.status = 'rejected';
    usedProduct.rejectedAt = new Date();
    if (adminNotes) usedProduct.adminNotes = adminNotes;

    await usedProduct.save();

    // Send rejection email
    await sendRejectionEmail(usedProduct.user.email, usedProduct, adminNotes);

    res.json({
      success: true,
      message: 'Used product rejected',
      data: usedProduct
    });

  } catch (error) {
    console.error('Reject used product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting used product',
      error: error.message
    });
  }
};



// EMAIL FUNCTIONS

const sendConfirmationEmail = async (email, usedProduct) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Used Product Submission Received - International Tijarat',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9900;">Thank you for your submission!</h2>
          <p>We have received your used product listing request for:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #333; margin: 0;">${usedProduct.title}</h3>
            <p style="color: #666; margin: 5px 0;">Category: ${usedProduct.category}</p>
            <p style="color: #666; margin: 5px 0;">Price: $${usedProduct.price}</p>
          </div>
          <p>Our team will review your submission within 24-48 hours. You will receive an email notification once the review is complete.</p>
          <p>Thank you for choosing International Tijarat!</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
};

const sendApprovalEmail = async (email, usedProduct) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Used Product Listing Has Been Approved! - International Tijarat',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Congratulations! Your listing is now live!</h2>
          <p>Your used product listing has been approved and is now visible on our website:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #333; margin: 0;">${usedProduct.title}</h3>
            <p style="color: #666; margin: 5px 0;">Category: ${usedProduct.category}</p>
            <p style="color: #666; margin: 5px 0;">Price: $${usedProduct.price}</p>
          </div>
          ${usedProduct.adminNotes ? `<p><strong>Admin Notes:</strong> ${usedProduct.adminNotes}</p>` : ''}
          <p>Your listing is now visible to potential buyers. You should start receiving inquiries soon!</p>
          <p>Thank you for choosing International Tijarat!</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
};

const sendRejectionEmail = async (email, usedProduct, reason) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Used Product Listing Update - International Tijarat',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Listing Review Update</h2>
          <p>Thank you for submitting your used product listing. After review, we are unable to approve the following listing at this time:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #333; margin: 0;">${usedProduct.title}</h3>
            <p style="color: #666; margin: 5px 0;">Category: ${usedProduct.category}</p>
            <p style="color: #666; margin: 5px 0;">Price: $${usedProduct.price}</p>
          </div>
          ${reason ? `<div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <strong>Reason:</strong> ${reason}
          </div>` : ''}
          <p>You can submit a new listing with updated information if you wish to try again.</p>
          <p>Thank you for your understanding.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
};

const notifyAdminNewSubmission = async (usedProduct) => {
  try {
    // Use default admin email if no custom admin emails are specified
    const defaultAdminEmail = 'shami537uet@gmail.com';
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').filter(email => email.trim()) || [defaultAdminEmail];
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmails.join(','),
      subject: 'New Used Product Submission - International Tijarat Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9900;">New Used Product Submission</h2>
          <p>A new used product listing has been submitted and requires review:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #333; margin: 0;">${usedProduct.title}</h3>
            <p style="color: #666; margin: 5px 0;">Category: ${usedProduct.category}</p>
            <p style="color: #666; margin: 5px 0;">Price: $${usedProduct.price}</p>
            <p style="color: #666; margin: 5px 0;">Submitted: ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Please review this submission in the admin panel.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error notifying admin:', error);
    throw error; // Re-throw to handle at the route level
  }
};

// Get all used products for admin with stats and pagination
const getUsedProductsForAdmin = async (req, res) => {
  try {
    console.log('📋 getUsedProductsForAdmin - Starting execution');
    console.log('📋 Query params:', req.query);
    
    const { 
      status, 
      page = 1, 
      limit = 10, 
      search = '' 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('📋 Parsed params:', { status, page, limit, search, skip });
    
    // Build filter
    let filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('📋 Filter:', filter);

    // Get products with pagination
    const products = await UsedProduct.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('📋 Products found:', products.length);

    // Transform products to include full image URLs
    const transformedProducts = products.map(transformUsedProductData);

    // Get total count for pagination
    const total = await UsedProduct.countDocuments(filter);
    
    console.log('📋 Total products:', total);
    
    // Get statistics
    const stats = await UsedProduct.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statsObj = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: total
    };
    
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
    });

    console.log('📋 Stats:', statsObj);

    const response = {
      success: true,
      products: transformedProducts,
      stats: statsObj,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalCount: total
    };

    console.log('📋 Sending response:', response);

    res.json(response);

  } catch (error) {
    console.error('Error fetching used products for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching used products',
      error: error.message
    });
  }
};

// Get single used product for admin with full details
const getUsedProductByIdForAdmin = async (req, res) => {
  try {
    const product = await UsedProduct.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('approvedBy', 'firstName lastName email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Used product not found'
      });
    }

    // Transform product to include full image URLs
    const transformedProduct = transformUsedProductData(product);

    res.json(transformedProduct);

  } catch (error) {
    console.error('Error fetching used product details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product details',
      error: error.message
    });
  }
};

// User functions to manage their products

// Mark product as sold
const markProductAsSold = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const product = await UsedProduct.findOne({ _id: id, user: userId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to update it'
      });
    }

    if (product.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved products can be marked as sold'
      });
    }

    product.status = 'sold';
    product.soldDate = new Date();
    await product.save();

    res.json({
      success: true,
      message: 'Product marked as sold successfully',
      data: transformUsedProductData(product)
    });

  } catch (error) {
    console.error('Mark product as sold error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking product as sold',
      error: error.message
    });
  }
};

// Update product price
const updateProductPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const userId = req.user.id;

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    const product = await UsedProduct.findOne({ _id: id, user: userId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to update it'
      });
    }

    if (product.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved products can have their price updated'
      });
    }

    if (price >= product.price) {
      return res.status(400).json({
        success: false,
        message: 'New price must be lower than current price'
      });
    }

    const oldPrice = product.price;
    product.price = parseFloat(price);
    product.priceHistory = product.priceHistory || [];
    product.priceHistory.push({
      oldPrice,
      newPrice: product.price,
      changedAt: new Date()
    });

    await product.save();

    res.json({
      success: true,
      message: 'Product price updated successfully',
      data: transformUsedProductData(product)
    });

  } catch (error) {
    console.error('Update product price error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product price',
      error: error.message
    });
  }
};

// Get all used products for admin with pagination
const getAllUsedProductsAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      category = 'all' 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      filter.status = status;
    }

    if (category !== 'all') {
      filter.category = category;
    }

    const products = await UsedProduct.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await UsedProduct.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: products.map(transformUsedProductData),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get all used products admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching used products',
      error: error.message
    });
  }
};

// Delete used product (Admin only)
const deleteUsedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Admin delete request for used product:', id);

    // Find the product first to get image filenames for cleanup
    const product = await UsedProduct.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Used product not found'
      });
    }

    // Delete images from filesystem
    if (product.images && product.images.length > 0) {
      const uploadPath = path.join(__dirname, '../uploads/used-products');
      for (const imageName of product.images) {
        try {
          const imagePath = path.join(uploadPath, imageName);
          await fs.unlink(imagePath);
          console.log('🗑️ Deleted image file:', imageName);
        } catch (imageError) {
          console.warn('⚠️ Could not delete image file:', imageName, imageError.message);
        }
      }
    }

    // Delete the product from database
    await UsedProduct.findByIdAndDelete(id);

    console.log('✅ Used product deleted successfully:', id);

    res.json({
      success: true,
      message: 'Used product deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete used product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting used product',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  submitUsedProduct,
  getApprovedUsedProducts,
  getUsedProductById,
  getUsedProductByIdPublic,
  getUserUsedProducts,
  getPendingRequests,
  approveUsedProduct,
  rejectUsedProduct,
  deleteUsedProduct,
  getAllUsedProductsAdmin,
  getUsedProductsForAdmin,
  getUsedProductByIdForAdmin,
  markProductAsSold,
  updateProductPrice
};
