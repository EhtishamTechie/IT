// Admin Service - Complete Admin API Integration for International Tijarat
import API from '../api.js';

class AdminService {
  // Admin Authentication
  static async adminLogin(credentials) {
    try {
      const response = await API.post('/admin/login', credentials);
      if (response.data.token) {
        // Store both admin-specific and general tokens for consistency
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminUser', JSON.stringify(response.data.admin));
        localStorage.setItem('token', response.data.token); // Also set general token
        localStorage.setItem('user', JSON.stringify(response.data.admin)); // Also set general user
        console.log('Admin login successful, tokens stored');
      }
      return response.data;
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }

  static adminLogout() {
    // Clear all authentication tokens
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🚪 Admin logout - all tokens cleared');
  }

  static getAdminToken() {
    return localStorage.getItem('adminToken');
  }

  static getAdminUser() {
    const adminUser = localStorage.getItem('adminUser');
    return adminUser ? JSON.parse(adminUser) : null;
  }

  static isAdminAuthenticated() {
    try {
      const adminToken = this.getAdminToken();
      const adminUser = this.getAdminUser();
      
      // Also check general auth as fallback
      const generalToken = localStorage.getItem('token');
      const generalUser = localStorage.getItem('user');
      const parsedGeneralUser = generalUser ? JSON.parse(generalUser) : null;
      
      // Check admin-specific auth first
      if (adminToken && adminUser && adminUser.role === 'admin') {
        console.log('Admin authenticated via admin tokens');
        return true;
      }
      
      // Fallback to general auth if user is admin
      if (generalToken && parsedGeneralUser && parsedGeneralUser.role === 'admin') {
        console.log('Admin authenticated via general tokens, syncing...');
        // Sync to admin storage
        localStorage.setItem('adminToken', generalToken);
        localStorage.setItem('adminUser', JSON.stringify(parsedGeneralUser));
        return true;
      }
      
      console.log('No valid admin authentication found');
      return false;
    } catch (error) {
      console.error('Error checking admin authentication:', error);
      return false;
    }
  }

  // Dashboard Statistics
  static async getDashboardStats() {
    try {
      const response = await API.get('/admin/dashboard/stats', {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Order Management
  static async getAllOrders(params = {}) {
    try {
      const response = await API.get('/orders/admin/all', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  // Multi-Vendor Order Management
  static async getEnhancedOrders(params = {}) {
    try {
      const response = await API.get('/admin/orders/', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching enhanced orders:', error);
      throw error;
    }
  }

  static async forwardOrderToVendors(orderId, vendorData) {
    try {
      const response = await API.post(`/admin/orders/${orderId}/forward`, vendorData, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error forwarding order:', error);
      throw error;
    }
  }

  static async handleAdminOrderAction(orderId, actionData) {
    try {
      const response = await API.put(`/admin/orders/${orderId}/admin-action`, actionData, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error handling admin order action:', error);
      throw error;
    }
  }

  // Commission Management
  static async getCommissionSummary(params = {}) {
    try {
      console.log('🔍 Fetching commission summary with params:', params);
      const response = await API.get('/admin/commissions/summary', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      console.log('📊 Commission summary response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching commission summary:', error);
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  }

  static async getCommissionOverview(params = {}) {
    try {
      console.log('🔍 Fetching commission overview with params:', params);
      const response = await API.get('/admin/commissions/overview', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      console.log('📊 Commission overview response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching commission overview:', error);
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  }

  static async getVendorCommissions(params = {}) {
    try {
      const response = await API.get('/admin/commissions/vendors', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor commissions:', error);
      throw error;
    }
  }

  static async processCommissionPayment(vendorId, paymentData) {
    try {
      const response = await API.put(`/admin/commissions/${vendorId}/pay`, paymentData, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error processing commission payment:', error);
      throw error;
    }
  }

  static async processBulkCommissionPayments(paymentsData) {
    try {
      const response = await API.post('/admin/commissions/bulk-pay', paymentsData, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error processing bulk commission payments:', error);
      throw error;
    }
  }

  static async exportCommissionReport(params = {}) {
    try {
      console.log('📊 Exporting commission report with params:', params);
      
      const response = await API.get('/admin/commissions/export', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` },
        responseType: 'blob'
      });
      
      console.log('✅ Commission report export response received');
      return response;
    } catch (error) {
      console.error('❌ Error exporting commission report:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        throw new Error('Export endpoint not found. Please contact technical support.');
      } else if (error.response?.status === 401) {
        throw new Error('You are not authorized to export reports. Please log in again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error occurred while generating the report. Please try again later.');
      } else {
        throw new Error(error.response?.data?.message || 'Failed to export commission report. Please try again.');
      }
    }
  }

  // Newsletter Management
  static async getNewsletterStats() {
    try {
      console.log('📧 Fetching newsletter statistics...');
      const response = await API.get('/admin/newsletter/stats', {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      console.log('📊 Newsletter stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching newsletter stats:', error);
      throw error;
    }
  }

  static async getNewsletterSubscriptions(params = {}) {
    try {
      console.log('📧 Fetching newsletter subscriptions with params:', params);
      const response = await API.get('/admin/newsletter/subscriptions', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      console.log('📊 Newsletter subscriptions response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching newsletter subscriptions:', error);
      throw error;
    }
  }

  static async exportNewsletterSubscriptions(params = {}) {
    try {
      console.log('📧 Exporting newsletter subscriptions with params:', params);
      const response = await API.get('/admin/newsletter/export', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` },
        responseType: 'blob'
      });
      console.log('✅ Newsletter export response received');
      return response;
    } catch (error) {
      console.error('Error exporting newsletter subscriptions:', error);
      throw error;
    }
  }

  static async deleteNewsletterSubscription(subscriptionId) {
    try {
      console.log('📧 Deleting newsletter subscription:', subscriptionId);
      const response = await API.delete(`/admin/newsletter/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      console.log('✅ Newsletter subscription deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting newsletter subscription:', error);
      throw error;
    }
  }

  static async updateOrderStatus(orderId, status) {
    try {
      const response = await API.patch(`/orders/${orderId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${this.getAdminToken()}` }}
      );
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  static async getOrderStats() {
    try {
      const response = await API.get('/orders/admin/stats', {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw error;
    }
  }

  // Product Management
  static async createProduct(productData) {
    try {
      const response = await API.post('/products/admin/create', productData, {
        headers: { 
          Authorization: `Bearer ${this.getAdminToken()}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  static async updateProduct(productId, productData) {
    try {
      const response = await API.put(`/products/admin/update/${productId}`, productData, {
        headers: { 
          Authorization: `Bearer ${this.getAdminToken()}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(productId) {
    try {
      const response = await API.delete(`/products/admin/delete/${productId}`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  static async getProductStats() {
    try {
      const response = await API.get('/products/admin/stats', {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product stats:', error);
      throw error;
    }
  }

  // User Management
  static async getAllUsers(params = {}) {
    try {
      const response = await API.get('/admin/users', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async getUserStats() {
    try {
      const response = await API.get('/admin/users/stats', {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // Analytics
  static async getSalesAnalytics(period = '30d') {
    try {
      const response = await API.get(`/admin/analytics/sales?period=${period}`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      throw error;
    }
  }

  static async getTopProducts(limit = 10) {
    try {
      const response = await API.get(`/admin/analytics/top-products?limit=${limit}`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching top products:', error);
      throw error;
    }
  }

  // Utility methods
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  static formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  static getOrderStatusColor(status) {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  // Contact/Feedback Management
  static async getAllContacts(params = {}) {
    try {
      console.log('🔍 Fetching contacts with params:', params);
      const response = await API.get('/admin/contacts', {
        params,
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      console.log('📨 Contacts response:', response.data);
      
      // Ensure consistent response format
      const contacts = response.data?.contacts || response.data || [];
      const pagination = response.data?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalContacts: contacts.length
      };
      
      return {
        data: {
          contacts,
          pagination
        }
      };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  }

  static async getContactById(contactId) {
    try {
      const response = await API.get(`/admin/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching contact:', error);
      throw error;
    }
  }

  static async updateContactStatus(contactId, status, response = null) {
    try {
      const updateData = { status };
      if (response) {
        updateData.adminResponse = response;
      }
      
      const apiResponse = await API.patch(`/admin/contacts/${contactId}`, updateData, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return apiResponse.data;
    } catch (error) {
      console.error('Error updating contact status:', error);
      throw error;
    }
  }

  static async assignContactToAdmin(contactId, adminId) {
    try {
      const response = await API.patch(`/admin/contacts/${contactId}`, 
        { assignedTo: adminId },
        { headers: { Authorization: `Bearer ${this.getAdminToken()}` }}
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning contact:', error);
      throw error;
    }
  }

  static async deleteContact(contactId) {
    try {
      const response = await API.delete(`/admin/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  static async getContactStats() {
    try {
      const response = await API.get('/admin/contacts/stats', {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching contact stats:', error);
      throw error;
    }
  }

  static getContactStatusColor(status) {
    const statusColors = {
      new: 'bg-blue-100 text-blue-800',
      read: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  static getContactPriorityColor(priority) {
    const priorityColors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return priorityColors[priority] || 'bg-gray-100 text-gray-800';
  }
}

export default AdminService;
