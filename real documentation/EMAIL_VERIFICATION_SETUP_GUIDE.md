# Email Verification System - Quick Setup Guide

## Current Status
✅ **IMPLEMENTED AND ACTIVE**

The email verification system is now fully operational with real Gmail integration.

## Configuration Details

### Email Settings (Already Configured)
```env
EMAIL_USER=shami537uet@gmail.com
EMAIL_PASS=vjlk swal olbh bopt
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### System Behavior
- **Development Mode**: Disabled (real emails are sent)
- **OTP Generation**: 6-digit codes with 10-minute expiration
- **Rate Limiting**: 2-minute cooldown between requests
- **Security**: Maximum 5 verification attempts per OTP

## User Registration Flows

### Customer Registration
1. User visits: `http://localhost:5173/register`
2. Fills registration form
3. System sends OTP to user's email address
4. User enters OTP from email
5. Account created successfully

### Vendor Registration  
1. User visits: `http://localhost:5173/vendor/register`
2. Completes 3-step vendor application
3. System sends OTP to business email
4. User enters OTP from email
5. Vendor application submitted to admin

## Email Templates

### Customer Verification Email
- **From**: International Tijarat <shami537uet@gmail.com>
- **Subject**: "Verify Your Email - International Tijarat"
- **Design**: Orange theme with welcome message
- **Content**: 6-digit OTP code with security instructions

### Vendor Verification Email
- **From**: International Tijarat <shami537uet@gmail.com>  
- **Subject**: "Verify Your Business Email - International Tijarat Vendor Application"
- **Design**: Professional blue theme for business users
- **Content**: Business onboarding information with OTP code

## Testing the System

### Test Customer Registration
```
1. Go to: http://localhost:5173/register
2. Enter any email address you have access to
3. Fill out the form completely
4. Click "Submit" 
5. Check your email for OTP code
6. Enter the 6-digit code
7. Registration should complete successfully
```

### Test Vendor Registration
```  
1. Go to: http://localhost:5173/vendor/register
2. Complete all 3 steps of vendor application
3. Use a real email address for business email
4. Click "Verify Email & Submit"
5. Check your email for OTP code  
6. Enter the 6-digit code
7. Application should be submitted successfully
```

## Backend API Endpoints

### Send Customer OTP
```
POST /api/email-verification/send-customer-otp
Body: { "email": "user@example.com", "name": "User Name" }
```

### Send Vendor OTP
```
POST /api/email-verification/send-vendor-otp  
Body: { "email": "business@example.com", "businessName": "Company Name" }
```

### Verify OTP
```
POST /api/email-verification/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }
```

## Security Features

### Rate Limiting
- 2-minute cooldown between OTP requests per email
- Prevents spam and abuse

### OTP Security  
- 6-digit codes (100,000 - 999,999 range)
- 10-minute expiration time
- Maximum 5 verification attempts
- Cryptographically secure generation

### Email Security
- Encrypted SMTP connection
- Gmail App Password authentication
- Server-side email validation

## Troubleshooting

### Common Issues

**No email received:**
- Check spam/junk folder
- Verify email address is correct
- Wait up to 2 minutes for delivery

**OTP verification fails:**
- Check if OTP expired (10 minutes)
- Verify correct email address
- Ensure OTP entered correctly (6 digits)

**Rate limiting message:**
- Wait 2 minutes between OTP requests
- System prevents spam by enforcing cooldowns

## Monitoring

### Backend Console Logs
```
📧 OTP generated for customer: user@example.com - Code: 123456
✅ Customer verification email sent successfully: message-id
```

### Frontend Console Logs  
```
🔍 RegisterPage: Starting registration process
🔍 EmailService: Sending customer OTP
🔍 RegisterPage: Switching to verification step
```

## Files and Components

### Backend Files
- `backend/services/emailService.js` - Email sending logic
- `backend/services/OTPService.js` - OTP management
- `backend/routes/emailVerificationRoutes.js` - API endpoints

### Frontend Files
- `frontend/src/components/Auth/OTPVerification.jsx` - OTP input UI
- `frontend/src/services/emailVerificationService.js` - API client
- `frontend/src/pages/RegisterPage.jsx` - Customer registration
- `frontend/src/pages/Vendor/VendorRegisterPage.jsx` - Vendor registration

## Next Steps

### For Development
- Test both customer and vendor registration flows
- Verify emails are received and OTP codes work
- Test error scenarios (wrong OTP, expired codes)

### For Production
- Monitor email delivery rates
- Set up email delivery monitoring
- Consider Redis for OTP storage at scale
- Add email delivery analytics

---

## Summary

The email verification system is fully implemented and operational. Users now receive real OTP codes via email during registration processes. The system includes comprehensive security features and professional email templates.

**Status**: ✅ Production Ready
**Integration**: ✅ Customer & Vendor Registration  
**Email Provider**: ✅ Gmail SMTP
**Security**: ✅ Rate limiting, OTP expiration, attempt tracking
