# Email Verification System Documentation

## Overview
The email verification system provides secure OTP (One-Time Password) based email verification for both customer and vendor registration processes in the International Tijarat platform.

## System Architecture

### Backend Services

#### 1. EmailService.js
**Location**: `backend/services/emailService.js`

**Purpose**: Handles all email operations including OTP sending and email template management.

**Key Features**:
- Professional HTML email templates
- Development/Production mode detection
- NodeMailer integration with Gmail SMTP
- Error handling and logging

**Configuration**:
```javascript
// Production Configuration (from .env)
EMAIL_USER=shami537uet@gmail.com
EMAIL_PASS=vjlk swal olbh bopt
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Methods**:
- `sendCustomerVerificationOTP(email, otp, name)` - Sends OTP for customer registration
- `sendVendorVerificationOTP(email, otp, businessName)` - Sends OTP for vendor applications
- `sendWelcomeEmail(email, name, userType)` - Sends welcome email after verification

#### 2. OTPService.js
**Location**: `backend/services/OTPService.js`

**Purpose**: Manages OTP generation, storage, and verification with security features.

**Security Features**:
- 6-digit random OTP generation
- 10-minute expiration time
- Rate limiting (2-minute cooldown between requests)
- Maximum 5 verification attempts per OTP
- In-memory storage for development (recommend Redis for production)

**Methods**:
- `generateOTP(email, userType)` - Generates and stores new OTP
- `verifyOTP(email, otp)` - Verifies submitted OTP
- `canRequestOTP(email)` - Checks rate limiting
- `clearExpiredOTPs()` - Cleanup expired OTPs

#### 3. Email Verification Routes
**Location**: `backend/routes/emailVerificationRoutes.js`

**Endpoints**:
```
POST /api/email-verification/send-customer-otp
POST /api/email-verification/send-vendor-otp
POST /api/email-verification/verify-otp
```

**Request/Response Examples**:

**Send Customer OTP**:
```javascript
// Request
{
  "email": "customer@example.com",
  "name": "John Doe"
}

// Response
{
  "success": true,
  "message": "Verification code sent successfully",
  "messageId": "email-message-id"
}
```

**Verify OTP**:
```javascript
// Request
{
  "email": "customer@example.com",
  "otp": "123456"
}

// Response
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Frontend Components

#### 1. OTPVerification.jsx
**Location**: `frontend/src/components/Auth/OTPVerification.jsx`

**Features**:
- 6-digit OTP input with auto-focus
- Auto-paste support from clipboard
- Resend functionality with countdown timer
- Real-time validation and error handling
- Responsive design with animations

**Props**:
```javascript
{
  email: string,              // Email address for verification
  userType: string,           // 'customer' or 'vendor'
  userName: string,           // User's name (optional)
  businessName: string,       // Business name for vendors (optional)
  onVerificationSuccess: function,  // Success callback
  onBack: function           // Back button callback
}
```

#### 2. emailVerificationService.js
**Location**: `frontend/src/services/emailVerificationService.js`

**Purpose**: Frontend API service for email verification operations.

**Methods**:
- `sendCustomerOTP(email, name)` - Request OTP for customer
- `sendVendorOTP(email, businessName)` - Request OTP for vendor
- `verifyOTP(email, otp)` - Verify OTP code

### Integration Points

#### 1. Customer Registration (RegisterPage.jsx)
**Flow**:
1. User submits registration form
2. System sends OTP to user's email
3. User enters OTP for verification
4. After successful verification, account is created
5. User redirected to success page

**Key States**:
- `currentStep`: 'form' | 'verification' | 'complete'
- `verificationEmail`: Stores email for verification
- `formData`: Stores registration data until verification

#### 2. Vendor Registration (VendorRegisterPage.jsx)
**Flow**:
1. User completes 3-step vendor application
2. On final submission, OTP is sent to business email
3. Email verification required before application processing
4. After verification, application submitted to admin
5. Application ID provided for status tracking

## Email Templates

### Customer Verification Email
- **Subject**: "Verify Your Email - International Tijarat"
- **Design**: Orange theme matching customer branding
- **Content**: Welcome message, OTP code, security instructions
- **CTA**: Clear 6-digit OTP display with expiration notice

### Vendor Verification Email
- **Subject**: "Verify Your Business Email - International Tijarat Vendor Application"
- **Design**: Professional blue/gray theme for business users
- **Content**: Business-focused messaging, next steps after verification
- **Features**: Business onboarding information, vendor support contact

## Security Implementation

### Rate Limiting
```javascript
// 2-minute cooldown between OTP requests
const RATE_LIMIT_DURATION = 2 * 60 * 1000; // 2 minutes

// Maximum 5 attempts per OTP
const MAX_ATTEMPTS = 5;
```

### OTP Security
- **Length**: 6 digits (100,000 to 999,999)
- **Expiration**: 10 minutes
- **Generation**: Cryptographically secure random
- **Storage**: In-memory with automatic cleanup

### Email Security
- **SMTP**: Encrypted connection via TLS
- **Authentication**: Gmail App Password (not regular password)
- **Rate Limiting**: Prevents email spam/abuse
- **Validation**: Server-side email format validation

## Configuration Guide

### Development Mode
When email credentials are not configured, the system automatically runs in development mode:
- Emails are simulated (not actually sent)
- OTP codes displayed in backend console
- All functionality available for testing

### Production Setup
1. **Gmail Configuration**:
   - Enable 2-Factor Authentication
   - Generate App Password: Google Account → Security → App Passwords
   - Use App Password (not regular Gmail password)

2. **Environment Variables**:
   ```env
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-digit-app-password
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   ```

3. **Alternative Email Providers**:
   - Update EMAIL_HOST, EMAIL_PORT, and EMAIL_SECURE
   - Ensure SMTP authentication is enabled

## Testing Procedures

### Manual Testing
1. **Customer Registration**:
   - Navigate to `/register`
   - Complete registration form
   - Verify OTP email received
   - Enter OTP and confirm account creation

2. **Vendor Registration**:
   - Navigate to `/vendor/register`
   - Complete 3-step application
   - Verify OTP email received
   - Enter OTP and confirm application submission

### Automated Testing Considerations
- Mock EmailService in test environment
- Test OTP generation and validation logic
- Verify rate limiting functionality
- Test email template rendering

## Error Handling

### Common Errors and Solutions

#### Email Authentication Errors
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Solution**: Verify Gmail App Password and 2FA enabled

#### Rate Limiting
```
Error: Please wait before requesting another OTP
```
**Solution**: 2-minute cooldown enforced, inform user of wait time

#### Invalid OTP
```
Error: Invalid or expired OTP code
```
**Solution**: Generate new OTP or check expiration

### Logging
- All email operations logged with timestamps
- OTP generation and verification tracked
- Error details captured for debugging
- Rate limiting events logged

## Performance Considerations

### Current Implementation
- In-memory OTP storage (suitable for development)
- Basic rate limiting per email address
- Email templates rendered on-demand

### Production Recommendations
1. **Database Storage**: Move OTP storage to Redis or database
2. **Caching**: Cache email templates for better performance
3. **Queue System**: Use email queue for high-volume scenarios
4. **Monitoring**: Add email delivery monitoring and alerts

## API Documentation

### Send Customer OTP
```http
POST /api/email-verification/send-customer-otp
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "John Doe"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "messageId": "unique-message-id"
}
```

**Error Response** (400/429/500):
```json
{
  "success": false,
  "message": "Error description"
}
```

### Send Vendor OTP
```http
POST /api/email-verification/send-vendor-otp
Content-Type: application/json

{
  "email": "vendor@business.com",
  "businessName": "ABC Company"
}
```

### Verify OTP
```http
POST /api/email-verification/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

## Troubleshooting Guide

### Issue: No emails received
1. Check spam/junk folder
2. Verify email credentials in .env file
3. Check backend console for error messages
4. Confirm Gmail App Password is correct

### Issue: OTP verification fails
1. Check OTP expiration (10 minutes)
2. Verify correct email address used
3. Check for typos in OTP entry
4. Confirm rate limiting hasn't been triggered

### Issue: Development mode not switching to production
1. Verify .env file has correct EMAIL_USER and EMAIL_PASS
2. Restart backend server after .env changes
3. Check for typos in email credentials
4. Confirm no placeholder values remain

## Maintenance

### Regular Tasks
- Monitor email delivery success rates
- Clean up expired OTP entries
- Review and update email templates
- Check for failed email attempts

### Updates
- Keep NodeMailer dependency updated
- Review security best practices
- Monitor Gmail policy changes
- Update email templates as needed

## Integration with Existing Systems

### Database Models
- No changes required to existing User or Vendor models
- Email verification handled separately before account creation
- Compatible with existing authentication systems

### Email Service Compatibility
- Uses same Gmail credentials as existing order notification system
- Compatible with existing contact form email system
- Shares email infrastructure without conflicts

## Future Enhancements

### Planned Features
1. **SMS Verification**: Alternative to email OTP
2. **Multi-language**: Email templates in multiple languages
3. **Custom Domains**: Support for custom email domains
4. **Advanced Analytics**: Email delivery and verification metrics
5. **Template Builder**: Admin interface for email template customization

### Scalability Improvements
1. **Redis Integration**: For OTP storage in production
2. **Email Queues**: For high-volume email processing
3. **Load Balancing**: Multiple email service providers
4. **Caching**: Template and configuration caching

---

## Summary

The email verification system provides secure, user-friendly email verification for both customer and vendor registration processes. The system includes comprehensive security features, professional email templates, and seamless integration with existing authentication flows.

**Current Status**: ✅ Fully implemented and production-ready
**Email Provider**: Gmail SMTP with App Password authentication  
**Security**: Rate limiting, OTP expiration, attempt tracking
**User Experience**: Professional templates, responsive UI, auto-paste support
