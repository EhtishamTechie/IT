// Payment service for handling various payment methods
import API from '../api';

// Payment methods supported
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PAYPAL: 'paypal',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  BANK_TRANSFER: 'bank_transfer'
};

// Payment status codes
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// Card type detection
export const detectCardType = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (cleaned.match(/^4/)) return 'visa';
  if (cleaned.match(/^5[1-5]/)) return 'mastercard';
  if (cleaned.match(/^3[47]/)) return 'amex';
  if (cleaned.match(/^6/)) return 'discover';
  
  return 'unknown';
};

// Card number validation using Luhn algorithm
export const validateCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleaned)) return false;
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// CVV validation
export const validateCVV = (cvv, cardType) => {
  if (!cvv) return false;
  
  const cleanCvv = cvv.replace(/\s/g, '');
  
  if (cardType === 'amex') {
    return /^\d{4}$/.test(cleanCvv);
  } else {
    return /^\d{3}$/.test(cleanCvv);
  }
};

// Expiry date validation
export const validateExpiryDate = (month, year) => {
  if (!month || !year) return false;
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const expMonth = parseInt(month);
  const expYear = parseInt(year);
  
  if (expMonth < 1 || expMonth > 12) return false;
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
};

// Format card number with spaces
export const formatCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');
  const match = cleaned.match(/^(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})$/);
  
  if (!match) return cardNumber;
  
  return [match[1], match[2], match[3], match[4]]
    .filter(group => group.length > 0)
    .join(' ');
};

// Mock payment gateway integration
class PaymentGateway {
  constructor(gatewayType = 'stripe') {
    this.gatewayType = gatewayType;
    this.apiKey = process.env.REACT_APP_PAYMENT_API_KEY || 'test_key';
  }
  
  // Process credit/debit card payment
  async processCardPayment(paymentData) {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { cardNumber, cvv, expiryMonth, expiryYear, amount, currency = 'USD' } = paymentData;
      
      // Validate card details
      if (!validateCardNumber(cardNumber)) {
        throw new Error('Invalid card number');
      }
      
      const cardType = detectCardType(cardNumber);
      if (!validateCVV(cvv, cardType)) {
        throw new Error('Invalid CVV');
      }
      
      if (!validateExpiryDate(expiryMonth, expiryYear)) {
        throw new Error('Invalid expiry date');
      }
      
      // Simulate payment processing
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        return {
          success: true,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: PAYMENT_STATUS.COMPLETED,
          amount,
          currency,
          cardType,
          lastFourDigits: cardNumber.slice(-4),
          processingFee: amount * 0.029 + 0.30, // Standard processing fee
          netAmount: amount - (amount * 0.029 + 0.30),
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Payment declined by bank');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: PAYMENT_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Process PayPal payment
  async processPayPalPayment(paymentData) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { amount, currency = 'USD', email } = paymentData;
      
      // Simulate PayPal processing
      const success = Math.random() > 0.05; // 95% success rate
      
      if (success) {
        return {
          success: true,
          transactionId: `pp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: PAYMENT_STATUS.COMPLETED,
          amount,
          currency,
          paymentMethod: 'paypal',
          payerEmail: email,
          processingFee: amount * 0.034 + 0.30,
          netAmount: amount - (amount * 0.034 + 0.30),
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('PayPal payment failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: PAYMENT_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Process Apple Pay payment
  async processApplePayPayment(paymentData) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { amount, currency = 'USD' } = paymentData;
      
      // Simulate Apple Pay processing
      const success = Math.random() > 0.02; // 98% success rate
      
      if (success) {
        return {
          success: true,
          transactionId: `ap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: PAYMENT_STATUS.COMPLETED,
          amount,
          currency,
          paymentMethod: 'apple_pay',
          processingFee: amount * 0.029 + 0.30,
          netAmount: amount - (amount * 0.029 + 0.30),
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Apple Pay payment failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: PAYMENT_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Process Google Pay payment
  async processGooglePayPayment(paymentData) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { amount, currency = 'USD' } = paymentData;
      
      // Simulate Google Pay processing
      const success = Math.random() > 0.02; // 98% success rate
      
      if (success) {
        return {
          success: true,
          transactionId: `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: PAYMENT_STATUS.COMPLETED,
          amount,
          currency,
          paymentMethod: 'google_pay',
          processingFee: amount * 0.029 + 0.30,
          netAmount: amount - (amount * 0.029 + 0.30),
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Google Pay payment failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: PAYMENT_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Refund payment
  async refundPayment(transactionId, amount, reason = '') {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate refund processing
      const success = Math.random() > 0.05; // 95% success rate
      
      if (success) {
        return {
          success: true,
          refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalTransactionId: transactionId,
          amount,
          status: PAYMENT_STATUS.REFUNDED,
          reason,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Refund processing failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: PAYMENT_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Main payment service
class PaymentService {
  constructor() {
    this.gateway = new PaymentGateway();
  }
  
  // Process payment based on method
  async processPayment(paymentMethod, paymentData) {
    try {
      let result;
      
      switch (paymentMethod) {
        case PAYMENT_METHODS.CREDIT_CARD:
        case PAYMENT_METHODS.DEBIT_CARD:
          result = await this.gateway.processCardPayment(paymentData);
          break;
          
        case PAYMENT_METHODS.PAYPAL:
          result = await this.gateway.processPayPalPayment(paymentData);
          break;
          
        case PAYMENT_METHODS.APPLE_PAY:
          result = await this.gateway.processApplePayPayment(paymentData);
          break;
          
        case PAYMENT_METHODS.GOOGLE_PAY:
          result = await this.gateway.processGooglePayPayment(paymentData);
          break;
          
        default:
          throw new Error('Unsupported payment method');
      }
      
      // Store payment result in backend
      if (result.success) {
        await this.storePaymentRecord(result);
      }
      
      return result;
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message,
        status: PAYMENT_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Store payment record in backend
  async storePaymentRecord(paymentResult) {
    try {
      await API.post('/payments', {
        transactionId: paymentResult.transactionId,
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        status: paymentResult.status,
        paymentMethod: paymentResult.paymentMethod || 'card',
        processingFee: paymentResult.processingFee,
        netAmount: paymentResult.netAmount,
        timestamp: paymentResult.timestamp
      });
    } catch (error) {
      console.error('Error storing payment record:', error);
    }
  }
  
  // Get payment history
  async getPaymentHistory(userId) {
    try {
      const response = await API.get(`/payments/history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }
  
  // Initiate refund
  async initiateRefund(transactionId, amount, reason = '') {
    try {
      const result = await this.gateway.refundPayment(transactionId, amount, reason);
      
      if (result.success) {
        await API.post('/payments/refund', {
          refundId: result.refundId,
          originalTransactionId: transactionId,
          amount,
          reason,
          status: result.status,
          timestamp: result.timestamp
        });
      }
      
      return result;
    } catch (error) {
      console.error('Refund error:', error);
      return {
        success: false,
        error: error.message,
        status: PAYMENT_STATUS.FAILED,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export main service instance
const paymentService = new PaymentService();

export default paymentService;

export {
  PaymentService,
  PaymentGateway,
  detectCardType,
  validateCardNumber,
  validateCVV,
  validateExpiryDate,
  formatCardNumber
};
