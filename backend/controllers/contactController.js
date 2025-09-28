const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'internationaltijarat.com@gmail.com',
    pass: process.env.EMAIL_PASS || 'ehzq rwnf qjdd rfbs'
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'internationaltijarat.com@gmail.com',
      to,
      subject,
      html
    });
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message, inquiryType } = req.body;

    console.log('📧 [CONTACT] New contact submission:', {
      name,
      email,
      subject,
      inquiryType
    });

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, subject, message)'
      });
    }

    // Create contact record
    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
      inquiryType: inquiryType || 'general',
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    };

    const contact = new Contact(contactData);
    await contact.save();

    console.log('✅ [CONTACT] Contact saved successfully:', contact._id);

    // Set priority based on inquiry type
    if (inquiryType === 'technical' || inquiryType === 'billing') {
      contact.priority = 'high';
      await contact.save();
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent successfully. We will respond within 24 hours.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [CONTACT] Submission error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting contact form. Please try again later.',
      error: error.message
    });
  }
};

// @desc    Get all contacts (Admin only)
// @route   GET /api/admin/contacts
// @access  Private (Admin)
const getAllContacts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      inquiryType, 
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (inquiryType) {
      query.inquiryType = inquiryType;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const contacts = await Contact.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email');

    const total = await Contact.countDocuments(query);

    console.log(`📧 [ADMIN] Retrieved ${contacts.length} contacts, total: ${total}`);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalContacts: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
};

// @desc    Get single contact (Admin only)
// @route   GET /api/admin/contacts/:id
// @access  Private (Admin)
const getContact = async (req, res) => {
  try {
    const contactId = req.params.id;

    const contact = await Contact.findById(contactId)
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    console.log('📧 [ADMIN] Retrieved contact:', contact._id);

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('❌ [ADMIN] Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact details',
      error: error.message
    });
  }
};

// @desc    Update contact status (Admin only)
// @route   PUT /api/admin/contacts/:id
// @access  Private (Admin)
const updateContact = async (req, res) => {
  try {
    const contactId = req.params.id;
    const { status, priority, adminNotes, assignedTo, adminResponse } = req.body;
    const adminId = req.user?.id || req.user?.userId;

    const contact = await Contact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Update fields
    if (status) {
      contact.status = status;
      if (status === 'resolved') {
        contact.resolvedAt = new Date();
        contact.resolvedBy = adminId;
      }
    }
    
    if (priority) {
      contact.priority = priority;
    }
    
    if (adminNotes) {
      contact.adminNotes = adminNotes;
    }

    if (adminResponse) {
      contact.adminResponse = adminResponse;
    }
    
    if (assignedTo) {
      contact.assignedTo = assignedTo;
      if (contact.status === 'new') {
        contact.status = 'in-progress';
      }
    }

    await contact.save();

    // Send email response if adminResponse is provided
    if (adminResponse && contact.email) {
      try {
        const emailSubject = `Re: ${contact.subject} - Response from International Tijarat`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin-bottom: 10px;">Thank you for contacting International Tijarat</h2>
              <p style="color: #6b7280; margin: 0;">We have reviewed your message and are pleased to provide you with a response.</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin-bottom: 15px;">Your Original Message:</h3>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${contact.subject}</p>
                <p style="margin: 0;"><strong>Message:</strong> ${contact.message}</p>
              </div>
              
              <h3 style="color: #374151; margin-bottom: 15px;">Our Response:</h3>
              <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; border-radius: 6px;">
                <p style="margin: 0; line-height: 1.6;">${adminResponse.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0;">If you have any further questions, please don't hesitate to contact us.</p>
              <p style="color: #374151; margin: 0;"><strong>International Tijarat Support Team</strong></p>
            </div>
          </div>
        `;

        await sendEmail(contact.email, emailSubject, emailHtml);
        console.log('✅ [EMAIL] Admin response sent to customer:', contact.email);
      } catch (emailError) {
        console.error('❌ [EMAIL] Failed to send admin response:', emailError);
        // Don't fail the update if email fails
      }
    }

    const updatedContact = await Contact.findById(contactId)
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email');

    console.log('✅ [ADMIN] Contact updated:', contact._id);

    res.json({
      success: true,
      message: 'Contact updated successfully' + (adminResponse ? ' and response email sent' : ''),
      data: updatedContact
    });

  } catch (error) {
    console.error('❌ [ADMIN] Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
};

// @desc    Delete contact (Admin only)
// @route   DELETE /api/admin/contacts/:id
// @access  Private (Admin)
const deleteContact = async (req, res) => {
  try {
    const contactId = req.params.id;

    const contact = await Contact.findByIdAndDelete(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    console.log('🗑️ [ADMIN] Contact deleted:', contactId);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('❌ [ADMIN] Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
};

// @desc    Get contact statistics (Admin only)
// @route   GET /api/admin/contacts/stats
// @access  Private (Admin)
const getContactStats = async (req, res) => {
  try {
    // Get basic stats
    const totalContacts = await Contact.countDocuments();
    const newContacts = await Contact.countDocuments({ status: 'new' });
    const inProgressContacts = await Contact.countDocuments({ status: 'in_progress' });
    const resolvedContacts = await Contact.countDocuments({ status: 'resolved' });
    
    // Get inquiry type breakdown
    const inquiryTypeStats = await Contact.aggregate([
      {
        $group: {
          _id: '$inquiryType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get priority breakdown
    const priorityStats = await Contact.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await Contact.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    console.log(`📧 [ADMIN] Contact stats - Total: ${totalContacts}, New: ${newContacts}, InProgress: ${inProgressContacts}, Resolved: ${resolvedContacts}`);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalContacts,
          new: newContacts,
          inProgress: inProgressContacts,
          resolved: resolvedContacts
        },
        inquiryTypes: inquiryTypeStats,
        priorities: priorityStats,
        recentActivity
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Get contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact statistics',
      error: error.message
    });
  }
};

module.exports = {
  submitContact,
  getAllContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats
};
