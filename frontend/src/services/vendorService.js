import axios from 'axios';
import { config } from '../config';

const API_BASE_URL = config.API_BASE_URL;

// Create axios instance for vendor API calls
console.log('🔧 Initializing vendor service with config:', {
  API_BASE_URL,
  UPLOADS_URL: config.UPLOADS_URL
});

// Helper to construct full URL for images
export const getImageUrl = (path) => {
  if (!path) {
    console.warn('⚠️ [getImageUrl] No path provided');
    return '';
  }
  
  // If it's already a full URL, return it
  if (path.startsWith('http')) return path;
  
  // Clean up any malformed paths first
  let cleanPath = path.replace(/undefined/g, '').replace(/\/+/g, '/');
  
  // For vendor logos, ensure proper path structure
  if (cleanPath.includes('vendor-logos') || cleanPath.includes('vendor-')) {
    // Remove duplicated path segments
    cleanPath = cleanPath
      .replace(/\/vendor-logos\/vendor-logos\//g, '/vendor-logos/')
      .replace(/\/uploads\/uploads\//g, '/uploads/')
      .replace(/\/+/g, '/'); // Replace multiple slashes with single slash
      
    // Ensure it starts with /uploads/ if it doesn't already
    if (!cleanPath.startsWith('/uploads/')) {
      // Remove leading slash and add proper prefix
      cleanPath = `/uploads/vendor-logos/${cleanPath.replace(/^\/+/, '')}`;
    }
  }
  
  // Ensure it starts with / for relative paths
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }
  
  // Construct full URL
  const baseUrl = config.UPLOADS_URL || config.API_BASE_URL;
  return `${baseUrl}${cleanPath}`;
};

const vendorAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically with admin impersonation support
vendorAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vendorToken');
    const vendorData = localStorage.getItem('vendorData');
    
    if (token) {
      // Check if this is admin impersonation
      let isAdminImpersonation = false;
      
      try {
        if (vendorData) {
          const parsedVendor = JSON.parse(vendorData);
          isAdminImpersonation = parsedVendor.isAdminViewing === true;
        }
      } catch (e) {
        console.warn('Could not parse vendor data for admin check');
      }
      
      // Also check session storage and token format
      isAdminImpersonation = isAdminImpersonation || 
        sessionStorage.getItem('adminViewingVendor') === 'true' ||
        token.startsWith('admin-impersonating-');

      if (isAdminImpersonation) {
        // For admin impersonation, set a custom header instead of Authorization
        config.headers['X-Admin-Impersonation'] = 'true';
        config.headers['X-Admin-Token'] = token;
      } else {
        // For real vendor tokens, use standard Authorization header
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration and authentication errors
vendorAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if this is admin impersonation - don't redirect if so
      const vendorData = localStorage.getItem('vendorData');
      const isAdminViewing = sessionStorage.getItem('adminViewingVendor') === 'true';
      
      if (vendorData) {
        try {
          const parsedVendor = JSON.parse(vendorData);
          if (parsedVendor.isAdminViewing === true || isAdminViewing) {
            return Promise.reject(error); // Don't clear tokens or redirect for admin viewing
          }
        } catch (e) {
          console.warn('🔑 [VENDOR SERVICE] Could not parse vendor data');
        }
      }
      
      // Normal token expiration handling
      localStorage.removeItem('vendorToken');
      localStorage.removeItem('vendorData');
      localStorage.removeItem('vendorAuthTime');
      
      // Only redirect if currently on a vendor route to avoid disrupting main site navigation
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/vendor/') && currentPath !== '/vendor/login') {
        window.location.href = '/vendor/login';
      }
    }
    return Promise.reject(error);
  }
);

export const vendorAPI = {
  // Authentication
  applyAsVendor: (applicationData) => vendorAxios.post('/vendors/apply', applicationData),
  login: (credentials) => vendorAxios.post('/vendors/login', credentials),
  getProfile: async () => {
    try {
      const response = await vendorAxios.get('/vendors/profile');
      
      if (!response?.data?.success || !response?.data?.vendor) {
        throw new Error('Invalid profile response format');
      }

      const vendorData = response.data.vendor;
      
      // DON'T convert logo to full URL here - let components handle it
      // This prevents double URL processing issues on refresh
      console.log('📥 [VENDOR SERVICE] Profile data received:', {
        businessName: vendorData.businessName,
        logo: vendorData.logo
      });

      return response.data;
    } catch (error) {
      console.error('❌ [VENDOR SERVICE] Failed to get profile:', error);
      throw error;
    }
  },
  updateProfile: async (profileData) => {
    try {
      console.log('📤 [VENDOR SERVICE] Updating profile with data:', profileData);
      
      // Check if we have a file to upload
      const hasFileUpload = profileData.logo instanceof File;
      
      let response;
      if (hasFileUpload) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Handle logo file
        formData.append('logo', profileData.logo);
        
        // Add other fields
        Object.keys(profileData).forEach(key => {
          if (key !== 'logo') {
            if (typeof profileData[key] === 'object' && profileData[key] !== null) {
              formData.append(key, JSON.stringify(profileData[key]));
            } else {
              formData.append(key, profileData[key]);
            }
          }
        });
        
        response = await vendorAxios.put('/vendors/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Use regular JSON for text-only updates
        response = await vendorAxios.put('/vendors/profile', profileData, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log('📥 [VENDOR SERVICE] Profile update response:', response.data);
      
      // Add full URL to returned logo
      if (response.data?.data?.logo) {
        response.data.data.logo = getImageUrl(response.data.data.logo);
      }
      if (response.data?.vendor?.logo) {
        response.data.vendor.logo = getImageUrl(response.data.vendor.logo);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ [VENDOR SERVICE] Failed to update profile:', error);
      throw error;
    }
  },
  uploadLogo: async (formData) => {
    try {
      console.log('📤 [VENDOR SERVICE] Uploading logo...');
      
      // Ensure proper Content-Type for file upload
      const uploadConfig = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      const response = await vendorAxios.post('/vendors/upload-logo', formData, uploadConfig);
      console.log('📥 [VENDOR SERVICE] Logo upload response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ [VENDOR SERVICE] Logo upload failed:', error.response?.data || error.message);
      throw error;
    }
  },
  changePassword: (passwordData) => vendorAxios.put('/vendors/change-password', passwordData),
  getDashboard: () => vendorAxios.get('/vendors/dashboard'),
  checkApplicationStatus: async (applicationId) => {
    const response = await vendorAxios.get(`/vendors/application-status/${applicationId}`);
    return response;
  },

  // Orders
  getVendorOrders: (params = {}) => vendorAxios.get('/vendors/orders', { params }),
  getVendorOrder: (id) => vendorAxios.get(`/vendors/orders/${id}`),
  updateOrderStatus: (id, statusData) => vendorAxios.put(`/vendors/orders/${id}/status`, statusData),
  updateOrderTracking: (id, trackingInfo) => vendorAxios.put(`/vendors/orders/${id}/tracking`, trackingInfo),
  bulkUpdateOrderStatus: (orderIds, status) => vendorAxios.put('/vendors/orders/bulk-status', { orderIds, status }),
  // Analytics & Dashboard
  getDashboardStats: () => vendorAxios.get('/vendors/analytics/dashboard-stats'),
  getAnalyticsStats: (timeRange = 30) => vendorAxios.get(`/vendors/analytics/analytics-stats?timeRange=${timeRange}`),
  getOrderAnalytics: (params = {}) => vendorAxios.get('/vendors/orders/analytics', { params }),

  // Enhanced Multi-Vendor Order Management
  respondToOrder: (orderId, responseData) => vendorAxios.put(`/vendors/orders/${orderId}/respond`, responseData),
  updateVendorOrderStatus: (orderId, statusData) => vendorAxios.put(`/vendors/orders/${orderId}/status`, statusData),
  getVendorOrderDetails: (orderId) => vendorAxios.get(`/vendors/orders/${orderId}/details`),
  markOrderDelivered: (orderId, deliveryData) => vendorAxios.put(`/vendors/orders/${orderId}/delivered`, deliveryData),
  
  // Commission Management
  getCommissionData: (params = {}) => vendorAxios.get('/vendors/commissions', { params }),
  getCommissionHistory: (params = {}) => vendorAxios.get('/vendors/commissions/history', { params }),
  exportCommissionReport: (params = {}) => vendorAxios.get('/vendors/commissions/export', { 
    params,
    responseType: 'blob'
  }),

  // Categories - Using vendor API endpoints
  getCategories: async () => {
    const response = await vendorAxios.get('/vendors/categories');
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await vendorAxios.post('/vendors/categories', categoryData);
    return response.data;
  },

  updateCategory: async (categoryId, categoryData) => {
    const response = await vendorAxios.put(`/vendors/categories/${categoryId}`, categoryData);
    return response.data;
  },

  deleteCategory: async (categoryId) => {
    const response = await vendorAxios.delete(`/vendors/categories/${categoryId}`);
    return response.data;
  },

  // Vendor Products
  getVendorProducts: async (params = {}) => {
    const response = await vendorAxios.get('/vendors/products', { params });
    return response.data;
  },

  getVendorProductById: async (productId) => {
    const response = await vendorAxios.get(`/vendors/products/${productId}`);
    return response.data;
  },

  addVendorProduct: async (productData) => {
    const response = await vendorAxios.post('/vendors/products', productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateVendorProduct: async (productId, productData) => {
    const response = await vendorAxios.put(`/vendors/products/${productId}`, productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteVendorProduct: async (productId) => {
    const response = await vendorAxios.delete(`/vendors/products/${productId}`);
    return response.data;
  },

  getVendorProductStats: async () => {
    const response = await vendorAxios.get('/vendors/products/stats');
    return response.data;
  },

  // Analytics and Reporting API methods
  getAnalytics: async (params = {}) => {
    const response = await vendorAxios.get('/vendors/analytics', { params });
    return response.data;
  },

  getSalesReport: async (params = {}) => {
    const response = await vendorAxios.get('/vendors/sales-report', { params });
    return response.data;
  },

  exportSalesReport: async (params = {}) => {
    const response = await vendorAxios.get('/vendors/sales-report/export', { 
      params,
      responseType: 'blob'
    });
    return response;
  },

  getPerformanceMetrics: async (params = {}) => {
    const response = await vendorAxios.get('/vendors/performance', { params });
    return response.data;
  }
};

// Utility functions
export const vendorUtils = {
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  formatDateTime: (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  getStatusColor: (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      payout_requested: 'bg-orange-100 text-orange-800 border-orange-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  },

  getStatusIcon: (status) => {
    // Return CSS classes for icons instead of emojis for better professionalism
    const iconClasses = {
      pending: 'w-4 h-4 text-yellow-500',
      under_review: 'w-4 h-4 text-blue-500', 
      approved: 'w-4 h-4 text-green-500',
      rejected: 'w-4 h-4 text-red-500',
      active: 'w-4 h-4 text-green-500',
      inactive: 'w-4 h-4 text-gray-500',
      suspended: 'w-4 h-4 text-red-500',
      confirmed: 'w-4 h-4 text-green-500',
      payout_requested: 'w-4 h-4 text-orange-500',
      paid: 'w-4 h-4 text-green-500',
    };
    return iconClasses[status] || 'w-4 h-4 text-gray-500';
  },

  truncateText: (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  calculateVendorEarnings: (amount, platformFee = 0) => {
    return amount - platformFee;
  },

  generateSKU: (prefix = 'VEN') => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  },

  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePhone: (phone) => {
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Check for various valid formats:
    // 1. Pakistani numbers starting with +92: +92xxxxxxxxxx (13 digits total)
    // 2. Pakistani numbers starting with 0: 0xxxxxxxxxx (11 digits)
    // 3. International numbers: +countrycode + number (7-15 digits after +)
    // 4. Local numbers: xxxxxxxxxx (10-15 digits)
    
    // Pakistani format: +92xxxxxxxxxx
    if (cleanPhone.match(/^\+92\d{10}$/)) {
      return true;
    }
    
    // Pakistani format starting with 0: 0xxxxxxxxxx (11 digits)
    if (cleanPhone.match(/^0\d{10}$/)) {
      return true;
    }
    
    // International format: +countrycode + 7-15 digits
    if (cleanPhone.match(/^\+\d{7,15}$/)) {
      return true;
    }
    
    // Local format: 10-15 digits (can start with any digit)
    if (cleanPhone.match(/^\d{10,15}$/)) {
      return true;
    }
    
    return false;
  },

  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  },

  downloadCSV: (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," + data;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Customer Communication
  getCustomerInquiries: async (queryParams = {}) => {
    const response = await vendorAxios.get('/vendors/communication/inquiries', { params: queryParams });
    return response.data;
  },

  getInquiry: async (inquiryId) => {
    const response = await vendorAxios.get(`/vendors/communication/inquiries/${inquiryId}`);
    return response.data;
  },

  replyToInquiry: async (inquiryId, messageData) => {
    const response = await vendorAxios.post(`/vendors/communication/inquiries/${inquiryId}/reply`, messageData);
    return response.data;
  },

  updateInquiryStatus: async (inquiryId, status) => {
    const response = await vendorAxios.put(`/vendors/communication/inquiries/${inquiryId}/status`, { status });
    return response.data;
  },

  assignInquiry: async (inquiryId, assignToId) => {
    const response = await vendorAxios.put(`/vendors/communication/inquiries/${inquiryId}/assign`, { assignToId });
    return response.data;
  },

  addInternalNote: async (inquiryId, note) => {
    const response = await vendorAxios.post(`/vendors/communication/inquiries/${inquiryId}/internal-note`, { note });
    return response.data;
  },

  getInquiryStats: async () => {
    const response = await vendorAxios.get('/vendors/communication/stats');
    return response.data;
  },

  bulkUpdateInquiries: async (inquiryIds, action, value) => {
    const response = await vendorAxios.put('/vendors/communication/inquiries/bulk-update', { inquiryIds, action, value });
    return response.data;
  }
};

export const vendorService = vendorAPI;
export { vendorAxios };
export default vendorAPI;
