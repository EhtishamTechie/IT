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
      
      // Check if it's a validation error from our backend
      if (error.response && error.response.data && error.response.status === 400) {
        // Return the error data instead of throwing for validation errors
        console.log('🔍 EmailService: Validation error', error.response.data);
        return error.response.data;
      }
      
      // For other errors, throw
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
      // Check if it's a validation error from our backend
      if (error.response && error.response.data && error.response.status === 400) {
        // Return the error data instead of throwing for validation errors
        return error.response.data;
      }
      
      // For other errors, throw
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
      const errorData = error.response.data;
      
      // Create error object with suggestion if available
      const customError = new Error(errorData.message || errorData.error || 'Email verification failed');
      
      // Pass through suggestion if provided by backend validation
      if (errorData.suggestion) {
        customError.suggestion = errorData.suggestion;
      }
      
      return customError;
    }
    return new Error('Network error. Please check your connection.');
  }
}

export default new EmailVerificationService();
