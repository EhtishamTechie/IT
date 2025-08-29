import axios from "axios";
import { config } from "./config";

const API = axios.create({ 
  baseURL: config.API_BASE_URL
});

// Add token to requests automatically
API.interceptors.request.use(
  (config) => {
    // Check for admin token first, then vendor token, then regular token
    const adminToken = localStorage.getItem('adminToken');
    const vendorToken = localStorage.getItem('vendorToken');
    const token = localStorage.getItem('token');
    
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (vendorToken) {
      config.headers.Authorization = `Bearer ${vendorToken}`;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration and unauthorized responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('🚨 Unauthorized response - clearing tokens');
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('vendorToken');
      localStorage.removeItem('user');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('vendorData');
      
      // Redirect to login based on current route
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      } else if (window.location.pathname.startsWith('/vendor')) {
        window.location.href = '/vendor/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
