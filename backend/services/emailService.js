const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    // Check if we're in development mode with placeholder credentials
    this.isDevelopmentMode = !process.env.EMAIL_USER || 
                             process.env.EMAIL_USER === 'your-email@gmail.com' ||
                             !process.env.EMAIL_PASS ||
                             process.env.EMAIL_PASS === 'your-app-password' ||
                             process.env.EMAIL_USER === 'shami537uet@gmail.com';

    if (!this.isDevelopmentMode) {
      // Configure email transporter for production with enhanced settings
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Fixed: was EMAIL_PASSWORD, now EMAIL_PASS
        },
        // Enhanced configuration for better error detection
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000,    // 5 seconds
        socketTimeout: 15000,     // 15 seconds
        pool: false,              // Disable connection pooling for immediate error detection
        maxConnections: 1,
        maxMessages: 1,
        secure: true,             // Use SSL/TLS
        requireTLS: true,         // Require TLS encryption
        tls: {
          rejectUnauthorized: true // Strict certificate validation
        },
        // Enable debug mode in development for better error tracking
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      });
    } else {
      console.log('📧 EmailService: Running in DEVELOPMENT MODE (emails will be simulated)');
      console.log('📧 To enable real emails, configure EMAIL_USER and EMAIL_PASS in .env file');
      console.log('📧 Gmail setup instructions:');
      console.log('   1. Enable 2-Factor Authentication on Gmail');
      console.log('   2. Generate App Password: Google Account → Security → App Passwords');
      console.log('   3. Use App Password (not regular password) in EMAIL_PASS');
    }
  }

  /**
   * Generate 6-digit OTP
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Validate email address format and basic domain structure
   */
  validateEmailAddress(email) {
    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format. Please enter a valid email address.' };
    }

    // Check for common typos in popular domains
    const commonDomainTypos = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com'
    };

    const [localPart, domain] = email.split('@');
    const lowerDomain = domain.toLowerCase();
    
    if (commonDomainTypos[lowerDomain]) {
      return { 
        valid: false, 
        error: `Did you mean ${localPart}@${commonDomainTypos[lowerDomain]}?`,
        suggestion: `${localPart}@${commonDomainTypos[lowerDomain]}`
      };
    }

    // Check for obviously fake or test domains
    const suspiciousDomains = ['example.com', 'test.com', 'fake.com', 'invalid.com', 'dummy.com'];
    if (suspiciousDomains.includes(lowerDomain)) {
      return { valid: false, error: 'Please enter a real email address.' };
    }

    // Additional validation for domain structure
    if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
      return { valid: false, error: 'Invalid email domain format.' };
    }

    return { valid: true };
  }

  /**
   * Check if email domain has MX record (basic deliverability check)
   */
  async validateEmailDomain(email) {
    try {
      const dns = require('dns').promises;
      const domain = email.split('@')[1];
      
      // Check if domain has MX records
      const mxRecords = await dns.resolveMx(domain);
      
      if (!mxRecords || mxRecords.length === 0) {
        return { valid: false, error: 'Email domain does not accept emails.' };
      }
      
      return { valid: true };
    } catch (error) {
      // If DNS lookup fails, it might be a network issue or invalid domain
      if (error.code === 'ENOTFOUND') {
        return { valid: false, error: 'Email domain not found. Please check your email address.' };
      }
      
      // For other DNS errors, allow the email to proceed but log the issue
      console.warn('DNS validation warning for', email, ':', error.message);
      return { valid: true }; // Don't block on DNS issues
    }
  }

  /**
   * Advanced email verification using SMTP connection test
   * This attempts to verify if the email address exists without sending a message
   */
  async verifyEmailExists(email) {
    try {
      const net = require('net');
      const dns = require('dns').promises;
      
      const domain = email.split('@')[1];
      
      // Get MX records for the domain
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return { valid: false, error: 'Email domain does not accept emails.' };
      }
      
      // Sort MX records by priority (lower number = higher priority)
      mxRecords.sort((a, b) => a.priority - b.priority);
      
      // Try to connect to the primary MX server
      const primaryMX = mxRecords[0].exchange;
      
      return new Promise((resolve) => {
        const socket = net.createConnection(25, primaryMX);
        
        // Set timeout for the verification process
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({ valid: true }); // Don't block on timeout, but log it
          console.warn('SMTP verification timeout for', email, 'on server', primaryMX);
        }, 5000); // 5 second timeout
        
        let response = '';
        let step = 0;
        
        socket.on('data', (data) => {
          response += data.toString();
          
          if (step === 0 && response.includes('220')) {
            // Server ready, send HELO
            socket.write('HELO smtp-verification.test\r\n');
            step = 1;
            response = '';
          } else if (step === 1 && response.includes('250')) {
            // HELO accepted, send MAIL FROM
            socket.write('MAIL FROM:<noreply@internationaltijarat.com>\r\n');
            step = 2;
            response = '';
          } else if (step === 2 && response.includes('250')) {
            // MAIL FROM accepted, send RCPT TO
            socket.write(`RCPT TO:<${email}>\r\n`);
            step = 3;
            response = '';
          } else if (step === 3) {
            // Check response to RCPT TO
            clearTimeout(timeout);
            socket.write('QUIT\r\n');
            socket.end();
            
            if (response.includes('250') || response.includes('251')) {
              // Email address accepted
              resolve({ valid: true });
            } else if (response.includes('550') || response.includes('551') || response.includes('553')) {
              // Email address rejected
              resolve({ valid: false, error: 'Email address not found or invalid.' });
            } else {
              // Uncertain response, allow to proceed
              resolve({ valid: true });
              console.warn('Uncertain SMTP response for', email, ':', response.trim());
            }
          }
        });
        
        socket.on('error', (error) => {
          clearTimeout(timeout);
          socket.destroy();
          // Don't block on connection errors, but log them
          console.warn('SMTP verification error for', email, ':', error.message);
          resolve({ valid: true });
        });
        
        socket.on('timeout', () => {
          clearTimeout(timeout);
          socket.destroy();
          console.warn('SMTP verification connection timeout for', email);
          resolve({ valid: true });
        });
      });
      
    } catch (error) {
      console.warn('SMTP verification failed for', email, ':', error.message);
      return { valid: true }; // Don't block on verification errors
    }
  }

  /**
   * Send OTP email for customer registration
   */
  async sendCustomerVerificationOTP(email, otp, name = '') {
    // Validate email format first
    const formatValidation = this.validateEmailAddress(email);
    if (!formatValidation.valid) {
      console.error('❌ Email validation failed for customer:', email, '-', formatValidation.error);
      return { success: false, error: formatValidation.error, suggestion: formatValidation.suggestion };
    }

    // Validate email domain (with DNS check)
    const domainValidation = await this.validateEmailDomain(email);
    if (!domainValidation.valid) {
      console.error('❌ Email domain validation failed for customer:', email, '-', domainValidation.error);
      return { success: false, error: domainValidation.error };
    }

    // Advanced SMTP verification (only in production mode)
    if (!this.isDevelopmentMode) {
      console.log('🔍 Verifying email address exists:', email);
      const smtpVerification = await this.verifyEmailExists(email);
      if (!smtpVerification.valid) {
        console.error('❌ SMTP verification failed for customer:', email, '-', smtpVerification.error);
        return { success: false, error: smtpVerification.error };
      }
    }

    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Customer verification email would be sent to:', email);
      console.log('📧 [DEV MODE] OTP Code:', otp);
      console.log('📧 [DEV MODE] Customer Name:', name || 'N/A');
      console.log('📧 [DEV MODE] Simulating successful email delivery...');
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { 
        success: true, 
        messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      
      // Provide specific error messages based on SMTP error codes
      let errorMessage = 'Failed to send verification email';
      
      if (error.code === 'EENVELOPE' || error.code === 'EENVELOPE_ADDRESS') {
        errorMessage = 'Invalid email address. Please check your email and try again.';
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Email service authentication failed. Please contact support.';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.responseCode === 550) {
        errorMessage = 'Email address not found or invalid. Please check your email address.';
      } else if (error.responseCode === 554) {
        errorMessage = 'Email rejected by the server. Please contact support.';
      } else if (error.message && error.message.includes('Invalid mail command')) {
        errorMessage = 'Invalid email address format. Please enter a valid email.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Send OTP email for vendor application
   */
  async sendVendorVerificationOTP(email, otp, businessName = '') {
    // Validate email format first
    const formatValidation = this.validateEmailAddress(email);
    if (!formatValidation.valid) {
      console.error('❌ Email validation failed for vendor:', email, '-', formatValidation.error);
      return { success: false, error: formatValidation.error, suggestion: formatValidation.suggestion };
    }

    // Validate email domain (with DNS check)
    const domainValidation = await this.validateEmailDomain(email);
    if (!domainValidation.valid) {
      console.error('❌ Email domain validation failed for vendor:', email, '-', domainValidation.error);
      return { success: false, error: domainValidation.error };
    }

    // Advanced SMTP verification (only in production mode)
    if (!this.isDevelopmentMode) {
      console.log('🔍 Verifying vendor email address exists:', email);
      const smtpVerification = await this.verifyEmailExists(email);
      if (!smtpVerification.valid) {
        console.error('❌ SMTP verification failed for vendor:', email, '-', smtpVerification.error);
        return { success: false, error: smtpVerification.error };
      }
    }

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
      
      // Provide specific error messages based on SMTP error codes
      let errorMessage = 'Failed to send verification email';
      
      if (error.code === 'EENVELOPE' || error.code === 'EENVELOPE_ADDRESS') {
        errorMessage = 'Invalid email address. Please check your email and try again.';
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Email service authentication failed. Please contact support.';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.responseCode === 550) {
        errorMessage = 'Email address not found or invalid. Please check your email address.';
      } else if (error.responseCode === 554) {
        errorMessage = 'Email rejected by the server. Please contact support.';
      } else if (error.message && error.message.includes('Invalid mail command')) {
        errorMessage = 'Invalid email address format. Please enter a valid email.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Send OTP email for password reset
   */
  async sendPasswordResetOTP(email, otp, name = '') {
    // Validate email format first
    const formatValidation = this.validateEmailAddress(email);
    if (!formatValidation.valid) {
      console.error('❌ Email validation failed for password reset:', email, '-', formatValidation.error);
      return { success: false, error: formatValidation.error, suggestion: formatValidation.suggestion };
    }

    // Validate email domain (with DNS check)
    const domainValidation = await this.validateEmailDomain(email);
    if (!domainValidation.valid) {
      console.error('❌ Email domain validation failed for password reset:', email, '-', domainValidation.error);
      return { success: false, error: domainValidation.error };
    }

    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Password reset email would be sent to:', email);
      console.log('📧 [DEV MODE] OTP Code:', otp);
      console.log('📧 [DEV MODE] User Name:', name || 'N/A');
      console.log('📧 [DEV MODE] Simulating successful email delivery...');
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { 
        success: true, 
        messageId: `dev-reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      subject: 'Reset Your Password - International Tijarat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .container { background: #f9f9f9; padding: 20px; }
            .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #e74c3c; 
              text-align: center; 
              padding: 20px; 
              background: #fee; 
              border: 2px dashed #e74c3c; 
              border-radius: 8px; 
              margin: 20px 0; 
              letter-spacing: 5px;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>Hello${name ? ' ' + name : ''},</p>
              <p>We received a request to reset your password for your International Tijarat account. Use the OTP code below to proceed:</p>
              
              <div class="otp-code">${otp}</div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This OTP is valid for <strong>10 minutes only</strong></li>
                  <li>Never share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your password will remain unchanged unless you complete the reset process</li>
                </ul>
              </div>
              
              <p><strong>How to reset your password:</strong></p>
              <ol>
                <li>Enter the OTP code shown above</li>
                <li>Create a new strong password</li>
                <li>Confirm your new password</li>
                <li>You're all set!</li>
              </ol>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
              
              <p>Need help? Contact us at support@internationaltijarat.com</p>
              
              <p>Best regards,<br>International Tijarat Security Team</p>
            </div>
            <div class="footer">
              <p>© 2025 International Tijarat. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
              <p>For security reasons, this email cannot be replied to.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully to:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      
      // Provide specific error messages based on SMTP error codes
      let errorMessage = 'Failed to send password reset email';
      
      if (error.code === 'EENVELOPE' || error.code === 'EENVELOPE_ADDRESS') {
        errorMessage = 'Invalid email address. Please check your email and try again.';
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Email service authentication failed. Please contact support.';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.responseCode === 550) {
        errorMessage = 'Email address not found or invalid. Please check your email address.';
      } else if (error.responseCode === 554) {
        errorMessage = 'Email rejected by the server. Please contact support.';
      } else if (error.message && error.message.includes('Invalid mail command')) {
        errorMessage = 'Invalid email address format. Please enter a valid email.';
      }
      
      throw new Error(errorMessage);
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

  /**
   * Send vendor application confirmation email with application ID
   */
  async sendVendorApplicationConfirmation(email, businessName, applicationId) {
    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Vendor application confirmation email would be sent to:', email);
      console.log('📧 [DEV MODE] Business Name:', businessName || 'N/A');
      console.log('📧 [DEV MODE] Application ID:', applicationId);
      console.log('📧 [DEV MODE] Simulating successful email delivery...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        success: true, 
        messageId: `dev-confirmation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        developmentMode: true 
      };
    }

    // Production mode - real email sending
    const mailOptions = {
      from: {
        name: 'International Tijarat',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Vendor Application Received - International Tijarat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .container { background: #f8f9fa; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .application-id { 
              background: #e9ecef; 
              padding: 15px; 
              border-radius: 6px; 
              border-left: 4px solid #28a745; 
              margin: 20px 0; 
              font-weight: bold;
              font-size: 18px;
              color: #495057;
            }
            .next-steps { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .step { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
            .step:last-child { border-bottom: none; }
            .contact-info { background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Received Successfully!</h1>
              <p>Welcome to International Tijarat Vendor Program</p>
            </div>
            <div class="content">
              <p>Dear ${businessName || 'Vendor'},</p>
              
              <p>Thank you for submitting your vendor application to International Tijarat. We have successfully received your application and it is now under review by our team.</p>
              
              <div class="application-id">
                Your Application ID: <span style="color: #28a745;">${applicationId}</span>
              </div>
              
              <p><strong>Please save this Application ID for your records.</strong> You can use it to track the status of your application or contact our support team.</p>
              
              <div class="next-steps">
                <h3 style="color: #495057; margin-top: 0;">What happens next?</h3>
                <div class="step">
                  <strong>1. Review Process (1-3 business days)</strong><br>
                  Our team will carefully review your application, business information, and submitted documents.
                </div>
                <div class="step">
                  <strong>2. Verification & Approval</strong><br>
                  We may contact you for additional information or documentation if needed.
                </div>
                <div class="step">
                  <strong>3. Account Setup</strong><br>
                  Once approved, you'll receive login credentials and access to your vendor dashboard.
                </div>
                <div class="step">
                  <strong>4. Start Selling</strong><br>
                  Begin adding your products and start reaching thousands of customers!
                </div>
              </div>
              
              <div class="contact-info">
                <h4 style="margin-top: 0; color: #1976d2;">Need assistance?</h4>
                <p style="margin-bottom: 0;">
                  <strong>Email:</strong> vendor-support@internationaltijarat.com<br>
                  <strong>Application ID:</strong> ${applicationId}<br>
                  <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM
                </p>
              </div>
              
              <p>We appreciate your interest in joining our marketplace and look forward to working with you.</p>
              
              <p>Best regards,<br>
              <strong>International Tijarat Vendor Relations Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 International Tijarat. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Vendor application confirmation email sent to:`, email);
      console.log(`📋 Application ID: ${applicationId}`);
    } catch (error) {
      console.error('❌ Failed to send vendor application confirmation email:', error);
      throw error; // Throw error for application confirmation as it's important
    }
  }

  /**
   * Send vendor application approval email with login credentials
   */
  async sendVendorApplicationApproval(email, businessName, applicationId, password) {
    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Vendor application approval email would be sent to:', email);
      console.log('📧 [DEV MODE] Business Name:', businessName);
      console.log('📧 [DEV MODE] Application ID:', applicationId);
      console.log('📧 [DEV MODE] Password:', password);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        success: true, 
        messageId: `dev-approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        developmentMode: true 
      };
    }

    const mailOptions = {
      from: {
        name: 'International Tijarat',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🎉 Vendor Application Approved - Welcome to International Tijarat!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .container { background: #f8f9fa; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .credentials-box { 
              background: #e8f5e8; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #28a745; 
              margin: 20px 0; 
            }
            .next-steps { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .step { margin: 15px 0; padding: 15px; background: white; border-radius: 6px; border-left: 3px solid #28a745; }
            .footer { text-align: center; color: #6c757d; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations!</h1>
              <p>Your vendor application has been approved!</p>
            </div>
            <div class="content">
              <p>Dear ${businessName},</p>
              
              <p>We are excited to inform you that your vendor application (ID: <strong>${applicationId}</strong>) has been <strong>approved</strong>! Welcome to the International Tijarat family!</p>
              
              <div class="credentials-box">
                <h3 style="color: #28a745; margin-top: 0;">Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
                <p style="color: #dc3545; font-size: 14px;"><strong>Important:</strong> Please change your password after first login for security.</p>
              </div>
              
              <div class="next-steps">
                <h3 style="color: #495057; margin-top: 0;">Next Steps to Get Started:</h3>
                <div class="step">
                  <strong>1. Login to Your Dashboard</strong><br>
                  Visit our vendor portal and login with your credentials above.
                </div>
                <div class="step">
                  <strong>2. Complete Your Profile</strong><br>
                  Add your business logo, description, and contact information.
                </div>
                <div class="step">
                  <strong>3. Add Your Products</strong><br>
                  Start listing your products with images and descriptions.
                </div>
                <div class="step">
                  <strong>4. Start Selling!</strong><br>
                  Your products will be visible to thousands of customers.
                </div>
              </div>
              
              <p><strong>Vendor Portal:</strong> <a href="http://localhost:5173/vendor/login" style="color: #28a745;">http://localhost:5173/vendor/login</a></p>
              
              <p>We're here to support you every step of the way. If you have any questions, please don't hesitate to reach out.</p>
              
              <p>Welcome aboard!<br>
              <strong>The International Tijarat Team</strong></p>
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
      console.log(`✅ Vendor application approval email sent to: ${email}`);
    } catch (error) {
      console.error('❌ Failed to send vendor application approval email:', error);
      throw error;
    }
  }

  /**
   * Send vendor application rejection email
   */
  async sendVendorApplicationRejection(email, businessName, applicationId, reason) {
    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Vendor application rejection email would be sent to:', email);
      console.log('📧 [DEV MODE] Business Name:', businessName);
      console.log('📧 [DEV MODE] Application ID:', applicationId);
      console.log('📧 [DEV MODE] Reason:', reason);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        success: true, 
        messageId: `dev-rejection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        developmentMode: true 
      };
    }

    const mailOptions = {
      from: {
        name: 'International Tijarat',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Vendor Application Update - International Tijarat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
            .container { background: #f8f9fa; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .reason-box { 
              background: #ffeaa7; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #fdcb6e; 
              margin: 20px 0; 
            }
            .reapply-info { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Update</h1>
              <p>Regarding your vendor application</p>
            </div>
            <div class="content">
              <p>Dear ${businessName},</p>
              
              <p>Thank you for your interest in joining International Tijarat as a vendor. After careful review of your application (ID: <strong>${applicationId}</strong>), we regret to inform you that we cannot approve your application at this time.</p>
              
              ${reason ? `
              <div class="reason-box">
                <h3 style="color: #e17055; margin-top: 0;">Reason for Decline:</h3>
                <p>${reason}</p>
              </div>
              ` : ''}
              
              <div class="reapply-info">
                <h3 style="color: #1976d2; margin-top: 0;">Can I Reapply?</h3>
                <p>Yes! You are welcome to submit a new application in the future. Please address any concerns mentioned above and ensure all requirements are met.</p>
                <p><strong>Reapply at:</strong> <a href="http://localhost:5173/vendor/register" style="color: #1976d2;">http://localhost:5173/vendor/register</a></p>
              </div>
              
              <p>If you have any questions about this decision or need clarification on the requirements, please feel free to contact our support team.</p>
              
              <p><strong>Contact:</strong> vendor-support@internationaltijarat.com</p>
              
              <p>Thank you for your understanding.</p>
              
              <p>Best regards,<br>
              <strong>International Tijarat Vendor Relations Team</strong></p>
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
      console.log(`✅ Vendor application rejection email sent to: ${email}`);
    } catch (error) {
      console.error('❌ Failed to send vendor application rejection email:', error);
      throw error;
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(email, order) {
    const orderData = {
      orderNumber: order.orderNumber,
      customerName: order.name,
      customerEmail: order.email,
      items: order.cart || order.items || [],
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      shippingAddress: {
        address: order.address,
        city: order.city
      },
      createdAt: order.createdAt || new Date()
    };

    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Order confirmation email would be sent to:', email);
      console.log('📧 [DEV MODE] Order Number:', orderData.orderNumber);
      console.log('📧 [DEV MODE] Total Amount:', orderData.totalAmount);
      console.log('📧 [DEV MODE] Simulating successful email delivery...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, messageId: `dev-order-${Date.now()}`, developmentMode: true };
    }

    try {
      const mailOptions = {
        from: {
          name: 'International Tijarat',
          address: process.env.EMAIL_USER || 'noreply@internationaltijarat.com'
        },
        to: email,
        subject: `Order Confirmation - ${orderData.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
              .container { background: #f9f9f9; padding: 20px; }
              .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
              .content { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; }
              .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .item { padding: 10px 0; border-bottom: 1px solid #eee; }
              .total { font-size: 18px; font-weight: bold; color: #ff6b35; text-align: right; padding-top: 15px; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Order Confirmed!</h1>
                <p>Thank you for your purchase</p>
              </div>
              <div class="content">
                <h2>Order Details</h2>
                <div class="order-details">
                  <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
                  <p><strong>Customer:</strong> ${orderData.customerName}</p>
                  <p><strong>Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
                  <p><strong>Payment Method:</strong> ${orderData.paymentMethod === 'advance_payment' ? 'Advance Payment' : orderData.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : orderData.paymentMethod}</p>
                  ${orderData.paymentMethod === 'advance_payment' ? '<p><strong>Note:</strong> Your payment is under verification. You will be notified once verified.</p>' : ''}
                </div>

                <h3>Items Ordered:</h3>
                ${orderData.items.map(item => `
                  <div class="item">
                    <strong>${item.title || item.name}</strong><br>
                    Quantity: ${item.quantity} × ${item.price ? `Rs. ${item.price}` : 'Price TBD'} = Rs. ${item.quantity * (item.price || 0)}
                  </div>
                `).join('')}
                
                <div class="total">
                  Total: Rs. ${orderData.totalAmount}
                </div>

                <h3>Shipping Address:</h3>
                <p>${orderData.shippingAddress.address}<br>${orderData.shippingAddress.city}</p>

                <p>We will process your order and keep you updated on its status.</p>
                
                ${orderData.paymentMethod === 'advance_payment' ? 
                  '<p><strong>Next Steps:</strong> Our team will verify your payment receipt and update your order status within 24 hours.</p>' : 
                  '<p><strong>Next Steps:</strong> We will contact you to confirm your order and arrange delivery.</p>'
                }
              </div>
              <div class="footer">
                <p>International Tijarat - Your Trusted Online Marketplace</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Order confirmation email sent to: ${email} for order: ${orderData.orderNumber}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send order confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(email, order, newStatus, oldStatus) {
    const statusMessages = {
      'placed': 'Your order has been placed successfully',
      'confirmed': 'Your order has been confirmed',
      'processing': 'Your order is being processed',
      'shipped': 'Your order has been shipped',
      'delivered': 'Your order has been delivered',
      'cancelled': 'Your order has been cancelled',
      'payment_verified': 'Your payment has been verified',
      'pending_verification': 'Your payment is pending verification'
    };

    const statusColors = {
      'placed': '#007bff',
      'confirmed': '#28a745',
      'processing': '#ffc107',
      'shipped': '#17a2b8',
      'delivered': '#28a745',
      'cancelled': '#dc3545',
      'payment_verified': '#28a745',
      'pending_verification': '#ffc107'
    };

    // Development mode simulation
    if (this.isDevelopmentMode) {
      console.log('📧 [DEV MODE] Order status update email would be sent to:', email);
      console.log('📧 [DEV MODE] Order:', order.orderNumber);
      console.log('📧 [DEV MODE] Status change:', `${oldStatus} → ${newStatus}`);
      console.log('📧 [DEV MODE] Simulating successful email delivery...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, messageId: `dev-status-${Date.now()}`, developmentMode: true };
    }

    try {
      const mailOptions = {
        from: {
          name: 'International Tijarat',
          address: process.env.EMAIL_USER || 'noreply@internationaltijarat.com'
        },
        to: email,
        subject: `Order Update - ${order.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
              .container { background: #f9f9f9; padding: 20px; }
              .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
              .content { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; }
              .status-update { 
                background: ${statusColors[newStatus] || '#007bff'}; 
                color: white; 
                padding: 20px; 
                border-radius: 8px; 
                text-align: center; 
                margin: 20px 0; 
              }
              .order-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Order Status Update</h1>
              </div>
              <div class="content">
                <div class="status-update">
                  <h2>${statusMessages[newStatus] || 'Order status updated'}</h2>
                  <p>Order #${order.orderNumber}</p>
                </div>

                <div class="order-summary">
                  <h3>Order Summary</h3>
                  <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                  <p><strong>Customer:</strong> ${order.name}</p>
                  <p><strong>Total Amount:</strong> Rs. ${order.totalAmount}</p>
                  <p><strong>Payment Method:</strong> ${order.paymentMethod === 'advance_payment' ? 'Advance Payment' : order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : order.paymentMethod}</p>
                  <p><strong>Previous Status:</strong> ${statusMessages[oldStatus] || oldStatus}</p>
                  <p><strong>Current Status:</strong> ${statusMessages[newStatus] || newStatus}</p>
                </div>

                ${newStatus === 'payment_verified' ? `
                  <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">Payment Verified ✅</h4>
                    <p style="color: #155724; margin: 0;">Great news! Your payment has been verified and your order is now being processed.</p>
                  </div>
                ` : ''}

                ${newStatus === 'shipped' ? `
                  <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin: 0 0 10px 0;">Order Shipped 🚚</h4>
                    <p style="color: #0c5460; margin: 0;">Your order is on its way! You should receive it soon.</p>
                  </div>
                ` : ''}

                ${newStatus === 'delivered' ? `
                  <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">Order Delivered 📦</h4>
                    <p style="color: #155724; margin: 0;">Your order has been delivered! We hope you enjoy your purchase.</p>
                  </div>
                ` : ''}

                ${newStatus === 'cancelled' ? `
                  <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #721c24; margin: 0 0 10px 0;">Order Cancelled ❌</h4>
                    <p style="color: #721c24; margin: 0;">Your order has been cancelled. If you have any questions, please contact our support team.</p>
                  </div>
                ` : ''}

                <p>Thank you for shopping with International Tijarat!</p>
              </div>
              <div class="footer">
                <p>International Tijarat - Your Trusted Online Marketplace</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Order status update email sent to: ${email} for order: ${order.orderNumber} (${oldStatus} → ${newStatus})`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send order status update email:', error);
      throw error;
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
  sendPasswordResetOTP: emailService.sendPasswordResetOTP.bind(emailService),
  sendVendorApplicationConfirmation: emailService.sendVendorApplicationConfirmation.bind(emailService),
  sendVendorApplicationApproval: emailService.sendVendorApplicationApproval.bind(emailService),
  sendVendorApplicationRejection: emailService.sendVendorApplicationRejection.bind(emailService),
  sendOrderConfirmation: emailService.sendOrderConfirmation.bind(emailService),
  sendOrderStatusUpdate: emailService.sendOrderStatusUpdate.bind(emailService),
  generateOTP: emailService.generateOTP.bind(emailService),
  transporter: emailService.transporter,
  // Make the instance the default export for backward compatibility
  __esModule: true,
  default: emailService
};
