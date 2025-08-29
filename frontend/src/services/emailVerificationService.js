import axios from 'axios';
import { getApiUrl } from '../config';

const API_BASE_URL = getApiUrl('/email-verification');

class EmailVerificationService {
  /**
   * Send OTP for customer registration
   */
  async sendCustomerOTP(email, name = '') {
    try {
      console.log('🔍 EmailService: Sending customer OTP', { email, name });
      const response = await axios.post(`${API_BASE_URL}/send-customer-otp`, {
        email,
        name
      });
      console.log('🔍 EmailService: Customer OTP response', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 EmailService: Customer OTP error', error);
      throw this.handleError(error);
    }
  }

  /**
   * Send OTP for vendor application
   */
  async sendVendorOTP(email, businessName = '') {
    try {
      const response = await axios.post(`${API_BASE_URL}/send-vendor-otp`, {
        email,
        businessName
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify customer OTP
   */
  async verifyCustomerOTP(email, otp) {
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-customer-otp`, {
        email,
        otp
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify vendor OTP
   */
  async verifyVendorOTP(email, otp) {
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-vendor-otp`, {
        email,
        otp
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(email, type, name = '', businessName = '') {
    try {
      const response = await axios.post(`${API_BASE_URL}/resend-otp`, {
        email,
        type,
        name,
        businessName
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response && error.response.data) {
      return new Error(error.response.data.message || 'Email verification failed');
    }
    return new Error('Network error. Please check your connection.');
  }
}

export default new EmailVerificationService();
