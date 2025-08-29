import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Package,
  Filter,
  ChevronDown
} from 'lucide-react';
import { vendorAxios } from '../../services/vendorService';
import VendorLayout from '../../components/Vendor/VendorLayout';

const VendorCommissionPage = () => {
  const [commissionData, setCommissionData] = useState({
    totalCommissionSum: 0,
    totalPaidToAdmin: 0,
    pendingAmountToAdmin: 0
  });
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month'); // 'month', '90days', 'year'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [commissionRate, setCommissionRate] = useState(null); // Start with null to force loading
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const itemsPerPage = 12; // 12 cards per page as requested

  const filterOptions = [
    { value: 'month', label: 'This Month' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'year', label: 'This Year' }
  ];

  useEffect(() => {
    console.log('🔄 DEBUG: useEffect triggered, filterPeriod:', filterPeriod);
    loadCommissionData();
    loadCommissionRate();
  }, [filterPeriod, currentPage]);
  
  // Reset to page 1 when filter period changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriod]);

  const loadCommissionRate = async () => {
    try {
      console.log('💰 DEBUG: Loading commission rate...');
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      if (!token) {
        console.log('❌ DEBUG: No token found for commission rate');
        setCommissionRate(20); // Fallback to 20%
        return;
      }

      // Always get the global commission rate from admin settings first
      let globalRate = 20; // Default fallback
      try {
        const adminResponse = await vendorAxios.get('/admin/commission/settings');
        
        if (adminResponse.data.success && adminResponse.data.data && adminResponse.data.data.commissionPercentage !== undefined) {
          globalRate = adminResponse.data.data.commissionPercentage;
          console.log('💰 DEBUG: Global commission rate from admin:', globalRate + '%');
        } else {
          console.log('⚠️ Admin settings not accessible, using default 20%');
        }
      } catch (adminError) {
        console.log('⚠️ Admin settings endpoint failed, using default 20%:', adminError.message);
      }

      // Try to get vendor-specific rate from dashboard
      try {
        const dashboardResponse = await vendorAxios.get('/vendors/dashboard');
        
        console.log('💰 DEBUG: Dashboard response status:', dashboardResponse.status);
        
        if (dashboardResponse.data.success && dashboardResponse.data.data && dashboardResponse.data.data.commissionRate !== undefined) {
          const vendorRate = dashboardResponse.data.data.commissionRate;
          console.log('💰 DEBUG: Vendor-specific commission rate:', vendorRate + '%');
          setCommissionRate(vendorRate);
          return; // Use vendor-specific rate
        }
      } catch (dashboardError) {
        console.log('⚠️ Dashboard endpoint failed:', dashboardError.message);
      }

      // Use global rate as fallback
      console.log('💰 DEBUG: Using global commission rate as fallback:', globalRate + '%');
      setCommissionRate(globalRate);
      
    } catch (error) {
      console.error('❌ DEBUG: Error loading commission rate:', error);
      // Keep default rate of 20% if everything fails
      setCommissionRate(20);
    }
  };

  const loadCommissionData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      
      console.log('🔍 DEBUG: Loading commission data...');
      console.log('🔑 DEBUG: Token found:', token ? 'YES' : 'NO');
      console.log('📅 DEBUG: Filter period:', filterPeriod);
      
      if (!token) {
        console.error('❌ DEBUG: No authentication token found');
        setError('No authentication token found. Please log in again.');
        return;
      }
      
      // Get commission summary data with filter
      const summaryUrl = `/vendors/orders/commissions?period=${filterPeriod}`;
      console.log('📊 DEBUG: Making summary request to:', summaryUrl);
      
      try {
        const summaryResponse = await vendorAxios.get(summaryUrl);
        
        console.log('📊 DEBUG: Summary response status:', summaryResponse.status);
        console.log('📊 DEBUG: Summary response data:', summaryResponse.data);
        
        if (summaryResponse.data.success && summaryResponse.data.data) {
          const summary = summaryResponse.data.data.summary;
          console.log('📊 DEBUG: Summary object:', summary);
          
          // Use real data from API - match backend property names
          const newCommissionData = {
            totalCommissionSum: summary.totalCommission || 0,  // Backend sends totalCommission
            totalPaidToAdmin: summary.totalPaidToAdmin || 0,
            pendingAmountToAdmin: summary.pendingAmountToAdmin || 0
          };
          
          console.log('📊 DEBUG: Setting commission data:', newCommissionData);
          setCommissionData(newCommissionData);
          
          // Update commission rate if provided
          if (summary.vendorCommissionRate !== undefined) {
            console.log('💰 DEBUG: Setting commission rate from summary:', summary.vendorCommissionRate);
            setCommissionRate(summary.vendorCommissionRate);
          }
          
          setError('');
          
          if (summaryResponse.data.data.message) {
            console.log('ℹ️ DEBUG: Info message from API:', summaryResponse.data.data.message);
          }
        } else {
          console.log('❌ DEBUG: API returned success but invalid data structure:', summaryResponse.data);
          setError('Invalid data format received from server.');
        }
      } catch (summaryError) {
        console.error('❌ DEBUG: Error fetching summary:', summaryError);
        setError('Unable to load commission summary. Please try again later.');
      }

      // Get monthly commission breakdown using the correct endpoint
      try {
        await loadMonthlyReports(token);
      } catch (monthlyError) {
        console.error('❌ DEBUG: Error loading monthly reports:', monthlyError);
        // Don't set error here as summary data might have loaded successfully
      }

    } catch (error) {
      console.error('❌ DEBUG: Error loading commission data:', error);
      setError('Unable to load commission data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReports = async (token) => {
    try {
      // Use the CORRECT endpoint that matches summary calculation logic
      // This endpoint expects 'year' parameter, not 'period'
      const currentYear = new Date().getFullYear();
      const monthlyUrl = `/vendors/orders/commissions/monthly?year=${currentYear}&page=${currentPage}&limit=${itemsPerPage}`;
      console.log('📅 DEBUG: Making monthly request to:', monthlyUrl);
      
      const monthlyResponse = await vendorAxios.get(monthlyUrl);

      console.log('📅 DEBUG: Monthly response status:', monthlyResponse.status);
      console.log('📅 DEBUG: Monthly response data:', monthlyResponse.data);

      if (monthlyResponse.data.success && monthlyResponse.data.data) {
        // Handle response structure from vendorOrderController_clean.js
        if (monthlyResponse.data.data.monthlyCommissions) {
          console.log('📅 DEBUG: Monthly commissions array:', monthlyResponse.data.data.monthlyCommissions);
          setMonthlyReports(monthlyResponse.data.data.monthlyCommissions);
          
          // Handle pagination if available
          if (monthlyResponse.data.data.pagination) {
            const pagination = monthlyResponse.data.data.pagination;
            setCurrentPage(pagination.currentPage || currentPage);
            setTotalPages(pagination.totalPages || 1);
            setTotalReports(pagination.totalReports || 0);
            console.log('📄 DEBUG: Pagination info:', {
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
              totalReports: pagination.totalReports
            });
          } else {
            // If no pagination, assume single page
            setTotalPages(1);
            setTotalReports(monthlyResponse.data.data.monthlyCommissions.length);
          }
        }
        
        // Update commission rate if provided  
        if (monthlyResponse.data.data.vendorCommissionRate !== undefined) {
          console.log('💰 DEBUG: Monthly endpoint commission rate:', monthlyResponse.data.data.vendorCommissionRate);
          setCommissionRate(monthlyResponse.data.data.vendorCommissionRate);
        }
      } else {
        console.log('❌ DEBUG: Monthly data invalid structure:', monthlyResponse.data);
        // Set empty state for no data
        setMonthlyReports([]);
        setTotalPages(1);
        setTotalReports(0);
      }
    } catch (error) {
      console.error('❌ DEBUG: Error loading monthly reports:', error);
      // Set empty state on error
      setMonthlyReports([]);
      setTotalPages(1);
      setTotalReports(0);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'current':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Current</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Payment</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">No Data</span>;
    }
  };

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commission Management</h1>
            <p className="text-gray-600">
              Track your commission payments to admin ({commissionRate || 'Loading...'}% commission rate)
            </p>
          </div>
          
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <Filter className="h-4 w-4 text-gray-500" />
              <span>{filterOptions.find(opt => opt.value === filterPeriod)?.label}</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
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
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                      filterPeriod === option.value ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
              <p className="text-orange-700">{error}</p>
            </div>
          </div>
        )}

        {/* Summary Cards - Website Theme Colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Commission - Orange Theme */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Total Commission Sum</p>
                <p className="text-3xl font-bold">{formatCurrency(commissionData.totalCommissionSum)}</p>
                <p className="text-orange-100 text-sm mt-1">From all completed orders</p>
              </div>
              <DollarSign className="h-12 w-12 text-orange-200" />
            </div>
          </div>

          {/* Paid to Admin - Green Success Theme */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Paid to Admin</p>
                <p className="text-3xl font-bold">{formatCurrency(commissionData.totalPaidToAdmin)}</p>
                <p className="text-emerald-100 text-sm mt-1">Successfully paid</p>
              </div>
              <CheckCircle className="h-12 w-12 text-emerald-200" />
            </div>
          </div>

          {/* Pending to Admin - Warm Orange-Red Theme */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Pending to Admin</p>
                <p className="text-3xl font-bold">{formatCurrency(commissionData.pendingAmountToAdmin)}</p>
                <p className="text-amber-100 text-sm mt-1">Amount to be paid</p>
              </div>
              <Clock className="h-12 w-12 text-amber-200" />
            </div>
          </div>
        </div>

        {/* Monthly Commission Records */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-orange-600" />
              Monthly Commission Records
            </h2>
          </div>
          
          <div className="p-6">
            {monthlyReports && monthlyReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {monthlyReports.map((report, index) => (
                  <div key={index} className={`p-4 rounded-lg border-2 shadow-md transition-all duration-200 hover:shadow-lg ${
                    report.status === 'current' ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100' :
                    report.status === 'pending' ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100' :
                    report.status === 'completed' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100' :
                    'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {report.monthName} {report.year}
                      </h3>
                      {getStatusBadge(report.status)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Commission:</span>
                        <span className="font-medium text-orange-700">{formatCurrency(report.totalCommission)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid to Admin:</span>
                        <span className="font-medium text-emerald-700">{formatCurrency(report.paidToAdmin)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending to Admin:</span>
                        <span className="font-medium text-amber-700">{formatCurrency(report.pendingAmountToAdmin)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Orders:</span>
                        <span className="font-medium text-gray-800">{report.totalOrders}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Commission Data</h3>
                <p className="text-gray-500">No commission records found for the selected period.</p>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
              <div className="text-sm text-gray-700 mb-2 sm:mb-0">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalReports)} of {totalReports} monthly reports
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
                            ? 'bg-orange-600 text-white border-orange-600'
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
      </div>
    </VendorLayout>
  );
};

export default VendorCommissionPage;
