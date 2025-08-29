import React, { createContext, useContext, useState, useEffect } from 'react';
import { vendorService } from '../services/vendorService';

const VendorAuthContext = createContext();

export const useVendorAuth = () => {
  const context = useContext(VendorAuthContext);
  if (!context) {
    throw new Error('useVendorAuth must be used within a VendorAuthProvider');
  }
  return context;
};

export const VendorAuthProvider = ({ children }) => {
  const [vendor, setVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage with better persistence
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('vendorToken');
        const vendorData = localStorage.getItem('vendorData');

        console.log('🔑 [VENDOR AUTH] Initializing auth...', { 
          hasToken: !!token, 
          hasVendorData: !!vendorData,
          tokenType: token ? (token.startsWith('admin-impersonating-') ? 'admin-impersonation' : 'real-vendor') : 'none',
          sessionFlags: {
            adminViewingVendor: sessionStorage.getItem('adminViewingVendor'),
            hasOriginalAdminToken: !!sessionStorage.getItem('originalAdminToken')
          }
        });

        if (token && vendorData) {
          try {
            const parsedVendor = JSON.parse(vendorData);
            
            // Enhanced admin impersonation detection
            const isAdminImpersonation = 
              parsedVendor.isAdminViewing === true || 
              token.startsWith('admin-impersonating-') ||
              sessionStorage.getItem('adminViewingVendor') === 'true' ||
              !!parsedVendor.originalAdminToken ||
              !!parsedVendor.adminImpersonationTimestamp;
            
            if (isAdminImpersonation) {
              console.log('🔑 [VENDOR AUTH] ✅ Admin impersonation detected - BYPASSING all validation');
              console.log('🔑 [VENDOR AUTH] Impersonated vendor data:', {
                id: parsedVendor._id,
                businessName: parsedVendor.businessName,
                email: parsedVendor.email,
                verificationStatus: parsedVendor.verificationStatus,
                isAdminViewing: parsedVendor.isAdminViewing
              });
              
              // Set authentication state immediately for admin impersonation
              setVendor(parsedVendor);
              setIsAuthenticated(true);
              setIsLoading(false);
              return; // Skip all JWT validation for admin viewing
            }
            
            // For real vendor tokens, proceed with normal authentication
            console.log('🔑 [VENDOR AUTH] Real vendor token detected, validating...');
            setVendor(parsedVendor);
            setIsAuthenticated(true);
            
            // Verify token is still valid by fetching profile (only for real vendor tokens)
            try {
              const response = await vendorService.getProfile();
              if (response.success && response.vendor) {
                setVendor(response.vendor);
                localStorage.setItem('vendorData', JSON.stringify(response.vendor));
                console.log('🔑 [VENDOR AUTH] ✅ Real vendor authentication validated');
              } else {
                throw new Error('Invalid profile response');
              }
            } catch (profileError) {
              console.error('🔑 [VENDOR AUTH] Profile validation failed:', profileError);
              // Token validation failed, clear auth unless this is actually admin impersonation
              if (!isAdminImpersonation) {
                handleLogout();
                throw new Error('Profile validation failed');
              }
            }
          } catch (error) {
            console.error('🔑 [VENDOR AUTH] Parse error:', error);
            
            // Check if this is admin impersonation before clearing auth
            try {
              const fallbackParsed = JSON.parse(vendorData);
              const isAdminImpersonation = 
                fallbackParsed.isAdminViewing === true ||
                sessionStorage.getItem('adminViewingVendor') === 'true' ||
                token.startsWith('admin-impersonating-');
                
              if (isAdminImpersonation) {
                console.log('🔑 [VENDOR AUTH] ✅ Admin impersonation detected in fallback check');
                setVendor(fallbackParsed);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
              }
            } catch (parseError) {
              console.error('🔑 [VENDOR AUTH] Could not parse vendor data for admin check');
              handleLogout();
            }
            try {
              const fallbackParsed = JSON.parse(vendorData);
              const isAdminImpersonation = 
                fallbackParsed.isAdminViewing === true ||
                sessionStorage.getItem('adminViewingVendor') === 'true' ||
                token.startsWith('admin-impersonating-');
                
              if (isAdminImpersonation) {
                console.log('🔑 [VENDOR AUTH] ✅ Admin impersonation detected in fallback check');
                setVendor(fallbackParsed);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
              }
            } catch (parseError) {
              console.error('🔑 [VENDOR AUTH] Could not parse vendor data for admin check');
            }
            
            // Token might be expired or invalid, clear auth
            console.warn('🔑 [VENDOR AUTH] ❌ Token validation failed:', error.message);
            handleLogout();
          }
        } else {
          // No token or vendor data found
          console.log('🔑 [VENDOR AUTH] ❌ No auth data found');
          setIsAuthenticated(false);
          setVendor(null);
        }
      } catch (error) {
        console.error('🔑 [VENDOR AUTH] ❌ Auth initialization error:', error);
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
      const response = await vendorService.login({ email, password });
      
      if (response.data.success) {
        const { vendor: vendorData, token } = response.data.data;
        
        // Store auth data with additional persistence flags
        localStorage.setItem('vendorToken', token);
        localStorage.setItem('vendorData', JSON.stringify(vendorData));
        localStorage.setItem('vendorAuthTime', Date.now().toString());
        
        // Set initial vendor data
        setVendor(vendorData);
        setIsAuthenticated(true);
        
        // Immediately refresh vendor data to get complete profile including logo
        try {
          const refreshedVendor = await vendorService.getProfile();
          if (refreshedVendor?.data?.success && refreshedVendor?.data?.vendor) {
            setVendor(refreshedVendor.data.vendor);
            localStorage.setItem('vendorData', JSON.stringify(refreshedVendor.data.vendor));
          }
        } catch (error) {
          console.error('Failed to refresh vendor data after login:', error);
        }
        
        return { success: true, vendor: vendorData };
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

  const handleRegister = async (applicationData) => {
    try {
      setIsLoading(true);
      const response = await vendorService.applyAsVendor(applicationData);
      
      if (response.data.success) {
        return { 
          success: true, 
          applicationId: response.data.data.applicationId,
          message: 'Application submitted successfully! You will receive an email when reviewed.'
        };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Check if this is admin viewing vendor dashboard
    const isAdminViewing = sessionStorage.getItem('adminViewingVendor') === 'true';
    
    if (isAdminViewing) {
      console.log('🔑 Restoring admin session from vendor dashboard logout');
      
      // Restore admin session
      const originalAdminToken = sessionStorage.getItem('originalAdminToken');
      const originalAdminData = sessionStorage.getItem('originalAdminData');
      
      if (originalAdminToken && originalAdminData) {
        localStorage.setItem('adminToken', originalAdminToken);
        localStorage.setItem('adminData', originalAdminData);
      }
      
      // Clear admin impersonation data
      sessionStorage.removeItem('adminViewingVendor');
      sessionStorage.removeItem('originalAdminToken');
      sessionStorage.removeItem('originalAdminData');
      sessionStorage.removeItem('viewingVendorId');
      
      // Clear vendor session
      localStorage.removeItem('vendorToken');
      localStorage.removeItem('vendorData');
      localStorage.removeItem('vendorAuthTime');
      
      // Redirect back to admin panel
      window.location.href = '/admin/vendors';
      return;
    }
    
    // Normal vendor logout
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorData');
    localStorage.removeItem('vendorAuthTime');
    
    setVendor(null);
    setIsAuthenticated(false);
  };

  const updateVendorProfile = async (profileData) => {
    try {
      const response = await vendorService.updateProfile(profileData);
      
      if (response.data.success) {
        const updatedVendor = response.data.data;
        setVendor(updatedVendor);
        localStorage.setItem('vendorData', JSON.stringify(updatedVendor));
        return { success: true, vendor: updatedVendor };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed.';
      return { success: false, message };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await vendorService.changePassword(passwordData);
      
      if (response.data.success) {
        return { success: true, message: 'Password changed successfully' };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed.';
      return { success: false, message };
    }
  };

  // Direct vendor state update function
  const updateVendor = (updatedVendorData) => {
    setVendor(updatedVendorData);
    localStorage.setItem('vendorData', JSON.stringify(updatedVendorData));
  };

  const checkApplicationStatus = async (applicationId) => {
    try {
      const response = await vendorService.checkApplicationStatus(applicationId);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to check application status.';
      return { success: false, message };
    }
  };

  const refreshVendorData = async () => {
    try {
      if (!isAuthenticated) return null;
      
      const response = await vendorService.getProfile();
      if (response?.data?.success && response?.data?.vendor) {
        const updatedVendor = response.data.vendor;
        setVendor(updatedVendor);
        localStorage.setItem('vendorData', JSON.stringify(updatedVendor));
        return updatedVendor;
      }
    } catch (error) {
      console.error('Error refreshing vendor data:', error);
      // If refresh fails due to auth error, logout
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  // Check if vendor is still authenticated (for external components)
  const checkAuthStatus = () => {
    const token = localStorage.getItem('vendorToken');
    const vendorData = localStorage.getItem('vendorData');
    return !!(token && vendorData && isAuthenticated);
  };

  const value = {
    vendor,
    isLoading,
    isAuthenticated,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateProfile: updateVendorProfile,
    updateVendor,
    changePassword,
    checkApplicationStatus,
    refreshVendorData,
    checkAuthStatus
  };

  return (
    <VendorAuthContext.Provider value={value}>
      {children}
    </VendorAuthContext.Provider>
  );
};
