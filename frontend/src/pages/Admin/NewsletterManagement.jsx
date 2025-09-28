import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Download, 
  Search, 
  Filter,
  Calendar,
  Users,
  Eye,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const NewsletterManagement = () => {
  const { adminAPI } = useAdminAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalUnsubscribed: 0,
    recentSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const itemsPerPage = 10;

  const statusOptions = [
    { value: 'all', label: 'All Subscribers', color: 'blue' },
    { value: 'active', label: 'Active Only', color: 'green' },
    { value: 'inactive', label: 'Unsubscribed', color: 'red' }
  ];

  // Load newsletter data
  const loadNewsletterData = async () => {
    try {
      setLoading(true);

      // Load stats and subscriptions in parallel
      const [statsResponse, subscriptionsResponse] = await Promise.all([
        adminAPI.getNewsletterStats(),
        adminAPI.getNewsletterSubscriptions({
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
          status: statusFilter
        })
      ]);

      if (statsResponse.data?.success) {
        setStats(statsResponse.data.data);
      }

      if (subscriptionsResponse.data?.success) {
        const { subscriptions: subs, pagination } = subscriptionsResponse.data.data;
        setSubscriptions(subs || []);
        setTotalPages(pagination?.totalPages || 1);
        setTotalItems(pagination?.totalItems || 0);
      }

    } catch (error) {
      console.error('Error loading newsletter data:', error);
      setSubscriptions([]);
      setStats({ totalSubscribers: 0, totalUnsubscribed: 0, recentSubscriptions: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Export subscriptions to CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      
      const response = await adminAPI.exportNewsletterSubscriptions({
        status: statusFilter
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `newsletter_subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting newsletter data:', error);
      alert('Failed to export newsletter data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Delete subscription
  const handleDelete = async (subscriptionId, email) => {
    if (!window.confirm(`Are you sure you want to delete the subscription for ${email}?`)) {
      return;
    }

    try {
      const response = await adminAPI.deleteNewsletterSubscription(subscriptionId);
      
      if (response.data?.success) {
        // Reload data
        loadNewsletterData();
      } else {
        alert('Failed to delete subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Failed to delete subscription. Please try again.');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle search and filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      loadNewsletterData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  // Handle page changes
  useEffect(() => {
    loadNewsletterData();
  }, [currentPage]);

  // Initial load
  useEffect(() => {
    loadNewsletterData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Management</h1>
          <p className="text-gray-600">Manage email subscriptions and export subscriber data</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => loadNewsletterData()}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExport}
            disabled={exporting || totalItems === 0}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSubscribers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentSubscriptions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unsubscribed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUnsubscribed.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by email address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <Filter className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {statusOptions.find(opt => opt.value === statusFilter)?.label}
              </span>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 ${
                      statusFilter === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 bg-${option.color}-500`}></span>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Email Subscriptions 
            {totalItems > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({totalItems.toLocaleString()} total)
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2">Loading subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'No newsletter subscriptions yet.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">
                            {subscription.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(subscription.subscribedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          subscription.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subscription.isActive ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {subscription.source?.replace('_', ' ') || 'Website'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(subscription._id, subscription.email)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          title="Delete subscription"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="px-3 py-1 text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NewsletterManagement;