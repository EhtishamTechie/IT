// Email notification service for order confirmations and updates
import API from '../api';

// Email templates
const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  PASSWORD_RESET: 'password_reset',
  WELCOME: 'welcome',
  PAYMENT_RECEIVED: 'payment_received',
  REFUND_PROCESSED: 'refund_processed'
};

import { config } from '../config';

// Email notification service
class EmailNotificationService {
  constructor() {
    this.apiBaseUrl = config.EMAIL_API_URL;
    this.senderEmail = process.env.REACT_APP_SENDER_EMAIL || 'noreply@internationaltijarat.com';
    this.senderName = process.env.REACT_APP_SENDER_NAME || 'International Tijarat';
  }

  // Generate order confirmation email content
  generateOrderConfirmationEmail(orderData) {
    const { orderNumber, customerInfo, items, total, shippingAddress, paymentInfo } = orderData;
    
    return {
      subject: `Order Confirmation - ${orderNumber}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Thank You for Your Order!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Order #${orderNumber}</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Order Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #667eea; margin-top: 0;">Items Ordered</h3>
              ${items.map(item => `
                <div style="border-bottom: 1px solid #eee; padding: 15px 0; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${item.title}</strong><br>
                    <span style="color: #666;">Quantity: ${item.quantity}</span>
                  </div>
                  <div style="text-align: right;">
                    <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
                  </div>
                </div>
              `).join('')}
              
              <div style="padding: 15px 0; text-align: right; font-size: 18px;">
                <strong>Total: $${total.toFixed(2)}</strong>
              </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #667eea; margin-top: 0;">Shipping Information</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${customerInfo.name}</p>
              <p style="margin: 5px 0;"><strong>Address:</strong> ${shippingAddress.address}</p>
              <p style="margin: 5px 0;"><strong>City:</strong> ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}</p>
              <p style="margin: 5px 0;"><strong>Country:</strong> ${shippingAddress.country}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #667eea; margin-top: 0;">Payment Information</h3>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentInfo.method}</p>
              <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${paymentInfo.transactionId}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745;">Paid</span></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}/orders" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Track Your Order
              </a>
            </div>
            
            <div style="background: #e9ecef; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666;">
                We'll send you shipping confirmation when your order ships.<br>
                Expected delivery: 3-5 business days
              </p>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0;">Thank you for shopping with International Tijarat!</p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">
              Questions? Contact us at support@internationaltijarat.com
            </p>
          </div>
        </div>
      `,
      text: `
        Thank you for your order!
        
        Order Number: ${orderNumber}
        
        Items Ordered:
        ${items.map(item => `- ${item.title} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}
        
        Total: $${total.toFixed(2)}
        
        Shipping Address:
        ${customerInfo.name}
        ${shippingAddress.address}
        ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
        ${shippingAddress.country}
        
        Payment Method: ${paymentInfo.method}
        Transaction ID: ${paymentInfo.transactionId}
        
        Track your order: ${window.location.origin}/orders
        
        Expected delivery: 3-5 business days
        
        Thank you for shopping with International Tijarat!
      `
    };
  }

  // Generate order status update email content
  generateOrderStatusEmail(orderData, newStatus) {
    const { orderNumber, customerInfo, trackingNumber } = orderData;
    
    const statusMessages = {
      confirmed: {
        subject: `Order Confirmed - ${orderNumber}`,
        title: 'Your Order Has Been Confirmed',
        message: 'We\'ve received your order and it\'s being prepared for shipment.',
        color: '#28a745'
      },
      shipped: {
        subject: `Order Shipped - ${orderNumber}`,
        title: 'Your Order Has Been Shipped',
        message: `Your order is on its way! ${trackingNumber ? `Tracking number: ${trackingNumber}` : ''}`,
        color: '#007bff'
      },
      delivered: {
        subject: `Order Delivered - ${orderNumber}`,
        title: 'Your Order Has Been Delivered',
        message: 'Your order has been successfully delivered. We hope you love your purchase!',
        color: '#28a745'
      },
      cancelled: {
        subject: `Order Cancelled - ${orderNumber}`,
        title: 'Your Order Has Been Cancelled',
        message: 'Your order has been cancelled. Any charges will be refunded within 3-5 business days.',
        color: '#dc3545'
      }
    };
    
    const statusInfo = statusMessages[newStatus] || statusMessages.confirmed;
    
    return {
      subject: statusInfo.subject,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: ${statusInfo.color}; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">${statusInfo.title}</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Order #${orderNumber}</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
              <h2 style="color: #333; margin-bottom: 20px;">Order Status Update</h2>
              <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                ${statusInfo.message}
              </p>
              
              <a href="${window.location.origin}/orders" 
                 style="background: ${statusInfo.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Order Details
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0;">Thank you for shopping with International Tijarat!</p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">
              Questions? Contact us at support@internationaltijarat.com
            </p>
          </div>
        </div>
      `,
      text: `
        ${statusInfo.title}
        
        Order Number: ${orderNumber}
        
        ${statusInfo.message}
        
        View your order details: ${window.location.origin}/orders
        
        Thank you for shopping with International Tijarat!
      `
    };
  }

  // Send order confirmation email
  async sendOrderConfirmation(orderData) {
    try {
      const emailContent = this.generateOrderConfirmationEmail(orderData);
      
      const emailPayload = {
        to: orderData.customerInfo.email,
        from: {
          email: this.senderEmail,
          name: this.senderName
        },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        template: EMAIL_TEMPLATES.ORDER_CONFIRMATION,
        orderNumber: orderData.orderNumber
      };
      
      const response = await API.post('/email/send', emailPayload);
      
      return {
        success: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send order status update email
  async sendOrderStatusUpdate(orderData, newStatus) {
    try {
      const emailContent = this.generateOrderStatusEmail(orderData, newStatus);
      
      const emailPayload = {
        to: orderData.customerInfo.email,
        from: {
          email: this.senderEmail,
          name: this.senderName
        },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        template: EMAIL_TEMPLATES.ORDER_SHIPPED,
        orderNumber: orderData.orderNumber,
        status: newStatus
      };
      
      const response = await API.post('/email/send', emailPayload);
      
      return {
        success: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending order status email:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send welcome email for new users
  async sendWelcomeEmail(userData) {
    try {
      const emailContent = {
        subject: 'Welcome to International Tijarat!',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">Welcome to International Tijarat!</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">We're excited to have you join our community</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${userData.name}!</h2>
                <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
                  Thank you for creating an account with us. You now have access to:
                </p>
                
                <div style="text-align: left; margin: 20px 0;">
                  <ul style="color: #666; line-height: 1.8;">
                    <li>Exclusive member discounts</li>
                    <li>Order tracking and history</li>
                    <li>Faster checkout process</li>
                    <li>Personalized product recommendations</li>
                    <li>Early access to sales and new products</li>
                  </ul>
                </div>
                
                <a href="${window.location.origin}/products" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
                  Start Shopping
                </a>
              </div>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0;">Happy shopping!</p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">
                Questions? Contact us at support@internationaltijarat.com
              </p>
            </div>
          </div>
        `,
        text: `
          Welcome to International Tijarat!
          
          Hello ${userData.name}!
          
          Thank you for creating an account with us. You now have access to:
          - Exclusive member discounts
          - Order tracking and history
          - Faster checkout process
          - Personalized product recommendations
          - Early access to sales and new products
          
          Start shopping: ${window.location.origin}/products
          
          Happy shopping!
        `
      };
      
      const emailPayload = {
        to: userData.email,
        from: {
          email: this.senderEmail,
          name: this.senderName
        },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        template: EMAIL_TEMPLATES.WELCOME
      };
      
      const response = await API.post('/email/send', emailPayload);
      
      return {
        success: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(paymentData) {
    try {
      const emailContent = {
        subject: `Payment Received - ${paymentData.orderNumber}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: #28a745; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">Payment Received</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Transaction ID: ${paymentData.transactionId}</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <div style="background: white; padding: 30px; border-radius: 8px;">
                <h2 style="color: #333; margin-bottom: 20px;">Payment Details</h2>
                <p><strong>Amount:</strong> $${paymentData.amount.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${paymentData.paymentMethod}</p>
                <p><strong>Order Number:</strong> ${paymentData.orderNumber}</p>
                <p><strong>Date:</strong> ${new Date(paymentData.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0;">Thank you for your payment!</p>
            </div>
          </div>
        `
      };
      
      const emailPayload = {
        to: paymentData.customerEmail,
        from: {
          email: this.senderEmail,
          name: this.senderName
        },
        subject: emailContent.subject,
        html: emailContent.html,
        template: EMAIL_TEMPLATES.PAYMENT_RECEIVED
      };
      
      const response = await API.post('/email/send', emailPayload);
      
      return {
        success: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get email history for a user
  async getEmailHistory(userId) {
    try {
      const response = await API.get(`/email/history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching email history:', error);
      return [];
    }
  }

  // Mark email as read
  async markEmailAsRead(emailId) {
    try {
      await API.patch(`/email/${emailId}/read`);
      return { success: true };
    } catch (error) {
      console.error('Error marking email as read:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export email service instance
const emailService = new EmailNotificationService();

export default emailService;

export {
  EmailNotificationService,
  EMAIL_TEMPLATES
};
