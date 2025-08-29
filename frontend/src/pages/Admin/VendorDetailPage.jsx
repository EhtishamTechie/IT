import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Star,
  Ban,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Settings
} from 'lucide-react';

const VendorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminAPI } = useAdminAuth();
  const [vendor, setVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVendorDetails();
  }, [id]);

  const fetchVendorDetails = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 [VENDOR DETAIL] Fetching detailed vendor info for:', id);
      
      const response = await adminAPI.getVendorById(id);
      console.log('🔍 [VENDOR DETAIL] Vendor detail response:', response);
      
      if (response.data && response.data.success) {
        const vendorData = response.data.data;
        console.log('🔍 [VENDOR DETAIL] Vendor detailed data:', vendorData);
        
        // Log password availability for debugging
        console.log('🔐 [VENDOR DETAIL] Password fields:', {
          currentPassword: !!vendorData.currentPassword,
          password: !!vendorData.password,
          hashedPassword: vendorData.hashedPassword
        });
        
        setVendor(vendorData);
      } else {
        console.error('❌ [VENDOR DETAIL] Failed to fetch vendor details:', response.data?.message);
        setError(response.data?.message || 'Failed to fetch vendor details');
      }
    } catch (error) {
      console.error('❌ [VENDOR DETAIL] Error fetching vendor details:', error);
      setError('Error fetching vendor details: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendVendor = async () => {
    if (!window.confirm('Are you sure you want to suspend this vendor?')) {
      return;
    }

    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    try {
      const response = await adminAPI.suspendVendor(id, { reason });
      if (response.data.success) {
        alert('Vendor suspended successfully');
        fetchVendorDetails();
      } else {
        alert('Failed to suspend vendor');
      }
    } catch (error) {
      console.error('Error suspending vendor:', error);
      alert('Error suspending vendor');
    }
  };

  const handleUnsuspendVendor = async () => {
    if (!window.confirm('Are you sure you want to unsuspend this vendor?')) {
      return;
    }

    try {
      const response = await adminAPI.unsuspendVendor(id);
      if (response.data.success) {
        alert('Vendor unsuspended successfully');
        fetchVendorDetails();
      } else {
        alert('Failed to unsuspend vendor');
      }
    } catch (error) {
      console.error('Error unsuspending vendor:', error);
      alert('Error unsuspending vendor');
    }
  };

  const handleUpdateCommission = async () => {
    const newRate = prompt('Enter new commission rate (%):', vendor.settings?.commissionRate || 20);
    if (!newRate || isNaN(newRate)) return;

    try {
      const response = await adminAPI.updateVendorCommission(id, { commissionRate: parseFloat(newRate) });
      if (response.data.success) {
        alert('Commission rate updated successfully');
        fetchVendorDetails();
      } else {
        alert('Failed to update commission rate');
      }
    } catch (error) {
      console.error('Error updating commission rate:', error);
      alert('Error updating commission rate');
    }
  };

  const getStatusBadge = (vendor) => {
    if (vendor.isSuspended) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <Ban className="w-3 h-3 mr-1" />
        Suspended
      </span>;
    }
    
    if (!vendor.isActive) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <AlertCircle className="w-3 h-3 mr-1" />
        Inactive
      </span>;
    }

    if (vendor.verificationStatus === 'approved') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>;
    }

    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <AlertCircle className="w-3 h-3 mr-1" />
      Pending
    </span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <Link to="/admin/vendors" className="text-orange-600 hover:text-orange-500 mt-4 inline-block">
            ← Back to Vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link 
                to="/admin/vendors" 
                className="flex items-center text-gray-500 hover:text-gray-700 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Vendors
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{vendor.businessName}</h1>
                <div className="flex items-center mt-1">
                  {getStatusBadge(vendor)}
                  <span className="ml-2 text-sm text-gray-500">
                    ID: {vendor._id?.slice(-8)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {vendor.isSuspended ? (
                <button
                  onClick={handleUnsuspendVendor}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <CheckCircle className="w-4 h-4 mr-2 inline" />
                  Unsuspend
                </button>
              ) : (
                <button
                  onClick={handleSuspendVendor}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <Ban className="w-4 h-4 mr-2 inline" />
                  Suspend
                </button>
              )}
              
              <button
                onClick={handleUpdateCommission}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Settings className="w-4 h-4 mr-2 inline" />
                Commission
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vendor Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Products</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.stats?.totalProducts || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ShoppingCart className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Orders</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.stats?.totalOrders || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${vendor.stats?.totalRevenue || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rating</p>
                <p className="text-2xl font-bold text-gray-900">{vendor.stats?.averageRating?.toFixed(1) || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Business Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.businessName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{vendor.businessType}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.description || 'No description provided'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Categories</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {vendor.categories?.map((category, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {category}
                    </span>
                  )) || <span className="text-sm text-gray-500">No categories assigned</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{vendor.email}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{vendor.contactPerson?.phone || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <p className="mt-1 text-sm text-gray-900">
                  {vendor.contactPerson?.firstName} {vendor.contactPerson?.lastName}
                </p>
              </div>
              
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-sm text-gray-900">
                    {vendor.address?.street}<br />
                    {vendor.address?.city}, {vendor.address?.state} {vendor.address?.zipCode}<br />
                    {vendor.address?.country}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings & Security */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Account Settings & Security</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Password Display (Admin Only) */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <label className="block text-sm font-medium text-yellow-800">Current Password (Admin View Only)</label>
                </div>
                <div className="bg-white border rounded px-3 py-2 font-mono text-sm">
                  {vendor.currentPassword || 'Password not available'}
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  🔐 This information is only visible to administrators for account recovery purposes
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Commission Rate</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.settings?.commissionRate || 15}%</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.settings?.currency || 'USD'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Auto Approve Products</label>
                <p className="mt-1 text-sm text-gray-900">
                  {vendor.settings?.autoApproveProducts ? 'Yes' : 'No'}
                </p>
              </div>
              
              {/* Additional Account Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Status</label>
                <p className="mt-1 text-sm text-gray-900">
                  {vendor.isActive ? 'Active' : 'Inactive'} 
                  {vendor.isSuspended && ' (Suspended)'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Login</label>
                <p className="mt-1 text-sm text-gray-900">
                  {vendor.lastLogin ? formatDate(vendor.lastLogin) : 'Never logged in'}
                </p>
              </div>
            </div>
          </div>

          {/* Verification & Timeline */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Verification & Timeline</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Joined</label>
                  <p className="text-sm text-gray-900">{formatDate(vendor.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Verification Status</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{vendor.verificationStatus}</p>
              </div>
              
              {vendor.verifiedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Verified At</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(vendor.verifiedAt)}</p>
                </div>
              )}
              
              {vendor.verificationNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Verification Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.verificationNotes}</p>
                </div>
              )}
              
              {vendor.lastLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Login</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(vendor.lastLogin)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetailPage;
