import React, { useState, useEffect } from 'react';
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
  Calendar,
  Users,
  User,
  Send,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../config';

const EnhancedOrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vendor_orders'); // Default to Vendor Orders tab
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardOrderId, setForwardOrderId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pagination, setPagination] = useState({});

  // Reset to page 1 when filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadOrders();
      loadVendors();
    }
  }, [activeTab, statusFilter]);

  // Load orders when page changes
  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  const loadOrders = async (forceRefresh = false, backgroundRefresh = false) => {
    try {
      // Only show loading state if it's not a background refresh
      if (!backgroundRefresh) {
        setLoading(true);
      }
      
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Add cache busting for force refresh
      if (forceRefresh) {
        headers['Cache-Control'] = 'no-cache';
        headers['Pragma'] = 'no-cache';
      }
      
      // Build pagination parameters
      const params = new URLSearchParams({
        type: 'vendor_orders', // Only vendor orders
        page: currentPage.toString(),
        limit: '20' // 20 orders per page
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (forceRefresh) {
        params.append('_t', Date.now()); // Cache bust
      }
      
      console.log('🔍 [VENDOR ORDERS] Making paginated request with params:', params.toString());
      
      const apiUrl = `${getApiUrl()}/admin/orders/?${params.toString()}`;
      const response = await axios.get(apiUrl, { headers });
      
      console.log('🔍 [VENDOR ORDERS] API response:', response.data);
      
      if (response.data && response.data.success) {
        const ordersData = response.data.data?.orders || [];
        const paginationData = response.data.data?.pagination || {};
        
        setOrders(ordersData);
        setPagination(paginationData);
        setCurrentPage(paginationData.currentPage || currentPage);
        setTotalPages(paginationData.totalPages || 1);
        setTotalOrders(paginationData.totalOrders || ordersData.length);
        
        console.log(`📊 [VENDOR ORDERS] Loaded ${ordersData.length} orders for page ${currentPage}`);
        console.log('🔍 [VENDOR ORDERS] Pagination:', paginationData);
      } else {
        console.log('Unexpected response format:', response.data);
        if (!backgroundRefresh) {
          setOrders([]);
          setTotalPages(1);
          setTotalOrders(0);
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      if (!backgroundRefresh) {
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
      }
    } finally {
      if (!backgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const loadVendors = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('🏪 Loading vendors...');
      
      // Use the correct admin vendor management endpoint
      const response = await axios.get(`${getApiUrl()}/admin/vendor-management/vendors?limit=100`, { headers });
      console.log('🏪 Vendors response:', response.data);
      
      if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data.vendors)) {
        setVendors(response.data.data.vendors);
        console.log(`✅ Loaded ${response.data.data.vendors.length} vendors`);
      } else if (response.data && Array.isArray(response.data.vendors)) {
        setVendors(response.data.vendors);
        console.log(`✅ Loaded ${response.data.vendors.length} vendors (legacy format)`);
      } else if (Array.isArray(response.data)) {
        setVendors(response.data);
        console.log(`✅ Loaded ${response.data.length} vendors (direct array)`);
      } else {
        console.log('❌ Unexpected vendor response format:', response.data);
        setVendors([]);
      }
    } catch (error) {
      console.error('❌ Error loading vendors:', error);
      setVendors([]);
    }
  };

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

  const categorizeOrder = (order) => {
    // First check if backend already provided orderType
    if (order.orderType && order.orderType !== 'legacy') {
      return order.orderType;
    }
    
    // Fallback to frontend logic - check both 'cart' and 'items' fields
    const items = order.cart || order.items || [];
    if (items.length === 0) return 'admin_only';
    
    const hasAdminProducts = items.some(item => !item.vendor || item.vendor === null);
    const hasVendorProducts = items.some(item => item.vendor && item.vendor !== null);
    
    if (hasAdminProducts && hasVendorProducts) return 'mixed';
    if (hasVendorProducts) return 'vendor_only';
    return 'admin_only';
  };

  const getOrderTypeColor = (type) => {
    switch (type) {
      case 'admin_only': return 'bg-blue-100 text-blue-800';
      case 'vendor_only': return 'bg-green-100 text-green-800';
      case 'mixed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'cancelled_by_user': return 'bg-red-100 text-red-800';
      // Legacy status fallbacks
      case 'pending_admin_review':
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'forwarded': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
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

  const forwardOrderToVendors = async () => {
    if (!forwardOrderId || selectedVendors.length === 0) return;
    
    // Find the order to check if it can be modified
    const orderToForward = orders.find(order => order._id === forwardOrderId);
    if (orderToForward && !canModifyOrder(orderToForward)) {
      alert('❌ Cannot forward orders that were cancelled by customer. Customer cancellations are final.');
      setShowForwardModal(false);
      setForwardOrderId(null);
      setSelectedVendors([]);
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log(`🔄 Forwarding order to vendors: ${forwardOrderId}`);
      
      // Use the correct forwarding endpoint
      const response = await axios.post(
        `${getApiUrl()}/admin/orders/${forwardOrderId}/forward`,
        {
          vendorIds: selectedVendors,
          adminNotes: adminNotes
        },
        { headers }
      );
      
      if (response.data.success) {
        let message = `✅ Order forwarded successfully to vendors!\n\n`;
        message += `📦 Order ID: ${forwardOrderId}\n`;
        message += `👥 Vendors: ${selectedVendors.length}\n`;
        if (adminNotes) {
          message += `📝 Notes: ${adminNotes}\n`;
        }

        alert(message);
        
        // Update the specific order in state instead of reloading all orders
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === forwardOrderId 
              ? { ...order, status: 'forwarded', forwardedAt: new Date().toISOString() }
              : order
          )
        );
        
        setShowForwardModal(false);
        setForwardOrderId(null);
        setSelectedVendors([]);
        setAdminNotes('');
        
        // Optional: Refresh in background without showing loading state
        setTimeout(() => loadOrders(true, true), 1000);
      }
    } catch (error) {
      console.error('❌ Error forwarding order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to forward order';
      alert(`❌ ${errorMessage}`);
    }
  };

  // Removed processUnifiedOrder function - No longer needed since orders auto-split at checkout

  const handleAdminAction = async (orderId, action, notes = '') => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log(`🔧 Admin action: ${action} for order: ${orderId}`);
      
      const response = await axios.put(`${getApiUrl()}/admin/orders/${orderId}/admin-action`, {
        action,
        notes
      }, { headers });
      
      if (response.data.success) {
        console.log(`✅ Admin action completed:`, response.data.data);
        loadOrders(true); // Force refresh to get updated order status
        
        // Show more detailed success message
        const { isMixedOrder, overallStatus } = response.data.data;
        if (isMixedOrder) {
          alert(`✅ Admin portion ${action}ed successfully!\nOverall order status: ${overallStatus}`);
        } else {
          alert(`✅ Order ${action}ed successfully!`);
        }
      } else {
        alert(`Failed to ${action} order: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error ${action} order:`, error);
      const errorMessage = error.response?.data?.message || `Failed to ${action} order`;
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log(`🔧 Updating status to: ${newStatus} for order: ${orderId}`);
      
      const response = await axios.put(`${getApiUrl()}/admin/orders/${orderId}/admin-action`, {
        action: 'updateStatus',
        newStatus: newStatus
      }, { headers });
      
      if (response.data.success) {
        console.log(`✅ Status updated successfully:`, response.data.data);
        loadOrders(true); // Force refresh to get updated order status
        alert(`✅ Order status updated to ${newStatus}!`);
        setShowStatusModal(false);
        setStatusOrderId(null);
        setNewStatus('');
      } else {
        alert(`Failed to update status: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error updating status:`, error);
      const errorMessage = error.response?.data?.message || `Failed to update status`;
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log(`🔧 Cancelling order: ${orderId}`);
      
      const response = await axios.put(`${getApiUrl()}/admin/orders/${orderId}/admin-action`, {
        action: 'updateStatus',
        newStatus: 'cancelled'
      }, { headers });
      
      if (response.data.success) {
        console.log(`✅ Order cancelled successfully:`, response.data.data);
        loadOrders(true); // Force refresh to get updated order status
        alert(`✅ Order cancelled successfully!`);
      } else {
        alert(`Failed to cancel order: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error cancelling order:`, error);
      const errorMessage = error.response?.data?.message || `Failed to cancel order`;
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleRejectOrder = async (orderId) => {
    if (!confirm('Are you sure you want to reject this order?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log(`🔧 Rejecting order: ${orderId}`);
      
      // Reject order and change status to cancelled
      const response = await axios.put(`${getApiUrl()}/admin/orders/${orderId}/admin-action`, {
        action: 'updateStatus',
        newStatus: 'cancelled'
      }, { headers });
      
      if (response.data.success) {
        console.log(`✅ Order rejected successfully:`, response.data.data);
        
        // Update the specific order in state instead of reloading all orders
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId 
              ? { ...order, status: 'cancelled', rejectedAt: new Date().toISOString() }
              : order
          )
        );
        
        alert(`✅ Order rejected and status updated to Cancelled!`);
        
        // Optional: Refresh in background without showing loading state
        setTimeout(() => loadOrders(true, true), 1000);
      } else {
        alert(`Failed to reject order: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error rejecting order:`, error);
      const errorMessage = error.response?.data?.message || `Failed to reject order`;
      alert(`❌ ${errorMessage}`);
    }
  };

  const exportOrders = async () => {
    try {
      const dataToExport = filteredOrders.map(order => {
        const orderType = categorizeOrder(order);
        return {
          'Order Number': order.orderNumber || `Order #${order._id?.slice(-6)}`,
          'Customer Name': order.name || order.customer?.name || order.customerName || 'N/A',
          'Customer Email': order.email || order.customer?.email || 'N/A',
          'Phone': order.phone || order.customer?.phone || 'N/A',
          'Address': order.address || order.customer?.address || 'N/A',
          'City': order.city || order.customer?.city || 'N/A',
          'Order Type': orderType.replace('_', ' '),
          'Status': order.status?.replace('_', ' ') || 'N/A',
          'Total Amount': `PKR ${(() => {
            // Calculate total including shipping
            if (order.cart && Array.isArray(order.cart)) {
              const cartTotal = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              const shippingCost = order.shippingCost || 0;
              return (cartTotal + shippingCost).toFixed(2);
            }
            // Fallback to stored totalAmount
            return (order.totalAmount || order.total || 0).toFixed(2);
          })()}`,
          'Payment Method': order.paymentMethod || 'N/A',
          'Order Date': new Date(order.createdAt).toLocaleDateString(),
          'Items Count': (order.cart || order.items || []).length,
          'Items': (order.cart || order.items || []).map(item => 
            `${item.title || item.productName || 'Product'} (Qty: ${item.quantity}, Price: $${item.price})`
          ).join('; ')
        };
      });

      // Convert to CSV
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
            // Escape commas and quotes in CSV
            return `"${value.toString().replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `orders_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
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

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getVendorBreakdown = (order) => {
    // Use backend's vendorBreakdown if available (includes commission calculations)
    if (order.vendorBreakdown && Array.isArray(order.vendorBreakdown)) {
      console.log('🔍 Using backend vendorBreakdown:', order.vendorBreakdown);
      const breakdown = { admin: [], vendors: {} };
      
      // Process vendorBreakdown from backend
      order.vendorBreakdown.forEach(vendorData => {
        const vendorId = vendorData.vendor._id;
        breakdown.vendors[vendorId] = {
          vendor: vendorData.vendor,
          items: vendorData.items,
          subtotal: vendorData.subtotal,
          commissionAmount: vendorData.commissionAmount
        };
        console.log(`💰 Vendor ${vendorData.vendor.businessName}: Subtotal=$${vendorData.subtotal}, Commission=$${vendorData.commissionAmount}`);
      });
      
      // Add admin items
      if (order.adminItems && Array.isArray(order.adminItems)) {
        breakdown.admin = order.adminItems;
      }
      
      return breakdown;
    }
    
    console.log('⚠️ Fallback: Backend vendorBreakdown not available, using manual calculation');
    // Fallback to manual calculation if backend data not available
    const items = order.cart || order.items || [];
    if (!items.length) return { admin: [], vendors: {} };
    
    const breakdown = { admin: [], vendors: {} };
    
    items.forEach(item => {
      if (!item.vendor || item.vendor === null) {
        breakdown.admin.push(item);
      } else {
        const vendorId = typeof item.vendor === 'object' ? item.vendor._id : item.vendor;
        if (!breakdown.vendors[vendorId]) {
          breakdown.vendors[vendorId] = {
            vendor: item.vendor,
            items: [],
            subtotal: 0
          };
        }
        breakdown.vendors[vendorId].items.push(item);
        breakdown.vendors[vendorId].subtotal += item.price * item.quantity;
      }
    });
    
    return breakdown;
  };

  const getOrderVendors = (order) => {
    // Extract unique vendor IDs from order items
    const items = order.cart || order.items || [];
    const vendorIds = new Set();
    
    items.forEach(item => {
      if (item.vendor && item.vendor !== null) {
        const vendorId = typeof item.vendor === 'object' ? item.vendor._id : item.vendor;
        if (vendorId) {
          vendorIds.add(vendorId);
        }
      }
    });
    
    return Array.from(vendorIds);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Only vendor orders now (removed my orders tab)
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Split Information Banner */}
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vendor Order Management
            </h1>
            {!loading && totalOrders > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {totalOrders} vendor orders • {totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : 'All orders displayed'}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => {
                setCurrentPage(1);
                loadOrders(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
            >
              <Clock className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button 
              onClick={exportOrders}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Orders
            </button>
          </div>
        </div>

        {/* Order Management Tabs - Removed My Orders tab */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
          {[
            { key: 'vendor_orders', label: 'Vendor Orders', icon: Truck }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="placed">Placed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled by Admin</option>
            <option value="cancelled_by_user">Cancelled by User</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Orders ({filteredOrders.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500">
                No vendor orders found matching your filters.
              </p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const orderType = categorizeOrder(order);
              const vendorBreakdown = getVendorBreakdown(order);
              const isExpanded = expandedOrders.has(order._id);
              
              return (
                <div key={order._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleOrderExpansion(order._id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {order.orderNumber || `Order #${order._id?.slice(-6)}`}
                          </p>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderTypeColor(orderType)}`}>
                            {orderType.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Customer: {order.name || order.customer?.name || order.customerName || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total: PKR {(() => {
                            // Calculate total including shipping
                            if (order.cart && Array.isArray(order.cart)) {
                              const cartTotal = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                              const shippingCost = order.shippingCost || 0;
                              return (cartTotal + shippingCost).toFixed(2);
                            }
                            // Fallback to stored totalAmount
                            return (order.totalAmount || order.total || 0).toFixed(2);
                          })()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Date: {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Forward/Reject Actions for Vendor Orders */}
                      {canModifyOrder(order) && 
                       !['processing', 'shipped', 'delivered', 'cancelled', 'completed', 'forwarded'].includes(order.status?.toLowerCase()) && (
                        <>
                          <button
                            onClick={() => {
                              setForwardOrderId(order._id);
                              // Auto-select vendors from the order items for vendor_only orders
                              const orderVendors = getOrderVendors(order);
                              setSelectedVendors(orderVendors);
                              setShowForwardModal(true);
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 flex items-center text-sm transition-colors"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Forward
                          </button>
                          <button
                            onClick={() => handleRejectOrder(order._id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 flex items-center text-sm transition-colors"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </button>
                        </>
                      )}
                      
                      {/* Show status for already processed orders */}
                      {['processing', 'forwarded'].includes(order.status?.toLowerCase()) && (
                        <span className="text-green-600 text-sm font-medium">
                          ✅ Forwarded to Vendor
                        </span>
                      )}
                      
                      {/* Show completed status */}
                      {['shipped', 'delivered', 'completed'].includes(order.status?.toLowerCase()) && (
                        <span className="text-blue-600 text-sm font-medium">
                          📦 {order.status}
                        </span>
                      )}
                      
                      {/* Show cancelled status */}
                      {order.status?.toLowerCase() === 'cancelled' && (
                        <span className="text-red-600 text-sm font-medium">
                          ❌ Cancelled
                        </span>
                      )}
                      
                      {/* Show View button for all orders */}
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                        className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 flex items-center text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      
                      {/* Show disabled message if order was cancelled by user */}
                      {!canModifyOrder(order) && (
                        <span className="text-red-600 text-sm italic">
                          Cannot modify - Order cancelled by customer
                        </span>
                      )}
                      
                      <button
                        onClick={() => {
                          localStorage.setItem('orderDetailSource', '/admin/multi-vendor-orders');
                          navigate(`/order/${order._id}`);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center text-sm transition-colors"
                        title="View unified order tracking"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </div>
                  </div>

                  {/* Expanded Order Details */}
                  {isExpanded && (
                    <div className="mt-4 pl-9 space-y-4">
                      {/* Admin Products */}
                      {vendorBreakdown.admin.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Admin Products ({vendorBreakdown.admin.length})</h4>
                          <div className="space-y-2">
                            {vendorBreakdown.admin.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.title || item.productName || item.product?.name || item.product?.title || 'Product'}</span>
                                <span>Qty: {item.quantity} × ${item.price} = ${item.itemTotal || (item.quantity * item.price)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vendor Products */}
                      {Object.entries(vendorBreakdown.vendors).map(([vendorId, vendorData]) => (
                        <div key={vendorId} className="bg-green-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-green-900">
                              Vendor: {vendorData.vendor?.businessName || vendorData.vendor?.name || `Vendor ID: ${vendorId}`} ({vendorData.items.length} items)
                            </h4>
                            <div className="text-right text-sm">
                              <div className="text-green-800 font-medium">Subtotal: ${vendorData.subtotal || 0}</div>
                              <div className="text-green-600 text-xs">
                                Commission ({((vendorData.commissionAmount || 0) / (vendorData.subtotal || 1) * 100).toFixed(0)}%): ${vendorData.commissionAmount ? vendorData.commissionAmount.toFixed(2) : (vendorData.subtotal * 0.20).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {vendorData.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.title || item.productName || item.product?.name || item.product?.title || 'Product'}</span>
                                <div className="text-right">
                                  <div>Qty: {item.quantity} × ${item.price} = ${item.itemTotal || (item.quantity * item.price)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

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
                  <span className="font-medium">{totalOrders}</span> vendor orders
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
            {totalOrders === 0 ? 'No vendor orders found' : 
             totalPages <= 1 ? `${totalOrders} vendor order${totalOrders !== 1 ? 's' : ''} found` :
             `Page ${currentPage} of ${totalPages} (${totalOrders} total vendor orders)`
            }
          </div>
        )}
      </div>

      {/* Forward Order Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Forward Order to Vendors</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Vendors ({selectedVendors.length} selected)
                  </label>
                  {selectedVendors.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-md">
                      No vendors selected. Please select vendors for this order.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {vendors
                        .filter(vendor => selectedVendors.includes(vendor._id))
                        .map(vendor => (
                          <div key={vendor._id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <span className="text-sm font-medium text-blue-900">
                              {vendor.businessName || vendor.name || 'Unknown Vendor'}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedVendors(selectedVendors.filter(id => id !== vendor._id));
                              }}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  
                  {/* Show available vendors to add */}
                  {vendors.filter(vendor => !selectedVendors.includes(vendor._id)).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-800">
                        Add more vendors ({vendors.filter(vendor => !selectedVendors.includes(vendor._id)).length} available)
                      </summary>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                        {vendors
                          .filter(vendor => !selectedVendors.includes(vendor._id))
                          .map(vendor => (
                            <label key={vendor._id} className="flex items-center hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVendors([...selectedVendors, vendor._id]);
                                  }
                                }}
                                className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-900">
                                {vendor.businessName || vendor.name || 'Unknown Vendor'}
                              </span>
                            </label>
                          ))
                        }
                      </div>
                    </details>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add notes for vendors..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowForwardModal(false);
                    setForwardOrderId(null);
                    setSelectedVendors([]);
                    setAdminNotes('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={forwardOrderToVendors}
                  disabled={selectedVendors.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forward Order {selectedVendors.length > 0 && `(${selectedVendors.length} vendors)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removed Process Unified Modal - No longer needed since orders auto-split at checkout */}
      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update Order Status</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="placed">Placed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setStatusOrderId(null);
                      setNewStatus('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(statusOrderId, newStatus)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedOrderManagement;
