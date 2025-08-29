import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Search, Filter, MoreVertical, Eye, Ban, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../services/vendorService';

const VendorManagement = () => {
  const { adminAPI } = useAdminAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);
  const vendorsPerPage = 10;

  // Debounced search to prevent constant API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Reduced to 300ms for better responsiveness

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch vendors when debounced search term or filters change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchVendors(1);
  }, [debouncedSearchTerm, statusFilter, sortBy, sortOrder]);

  const fetchVendors = async (page = currentPage) => {
    try {
      setIsLoading(true);
      console.log('🔍 [VENDOR SEARCH] Fetching vendors with search:', debouncedSearchTerm);
      
      const params = {
        search: debouncedSearchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        limit: vendorsPerPage
      };

      const response = await adminAPI.getVendors(params);
      console.log('🔍 Vendors API response:', response);
      
      if (response.data && response.data.success) {
        const vendorsData = response.data.data?.vendors || [];
        console.log('🔍 Vendors data:', vendorsData);
        
        // Ensure vendorsData is an array
        if (Array.isArray(vendorsData)) {
          setVendors(vendorsData);
          // Handle pagination data if available
          if (response.data.data?.pagination) {
            setTotalVendors(response.data.data.pagination.total || 0);
            setTotalPages(response.data.data.pagination.pages || 1);
            setCurrentPage(response.data.data.pagination.page || 1);
          } else {
            // Fallback for non-paginated response
            setTotalVendors(vendorsData.length);
            setTotalPages(Math.ceil(vendorsData.length / vendorsPerPage));
            setCurrentPage(page);
          }
        } else {
          console.warn('Vendors data is not an array:', vendorsData);
          setVendors([]);
          setTotalVendors(0);
          setTotalPages(1);
        }
      } else {
        console.error('Failed to fetch vendors:', response.data?.message || 'Unknown error');
        setVendors([]);
        setTotalVendors(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
      setTotalVendors(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendVendor = async (vendorId) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    try {
      const response = await adminAPI.suspendVendor(vendorId, { reason });
      if (response.data.success) {
        alert('Vendor suspended successfully');
        fetchVendors();
      } else {
        alert('Failed to suspend vendor');
      }
    } catch (error) {
      console.error('Error suspending vendor:', error);
      alert('Error suspending vendor');
    }
  };

  const handleUnsuspendVendor = async (vendorId) => {
    try {
      const response = await adminAPI.unsuspendVendor(vendorId);
      if (response.data.success) {
        alert('Vendor unsuspended successfully');
        fetchVendors();
      } else {
        alert('Failed to unsuspend vendor');
      }
    } catch (error) {
      console.error('Error unsuspending vendor:', error);
      alert('Error unsuspending vendor');
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
        <Clock className="w-3 h-3 mr-1" />
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Navigate to vendor dashboard with admin impersonation
  const handleViewVendorDashboard = async (vendorId) => {
    try {
      console.log('🏪 Admin accessing vendor dashboard for:', vendorId);
      
      // Get vendor details first
      const vendorResponse = await adminAPI.getVendorById(vendorId);
      if (vendorResponse.data && vendorResponse.data.success) {
        const vendor = vendorResponse.data.data;
        console.log('🏪 Vendor details for admin access:', vendor);
        
        // Store current admin session temporarily
        const currentAdminToken = localStorage.getItem('adminToken');
        const currentAdminData = localStorage.getItem('adminData');
        
        if (currentAdminToken) {
          // Clear any existing vendor session first
          localStorage.removeItem('vendorToken');
          localStorage.removeItem('vendorData');
          localStorage.removeItem('vendorAuthTime');
          
          // Store admin context in sessionStorage for later restoration
          sessionStorage.setItem('adminViewingVendor', 'true');
          sessionStorage.setItem('originalAdminToken', currentAdminToken);
          sessionStorage.setItem('originalAdminData', currentAdminData || '{}');
          sessionStorage.setItem('viewingVendorId', vendorId);
          
          // Create comprehensive vendor session for admin viewing with all required fields
          const adminImpersonationData = {
            _id: vendor._id,
            businessName: vendor.businessName || vendor.name || 'Unknown Business',
            email: vendor.email,
            contactPerson: vendor.contactPerson || {
              firstName: vendor.firstName || 'Admin',
              lastName: vendor.lastName || 'User',
              phone: vendor.phone || ''
            },
            verificationStatus: vendor.verificationStatus || 'approved',
            isActive: vendor.isActive !== false, // Default to true if not specified
            isSuspended: vendor.isSuspended || false,
            businessType: vendor.businessType || 'general',
            isAdminViewing: true,
            originalAdminToken: currentAdminToken,
            adminImpersonationTimestamp: Date.now()
          };
          
          // Set impersonation token and data
          localStorage.setItem('vendorToken', `admin-impersonating-${vendorId}`);
          localStorage.setItem('vendorData', JSON.stringify(adminImpersonationData));
          
          console.log('🔑 [ADMIN IMPERSONATION] Setup complete:', {
            vendorId: vendor._id,
            businessName: adminImpersonationData.businessName,
            token: `admin-impersonating-${vendorId}`,
            sessionFlags: {
              adminViewingVendor: sessionStorage.getItem('adminViewingVendor'),
              hasOriginalToken: !!sessionStorage.getItem('originalAdminToken'),
              viewingVendorId: sessionStorage.getItem('viewingVendorId')
            }
          });
          
          // Small delay to ensure localStorage is written
          setTimeout(() => {
            console.log('🚀 [ADMIN IMPERSONATION] Navigating to vendor dashboard...');
            navigate('/vendor/dashboard');
          }, 100);
          
        } else {
          console.error('No admin token found');
          alert('Authentication error. Please login as admin again.');
        }
      } else {
        console.error('Failed to get vendor details');
        alert('Failed to load vendor information');
      }
    } catch (error) {
      console.error('Error accessing vendor dashboard:', error);
      alert('Error accessing vendor dashboard: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
              <p className="text-sm text-gray-500">Manage approved vendors and their accounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Search and Filters */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative bg-white">
                <input
                  type="text"
                  placeholder="Search by business name, email, or vendor ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  autoComplete="off"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
              
              <button
                onClick={fetchVendors}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Vendors Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(!vendors || !Array.isArray(vendors) || vendors.length === 0) ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No vendors found</p>
                        <p className="text-sm">
                          {isLoading ? 'Loading vendors...' : 'No approved vendors are available yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          {/* Vendor Logo */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                              {vendor.logo ? (
                                <img
                                  src={getImageUrl(vendor.logo)}
                                  alt={`${vendor.businessName} Logo`}
                                  onError={(e) => {
                                    console.log('🖼️ Vendor management logo load error, using fallback');
                                    e.target.src = '/assets/default-vendor-logo.png';
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">
                                    {vendor.businessName?.charAt(0)?.toUpperCase() || 'V'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Vendor Details */}
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {vendor.businessName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {vendor._id?.slice(-8) || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400 capitalize">
                              {vendor.businessType}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{vendor.email}</div>
                        <div className="text-sm text-gray-500">
                          {vendor.contactPerson?.firstName} {vendor.contactPerson?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {vendor.contactPerson?.phone}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        {getStatusBadge(vendor)}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">
                            Products: <span className="font-medium">{vendor.stats?.totalProducts || 0}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Orders: <span className="font-medium">{vendor.stats?.totalOrders || 0}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Revenue: <span className="font-medium text-green-600">${vendor.stats?.totalRevenue || 0}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(vendor.createdAt)}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {/* View Vendor Dashboard Button */}
                          <button
                            onClick={() => handleViewVendorDashboard(vendor._id)}
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm font-medium"
                            title="View Vendor Dashboard"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Dashboard</span>
                          </button>
                          
                          {/* View Details */}
                          <Link
                            to={`/admin/vendors/${vendor._id}`}
                            className="text-gray-600 hover:text-gray-800"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          {/* Suspend/Unsuspend */}
                          {vendor.isSuspended ? (
                            <button
                              onClick={() => handleUnsuspendVendor(vendor._id)}
                              className="text-green-600 hover:text-green-800"
                              title="Unsuspend Vendor"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspendVendor(vendor._id)}
                              className="text-red-600 hover:text-red-800"
                              title="Suspend Vendor"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * vendorsPerPage) + 1}-{Math.min(currentPage * vendorsPerPage, totalVendors)} of {totalVendors} vendors
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchVendors(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNumber = currentPage <= 3 
                    ? index + 1 
                    : currentPage >= totalPages - 2 
                      ? totalPages - 4 + index
                      : currentPage - 2 + index;
                  
                  if (pageNumber < 1 || pageNumber > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => fetchVendors(pageNumber)}
                      className={`px-3 py-2 border rounded-lg text-sm ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => fetchVendors(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorManagement;
