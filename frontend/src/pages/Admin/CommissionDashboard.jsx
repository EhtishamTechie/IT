import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users, 
  Download,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  FileText,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Settings,
  X
} from 'lucide-react';
import axios from 'axios';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { getApiUrl } from '../../config';

const CommissionDashboard = () => {
  const { adminAPI } = useAdminAuth();
  const [vendorCommissions, setVendorCommissions] = useState([]);
  const [summary, setSummary] = useState({
    totalPending: 0,
    totalPaid: 0,
    totalCommissionSum: 0,
    activeVendors: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('month'); // 'month', '90days', 'year'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'paid'
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Additional state variables for various modals and operations
  const [paymentVendor, setPaymentVendor] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [resetVendor, setResetVendor] = useState(null);
  const [resetNotes, setResetNotes] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [commissionData, setCommissionData] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);
  const itemsPerPage = 9; // 3x3 grid
  const [showCommissionSettingsModal, setShowCommissionSettingsModal] = useState(false);
  const [currentCommissionRate, setCurrentCommissionRate] = useState(20);
  const [newCommissionRate, setNewCommissionRate] = useState(20);

  const filterOptions = [
    { value: 'month', label: 'This Month' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'year', label: 'This Year' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Completed' }
  ];

  useEffect(() => {
    loadCommissionData();
    loadCurrentCommissionRate();
  }, [currentPage]); // Only depend on currentPage
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriod, statusFilter, searchTerm]);

  const loadCommissionData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Admin: Loading commission data...');
      console.log('📅 Filter period:', filterPeriod);
      console.log('🎯 Status filter:', statusFilter);
      
      // Get commission summary with filters
      const summaryResponse = await adminAPI.getCommissionSummary({
        period: filterPeriod,
        status: statusFilter,
        search: searchTerm,
        page: currentPage,
        limit: itemsPerPage
      });
      
      // Validate response format
      if (!summaryResponse.data || typeof summaryResponse.data !== 'object') {
        throw new Error('Invalid API response format');
      }
      
      // Then get commission analytics data
      const analyticsResponse = await adminAPI.getCommissionOverview({
        period: filterPeriod,
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined
      });
      
      // Check if we got HTML instead of JSON
      if (typeof analyticsResponse.data === 'string' && analyticsResponse.data.includes('<!doctype html>')) {
        console.error('Received HTML instead of JSON for analytics');
        throw new Error('Invalid API response format');
      }
      
      console.log('📊 API Response:', { 
        summary: summaryResponse.data, 
        analytics: analyticsResponse.data 
      });
      
      // Handle missing or malformed data
      if (!summaryResponse.data?.data || !analyticsResponse.data?.data) {
        throw new Error('Missing data in API response');
      }

      // Process vendor commissions data from analytics
      const analyticsData = analyticsResponse.data.data;
      const vendorCommissions = analyticsData.vendorCommissions || [];
      
      if (!Array.isArray(vendorCommissions)) {
        throw new Error('Vendor commissions data is not an array');
      }
      
      // Map vendor data with defaults
      const processedVendors = vendorCommissions.map(vendor => ({
        ...vendor,
        vendorId: vendor.vendorId,
        businessName: vendor.businessName || 'Unknown Vendor',
        email: vendor.email || '',
        totalCommission: vendor.totalCommission || 0,
        totalPaid: vendor.totalPaid || 0,
        pendingAmount: vendor.pendingAmount || 0,
        orderCount: vendor.orderCount || 0
      }));

      console.log('🏢 Processed vendor data:', processedVendors);
      setVendorCommissions(processedVendors);

      // Process and set summary data
      const summaryData = summaryResponse.data.data;
      console.log('📊 Summary data received:', summaryData);
      
      // Check if summary data exists directly in data object
      const summaryStats = summaryData.summary || summaryData;
      console.log('📊 Processing summary stats:', summaryStats);
      
      if (summaryStats) {
        const newSummary = {
          totalPending: parseFloat(summaryStats.totalPending || 0),
          totalPaid: parseFloat(summaryStats.totalPaid || 0),
          totalCommissionSum: parseFloat(summaryStats.totalCommissionSum || 0),
          activeVendors: summaryStats.activeVendors || processedVendors.length
        };
        console.log('📊 Setting new summary:', newSummary);
        setSummary(newSummary);
      } else {
        console.error('❌ Missing summary data in API response:', summaryData);
        setSummary({
          totalPending: 0,
          totalPaid: 0,
          totalCommissionSum: 0,
          activeVendors: 0
        });
      }
      
      // Handle pagination from analytics data
      setCurrentPage(analyticsData.currentPage || 1);
      setTotalPages(analyticsData.totalPages || 1);
      setTotalVendors(analyticsData.totalVendors || 0);
    } catch (error) {
      console.error('❌ Error loading commission data:', error);
      setVendorCommissions([]);
      setSummary({ totalPending: 0, totalPaid: 0, totalCommissionSum: 0, activeVendors: 0 });
    } finally {
      setLoading(false);
    }
  };

  // TEMPORARILY COMMENTED OUT - THESE FUNCTIONS HAVE UNDEFINED VARIABLES
  /*
  const processCommissionPayment = async () => {
    if (!paymentVendor || !paymentAmount || !paymentMethod) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.put(`${getApiUrl()}/admin/commissions/${paymentVendor._id}/pay`, {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        transactionRef
      }, { headers });
      
      setShowPaymentModal(false);
      setPaymentVendor(null);
      setPaymentAmount('');
      setTransactionRef('');
      loadCommissionData();
      
      alert('Commission payment processed successfully!');
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  const resetVendorCommission = async () => {
    if (!resetVendor || !resetNotes.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.put(`${getApiUrl()}/admin/commissions/${resetVendor.vendor._id}/reset`, {
        paymentMethod: 'bank_transfer',
        transactionRef: transactionRef || `RESET_${Date.now()}`,
        notes: resetNotes,
        paymentDate: new Date().toISOString()
      }, { headers });
      
      setShowResetModal(false);
      setResetVendor(null);
      setResetNotes('');
      setTransactionRef('');
      loadCommissionData();
      
      alert('Vendor commission reset successfully!');
    } catch (error) {
      console.error('Error resetting commission:', error);
      alert('Failed to reset commission. Please try again.');
    }
  };

  const processBulkPayments = async () => {

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const paymentData = selectedVendors.map(vendorId => {
        const vendor = commissionData.find(c => c.vendor._id === vendorId);
        return {
          vendorId,
          amount: vendor.pendingCommission,
          paymentMethod: 'bank_transfer'
        };
      });
      
      await axios.post(`${getApiUrl()}/admin/commissions/bulk-pay`, {
        payments: paymentData
      }, { headers });
      
      setSelectedVendors([]);
      loadCommissionData();
      
      alert(`Bulk payment processed for ${paymentData.length} vendors!`);
    } catch (error) {
      console.error('Error processing bulk payment:', error);
      alert('Failed to process bulk payment. Please try again.');
    }
  };

  const exportCommissionReport = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${getApiUrl()}/admin/commissions/export`, {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `commission-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to generate report. Using fallback export...');
      
      // Fallback: Create CSV from current data
      const csvContent = [
        ['Vendor', 'Total Commission', 'Pending', 'Paid', 'Last Payment Date'].join(','),
        ...filteredCommissions.map(c => [
          c.vendor.businessName || c.vendor.name,
          c.totalCommission || 0,
          c.pendingCommission || 0,
          c.paidCommission || 0,
          c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString() : 'Never'
        ].join(','))
      ].join('\\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `commission-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  };
  */
  // END OF COMMENTED OUT FUNCTIONS

  const markPaymentReceived = async (vendor, amount) => {
    try {
      console.log('🎯 Marking payment for vendor:', { 
        vendorId: vendor._id, 
        vendorName: vendor.businessName,
        amount 
      });
      
      const response = await adminAPI.updateVendorPayment(vendor._id, {
        amount: parseFloat(amount),
        period: filterPeriod,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        notes: `Payment marked as received by admin on ${new Date().toLocaleDateString()}`
      });
      
      console.log('✅ Payment response:', response.data);
      
      if (response.data.success) {
        setShowPaymentModal(false);
        setSelectedVendor(null);
        setPaymentAmount('');
        
        // Refresh the commission data
        await loadCommissionData();
        
        alert(`Payment of $${amount} marked successfully for ${vendor.businessName}!`);
      }
    } catch (error) {
      console.error('❌ Error marking payment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to mark payment. Please try again.';
      alert(errorMessage);
    }
  };

  const exportReport = async () => {
    try {
      const response = await adminAPI.exportCommissionReport({
        period: filterPeriod
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `commission-report-${filterPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const loadCurrentCommissionRate = async () => {
    try {
      const response = await adminAPI.getCommissionSettings();
      if (response.data && response.data.success) {
        setCurrentCommissionRate(response.data.data.commissionPercentage);
        setNewCommissionRate(response.data.data.commissionPercentage);
      }
    } catch (error) {
      console.error('Error loading commission rate:', error);
      // Default to 20% if can't load
      setCurrentCommissionRate(20);
      setNewCommissionRate(20);
    }
  };

  const updateCommissionRate = async () => {
    if (newCommissionRate < 0 || newCommissionRate > 100) {
      alert('Commission rate must be between 0% and 100%');
      return;
    }

    try {
      await adminAPI.updateCommissionSettings({
        commissionPercentage: newCommissionRate
      });
      
      setCurrentCommissionRate(newCommissionRate);
      setShowCommissionSettingsModal(false);
      
      alert(`Commission rate updated to ${newCommissionRate}% successfully!`);
      
      // Reload commission data to reflect changes
      loadCommissionData();
    } catch (error) {
      console.error('Error updating commission rate:', error);
      alert('Failed to update commission rate. Please try again.');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Trigger search with debounce could be added here
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Commission Management</h1>
            <p className="text-gray-600">Track vendor commission payments and manage payment status</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
            {/* Period Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Filter className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-gray-700">
                  {filterOptions.find(opt => opt.value === filterPeriod)?.label}
                </span>
                <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterPeriod(option.value);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                        filterPeriod === option.value ? 'bg-green-50 text-green-700' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowCommissionSettingsModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Commission Settings
            </button>
            
            <button
              onClick={exportReport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Pending Commission</p>
                <p className="text-3xl font-bold">
                  ${summary.totalPending?.toFixed(2) || '0.00'}
                </p>
                <p className="text-green-100 text-xs mt-1">From all vendors</p>
              </div>
              <div className="bg-green-400 p-3 rounded-full">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Paid Commission</p>
                <p className="text-3xl font-bold">
                  ${summary.totalPaid?.toFixed(2) || '0.00'}
                </p>
                <p className="text-blue-100 text-xs mt-1">Successfully received</p>
              </div>
              <div className="bg-blue-400 p-3 rounded-full">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Commission Sum</p>
                <p className="text-3xl font-bold">
                  ${summary.totalCommissionSum?.toFixed(2) || '0.00'}
                </p>
                <p className="text-purple-100 text-xs mt-1">Overall generated</p>
              </div>
              <div className="bg-purple-400 p-3 rounded-full">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Status Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          
          <button
            onClick={loadCommissionData}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Vendor Commission Cards */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Vendor Commissions ({(() => {
              const filteredVendors = vendorCommissions.filter((vendorData) => {
                const searchMatch = !searchTerm || 
                  (vendorData.businessName && vendorData.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (vendorData.email && vendorData.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (vendorData.name && vendorData.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (vendorData.vendorId && vendorData.vendorId.toString().includes(searchTerm));

                const statusMatch = statusFilter === 'all' || 
                  (statusFilter === 'pending' && vendorData.pendingAmount > 0) ||
                  (statusFilter === 'paid' && vendorData.pendingAmount <= 0);

                return searchMatch && statusMatch;
              });
              return filteredVendors.length;
            })()})
            {(searchTerm || statusFilter !== 'all') && (
              <span className="text-sm text-gray-500 ml-2">
                of {vendorCommissions.length} total
              </span>
            )}
          </h2>
        </div>
        
        <div className="p-6">
          {(() => {
            // Filter vendors based on search term and status
            const filteredVendors = vendorCommissions.filter((vendorData) => {
              // Search filter - check business name, email, and vendor ID
              const searchMatch = !searchTerm || 
                (vendorData.businessName && vendorData.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (vendorData.email && vendorData.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (vendorData.name && vendorData.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (vendorData.vendorId && vendorData.vendorId.toString().includes(searchTerm));

              // Status filter
              const statusMatch = statusFilter === 'all' || 
                (statusFilter === 'pending' && vendorData.pendingAmount > 0) ||
                (statusFilter === 'paid' && vendorData.pendingAmount <= 0);

              return searchMatch && statusMatch;
            });

            return filteredVendors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendorData) => {
                const getCardBorderColor = () => {
                  if (vendorData.pendingAmount > 0) return 'border-red-200 bg-red-50'; // Has pending
                  return 'border-green-200 bg-green-50'; // All paid
                };

                const getStatusColor = () => {
                  if (vendorData.pendingAmount > 0) return 'bg-red-100 text-red-800';
                  return 'bg-green-100 text-green-800';
                };

                const getStatusText = () => {
                  if (vendorData.pendingAmount > 0) return 'Pending Payment';
                  return 'Completed';
                };

                // Debug log for each vendor
                console.log('🔍 Vendor card data:', {
                  vendorId: vendorData.vendorId,
                  businessName: vendorData.businessName,
                  email: vendorData.email,
                  hasBusinessName: !!vendorData.businessName,
                  businessNameType: typeof vendorData.businessName,
                  rawVendorData: vendorData
                });

                // Create a display name that prioritizes actual names over email
                const displayName = vendorData.businessName && vendorData.businessName.trim() 
                  ? vendorData.businessName.trim()
                  : vendorData.name && vendorData.name.trim()
                  ? vendorData.name.trim()
                  : `Vendor ${(vendorData.vendorId || '').toString().slice(-6)}`;

                return (
                  <div key={vendorData.vendorId} className={`p-6 border-2 rounded-lg transition-all hover:shadow-lg ${getCardBorderColor()}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">
                        {displayName}
                      </h3>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor()}`}>
                        {getStatusText()}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Total Commission Sum:</span>
                        <span className="font-semibold text-purple-600">
                          ${vendorData.totalCommission?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Paid Amount:</span>
                        <span className="font-semibold text-green-600">
                          ${vendorData.totalPaid?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Total Orders:</span>
                        <span className="font-semibold text-gray-800">
                          {vendorData.orderCount || 0}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-gray-600 text-sm font-medium">Pending Amount:</span>
                        <span className={`font-bold ${
                          vendorData.pendingAmount > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${vendorData.pendingAmount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                    
                    {vendorData.pendingAmount > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setSelectedVendor({
                              _id: vendorData.vendorId,
                              businessName: vendorData.businessName
                            });
                            setPaymentAmount(vendorData.pendingAmount.toString());
                            setShowPaymentModal(true);
                          }}
                          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Mark Payment Received
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'No matching vendors' : 'No Commission Data'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No vendors match your current search criteria or filter.'
                    : 'No vendor commission data found for the selected period.'
                  }
                </p>
                <button
                  onClick={loadCommissionData}
                  className="flex items-center justify-center mx-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </button>
              </div>
            );
          })()}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-700 mb-2 sm:mb-0">
              Showing {((currentPage - 1) * 9) + 1} to {Math.min(currentPage * 9, totalVendors)} of {totalVendors} vendors
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium border transition-colors ${
                        currentPage === pageNum
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedVendor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Mark Payment Received
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Vendor: <strong>{selectedVendor.businessName}</strong>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder="0.00"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => markPaymentReceived(selectedVendor, paymentAmount)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Confirm Payment
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedVendor(null);
                    setPaymentAmount('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Settings Modal */}
      {showCommissionSettingsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Commission Settings</h3>
                <button
                  onClick={() => setShowCommissionSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Commission Rate
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                    {currentCommissionRate}%
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter commission percentage"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a value between 0 and 100
                  </p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-700">
                      <p><strong>Important:</strong> This will affect all future commission calculations. Existing commissions will not be changed.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateCommissionRate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Update Commission Rate
                </button>
                <button
                  onClick={() => {
                    setShowCommissionSettingsModal(false);
                    setNewCommissionRate(currentCommissionRate);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionDashboard;
