import React, { useState, useEffect } from 'react';
import { vendorAxios } from '../../services/vendorService';
import { Search, RefreshCw, Package, Eye, Truck, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

const SimplifiedVendorOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [error, setError] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 10;
  
  const { vendor, loading: authLoading } = useVendorAuth();

  useEffect(() => {
    console.log('🚀 Component mounted');
    console.log('🔐 Auth loading:', authLoading);
    console.log('👤 Vendor:', vendor ? 'Present' : 'Missing');
    console.log('🔐 LocalStorage check:', {
      hasVendorToken: !!localStorage.getItem('vendorToken'),
      hasVendorData: !!localStorage.getItem('vendorData'),
      tokenType: localStorage.getItem('vendorToken')?.startsWith('admin-impersonating-') ? 'admin-impersonation' : 'normal',
      isAdminViewing: sessionStorage.getItem('adminViewingVendor')
    });
    
    if (!authLoading) {
      // Check for admin impersonation before showing error
      const token = localStorage.getItem('vendorToken');
      const isAdminImpersonation = token && token.startsWith('admin-impersonating-');
      const sessionAdminViewing = sessionStorage.getItem('adminViewingVendor') === 'true';
      
      if (vendor || isAdminImpersonation || sessionAdminViewing) {
        console.log('✅ Authentication valid - loading orders', { vendor: !!vendor, isAdminImpersonation, sessionAdminViewing });
        loadOrders();
      } else {
        console.log('❌ No vendor found after auth loading');
        setError('Not authenticated as vendor');
        setLoading(false);
      }
    }
  }, [authLoading, vendor]);

  // Reload orders when pagination changes
  useEffect(() => {
    if (vendor || localStorage.getItem('vendorToken')) {
      console.log(`📄 Page changed to: ${currentPage}`);
      loadOrders();
    }
  }, [currentPage]);

  // Reset to page 1 when filters change and reload data
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      // If already on page 1, reload data immediately for any status filter change
      if (vendor || localStorage.getItem('vendorToken')) {
        console.log(`🔄 Status filter changed to: ${statusFilter}`);
        loadOrders();
      }
    }
  }, [statusFilter]);

  // Debounced search effect
  useEffect(() => {
    if (!vendor && !localStorage.getItem('vendorToken')) return;
    
    const delayTimer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        loadOrders();
      }
    }, 500); // 500ms delay for search

    return () => clearTimeout(delayTimer);
  }, [searchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading vendor orders...');
      console.log('� Vendor info:', vendor);
      
      // Build query parameters for pagination and filtering
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      
      const response = await vendorAxios.get(`/vendors/orders?${params}`);
      console.log('📦 API Response:', response.data);
      console.log('📊 Response status:', response.status);
      
      // Handle new paginated response format
      if (response.data.success && response.data.data && response.data.data.orders) {
        const ordersData = response.data.data.orders;
        const pagination = response.data.data.pagination;
        
        console.log(`✅ Found ${ordersData.length} orders (paginated format)`);
        console.log('📄 Pagination info:', pagination);
        
        setOrders(ordersData);
        
        // Update pagination state
        if (pagination) {
          setCurrentPage(pagination.currentPage || currentPage);
          setTotalPages(pagination.totalPages || 1);
          setTotalOrders(pagination.totalOrders || 0);
        }
      } else if (response.data.success && response.data.orders) {
        console.log(`✅ Found ${response.data.orders.length} orders (legacy success format)`);
        setOrders(response.data.orders);
      } else if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Found ${response.data.length} orders (direct array format)`);
        setOrders(response.data);
      } else {
        console.log('❌ No orders found or unexpected format');
        console.log('📋 Full response:', response.data);
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      setError('Failed to load orders');
      setOrders([]);
    } finally {
      console.log('🏁 Setting loading to false...');
      setLoading(false);
    }
  };

  // Remove client-side filtering since backend handles it
  const filteredOrders = orders; // Backend already returns filtered results

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrders(prev => new Set([...prev, orderId]));

      const response = await vendorAxios.put(
        `/status/${orderId}/vendor-status`,
        { status: newStatus }
      );

      if (response.data.success) {
        console.log('✅ Order status updated successfully');
        loadOrders(); // Reload orders to reflect changes
        alert(`✅ Order status updated to "${newStatus}" successfully`);
      } else {
        console.error('❌ Failed to update order status:', response.data);
        alert(`❌ Failed to update order status: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update order status';
      alert(`❌ ${errorMessage}`);
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  console.log('🎯 Render state:', { authLoading, vendor: !!vendor, loading, ordersCount: orders.length });

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
          <p className="ml-4 text-gray-600">Initializing...</p>
        </div>
      </VendorLayout>
    );
  }

  // Show error if not authenticated
  if (error) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  // Show loading while orders are loading
  if (loading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
          <p className="ml-4 text-gray-600">Loading orders...</p>
        </div>
      </VendorLayout>
    );
  }

  console.log('🎯 Rendering main content with', orders.length, 'orders');

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <div className="flex space-x-3">
            <button
              onClick={loadOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Orders
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order number, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Status</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="cancelled_by_customer">Cancelled by Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            #{order.orderNumber || order._id?.slice(-8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.items?.length || 0} items
                          </p>
                          {order.orderType && (
                            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                              order.orderType === 'vendor_only' ? 'bg-purple-100 text-purple-800' :
                              order.orderType === 'admin_only' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.orderType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.customerName || order.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.email || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">
                          Rs. {order.totalAmount?.toFixed(2) || '0.00'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <span className="capitalize">{order.status || 'pending'}</span>
                          </span>
                          {order.status === 'cancelled' && order.cancelledBy === 'user' && (
                            <span className="text-xs text-gray-500 mt-1">
                              🚫 Cancelled by customer
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              localStorage.setItem('orderDetailSource', '/vendor/orders');
                              navigate(`/order/${order._id}`);
                            }}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-100"
                            title="View detailed order"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <select
                            value={order.status || 'processing'}
                            onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                            disabled={updatingOrders.has(order._id) || order.status === 'cancelled' || order.status === 'cancelled_by_customer'}
                            className={`text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                              order.status === 'cancelled' || order.status === 'cancelled_by_customer' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                            title={order.status === 'cancelled' || order.status === 'cancelled_by_customer' ? 'Cannot modify - Order cancelled' : ''}
                          >
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
          )}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
            <div className="text-sm text-gray-700 mb-2 sm:mb-0">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalOrders)} of {totalOrders} orders
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
                {(() => {
                  const pages = [];
                  const maxVisible = 3; // Show only 3 pages before ellipsis
                  
                  if (totalPages <= 5) {
                    // Show all pages if total pages is 5 or less
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-2 text-sm font-medium border transition-colors ${
                            currentPage === i
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    // For more than 5 pages, use ellipsis logic
                    if (currentPage <= 3) {
                      // Show first 3 pages, ellipsis, then last page
                      for (let i = 1; i <= 3; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-2 text-sm font-medium border transition-colors ${
                              currentPage === i
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      if (totalPages > 4) {
                        pages.push(
                          <span key="right-ellipsis" className="px-3 py-2 text-sm text-gray-400">
                            ...
                          </span>
                        );
                        
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                          >
                            {totalPages}
                          </button>
                        );
                      }
                    } else if (currentPage >= totalPages - 2) {
                      // Show first page, ellipsis, then last 3 pages
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                        >
                          1
                        </button>
                      );
                      
                      pages.push(
                        <span key="left-ellipsis" className="px-3 py-2 text-sm text-gray-400">
                          ...
                        </span>
                      );
                      
                      for (let i = totalPages - 2; i <= totalPages; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-2 text-sm font-medium border transition-colors ${
                              currentPage === i
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                    } else {
                      // Show first page, ellipsis, current page, ellipsis, last page
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                        >
                          1
                        </button>
                      );
                      
                      pages.push(
                        <span key="left-ellipsis" className="px-3 py-2 text-sm text-gray-400">
                          ...
                        </span>
                      );
                      
                      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-2 text-sm font-medium border transition-colors ${
                              currentPage === i
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      pages.push(
                        <span key="right-ellipsis" className="px-3 py-2 text-sm text-gray-400">
                          ...
                        </span>
                      );
                      
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      );
                    }
                  }

                  return pages;
                })()}
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
    </VendorLayout>
  );
};

export default SimplifiedVendorOrdersPage;