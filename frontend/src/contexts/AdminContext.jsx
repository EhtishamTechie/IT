import React, { createContext, useContext, useState, useEffect } from 'react';
import AdminService from '../services/adminService';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get regular auth context to check for admin users and sync authentication
  const { user: authUser, isAuthenticated: authIsAuthenticated, setAdminUser: setRegularAuthUser, logout: regularLogout } = useAuth();

  useEffect(() => {
    // Check if admin is already logged in on app load
    const checkAdminAuth = async () => {
      try {
        setLoading(true);
        
        // First check localStorage for admin token and user
        const adminToken = AdminService.getAdminToken();
        const adminUserData = AdminService.getAdminUser();
        
        console.log('🔍 Checking admin auth on load:', { 
          hasToken: !!adminToken, 
          hasUserData: !!adminUserData,
          userRole: adminUserData?.role 
        });
        
        if (adminToken && adminUserData && adminUserData.role === 'admin') {
          console.log('✅ Admin found in localStorage, authenticating...');
          setIsAdminAuthenticated(true);
          setAdminUser(adminUserData);
        }
        // Also check regular auth for admin users
        else if (authIsAuthenticated && authUser && authUser.role === 'admin') {
          console.log('✅ Admin found in regular auth, syncing...');
          setIsAdminAuthenticated(true);
          setAdminUser(authUser);
          // Save to admin localStorage if not already there
          if (!adminToken) {
            localStorage.setItem('adminToken', localStorage.getItem('token'));
            localStorage.setItem('adminUser', JSON.stringify(authUser));
          }
        }
        else {
          console.log('❌ No valid admin authentication found');
          setIsAdminAuthenticated(false);
          setAdminUser(null);
        }
      } catch (error) {
        console.error('Error checking admin authentication:', error);
        setIsAdminAuthenticated(false);
        setAdminUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Listen for user logout events from the main AuthContext
    const handleUserLogout = () => {
      console.log('🚪 User logout detected, clearing admin auth');
      setIsAdminAuthenticated(false);
      setAdminUser(null);
    };

    // Add event listener for logout
    window.addEventListener('userLogout', handleUserLogout);

    checkAdminAuth();

    // Cleanup event listener
    return () => {
      window.removeEventListener('userLogout', handleUserLogout);
    };
  }, [authUser, authIsAuthenticated]);

  const adminLogin = async (email, password) => {
    try {
      setLoading(true);
      const credentials = { email, password };
      const response = await AdminService.adminLogin(credentials);
      
      if (response.success) {
        setIsAdminAuthenticated(true);
        setAdminUser(response.admin);
        
        // Set admin in regular auth context for global authentication
        setRegularAuthUser(response.token, response.admin);
        
        return { success: true, admin: response.admin };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      return { success: false, message: error.response?.data?.message || error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const adminLogout = () => {
    // Clear admin authentication
    AdminService.adminLogout();
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    
    // Also trigger regular logout to clear everything globally
    regularLogout();
  };

  const value = {
    isAdminAuthenticated,
    adminUser,
    loading,
    adminLogin,
    adminLogout
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContext;
