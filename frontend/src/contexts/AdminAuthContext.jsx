import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { config } from '../config';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

// Create axios instance for admin API calls
const adminAxios = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
adminAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const adminData = localStorage.getItem('adminData');

        if (token && adminData) {
          const parsedAdmin = JSON.parse(adminData);
          setAdmin(parsedAdmin);
          setIsAuthenticated(true);
          
          // Verify token is still valid
          try {
            const response = await adminAxios.get('/admin/profile');
            if (response.data.success) {
              setAdmin(response.data.data);
              localStorage.setItem('adminData', JSON.stringify(response.data.data));
            }
          } catch (error) {
            handleLogout();
          }
        }
      } catch (error) {
        console.error('Admin auth initialization error:', error);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await adminAxios.post('/admin/login', { email, password });
      
      if (response.data.success) {
        const { admin: adminData, token } = response.data.data;
        
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminData', JSON.stringify(adminData));
        
        setAdmin(adminData);
        setIsAuthenticated(true);
        
        return { success: true, admin: adminData };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setAdmin(null);
    setIsAuthenticated(false);
  };

  // Admin API methods
  const adminAPI = {
    // Vendor Applications
    getVendorApplications: (params = {}) => adminAxios.get('/admin/vendor-management/applications', { params }),
    getVendorApplication: (id) => adminAxios.get(`/admin/vendor-management/applications/${id}`),
    approveVendorApplication: (id, data) => adminAxios.post(`/admin/vendor-management/applications/${id}/approve`, data),
    rejectVendorApplication: (id, data) => adminAxios.post(`/admin/vendor-management/applications/${id}/reject`, data),
    
    // Vendor Management
    getVendors: (params = {}) => adminAxios.get('/admin/vendor-management/vendors', { params }),
    getVendor: (id) => adminAxios.get(`/admin/vendor-management/vendors/${id}`),
    getVendorById: (id) => adminAxios.get(`/admin/vendor-management/vendors/${id}`),
    suspendVendor: (id, data) => adminAxios.post(`/admin/vendor-management/vendors/${id}/suspend`, data),
    unsuspendVendor: (id) => adminAxios.post(`/admin/vendor-management/vendors/${id}/unsuspend`),
    updateVendorCommission: (id, data) => adminAxios.put(`/admin/vendor-management/vendors/${id}/commission`, data),
    getVendorStats: () => adminAxios.get('/admin/vendor-management/vendors/stats'),
    
    // Orders Management
    getAdminOrders: (params = {}) => adminAxios.get('/admin/orders/my-orders', { params }),
    
    // Commission Management
    getCommissionOverview: (params = {}) => adminAxios.get('/admin/commissions/overview', { params }),
    getCommissionSummary: () => adminAxios.get('/admin/commissions/summary'),
    getCommissionSettings: () => adminAxios.get('/admin/commissions/config'),
    updateCommissionSettings: (data) => adminAxios.put('/admin/commissions/config', data),
    updateVendorPayment: (vendorId, data) => adminAxios.post(`/admin/commissions/vendor/${vendorId}/payment`, data),
    exportCommissionReport: (params = {}) => adminAxios.get('/admin/commissions/export', { params, responseType: 'blob' }),

    // Feedback Management
    getFeedback: (params = {}) => adminAxios.get('/admin/contacts', { params }),
    getFeedbackStats: () => adminAxios.get('/admin/contacts/stats'),
    respondToFeedback: (id, data) => adminAxios.post(`/admin/contacts/${id}/respond`, data),
    deleteFeedback: (id) => adminAxios.delete(`/admin/contacts/${id}`),
    markFeedbackAsRead: (id) => adminAxios.put(`/admin/contacts/${id}/mark-read`),
    markFeedbackAsResolved: (id) => adminAxios.put(`/admin/contacts/${id}/resolve`),

    // Newsletter Management
    getNewsletterStats: () => adminAxios.get('/admin/newsletter/stats'),
    getNewsletterSubscriptions: (params = {}) => adminAxios.get('/admin/newsletter/subscriptions', { params }),
    deleteNewsletterSubscription: (id) => adminAxios.delete(`/admin/newsletter/subscriptions/${id}`),
    exportNewsletterSubscriptions: (params = {}) => adminAxios.get('/admin/newsletter/export', { params, responseType: 'blob' }),
    
    // Payment Accounts Management
    get: (endpoint) => adminAxios.get(endpoint),
    post: (endpoint, data, config) => adminAxios.post(endpoint, data, config),
    put: (endpoint, data, config) => adminAxios.put(endpoint, data, config),
    delete: (endpoint) => adminAxios.delete(endpoint),
  };

  const value = {
    admin,
    isLoading,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    adminAPI
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
