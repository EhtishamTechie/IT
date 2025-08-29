import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

const VendorProtectedRoute = ({ children, requireApproved = false }) => {
  const { isAuthenticated, vendor, isLoading } = useVendorAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if this is admin impersonation - allow access without normal validation
  const isAdminViewing = 
    vendor?.isAdminViewing === true || 
    sessionStorage.getItem('adminViewingVendor') === 'true' ||
    localStorage.getItem('vendorToken')?.startsWith('admin-impersonating-');

  if (isAdminViewing) {
    console.log('🔑 [VENDOR PROTECTED ROUTE] ✅ Admin impersonation access granted');
    return children; // Admin viewing bypasses all protection rules
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('🔑 [VENDOR PROTECTED ROUTE] ❌ Not authenticated, redirecting to login');
    return <Navigate to="/vendor/login" state={{ from: location }} replace />;
  }

  // Check if vendor approval is required
  if (requireApproved && vendor?.verificationStatus !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Account Pending Approval
          </h2>
          <p className="text-gray-600 mb-4">
            Your vendor account is currently {vendor?.verificationStatus || 'pending'}. 
            You'll be able to access this feature once your account is approved.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/vendor/dashboard'}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/vendor/profile'}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if account is suspended
  if (vendor?.isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Account Suspended
          </h2>
          <p className="text-gray-600 mb-4">
            Your vendor account has been suspended. Please contact support for assistance.
          </p>
          {vendor?.suspensionReason && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-700">
                <strong>Reason:</strong> {vendor.suspensionReason}
              </p>
            </div>
          )}
          <button
            onClick={() => window.location.href = 'mailto:support@internationaltijarat.com'}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    );
  }

  // Account is valid, render children
  return children;
};

export default VendorProtectedRoute;
