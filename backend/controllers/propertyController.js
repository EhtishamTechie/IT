const Property = require('../models/Property');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { validateWhatsAppNumber, formatWhatsAppNumber } = require('../utils/whatsappUtils');
const { getImageUrl } = require('../config/serverConfig');

const normalizePropertyData = (property) => {
  const normalized = property.toObject ? property.toObject() : { ...property };
  
  if (normalized.images && Array.isArray(normalized.images)) {
    // Handle both old and new image paths
    normalized.images = normalized.images.map(img => {
      // If it's already a full URL, return as is
      if (img.startsWith('http')) return img;
      
      // Clean the path
      const filename = img.replace(/^\/+/, '')          // Remove leading slashes
                         .replace(/^uploads\/+/, '')     // Remove uploads/ prefix
                         .replace(/^properties\/+/, ''); // Remove properties/ prefix
      
      // Always use the properties directory for consistency with leading slash
      return `/uploads/properties/${filename}`;
    });
  }
  
  return normalized;
};

// Submit Property Listing
const submitProperty = async (req, res) => {
  try {
    console.log('Property submission request received');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    if (!req.user || !req.user.userId) {
      console.error('No user information in request');
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const {
      title,
      description,
      propertyType,
      price,
      areaValue,
      areaUnit,
      area,
      bedrooms,
      bathrooms,
      propertyAge,
      furnishing,
      address,
      city,
      area_name,
      features,
      listingType,
      sellerContact
    } = req.body;

    // Handle area data - could come as separate areaValue/areaUnit or as structured area object
    let areaData;
    try {
      if (area) {
        areaData = typeof area === 'string' ? JSON.parse(area) : area;
        console.log('Area data from structured object:', areaData);
      } else if (req.body.areaValue && req.body.areaUnit) {
        areaData = {
          value: parseFloat(req.body.areaValue),
          unit: req.body.areaUnit
        };
        console.log('Area data from separate fields:', areaData);
      } else {
        console.log('Missing area information. Body:', req.body);
        return res.status(400).json({
          success: false,
          message: 'Area information is required (either area object or areaValue+areaUnit)'
        });
      }
    } catch (error) {
      console.error('Error handling area data:', error);
      console.log('Raw area data:', area);
      return res.status(400).json({
        success: false,
        message: 'Invalid area data format'
      });
    }

    // Parse seller contact info
    let contactInfo;
    try {
      contactInfo = typeof sellerContact === 'string' ? JSON.parse(sellerContact) : sellerContact;
      if (!contactInfo || typeof contactInfo !== 'object') {
        throw new Error('Invalid seller contact format');
      }
    } catch (error) {
      console.error('Error parsing seller contact:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid seller contact data'
      });
    }

    // Extract seller info
    const sellerName = contactInfo.name;
    const sellerPhone = contactInfo.phone;
    const sellerEmail = contactInfo.email;

    // Validate required fields
    if (!title || !description || !propertyType || !price || !areaData.value || !areaData.unit || 
        !address || !city || !req.body.area_name || !sellerName || !sellerPhone || !sellerEmail) {
      console.error('Missing required fields:', {
        title: !title,
        description: !description,
        propertyType: !propertyType,
        price: !price,
        areaValue: !areaData.value,
        areaUnit: !areaData.unit,
        address: !address,
        city: !city,
        area_name: !req.body.area_name,
        sellerName: !sellerName,
        sellerPhone: !sellerPhone,
        sellerEmail: !sellerEmail
      });
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Validate WhatsApp number
    if (!validateWhatsAppNumber(sellerPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid WhatsApp number for contact purposes'
      });
    }

    // Validate images
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one property image'
      });
    }

    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 images allowed per property'
      });
    }

    // Get uploaded filenames
    console.log('Processing uploaded files:', req.files);
    const imageUrls = req.files
      .filter(file => file && file.filename)
      .map(file => {
        console.log('📄 Added image:', file.filename);
        return file.filename;
      });

    // Parse features if it's a string
    let propertyFeatures = [];
    if (features) {
      try {
        propertyFeatures = typeof features === 'string' ? JSON.parse(features) : features;
      } catch (error) {
        console.error('Error parsing features:', error);
        propertyFeatures = [];
      }
    }

    // Create property listing
    console.log('Creating new property with data:', {
      title,
      propertyType,
      price,
      area: areaData,
      submittedBy: req.user.userId,
      images: imageUrls.length,
      sellerContact: req.body.sellerContact
    });
    
    const newProperty = new Property({
      title: title.trim(),
      description: description.trim(),
      propertyType,
      price: parseFloat(price),
      area: areaData,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      propertyAge,
      furnishing,
      address: address.trim(),
      city: city.trim(),
      area_name: req.body.area_name,
      features: propertyFeatures,
      sellerContact: JSON.parse(req.body.sellerContact),
      images: imageUrls,
      submittedBy: req.user.userId,
      listingType: listingType || 'Sale',
      status: 'pending'
    });

    console.log('Attempting to save property with data:', {
      title: newProperty.title,
      propertyType: newProperty.propertyType,
      price: newProperty.price,
      area: newProperty.area,
      submittedBy: newProperty.submittedBy,
      sellerContact: newProperty.sellerContact,
      area_name: newProperty.area_name,
      images: newProperty.images
    });
    
    const savedProperty = await newProperty.save();
    console.log('✅ Property saved successfully:', savedProperty._id);
    res.status(201).json({
      success: true,
      message: 'Property listing submitted successfully. It will be reviewed and published once approved.',
      data: {
        propertyId: savedProperty.propertyId,
        id: savedProperty._id,
        status: savedProperty.status
      }
    });

  } catch (error) {
    console.error('Error submitting property:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Invalid property data',
        errors: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {})
      });
    }
    
    // Clean up uploaded files if database save fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = process.env.NODE_ENV === 'production' 
          ? path.join('/tmp', file.filename)
          : path.join(__dirname, '../uploads/properties', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit property listing. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get Public Properties (Approved Only)
const getPublicProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter query
    let filter = { status: 'approved' };

    // Property type filter
    if (req.query.propertyType && req.query.propertyType !== 'all') {
      filter.propertyType = req.query.propertyType;
    }

    // City filter
    if (req.query.city) {
      filter.city = new RegExp(req.query.city, 'i');
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Bedrooms filter
    if (req.query.bedrooms && req.query.bedrooms !== 'all') {
      filter.bedrooms = parseInt(req.query.bedrooms);
    }

    // Listing type filter
    if (req.query.listingType && req.query.listingType !== 'all') {
      filter.listingType = req.query.listingType;
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price_asc':
          sortOption = { price: 1 };
          break;
        case 'price_desc':
          sortOption = { price: -1 };
          break;
        case 'area_asc':
          sortOption = { 'area.value': 1 };
          break;
        case 'area_desc':
          sortOption = { 'area.value': -1 };
          break;
        case 'featured':
          sortOption = { featured: -1, createdAt: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    const properties = await Property.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .select('-sellerContact -adminNotes') // Hide seller contact from public
      .populate('submittedBy', 'firstName lastName')
      .lean();

    const total = await Property.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Normalize all properties
    const normalizedProperties = properties.map(normalizePropertyData);

    res.json({
      success: true,
      data: normalizedProperties,
      pagination: {
        page,
        pages: totalPages,
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching public properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties'
    });
  }
};

// Get Property Details (Public)
const getPropertyDetails = async (req, res) => {
  try {
    console.log('Fetching property details for ID:', req.params.id);
    const { id } = req.params;

    // Allow access to both approved and sold properties for public viewing
    const property = await Property.findOne({ 
      _id: id,
      status: { $in: ['approved', 'sold', 'pending'] }  // Include pending for testing
    })
    .select('-adminNotes') // Only hide admin notes
    .populate('submittedBy', 'firstName lastName')
    .lean();

    if (!property) {
      console.log('Property not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Normalize the property data (including image URLs)
    const normalizedProperty = normalizePropertyData(property);

    // Increment views
    await Property.findByIdAndUpdate(id, { $inc: { views: 1 } });

    console.log('Successfully fetched property:', normalizedProperty._id);
    res.json({
      success: true,
      data: normalizedProperty
    });

  } catch (error) {
    console.error('Error fetching property details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property details'
    });
  }
};

// Get User's Properties
const getUserProperties = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const properties = await Property.find({ submittedBy: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Property.countDocuments({ submittedBy: userId });

    res.json({
      success: true,
      data: properties,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching user properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your properties'
    });
  }
};

// Update Property Price
const updatePropertyPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPrice } = req.body;
    const userId = req.user.userId;

    if (!newPrice || newPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid price'
      });
    }

    const property = await Property.findOne({ 
      _id: id, 
      submittedBy: userId 
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or you do not have permission to update it'
      });
    }

    property.price = parseFloat(newPrice);
    await property.save();

    res.json({
      success: true,
      message: 'Property price updated successfully',
      data: { price: property.price }
    });

  } catch (error) {
    console.error('Error updating property price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property price'
    });
  }
};

// Mark Property as Sold
const markPropertySold = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const property = await Property.findOne({ 
      _id: id, 
      submittedBy: userId 
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or you do not have permission to update it'
      });
    }

    property.status = 'sold';
    await property.save();

    res.json({
      success: true,
      message: 'Property marked as sold successfully'
    });

  } catch (error) {
    console.error('Error marking property as sold:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property status'
    });
  }
};

module.exports = {
  submitProperty,
  getPublicProperties,
  getPropertyDetails,
  getUserProperties,
  updatePropertyPrice,
  markPropertySold
};
