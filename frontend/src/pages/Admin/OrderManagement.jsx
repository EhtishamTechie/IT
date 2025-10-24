import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Truck,
  Download,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../config';

const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true); // Only for initial load
  const [isSearching, setIsSearching] = useState(false); // Separate state for search/filter updates
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  
  // Ref to maintain focus on search input
  const searchInputRef = useRef(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pagination, setPagination] = useState({});

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadOrders();
    }
  }, [statusFilter, searchTerm]);

  // Load orders when page changes
  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  // Pagination handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const loadOrders = async () => {
    try {
      // Use isSearching for subsequent loads, loading only for first load
      const isInitialLoad = orders.length === 0 && !statusFilter;
      
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Always use normal pagination - search is sent to backend
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Add search parameter to backend
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      console.log('🔍 [ADMIN MY ORDERS] Making request with params:', params.toString());
      
      const apiUrl = `${getApiUrl()}/admin/orders/my-orders?${params.toString()}`;
      const response = await axios.get(apiUrl, { headers });
      console.log('🔍 [ADMIN MY ORDERS] API response:', response.data);
      
      // Handle the response format from my-orders endpoint
      if (response.data && response.data.success) {
        const ordersData = response.data.orders || response.data.data?.orders || [];
        const paginationData = response.data.data?.pagination || response.data.pagination || {};
        
        console.log('🔍 [ADMIN MY ORDERS] Orders received:', ordersData.length);
        console.log('🔍 [ADMIN MY ORDERS] Pagination:', paginationData);
        
        setOrders(ordersData);
        setPagination(paginationData);
        setCurrentPage(paginationData.currentPage || currentPage);
        setTotalPages(paginationData.totalPages || 1);
        setTotalOrders(paginationData.totalOrders || ordersData.length);
        
        // Save orders data to localStorage for dashboard revenue calculation
        localStorage.setItem('adminMyOrders', JSON.stringify(ordersData));
        console.log('💾 [OrderManagement] Saved', ordersData.length, 'orders to localStorage for dashboard revenue');
      } else {
        console.log('OrderManagement (My Orders): Unexpected response format:', response.data);
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
        // Clear localStorage if no valid data
        localStorage.removeItem('adminMyOrders');
      }
    } catch (error) {
      console.error('Error loading my orders:', error);
      setOrders([]);
      setTotalPages(1);
      setTotalOrders(0);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrders(prev => new Set([...prev, orderId]));
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.put(
        `${getApiUrl()}/status/${orderId}/status`, 
        { status: newStatus },
        { headers }
      );
      
      // Update the order in the UI immediately
      setOrders(prev => prev.map(order => 
        order._id === orderId ? { ...order, status: newStatus } : order
      ));
      
      // Show success message
      alert(`✅ Order status updated to "${newStatus}" successfully`);
    } catch (error) {
      console.error('Error updating order status:', error);
      
      // Show specific error message if available
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

  const checkVendorOrderStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('🔍 Checking vendor order statuses...');
      
      const response = await axios.post(
        `${getApiUrl()}/admin/orders/check-vendor-statuses`,
        {},
        { headers }
      );
      
      if (response.data.success) {
        const { checkedOrders, updatedOrders, results } = response.data;
        const shippedOrders = results.filter(r => r.status === 'updated_to_shipped').length;
        const cancelledOrders = results.filter(r => r.status === 'updated_to_cancelled').length;
        
        let message = `✅ Checked ${checkedOrders} orders`;
        if (updatedOrders > 0) {
          const statusUpdates = [];
          if (shippedOrders > 0) statusUpdates.push(`${shippedOrders} to shipped`);
          if (cancelledOrders > 0) statusUpdates.push(`${cancelledOrders} to cancelled`);
          message += `, updated ${statusUpdates.join(' and ')}`;
        } else {
          message += ', no updates needed';
        }
        
        alert(message);
        // Refresh the orders after checking
        loadOrders();
      } else {
        alert(`❌ Error checking vendor statuses: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error checking vendor statuses:', error);
      alert(`❌ Failed to check vendor statuses: ${error.response?.data?.message || error.message}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      // New standardized statuses
      case 'placed': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'shipped': return <Truck className="w-4 h-4 text-indigo-600" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled_by_user': return <XCircle className="w-4 h-4 text-red-600" />;
      // Legacy statuses for backward compatibility
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      // New standardized statuses
      case 'placed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'cancelled_by_user': return 'bg-red-100 text-red-800';
      // Legacy statuses for backward compatibility
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canModifyOrder = (order) => {
    // Cannot modify if order was cancelled by user (both new and legacy format)
    return !((order.status === 'cancelled' || order.status === 'Cancelled') && order.cancelledBy === 'user');
  };

  // Only show loading spinner on initial page load (before any orders are loaded)
  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-600 mt-1">
            {totalOrders > 0 ? (
              <>
                {totalOrders} total order{totalOrders !== 1 ? 's' : ''}
                {searchTerm && ' (filtered)'}
                {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
              </>
            ) : (
              searchTerm ? 'No orders match your search' : 'No orders found'
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={checkVendorOrderStatus}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Check Vendor Status
          </button>
          <button
            onClick={() => {
              setCurrentPage(1);
              loadOrders();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Orders
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by order number, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              {/* New standardized statuses */}
              <option value="placed">Placed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled by Admin</option>
              <option value="cancelled_by_user">Cancelled by User</option>
              {/* Legacy statuses for backward compatibility */}
              <option value="Pending">Pending (Legacy)</option>
              <option value="Confirmed">Confirmed (Legacy)</option>
              <option value="Shipped">Shipped (Legacy)</option>
              <option value="Delivered">Delivered (Legacy)</option>
              <option value="Cancelled">Cancelled (Legacy)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No orders match your search' : 'No orders found'}
            </p>
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
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          #{order.orderNumber || order._id?.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.cart?.length || order.items?.length || 0} items
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
                        PKR {order.totalAmount?.toFixed(2) || '0.00'}
                      </p>
                      {(() => {
                        const shippingCost = order.shippingCost || 0;
                        if (shippingCost > 0) {
                          return (
                            <p className="text-xs text-gray-500">
                              Shipping: PKR {shippingCost.toFixed(2)}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status || 'pending'}</span>
                        </span>
                        {order.status === 'Cancelled' && order.cancelledBy === 'user' && (
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
                            localStorage.setItem('orderDetailSource', '/admin/orders');
                            navigate(`/order/${order._id}`);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100"
                          title="View detailed order tracking"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <select
                          value={order.status || 'Pending'}
                          onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                          disabled={updatingOrders.has(order._id) || !canModifyOrder(order)}
                          className={`text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            !canModifyOrder(order) ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          title={!canModifyOrder(order) ? 'Cannot modify - Order cancelled by customer' : ''}
                        >
                          <option value="placed">Placed</option>
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

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * 20, totalOrders)}</span> of{' '}
                  <span className="font-medium">{totalOrders}</span> orders
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {(() => {
                    const pages = [];
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, currentPage + 2);
                    
                    // First page
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => handlePageChange(1)}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="dots1" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">...</span>);
                      }
                    }
                    
                    // Current page range
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            i === currentPage
                              ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    // Last page
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="dots2" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">...</span>);
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => handlePageChange(totalPages)}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pages;
                  })()}
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Orders Info */}
        {!loading && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            {totalOrders === 0 ? 'No orders found' : 
             totalPages <= 1 ? `${totalOrders} order${totalOrders !== 1 ? 's' : ''} found` :
             `Page ${currentPage} of ${totalPages} (${totalOrders} total orders)`
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
