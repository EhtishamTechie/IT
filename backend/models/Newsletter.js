const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please provide a valid email address'
    ]
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    default: 'website_footer',
    enum: ['website_footer', 'popup', 'checkout', 'manual']
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ subscribedAt: -1 });
newsletterSchema.index({ isActive: 1 });

// Static method to check if email already exists
newsletterSchema.statics.isEmailSubscribed = async function(email) {
  const existingSubscription = await this.findOne({ 
    email: email.toLowerCase().trim(),
    isActive: true 
  });
  return !!existingSubscription;
};

// Static method to subscribe email
newsletterSchema.statics.subscribeEmail = async function(emailData) {
  const { email, source = 'website_footer', ipAddress, userAgent } = emailData;
  
  // Check if already subscribed
  const isSubscribed = await this.isEmailSubscribed(email);
  if (isSubscribed) {
    throw new Error('Email is already subscribed to newsletter');
  }
  
  // Create new subscription
  const subscription = new this({
    email: email.toLowerCase().trim(),
    source,
    ipAddress,
    userAgent
  });
  
  return await subscription.save();
};

// Static method to unsubscribe email
newsletterSchema.statics.unsubscribeEmail = async function(email) {
  const result = await this.updateOne(
    { email: email.toLowerCase().trim() },
    { isActive: false }
  );
  return result.modifiedCount > 0;
};

module.exports = mongoose.model('Newsletter', newsletterSchema);