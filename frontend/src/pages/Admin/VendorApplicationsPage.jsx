import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const VendorApplicationsPage = () => {
  const { adminAPI, isLoading: authLoading } = useAdminAuth();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    loadApplications();
  }, [filters]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getVendorApplications(filters);
      
      if (response.data.success) {
        setApplications(response.data.data.applications);
        setPagination(response.data.data.pagination);
      } else {
        setError('Failed to load applications');
      }
    } catch (error) {
      console.error('Load applications error:', error);
      setError('Error loading applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (applicationId) => {
    if (!window.confirm('Are you sure you want to approve this vendor application?')) {
      return;
    }

    try {
      const password = prompt('Enter a default password for the vendor (or leave empty for auto-generated):');
      const notes = prompt('Add approval notes (optional):');

      const response = await adminAPI.approveVendorApplication(applicationId, {
        password: password || undefined,
        notes: notes || undefined
      });

      if (response.data.success) {
        alert('Vendor application approved successfully!');
        loadApplications(); // Reload the list
      } else {
        alert(response.data.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Approve application error:', error);
      alert('Error approving application');
    }
  };

  const handleReject = async (applicationId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await adminAPI.rejectVendorApplication(applicationId, { reason });

      if (response.data.success) {
        alert('Vendor application rejected successfully!');
        loadApplications(); // Reload the list
      } else {
        alert(response.data.message || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Reject application error:', error);
      alert('Error rejecting application');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      'submitted': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
      'under_review': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Under Review' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      'more_info_required': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'More Info Required' }
    };

    const config = statusConfig[status] || statusConfig['draft'];
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin/dashboard" className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-orange-500">IT</div>
                <span className="text-gray-900 font-medium">Admin Portal</span>
              </Link>
            </div>
            <nav className="flex space-x-4">
              <Link to="/admin/dashboard" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/admin/vendor-applications" className="bg-orange-100 text-orange-700 px-3 py-2 rounded-md text-sm font-medium">
                Vendor Applications
              </Link>
              <Link to="/admin/vendors" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Vendors
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vendor Applications</h1>
          <p className="mt-2 text-gray-600">Review and manage vendor registration applications</p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by business name, email, or ID"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="more_info_required">More Info Required</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadApplications}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No vendor applications found</div>
              <p className="text-gray-400 mt-2">Applications will appear here when vendors register</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <tr key={application._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.businessName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {application.applicationId}
                          </div>
                          <div className="text-sm text-gray-500">
                            Type: {application.businessType}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {application.contactPerson?.firstName} {application.contactPerson?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.contactPerson?.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(application.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(application.applicationDate || application.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/admin/vendor-applications/${application._id}`}
                            className="text-orange-600 hover:text-orange-900 bg-orange-100 px-3 py-1 rounded text-xs"
                          >
                            View Details
                          </Link>
                          {(application.status === 'submitted' || application.status === 'under_review') && (
                            <>
                              <button
                                onClick={() => handleApprove(application._id)}
                                className="text-green-600 hover:text-green-900 bg-green-100 px-3 py-1 rounded text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(application._id)}
                                className="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded text-xs"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((pagination.currentPage - 1) * filters.limit) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * filters.limit, pagination.totalApplications)}
                    </span> of{' '}
                    <span className="font-medium">{pagination.totalApplications}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={!pagination.hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorApplicationsPage;
