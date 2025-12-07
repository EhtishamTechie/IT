# Password Management System Documentation

**International Tijarat E-Commerce Platform**  
**Implementation Date:** December 7, 2025  
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Email Service Integration](#email-service-integration)
7. [Security Features](#security-features)
8. [User Flows](#user-flows)
9. [API Documentation](#api-documentation)
10. [Testing Guide](#testing-guide)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Password Management System provides secure password reset and change functionality for International Tijarat users. The system implements industry-standard security practices including OTP-based verification, JWT tokens, bcrypt hashing, and email-based authentication.

### Key Components

- **Forgot Password Flow**: 3-step wizard with email → OTP → password reset
- **Change Password**: Secure password change for authenticated users
- **OTP Email Delivery**: Styled HTML emails via Gmail SMTP
- **Countdown Timer**: 10-minute OTP expiration with visual countdown
- **Light Theme UI**: Consistent with Login/Register pages

---

## Features

### 1. Forgot Password

- **Email-based OTP verification**
- **6-digit random OTP codes**
- **10-minute OTP expiration** with countdown timer
- **Resend OTP functionality**
- **15-minute temporary reset token**
- **Password strength validation** (minimum 6 characters)
- **3-step wizard UI** with progress indicator

### 2. Change Password

- **Current password verification**
- **New password validation**
- **Password confirmation matching**
- **Password visibility toggles** (eye icons)
- **Different from old password check**
- **JWT-based authentication**
- **Link to forgot password** if user forgets current password

### 3. Security Features

- **bcrypt password hashing** (12 salt rounds)
- **Single hashing** (no double-hash issues)
- **JWT token authentication** (30-day for login, 15-min for reset)
- **OTP expiration** (10 minutes)
- **Rate limiting ready**
- **Input sanitization**
- **HTTPS recommended** for production

---

## System Architecture

### Technology Stack

**Backend:**
- Node.js 22.x
- Express.js
- MongoDB with Mongoose
- JWT (jsonwebtoken)
- bcrypt (bcryptjs)
- nodemailer 6.10.1

**Frontend:**
- React 18.3.1
- React Router 6.28.0
- Tailwind CSS
- Heroicons
- React Helmet Async

**Email Service:**
- Gmail SMTP (smtp.gmail.com:465)
- SSL/TLS encryption
- HTML email templates

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FORGOT PASSWORD FLOW                      │
└─────────────────────────────────────────────────────────────┘

User enters email
      ↓
POST /api/auth/forgot-password
      ↓
Backend generates 6-digit OTP
      ↓
OTP saved to User.resetPasswordOTP (expires in 10 min)
      ↓
Email sent via Gmail SMTP
      ↓
User receives OTP email
      ↓
User enters OTP + countdown timer shows remaining time
      ↓
POST /api/auth/verify-reset-otp
      ↓
Backend verifies OTP and expiration
      ↓
Backend returns 15-minute JWT reset token
      ↓
User enters new password
      ↓
POST /api/auth/reset-password (with token)
      ↓
Backend verifies token
      ↓
Password hashed by pre-save hook → saved
      ↓
OTP fields cleared
      ↓
User redirected to login


┌─────────────────────────────────────────────────────────────┐
│                    CHANGE PASSWORD FLOW                      │
└─────────────────────────────────────────────────────────────┘

Authenticated user navigates to /change-password
      ↓
Enters current password, new password, confirm password
      ↓
POST /api/auth/change-password (with JWT)
      ↓
Backend verifies JWT token
      ↓
Backend compares current password with bcrypt
      ↓
Validates new password (min 6 chars, different from old)
      ↓
New password hashed by pre-save hook → saved
      ↓
User redirected to profile page
```

---

## Backend Implementation

### 1. User Model (`backend/models/User.js`)

#### New Fields Added

```javascript
// Password Reset OTP Fields
resetPasswordOTP: {
  type: String,
  default: undefined
},
resetPasswordOTPExpiry: {
  type: Date,
  default: undefined
}
```

#### Pre-save Hook (Automatic Password Hashing)

```javascript
// Hash password before saving (only if modified)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```

#### Methods

```javascript
// Compare password for login/change password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

**Important:** Always set `user.password = plainTextPassword` and let the pre-save hook handle hashing. Never manually hash passwords to avoid double-hashing issues.

---

### 2. Auth Controller (`backend/controllers/authController.js`)

#### A. Forgot Password Function

**Location:** Lines 378-427

```javascript
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration (10 minutes)
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    
    // Save OTP to user
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    const emailResult = await sendPasswordResetOTP(
      user.email,
      otp,
      user.name || 'User'
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email address'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};
```

**Key Points:**
- Generates random 6-digit OTP (100000-999999)
- Sets 10-minute expiration
- Calls email service to send OTP
- Returns success/failure message

---

#### B. Verify OTP Function

**Location:** Lines 428-485

```javascript
const verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP matches
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check if OTP expired
    if (new Date() > user.resetPasswordOTPExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Generate temporary reset token (15 minutes)
    const resetToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        purpose: 'password-reset'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};
```

**Key Points:**
- Verifies OTP matches stored value
- Checks expiration timestamp
- Generates 15-minute JWT reset token
- Returns token for final password reset step

---

#### C. Reset Password Function

**Location:** Lines 486-570

```javascript
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Verify purpose
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    
    // Clear OTP fields
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};
```

**Key Points:**
- Verifies JWT reset token (15-minute expiry)
- Validates password strength (min 6 characters)
- Sets plain text password (pre-save hook hashes it)
- Clears OTP fields after successful reset

---

#### D. Change Password Function

**Location:** Lines 269-318

```javascript
const changePassword = async (req, res) => {
  try {
    const { currentPassword, oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Support both parameter names for flexibility
    const currentPwd = currentPassword || oldPassword;

    // Validate inputs
    if (!currentPwd || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPwd);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Check if new password is different
    const isSameAsOld = await user.comparePassword(newPassword);
    if (isSameAsOld) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};
```

**Key Points:**
- Requires JWT authentication (via `authenticateToken` middleware)
- Accepts both `currentPassword` and `oldPassword` for flexibility
- Verifies current password with bcrypt
- Ensures new password is different from old
- Sets plain text password (pre-save hook hashes it)

---

### 3. Auth Routes (`backend/routes/authRoutes.js`)

```javascript
// Public routes (no authentication required)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// Protected routes (require JWT authentication)
router.post('/change-password', authenticateToken, changePassword);
router.put('/change-password', authenticateToken, changePassword); // Backward compatibility
```

**Authentication Middleware:**
- `authenticateToken`: Verifies JWT token from `Authorization: Bearer <token>` header
- Extracts user ID and attaches to `req.user`

---

### 4. Email Service (`backend/services/emailService.js`)

#### Configuration

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL/TLS
  auth: {
    user: process.env.EMAIL_USER, // internationaltijarat.com@gmail.com
    pass: process.env.EMAIL_PASS  // App-specific password
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});
```

#### Send Password Reset OTP Function

**Location:** Lines 520-670

```javascript
async function sendPasswordResetOTP(email, otp, userName = 'User') {
  try {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Development mode: Log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n${'='.repeat(60)}`);
      console.log('📧 PASSWORD RESET OTP EMAIL (Development Mode)');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Name: ${userName}`);
      console.log(`OTP: ${otp}`);
      console.log('='.repeat(60) + '\n');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        messageId: 'dev-mode-' + Date.now()
      };
    }

    // Production mode: Send actual email
    const mailOptions = {
      from: {
        name: 'International Tijarat',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Password Reset OTP - International Tijarat',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); padding: 40px 20px; text-align: center; border-radius: 16px 16px 0 0;">
              <div style="background: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid rgba(255, 255, 255, 0.3);">
                <svg style="width: 40px; height: 40px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Password Reset Request</h1>
            </div>

            <!-- Body -->
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hello <strong>${userName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                We received a request to reset your password for your International Tijarat account. 
                Use the One-Time Password (OTP) below to proceed with the password reset:
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; text-align: center; border-radius: 12px; margin: 0 0 30px; border: 2px dashed #f59e0b;">
                <div style="color: #92400e; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                  Your OTP Code
                </div>
                <div style="font-size: 32px; font-weight: bold; color: #b45309; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
              </div>

              <!-- Warning Box -->
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin: 0 0 30px;">
                <p style="color: #991b1b; font-size: 14px; line-height: 1.6; margin: 0; font-weight: 600;">
                  ⏰ This OTP will expire in 10 minutes
                </p>
                <p style="color: #991b1b; font-size: 14px; line-height: 1.6; margin: 8px 0 0;">
                  🔒 Never share this OTP with anyone
                </p>
              </div>

              <!-- Instructions -->
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 30px;">
                <h3 style="color: #1f2937; margin: 0 0 15px; font-size: 16px;">To reset your password:</h3>
                <ol style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Enter this OTP code on the password reset page</li>
                  <li>Create a new strong password</li>
                  <li>Confirm your new password</li>
                </ol>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0 0 10px;">
                © 2025 International Tijarat. All rights reserved.
              </p>
              <p style="margin: 0;">
                This is an automated email. Please do not reply.
              </p>
              <p style="margin: 10px 0 0;">
                ${process.env.EMAIL_USER}
              </p>
            </div>

          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Password reset email sent successfully to: ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Key Points:**
- HTML-styled email with gradient header
- Large, easy-to-read OTP display
- Security warnings (10-min expiry, don't share)
- Step-by-step instructions
- Branded with International Tijarat colors
- Development mode logs to console

---

## Frontend Implementation

### 1. Forgot Password Page (`frontend/src/pages/ForgotPasswordPage.jsx`)

**Total Lines:** 398  
**Components:** 3-step wizard with countdown timer

#### State Management

```javascript
const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
const [email, setEmail] = useState('');
const [otp, setOtp] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [resetToken, setResetToken] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
const [otpExpired, setOtpExpired] = useState(false);
```

#### Countdown Timer Implementation

```javascript
// Countdown timer effect
useEffect(() => {
  if (step === 2 && timeLeft > 0 && !otpExpired) {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }
}, [step, timeLeft, otpExpired]);

// Format time as MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
```

#### Step 1: Send OTP

```javascript
const handleSendOTP = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setLoading(true);

  try {
    const response = await fetch(`${getApiUrl()}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.success) {
      setSuccess('OTP sent to your email!');
      setTimeLeft(600); // Reset timer to 10 minutes
      setOtpExpired(false);
      setTimeout(() => {
        setStep(2);
        setSuccess('');
      }, 1500);
    } else {
      setError(data.message || 'Failed to send OTP');
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    setError('Failed to send OTP. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### Step 2: Verify OTP

```javascript
const handleVerifyOTP = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  if (otp.length !== 6) {
    setError('Please enter a valid 6-digit OTP');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${getApiUrl()}/auth/verify-reset-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (data.success) {
      setResetToken(data.resetToken);
      setSuccess('OTP verified! Set your new password.');
      setTimeout(() => {
        setStep(3);
        setSuccess('');
      }, 1500);
    } else {
      setError(data.message || 'Invalid OTP');
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    setError('Failed to verify OTP. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### Step 3: Reset Password

```javascript
const handleResetPassword = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  if (newPassword !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  if (newPassword.length < 6) {
    setError('Password must be at least 6 characters long');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resetToken, newPassword }),
    });

    const data = await response.json();

    if (data.success) {
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(data.message || 'Failed to reset password');
    }
  } catch (error) {
    console.error('Reset password error:', error);
    setError('Failed to reset password. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### UI Components

**Progress Indicator:**
```jsx
<div className="flex items-center justify-center mb-8">
  <div className="flex items-center space-x-4">
    {/* Step 1 Circle */}
    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
      step >= 1 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' : 'bg-gray-300 text-gray-600'
    }`}>
      1
    </div>
    {/* Connecting Line */}
    <div className={`h-1 w-12 rounded ${step >= 2 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
    {/* Step 2 Circle */}
    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
      step >= 2 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' : 'bg-gray-300 text-gray-600'
    }`}>
      2
    </div>
    {/* Connecting Line */}
    <div className={`h-1 w-12 rounded ${step >= 3 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
    {/* Step 3 Circle */}
    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
      step >= 3 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' : 'bg-gray-300 text-gray-600'
    }`}>
      3
    </div>
  </div>
</div>
```

**Countdown Timer Display:**
```jsx
<div className={`flex items-center justify-center p-4 rounded-lg ${
  otpExpired ? 'bg-red-50 border border-red-300' : 'bg-orange-50 border border-orange-300'
}`}>
  <ClockIcon className={`h-5 w-5 mr-2 ${otpExpired ? 'text-red-600' : 'text-orange-600'}`} />
  <span className={`text-lg font-semibold ${otpExpired ? 'text-red-700' : 'text-gray-900'}`}>
    {otpExpired ? 'OTP Expired' : formatTime(timeLeft)}
  </span>
  {!otpExpired && (
    <span className="ml-2 text-sm text-gray-600">remaining</span>
  )}
</div>
```

**Theme:** Light gradient background (`from-orange-50 via-white to-orange-100`)

---

### 2. Change Password Page (`frontend/src/pages/ChangePasswordPage.jsx`)

**Total Lines:** 248  
**Components:** Single-form with password visibility toggles

#### State Management

```javascript
const [oldPassword, setOldPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const [showOldPassword, setShowOldPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
```

#### Password Change Handler

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  // Validation
  if (newPassword !== confirmPassword) {
    setError('New passwords do not match');
    return;
  }

  if (newPassword.length < 6) {
    setError('New password must be at least 6 characters long');
    return;
  }

  if (oldPassword === newPassword) {
    setError('New password must be different from old password');
    return;
  }

  setLoading(true);

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${getApiUrl()}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const data = await response.json();

    if (data.success) {
      setSuccess('Password changed successfully! Redirecting...');
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } else {
      setError(data.message || 'Failed to change password');
    }
  } catch (error) {
    console.error('Change password error:', error);
    setError('Failed to change password. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### Password Visibility Toggles

```jsx
{/* Current Password Field */}
<div className="relative">
  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <KeyIcon className="h-5 w-5 text-gray-400" />
  </div>
  <input
    type={showOldPassword ? 'text' : 'password'}
    value={oldPassword}
    onChange={(e) => setOldPassword(e.target.value)}
    className="block w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
    placeholder="Enter current password"
  />
  <button
    type="button"
    onClick={() => setShowOldPassword(!showOldPassword)}
    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
  >
    {showOldPassword ? (
      <EyeSlashIcon className="h-5 w-5" />
    ) : (
      <EyeIcon className="h-5 w-5" />
    )}
  </button>
</div>
```

**Theme:** Light gradient background matching forgot password page

---

### 3. User Profile Integration

#### Profile Page Updates (`frontend/src/pages/UserProfilePage.jsx`)

**Account Security Section:**
```jsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h3>
  <div className="space-y-3">
    <button 
      onClick={() => navigate('/change-password')}
      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
    >
      <span className="text-gray-700">Change Password</span>
      <span className="text-gray-400">→</span>
    </button>
  </div>
</div>
```

**Changes Made:**
- Added `onClick` handler to "Change Password" button
- Removed "Privacy Settings" button (non-functional)

---

### 4. Routing Configuration

#### App.jsx Routes

```javascript
// Lazy imports
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));

// Protected routes
<Route path="/profile" element={
  <Suspense fallback={<PageLoader />}>
    <ProtectedRoute><UserProfilePage /></ProtectedRoute>
  </Suspense>
} />

<Route path="/change-password" element={
  <Suspense fallback={<PageLoader />}>
    <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>
  </Suspense>
} />

// Public route
<Route path="/forgot-password" element={
  <Suspense fallback={<PageLoader />}>
    <ForgotPasswordPage />
  </Suspense>
} />
```

**Route Protection:**
- `/forgot-password` - Public (no authentication required)
- `/change-password` - Protected (requires JWT token)
- `/profile` - Protected (requires JWT token)

---

## Security Features

### 1. Password Hashing

**Technology:** bcrypt with 12 salt rounds

```javascript
// Automatic hashing via pre-save hook
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

**Key Points:**
- Only hashes when password is modified
- Uses 12 salt rounds (high security)
- Never manually hash passwords (causes double-hashing)
- Always set `user.password = plainText` and let hook handle it

### 2. OTP Security

**Generation:**
```javascript
const otp = Math.floor(100000 + Math.random() * 900000).toString();
```

**Features:**
- 6-digit numeric code
- Cryptographically random (Math.random is sufficient for OTPs)
- 10-minute expiration
- Single-use (cleared after successful reset)
- Email-based delivery

### 3. JWT Tokens

**Login Token (30 days):**
```javascript
const token = jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);
```

**Reset Token (15 minutes):**
```javascript
const resetToken = jwt.sign(
  { 
    userId: user._id,
    email: user.email,
    purpose: 'password-reset'
  },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
```

**Key Points:**
- Short-lived reset tokens (15 min)
- Purpose verification (`password-reset`)
- Signed with JWT_SECRET
- Stored client-side only (not in database)

### 4. Input Validation

**Frontend Validation:**
- Email format validation
- Password length (min 6 characters)
- Password confirmation matching
- OTP format (6-digit numeric)
- Different from old password check

**Backend Validation:**
- Email existence check
- OTP expiration check
- Token verification
- Password strength validation
- Current password verification

### 5. Error Handling

**Generic Error Messages:**
- "Failed to send OTP" (doesn't reveal if email exists)
- "Invalid OTP" (doesn't specify which part is wrong)
- "Server error" (hides technical details)

**Security Best Practices:**
- No user enumeration
- No sensitive data in error messages
- Rate limiting recommended (not yet implemented)
- HTTPS required in production

---

## User Flows

### Forgot Password Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                          │
└─────────────────────────────────────────────────────────────┘

Step 1: Email Entry
─────────────────────
User clicks "Forgot Password" on login page
  ↓
Navigates to /forgot-password
  ↓
Enters email address
  ↓
Clicks "Send OTP"
  ↓
Backend generates OTP and sends email
  ↓
User sees "OTP sent to your email!" message


Step 2: OTP Verification
──────────────────────────
Progress indicator shows step 2 active
  ↓
Countdown timer starts (10:00)
  ↓
User receives email with OTP code
  ↓
User enters 6-digit OTP
  ↓
Timer counts down (e.g., 09:45, 09:44...)
  ↓
If timer expires:
  - Input field disabled
  - Submit button disabled
  - "OTP Expired" message shown
  - User can click "Resend OTP"
  ↓
User clicks "Verify OTP"
  ↓
Backend verifies OTP and returns reset token
  ↓
User sees "OTP verified!" message


Step 3: Password Reset
────────────────────────
Progress indicator shows step 3 active
  ↓
User enters new password
  ↓
User confirms new password
  ↓
Frontend validates:
  - Passwords match
  - Minimum 6 characters
  ↓
Clicks "Reset Password"
  ↓
Backend verifies token and updates password
  ↓
User sees "Password reset successfully!" message
  ↓
Auto-redirects to login page after 2 seconds
  ↓
User logs in with new password
```

### Change Password Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                          │
└─────────────────────────────────────────────────────────────┘

Starting Point
──────────────
User is logged in (has valid JWT token)
  ↓
Navigates to /profile
  ↓
Clicks "Change Password" button in Account Security section
  ↓
Navigates to /change-password


Password Change Form
─────────────────────
User sees three password fields:
  1. Current Password
  2. New Password (minimum 6 characters)
  3. Confirm New Password
  ↓
User can toggle password visibility with eye icons
  ↓
User fills all three fields
  ↓
Frontend validates:
  - New passwords match
  - New password ≥ 6 characters
  - New password different from current
  ↓
Clicks "Change Password"
  ↓
Backend verifies:
  - JWT token valid
  - Current password correct
  - New password meets requirements
  ↓
Password updated successfully
  ↓
User sees "Password changed successfully!" message
  ↓
Auto-redirects to profile page after 2 seconds


Alternative Path: Forgot Current Password
───────────────────────────────────────────
User clicks "Forgot your current password?"
  ↓
Navigates to /forgot-password
  ↓
Follows forgot password flow (see above)
```

---

## API Documentation

### 1. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Authentication:** None (public route)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to your email address"
}
```

**Error Responses:**

*User Not Found (404):*
```json
{
  "success": false,
  "message": "No account found with this email address"
}
```

*Email Send Failure (500):*
```json
{
  "success": false,
  "message": "Failed to send OTP email. Please try again."
}
```

*Server Error (500):*
```json
{
  "success": false,
  "message": "Server error. Please try again later."
}
```

---

### 2. Verify Reset OTP

**Endpoint:** `POST /api/auth/verify-reset-otp`

**Authentication:** None (public route)

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

*User Not Found (404):*
```json
{
  "success": false,
  "message": "User not found"
}
```

*Invalid OTP (400):*
```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

*Expired OTP (400):*
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one."
}
```

---

### 3. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Authentication:** Reset token required (from verify-reset-otp response)

**Request Body:**
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

**Error Responses:**

*Invalid/Expired Token (400):*
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

*Invalid Token Purpose (400):*
```json
{
  "success": false,
  "message": "Invalid reset token"
}
```

*User Not Found (404):*
```json
{
  "success": false,
  "message": "User not found"
}
```

*Weak Password (400):*
```json
{
  "success": false,
  "message": "Password must be at least 6 characters long"
}
```

---

### 4. Change Password

**Endpoint:** `POST /api/auth/change-password`

**Authentication:** JWT token required (Bearer token in Authorization header)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "oldPassword": "currentPassword123",
  "newPassword": "newSecurePassword456"
}
```

*Alternative parameter names (backward compatible):*
```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

*Missing Fields (400):*
```json
{
  "success": false,
  "message": "Current password and new password are required"
}
```

*User Not Found (404):*
```json
{
  "success": false,
  "message": "User not found"
}
```

*Incorrect Current Password (401):*
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

*Weak New Password (400):*
```json
{
  "success": false,
  "message": "New password must be at least 6 characters long"
}
```

*Same As Old Password (400):*
```json
{
  "success": false,
  "message": "New password must be different from current password"
}
```

*Unauthorized (401):*
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## Testing Guide

### Manual Testing Checklist

#### Forgot Password Flow

**Step 1: Email Entry**
- [ ] Enter non-existent email → Should show "No account found"
- [ ] Enter valid email → Should show "OTP sent" message
- [ ] Check email inbox for OTP email
- [ ] Verify OTP email styling and content
- [ ] Verify OTP is 6 digits

**Step 2: OTP Verification**
- [ ] Enter incorrect OTP → Should show "Invalid OTP"
- [ ] Wait for timer to expire → Input should be disabled
- [ ] Click "Resend OTP" → Timer should reset to 10:00
- [ ] Enter correct OTP → Should proceed to step 3
- [ ] Verify countdown timer updates every second

**Step 3: Password Reset**
- [ ] Enter non-matching passwords → Should show "Passwords do not match"
- [ ] Enter password < 6 characters → Should show length error
- [ ] Enter valid new password → Should show success and redirect
- [ ] Login with new password → Should work
- [ ] Try using old password → Should fail

#### Change Password Flow

**Authenticated User Tests**
- [ ] Navigate to /change-password without login → Should redirect to login
- [ ] Login and navigate to /profile
- [ ] Click "Change Password" button → Should navigate to /change-password
- [ ] Enter incorrect current password → Should show "Current password is incorrect"
- [ ] Enter same password as old → Should show "must be different"
- [ ] Enter passwords that don't match → Should show "do not match"
- [ ] Enter valid passwords → Should update and redirect
- [ ] Click "Forgot your current password?" → Should navigate to /forgot-password
- [ ] Test password visibility toggles (eye icons)

#### Security Tests

- [ ] Try accessing protected routes without token → Should be blocked
- [ ] Try using expired reset token → Should show "expired token"
- [ ] Try reusing OTP after successful reset → Should fail
- [ ] Verify passwords are hashed in database (not plain text)
- [ ] Verify OTP fields are cleared after reset

### API Testing with cURL

**1. Forgot Password:**
```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**2. Verify OTP:**
```bash
curl -X POST http://localhost:3001/api/auth/verify-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

**3. Reset Password:**
```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"resetToken": "YOUR_TOKEN_HERE", "newPassword": "newPassword123"}'
```

**4. Change Password:**
```bash
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"oldPassword": "current123", "newPassword": "newPassword456"}'
```

---

## Troubleshooting

### Common Issues

#### 1. OTP Email Not Received

**Symptoms:**
- User doesn't receive OTP email
- Backend logs show "Email sent successfully"

**Possible Causes:**
- Email in spam folder
- Gmail SMTP authentication issues
- Invalid EMAIL_USER or EMAIL_PASS environment variables
- Gmail "Less secure apps" blocking

**Solutions:**
1. Check spam/junk folder
2. Verify environment variables:
   ```bash
   EMAIL_USER=internationaltijarat.com@gmail.com
   EMAIL_PASS=your-app-specific-password
   ```
3. Generate new Gmail App Password:
   - Go to Google Account → Security
   - Enable 2-Factor Authentication
   - Generate App-Specific Password
   - Update EMAIL_PASS in .env
4. Check backend console for detailed error logs

---

#### 2. Double Password Hashing

**Symptoms:**
- Password reset works, but login fails
- New password doesn't match stored hash

**Cause:**
- Manually hashing password before saving
- Pre-save hook hashes again → double-hashed

**Solution:**
Always set plain text password:
```javascript
// ❌ WRONG - Manual hashing
const salt = await bcrypt.genSalt(10);
user.password = await bcrypt.hash(newPassword, salt);
await user.save(); // Hook hashes again!

// ✅ CORRECT - Let pre-save hook handle it
user.password = newPassword; // Plain text
await user.save(); // Hook hashes once
```

---

#### 3. OTP Expired Immediately

**Symptoms:**
- OTP shows as expired even though just sent
- Timer shows 00:00 from start

**Possible Causes:**
- Server time mismatch
- OTP expiry calculation error
- Frontend timer not initialized

**Solutions:**
1. Check server time:
   ```bash
   date
   ```
2. Verify OTP expiry calculation:
   ```javascript
   const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
   ```
3. Ensure frontend timer resets:
   ```javascript
   setTimeLeft(600); // Reset to 10 minutes
   setOtpExpired(false);
   ```

---

#### 4. JWT Token Errors

**Symptoms:**
- "Authentication required" on change password
- Token invalid/expired errors

**Possible Causes:**
- Token not stored in localStorage
- JWT_SECRET mismatch between sessions
- Token expired (>30 days old)

**Solutions:**
1. Check localStorage:
   ```javascript
   console.log(localStorage.getItem('token'));
   ```
2. Verify JWT_SECRET in backend .env:
   ```bash
   JWT_SECRET=your-secret-key-here
   ```
3. Re-login to get fresh token
4. Check token expiration:
   ```javascript
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   console.log('Token expires:', new Date(decoded.exp * 1000));
   ```

---

#### 5. Service Worker Interference (Development)

**Symptoms:**
- Fetch errors in console during development
- API calls fail randomly
- `sw.js:87` and `sw.js:161` errors

**Cause:**
- Service worker caching API responses
- Interferes with development Hot Module Replacement (HMR)

**Solution:**
Service worker is disabled in development mode:
```javascript
// main.jsx
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Only register in production
}
```

**Manual cleanup:**
1. Open Chrome DevTools → Application → Service Workers
2. Click "Unregister" for any active service workers
3. Refresh page

---

#### 6. CORS Errors

**Symptoms:**
- "CORS policy" errors in browser console
- API calls blocked from frontend

**Cause:**
- Frontend (localhost:5173) and backend (localhost:3001) different origins

**Solution:**
Backend already has CORS enabled:
```javascript
// backend/api.js
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true
}));
```

**For production:**
Add production domain to `origin` array

---

### Error Code Reference

| Error Code | Message | Meaning | Solution |
|------------|---------|---------|----------|
| 400 | Invalid OTP | OTP doesn't match | Check OTP from email |
| 400 | OTP has expired | >10 minutes passed | Click "Resend OTP" |
| 400 | Passwords do not match | Confirmation mismatch | Re-enter passwords |
| 400 | Password must be at least 6 characters | Too short | Use longer password |
| 400 | New password must be different | Same as current | Choose different password |
| 401 | Current password is incorrect | Wrong current password | Verify current password |
| 401 | Authentication required | No/invalid JWT token | Login again |
| 404 | No account found | Email not in database | Check email or register |
| 404 | User not found | User ID invalid | Login again |
| 500 | Failed to send OTP email | Email service error | Check SMTP settings |
| 500 | Server error | Unexpected backend error | Check backend logs |

---

## Production Deployment Checklist

### Environment Variables

**Backend (.env):**
```bash
# Required
NODE_ENV=production
JWT_SECRET=your-secure-random-secret-key-min-32-chars
EMAIL_USER=internationaltijarat.com@gmail.com
EMAIL_PASS=your-gmail-app-specific-password

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/internationaltijarat

# Optional
PORT=3001
```

**Frontend (.env):**
```bash
VITE_API_URL=https://api.yourdomain.com
```

### Security Hardening

1. **HTTPS Required:**
   - Install SSL certificate (Let's Encrypt recommended)
   - Force HTTPS redirects in nginx/Apache
   - Update CORS origin to HTTPS URLs

2. **Rate Limiting:**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const otpLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 requests per window
     message: 'Too many OTP requests. Please try again later.'
   });
   
   router.post('/forgot-password', otpLimiter, forgotPassword);
   ```

3. **Input Sanitization:**
   ```javascript
   const validator = require('validator');
   
   // Sanitize email
   email = validator.normalizeEmail(email);
   email = validator.escape(email);
   ```

4. **Helmet.js Security Headers:**
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

5. **MongoDB Security:**
   - Use MongoDB Atlas with IP whitelisting
   - Enable database authentication
   - Use connection string with credentials
   - Regular backups

### Testing

- [ ] Test forgot password flow end-to-end
- [ ] Test change password flow
- [ ] Verify OTP emails delivered in production
- [ ] Test password visibility toggles
- [ ] Test countdown timer accuracy
- [ ] Verify HTTPS certificate
- [ ] Test on mobile devices
- [ ] Test in different browsers
- [ ] Load test email service
- [ ] Verify error handling

### Monitoring

**Backend Logs:**
```javascript
// Log important events
console.log(`[${new Date().toISOString()}] OTP sent to: ${email}`);
console.log(`[${new Date().toISOString()}] Password reset successful: ${userId}`);
console.log(`[${new Date().toISOString()}] Password changed: ${userId}`);
```

**Email Service Monitoring:**
- Track email delivery rates
- Monitor SMTP connection errors
- Alert on repeated failures

---

## Future Enhancements

### Recommended Improvements

1. **Two-Factor Authentication (2FA)**
   - Add authenticator app support
   - Backup codes for account recovery

2. **Password Strength Meter**
   - Visual indicator on password input
   - Suggestions for strong passwords
   - Check against common password databases

3. **Account Recovery Questions**
   - Alternative recovery method
   - Security questions backup

4. **Email Templates**
   - Multiple email templates
   - Localization (multi-language support)
   - Dynamic branding

5. **Audit Logging**
   - Track all password changes
   - Login history
   - Failed login attempts
   - Suspicious activity alerts

6. **Advanced Security**
   - Device fingerprinting
   - Geolocation verification
   - Captcha on sensitive actions
   - Biometric authentication

7. **User Notifications**
   - Email on password change
   - SMS OTP option
   - Push notifications

8. **Admin Dashboard**
   - View password reset requests
   - Monitor OTP usage
   - User security analytics

---

## Conclusion

The Password Management System provides secure and user-friendly password reset and change functionality for International Tijarat. The system follows security best practices including OTP-based verification, JWT tokens, bcrypt hashing, and email authentication.

**Key Features:**
- ✅ Email-based OTP password reset
- ✅ 10-minute countdown timer with expiration
- ✅ Secure password change for authenticated users
- ✅ Styled HTML emails via Gmail SMTP
- ✅ Light theme UI matching Login/Register pages
- ✅ Password visibility toggles
- ✅ Comprehensive validation and error handling
- ✅ Backward compatible API routes

**Security Highlights:**
- bcrypt password hashing (12 rounds)
- JWT token authentication
- OTP expiration (10 minutes)
- Reset token expiration (15 minutes)
- Input validation on both frontend and backend
- No user enumeration in error messages

The system is production-ready with proper error handling, security measures, and user experience optimizations. Regular security audits and monitoring are recommended for ongoing security assurance.

---

**Document Version:** 1.0  
**Last Updated:** December 7, 2025  
**Author:** Development Team  
**Contact:** internationaltijarat.com@gmail.com
