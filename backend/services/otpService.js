const crypto = require('crypto');

class OTPService {
  constructor() {
    // In-memory storage for OTPs (in production, use Redis or database)
    this.otpStore = new Map();
    this.attemptStore = new Map();
    
    // Cleanup expired OTPs every 5 minutes
    setInterval(() => this.cleanupExpiredOTPs(), 5 * 60 * 1000);
  }

  /**
   * Generate and store OTP for email verification
   */
  generateOTP(email, type = 'customer') {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const key = `${email}:${type}`;
    
    // Store OTP with metadata
    this.otpStore.set(key, {
      otp,
      email,
      type,
      expiresAt,
      createdAt: new Date(),
      attempts: 0
    });

    // Reset attempt count for this email
    this.attemptStore.set(key, 0);

    console.log(`📧 OTP generated for ${type}: ${email} - Code: ${otp}`);
    return otp;
  }

  /**
   * Verify OTP
   */
  verifyOTP(email, providedOTP, type = 'customer') {
    const key = `${email}:${type}`;
    const otpData = this.otpStore.get(key);
    
    if (!otpData) {
      return {
        success: false,
        error: 'OTP_NOT_FOUND',
        message: 'No OTP found for this email. Please request a new one.'
      };
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(key);
      this.attemptStore.delete(key);
      return {
        success: false,
        error: 'OTP_EXPIRED',
        message: 'OTP has expired. Please request a new one.'
      };
    }

    // Check attempt count
    const attempts = this.attemptStore.get(key) || 0;
    if (attempts >= 5) {
      this.otpStore.delete(key);
      this.attemptStore.delete(key);
      return {
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed attempts. Please request a new OTP.'
      };
    }

    // Verify OTP
    if (otpData.otp === providedOTP.toString()) {
      // Success - clean up
      this.otpStore.delete(key);
      this.attemptStore.delete(key);
      
      console.log(`✅ OTP verified successfully for ${type}: ${email}`);
      return {
        success: true,
        message: 'Email verified successfully!'
      };
    } else {
      // Increment attempt count
      this.attemptStore.set(key, attempts + 1);
      const remainingAttempts = 4 - attempts;
      
      console.log(`❌ Invalid OTP for ${type}: ${email} - Attempts: ${attempts + 1}/5`);
      return {
        success: false,
        error: 'INVALID_OTP',
        message: `Invalid OTP. You have ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      };
    }
  }

  /**
   * Check if email can request new OTP (rate limiting)
   */
  canRequestOTP(email, type = 'customer') {
    const key = `${email}:${type}`;
    const otpData = this.otpStore.get(key);
    
    if (!otpData) {
      return { canRequest: true };
    }

    // Allow new request if current OTP is expired
    if (new Date() > otpData.expiresAt) {
      return { canRequest: true };
    }

    // Rate limiting - allow new request after 2 minutes
    const timeSinceLastRequest = Date.now() - otpData.createdAt.getTime();
    const minWaitTime = 2 * 60 * 1000; // 2 minutes

    if (timeSinceLastRequest < minWaitTime) {
      const remainingTime = Math.ceil((minWaitTime - timeSinceLastRequest) / 1000);
      return {
        canRequest: false,
        message: `Please wait ${remainingTime} seconds before requesting a new OTP.`,
        remainingTime
      };
    }

    return { canRequest: true };
  }

  /**
   * Get OTP status for debugging
   */
  getOTPStatus(email, type = 'customer') {
    const key = `${email}:${type}`;
    const otpData = this.otpStore.get(key);
    const attempts = this.attemptStore.get(key) || 0;
    
    if (!otpData) {
      return { exists: false };
    }

    return {
      exists: true,
      expiresAt: otpData.expiresAt,
      isExpired: new Date() > otpData.expiresAt,
      attempts,
      createdAt: otpData.createdAt,
      remainingTime: Math.max(0, Math.ceil((otpData.expiresAt - new Date()) / 1000))
    };
  }

  /**
   * Clean up expired OTPs
   */
  cleanupExpiredOTPs() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(key);
        this.attemptStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
    }
  }

  /**
   * Force delete OTP (for testing or admin actions)
   */
  deleteOTP(email, type = 'customer') {
    const key = `${email}:${type}`;
    const existed = this.otpStore.has(key);
    
    this.otpStore.delete(key);
    this.attemptStore.delete(key);
    
    return existed;
  }

  /**
   * Get statistics
   */
  getStats() {
    const activeOTPs = this.otpStore.size;
    const expiredOTPs = Array.from(this.otpStore.values())
      .filter(otpData => new Date() > otpData.expiresAt).length;

    return {
      activeOTPs,
      expiredOTPs,
      totalAttempts: Array.from(this.attemptStore.values())
        .reduce((sum, attempts) => sum + attempts, 0)
    };
  }
}

module.exports = new OTPService();
