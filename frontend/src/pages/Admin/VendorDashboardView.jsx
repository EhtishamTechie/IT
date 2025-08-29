import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { getImageUrl } from '../../services/vendorService';
import { ArrowLeft, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

const VendorDashboardView = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { adminAPI } = useAdminAuth();
  const [vendor, setVendor] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVendorDashboardData();
  }, [vendorId]);

  const fetchVendorDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch vendor details
      const vendorResponse = await adminAPI.getVendor(vendorId);
      if (vendorResponse.data.success) {
        setVendor(vendorResponse.data.data);
      }

      // Fetch vendor dashboard data (orders, products, etc.)
      const dashboardResponse = await adminAPI.getVendorDashboard(vendorId);
      if (dashboardResponse.data.success) {
        setDashboardData(dashboardResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching vendor dashboard:', err);
      setError('Failed to load vendor dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Vendor Dashboard View
                </h1>
                <p className="text-sm text-gray-500">
                  Admin view of {vendor?.businessName} dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">Admin View</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vendor Info Card */}
        {vendor && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                {vendor.logo ? (
                  <img
                    src={getImageUrl(vendor.logo)}
                    alt={`${vendor.businessName} Logo`}
                    onError={(e) => {
                      console.log('🖼️ Admin dashboard logo load error, using fallback');
                      e.target.src = '/assets/default-vendor-logo.png';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {vendor.businessName?.charAt(0)?.toUpperCase() || 'V'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {vendor.businessName}
                </h2>
                <p className="text-gray-600">
                  {vendor.email} • {vendor.contactPerson?.phone}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {vendor.businessType} • Joined {new Date(vendor.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  vendor.verificationStatus === 'approved' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {vendor.verificationStatus}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Stats */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.totalOrders || 0}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.totalProducts || 0}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-600">
                ${dashboardData.totalRevenue || 0}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500">Categories</h3>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.totalCategories || 0}
              </p>
            </div>
          </div>
        )}

        {/* Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <ExternalLink className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Full Dashboard Integration Coming Soon
          </h3>
          <p className="text-blue-700">
            This is a basic view of the vendor's dashboard. Full integration with all vendor 
            dashboard components will be implemented in the next update.
          </p>
          <div className="mt-4 space-x-4">
            <button
              onClick={() => navigate(`/admin/vendors/${vendorId}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              View Full Vendor Details
            </button>
            <button
              onClick={() => navigate('/admin/vendors')}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Back to Vendors
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboardView;
