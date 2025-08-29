import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Truck,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { getApiUrl, getUploadUrl } from '../../config';

const VendorOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    console.log(`🔄 Status filter or page changed: status=${statusFilter}, page=${currentPage}`);
    loadOrders();
  }, [statusFilter, currentPage]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);
  
  // Trigger search after user stops typing (debounced search)
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      if (currentPage === 1) {
        loadOrders(); // Only reload if on page 1 (otherwise setCurrentPage(1) will trigger reload)
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayTimer);
  }, [searchTerm]);

  const loadOrders = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      if (forceRefresh) {
        headers['Cache-Control'] = 'no-cache';
        headers['Pragma'] = 'no-cache';
      }
      
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (forceRefresh) params.append('_t', Date.now());
      
      console.log(`🔄 Loading orders: page=${currentPage}, status=${statusFilter}, search="${searchTerm}"`);
      
      const response = await axios.get(getApiUrl(`/vendors/orders?${params}`), { headers });
      
      if (response.data && response.data.success) {
        const ordersData = response.data.data.orders || [];
        const pagination = response.data.data.pagination || {};
        
        setOrders(ordersData);
        setCurrentPage(pagination.currentPage || currentPage);
        setTotalPages(pagination.totalPages || 1);
        setTotalOrders(pagination.totalOrders || ordersData.length);
        
        console.log(`📊 Loaded ${ordersData.length} vendor orders (Page ${pagination.currentPage || currentPage} of ${pagination.totalPages || 1})`);
      } else {
        console.log('Unexpected response format:', response.data);
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, orderType = 'legacy_order') => {
    try {
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      console.log('🔑 Token found:', token ? 'Yes' : 'No');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Use the same unified status API as admin
      const endpoint = getApiUrl(`/status/${orderId}/vendor-status`);
      
      console.log(`📤 Updating order ${orderId} status to ${newStatus} at endpoint:`, endpoint);
      
      const response = await axios.put(endpoint, { status: newStatus }, { headers });
      console.log('✅ Status update response:', response.data);
      
      loadOrders();
      alert(`Order status updated to ${newStatus.replace('_', ' ')} successfully!`);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      alert('Failed to update order status. Please try again.');
    }
  };

  const acceptOrder = async (orderId, orderType = 'legacy_order') => {
    try {
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      console.log('🔑 Token found:', token ? 'Yes' : 'No');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log(`🔄 Accepting order ${orderId} of type: ${orderType}`);
      
      if (orderType === 'vendor_order') {
        // For VendorOrder documents - use the action endpoint
        console.log(`📤 Using vendor-orders action endpoint for VendorOrder`);
        const response = await axios.put(getApiUrl(`/vendors/orders/vendor-orders/${orderId}/action`), {
          action: 'accept'
        }, { headers });
        console.log('✅ Accept response:', response.data);
      } else {
        // For legacy orders - use unified status API
        console.log(`📤 Using unified status API for Order`);
        const response = await axios.put(getApiUrl(`/status/${orderId}/vendor-status`), {
          status: 'processing'
        }, { headers });
        console.log('✅ Accept response:', response.data);
      }
      
      loadOrders();
      alert('✅ Order accepted successfully!');
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Full error response:', error.response);
      alert(`Failed to accept order: ${error.response?.data?.message || error.message}`);
    }
  };

  const rejectOrder = async (orderId, orderType = 'legacy_order') => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      console.log('🔑 Token found:', token ? 'Yes' : 'No');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log(`🔄 Cancelling order ${orderId} of type: ${orderType}`);
      
      if (orderType === 'vendor_order') {
        // For VendorOrder documents - use the action endpoint
        console.log(`📤 Using vendor-orders action endpoint for VendorOrder`);
        const response = await axios.put(getApiUrl(`/vendors/orders/vendor-orders/${orderId}/action`), {
          action: 'cancel',
          notes: reason
        }, { headers });
        console.log('✅ Cancel response:', response.data);
      } else {
        // For legacy orders - use unified status API
        console.log(`📤 Using unified status API for Order`);
        const response = await axios.put(getApiUrl(`/status/${orderId}/vendor-status`), {
          status: 'cancelled',
          reason: reason
        }, { headers });
        console.log('✅ Cancel response:', response.data);
      }
      
      loadOrders();
      alert('✅ Order rejected successfully!');
    } catch (error) {
      console.error('❌ Error rejecting order:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Full error response:', error.response);
      alert(`Failed to reject order: ${error.response?.data?.message || error.message}`);
    }
  };

  const getStatusColor = (status, order) => {
    // Check for new 6-status system customer cancellation
    if (status === 'cancelled_by_customer') {
      return 'bg-red-100 text-red-800 border border-red-300';
    }
    
    // Legacy: Check if order was cancelled by customer
    if (status?.toLowerCase() === 'cancelled' && order?.cancelledBy === 'user') {
      return 'bg-red-100 text-red-800 border border-red-300';
    }
    
    switch (status?.toLowerCase()) {
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'cancelled_by_customer': return 'bg-red-100 text-red-800 border border-red-300';
      case 'rejected': return 'bg-red-100 text-red-800';
      // Legacy statuses that should not appear in vendor orders
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, order) => {
    // Check for new 6-status system customer cancellation
    if (status === 'cancelled_by_customer') {
      return 'Cancelled by Customer';
    }
    
    // Legacy: Check if order was cancelled by customer
    if (status?.toLowerCase() === 'cancelled' && order?.cancelledBy === 'user') {
      return 'Cancelled by Customer';
    }
    
    switch (status?.toLowerCase()) {
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled by Vendor';
      case 'cancelled_by_customer': return 'Cancelled by Customer';
      case 'rejected': return 'Rejected';
      // Legacy statuses - show with warning
      case 'pending': return 'Pending (Contact Admin)';
      case 'accepted': return 'Accepted (Contact Admin)';
      case 'completed': return 'Completed';
      default: return status?.replace('_', ' ') || 'Processing';
    }
  };

  const getOrderTypeColor = (type) => {
    switch (type) {
      case 'vendor_order': return 'bg-green-100 text-green-800';
      case 'legacy_order': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canModifyOrder = (order) => {
    // Cannot modify if order was cancelled by customer (new 6-status system)
    if (order.status === 'cancelled_by_customer') {
      return false;
    }
    
    // Legacy support: Cannot modify if order was cancelled by user (old format)
    return !((order.status === 'cancelled' || order.status === 'Cancelled') && order.cancelledBy === 'user');
  };

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const exportOrders = () => {
    try {
      const dataToExport = filteredOrders.map(order => ({
        'Order Number': order.orderNumber || order.parentOrderId?.orderNumber || `Order #${order._id?.slice(-6)}`,
        'Customer Name': order.customer?.name || order.name || 'N/A',
        'Customer Email': order.customer?.email || order.email || 'N/A',
        'Status': order.status?.replace('_', ' ') || 'N/A',
        'Total Amount': `$${order.totalAmount || order.vendorSubtotal || 0}`,
        'Commission': `$${order.commissionAmount || 0}`,
        'Your Amount': `$${order.vendorAmount || (order.totalAmount - order.commissionAmount) || 0}`,
        'Order Date': new Date(order.createdAt).toLocaleDateString(),
        'Items Count': (order.items || order.vendorItems || []).length,
        'Order Type': (order.orderType || 'legacy_order').replace('_', ' ')
      }));

      if (dataToExport.length === 0) {
        alert('No orders to export');
        return;
      }

      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vendor_orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`📊 Exported ${dataToExport.length} orders to CSV`);
    } catch (error) {
      console.error('Error exporting orders:', error);
      alert('Failed to export orders. Please try again.');
    }
  };

  // Since we're using backend pagination, we don't need client-side filtering
  const filteredOrders = orders;

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-6 p-6">
          {/* Professional Header */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-white">Order Management</h1>
                  <p className="text-orange-100 mt-1">Manage and track your vendor orders efficiently</p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => loadOrders(true)}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-all duration-200 backdrop-blur-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </button>
                  <button 
                    onClick={exportOrders}
                    className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-medium flex items-center transition-all duration-200"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Filters */}
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-80">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search orders, customers, order numbers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div className="min-w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200"
                  >
                    <option value="all">All Statuses</option>
                    <option value="processing">🔵 Processing</option>
                    <option value="shipped">� Shipped</option>
                    <option value="delivered">✅ Delivered</option>
                    <option value="cancelled">❌ Cancelled</option>
                    <option value="cancelled_by_customer">🚫 Cancelled by Customer</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-orange-500" />
                  Orders ({filteredOrders.length})
                </h2>
                {filteredOrders.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Total Revenue: <span className="font-semibold text-green-600">
                      ${filteredOrders.reduce((sum, order) => sum + (order.vendorAmount || order.totalAmount - order.commissionAmount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="bg-gray-100 p-6 rounded-full mb-4">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-500 max-w-md">
                      {statusFilter === 'all' 
                        ? 'No orders match your current search criteria.' 
                        : `No ${statusFilter} orders found. Try adjusting your filters.`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const isExpanded = expandedOrders.has(order._id);
                  const orderItems = order.items || order.vendorItems || [];
                  
                  return (
                    <div key={order._id} className="hover:bg-gray-50 transition-colors duration-200">
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <button
                              onClick={() => toggleOrderExpansion(order._id)}
                              className="text-gray-400 hover:text-orange-500 transition-colors duration-200 mt-1"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {order.orderNumber || order.parentOrderId?.orderNumber || `#${order._id?.slice(-6)}`}
                                </h3>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getOrderTypeColor(order.orderType)}`}>
                                  {(order.orderType || 'legacy_order').replace('_', ' ')}
                                </span>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status, order)}`}>
                                  {getStatusText(order.status, order)}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center text-gray-600">
                                  <User className="w-4 h-4 mr-2 text-orange-500" />
                                  <span><strong>Customer:</strong> {order.customer?.name || order.name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-gray-600">
                                  <DollarSign className="w-4 h-4 mr-2 text-green-500" />
                                  <span><strong>Total:</strong> ${order.totalAmount || order.vendorSubtotal || 0}</span>
                                </div>
                                <div className="flex items-center text-gray-600">
                                  <DollarSign className="w-4 h-4 mr-2 text-orange-500" />
                                  <span><strong>Commission:</strong> ${order.commissionAmount || 0}</span>
                                </div>
                                <div className="flex items-center text-gray-600">
                                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                  <span><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              
                              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-green-800">Your Earnings</span>
                                  <span className="text-lg font-bold text-green-600">
                                    ${order.vendorAmount || (order.totalAmount - order.commissionAmount) || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-2 ml-4">
                            {/* Only show actions if order can be modified */}
                            {canModifyOrder(order) ? (
                              <>
                                {/* Note: Old statuses (pending, accepted, placed) are no longer used */}
                                
                                {order.status === 'processing' && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => updateOrderStatus(order._id, 'shipped', order.orderType)}
                                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium flex items-center text-sm transition-all duration-200 shadow-sm"
                                    >
                                      <Truck className="w-4 h-4 mr-1" />
                                      Mark Shipped
                                    </button>
                                    <button
                                      onClick={() => rejectOrder(order._id, order.orderType)}
                                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center text-sm transition-all duration-200 shadow-sm"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Cancel Order
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Show disabled message if order was cancelled by user */
                              <span className="text-red-600 text-sm italic">
                                Cannot modify - Order cancelled by customer
                              </span>
                            )}
                            
                            {order.status === 'shipped' && (
                              <button
                                onClick={() => updateOrderStatus(order._id, 'delivered', order.orderType)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center text-sm transition-all duration-200 shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Delivered
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                localStorage.setItem('orderDetailSource', '/vendor/orders');
                                navigate(`/order/${order._id}`);
                              }}
                              className="text-orange-500 hover:text-orange-600 border border-orange-300 hover:border-orange-400 px-4 py-2 rounded-lg font-medium flex items-center text-sm transition-all duration-200 bg-orange-50 hover:bg-orange-100"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </button>
                          </div>
                        </div>

                        {/* Expanded Order Details */}
                        {isExpanded && (
                          <div className="mt-6 pl-9 space-y-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <Package className="w-4 h-4 mr-2 text-orange-500" />
                                Order Items ({orderItems.length})
                              </h4>
                              <div className="space-y-3">
                                {orderItems.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center space-x-3">
                                      {item.image && (
                                        <img 
                                          src={getUploadUrl(item.image)}
                                          alt={item.title || item.productName || 'Product'} 
                                          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                        />
                                      )}
                                      <div>
                                        <span className="font-medium text-gray-900">
                                          {item.title || item.productName || 'Product'}
                                        </span>
                                        <div className="text-sm text-gray-500">
                                          Unit Price: ${item.price}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-gray-900">Qty: {item.quantity}</div>
                                      <div className="text-sm font-medium text-green-600">
                                        Total: ${item.itemTotal || (item.quantity * item.price)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
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
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorOrdersPage;
