const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    // Configure email transporter with fallback credentials (same as commissionController)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'internationaltijaratco@gmail.com',
        pass: process.env.EMAIL_PASS || 'vjlk swal olbh bopt'
      }
    });
    
    console.log('📧 EmailService: Configured with email credentials');
    console.log('📧 Email User:', process.env.EMAIL_USER || 'internationaltijaratco@gmail.com');
  }

  /**
   * Generate 6-digit OTP
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Send OTP email for customer registration
   */
  async sendCustomerVerificationOTP(email, otp, name = '') {
    const mailOptions = {
      from: {
        name: 'International Tijarat',
        address: process.env.EMAIL_USER || 'internationaltijaratco@gmail.com'
      },
        address: process.env.EMAIL_USER || 'noreply@internationaltijarat.com'
      },
      to: email,
      subject: 'Verify Your Email - International Tijarat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .container { background: #f9f9f9; padding: 20px; }
            .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #ff6b35; 
              text-align: center; 
              padding: 20px; 
              background: #f8f9fa; 
              border: 2px dashed #ff6b35; 
              border-radius: 8px; 
              margin: 20px 0; 
              letter-spacing: 5px;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to International Tijarat!</h1>
            </div>
            <div class="content">
              <h2>Email Verification Required</h2>
              <p>Hello ${name ? name : 'valued customer'},</p>
              <p>Thank you for registering with International Tijarat. To complete your registration, please verify your email address using the OTP code below:</p>
              
              <div class="otp-code">${otp}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This OTP is valid for 10 minutes only</li>
                <li>Enter this code on the verification page to activate your account</li>
                <li>Do not share this code with anyone</li>
              </ul>
              
              <div class="warning">
                <strong>Security Note:</strong> If you didn't request this verification, please ignore this email or contact our support team.
              </div>
              
              <p>If you're having trouble, please contact our support team at support@internationaltijarat.com</p>
              
              <p>Best regards,<br>The International Tijarat Team</p>
            </div>
            <div class="footer">
              <p>© 2025 International Tijarat. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Customer verification email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send customer verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send OTP email for vendor application
   */
  async sendVendorVerificationOTP(email, otp, businessName = '') {
    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Vendor verification email would be sent to:', email);
      console.log('📧 [DEV MODE] OTP Code:', otp);
      console.log('📧 [DEV MODE] Business Name:', businessName || 'N/A');
      console.log('📧 [DEV MODE] Simulating successful email delivery...');
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { 
        success: true, 
        messageId: `dev-vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        developmentMode: true 
      };
    }

    // Production mode - real email sending
    const mailOptions = {
      from: {
        name: 'International Tijarat',
        address: process.env.EMAIL_USER || 'noreply@internationaltijarat.com'
      },
      to: email,
      subject: 'Verify Your Business Email - International Tijarat Vendor Application',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .container { background: #f9f9f9; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #2c3e50; 
              text-align: center; 
              padding: 20px; 
              background: #ecf0f1; 
              border: 2px dashed #2c3e50; 
              border-radius: 8px; 
              margin: 20px 0; 
              letter-spacing: 5px;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .business-info { background: #e8f6f3; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Vendor Application - Email Verification</h1>
            </div>
            <div class="content">
              <h2>Verify Your Business Email</h2>
              <p>Hello ${businessName ? 'from ' + businessName : 'prospective vendor'},</p>
              <p>Thank you for applying to become a vendor on International Tijarat. To proceed with your application, please verify your business email address using the OTP code below:</p>
              
              <div class="otp-code">${otp}</div>
              
              <div class="business-info">
                <strong>Next Steps After Verification:</strong>
                <ol>
                  <li>Complete your vendor application form</li>
                  <li>Submit required business documents</li>
                  <li>Wait for admin approval (typically 2-3 business days)</li>
                  <li>Start selling on our platform!</li>
                </ol>
              </div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This OTP is valid for 10 minutes only</li>
                <li>Use a business email address for your vendor account</li>
                <li>Keep this code confidential</li>
              </ul>
              
              <p>For vendor support, contact us at vendors@internationaltijarat.com</p>
              
              <p>Best regards,<br>International Tijarat Vendor Team</p>
            </div>
            <div class="footer">
              <p>© 2025 International Tijarat. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Vendor verification email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send vendor verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email, name, userType = 'customer') {
    const isVendor = userType === 'vendor';
    
    const mailOptions = {
      from: {
        name: 'International Tijarat',
        address: process.env.EMAIL_USER || 'noreply@internationaltijarat.com'
      },
      to: email,
      subject: `Welcome to International Tijarat${isVendor ? ' - Vendor Portal' : ''}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .container { background: #f9f9f9; padding: 20px; }
            .header { background: ${isVendor ? '#2c3e50' : '#ff6b35'}; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; }
            .cta-button { 
              display: inline-block; 
              background: ${isVendor ? '#2c3e50' : '#ff6b35'}; 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isVendor ? '🎉 Welcome Vendor Partner!' : '🎉 Welcome to International Tijarat!'}</h1>
            </div>
            <div class="content">
              <h2>Account Successfully Created!</h2>
              <p>Hello ${name},</p>
              <p>${isVendor ? 
                'Congratulations! Your email has been verified. You can now complete your vendor application and start your journey with International Tijarat.' : 
                'Welcome to International Tijarat! Your account has been successfully created and verified. You can now start shopping with us.'
              }</p>
              
              <div style="text-align: center;">
                <a href="${isVendor ? 'http://localhost:3000/vendor/login' : 'http://localhost:3000/login'}" class="cta-button">
                  ${isVendor ? 'Access Vendor Portal' : 'Start Shopping'}
                </a>
              </div>
              
              <p>${isVendor ? 
                'Next steps: Complete your vendor profile and start adding your products!' : 
                'Explore thousands of products from verified vendors worldwide.'
              }</p>
              
              <p>If you have any questions, feel free to contact our support team.</p>
              
              <p>Happy ${isVendor ? 'selling' : 'shopping'}!<br>The International Tijarat Team</p>
            </div>
            <div class="footer">
              <p>© 2025 International Tijarat. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${userType}:`, email);
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      // Don't throw error for welcome email failure
    }
  }
}

// Export singleton instance
// Create singleton instance
const emailService = new EmailService();

// Export both the instance and class for backward compatibility
module.exports = {
  emailService,
  // Add direct exports of instance methods for backward compatibility
  sendCustomerVerificationOTP: emailService.sendCustomerVerificationOTP.bind(emailService),
  sendVendorVerificationOTP: emailService.sendVendorVerificationOTP.bind(emailService),
  generateOTP: emailService.generateOTP.bind(emailService),
  transporter: emailService.transporter,
  // Make the instance the default export for backward compatibility
  __esModule: true,
  default: emailService
};
