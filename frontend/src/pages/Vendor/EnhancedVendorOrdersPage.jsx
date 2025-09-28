import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Truck,
  DollarSign,
  Eye,
  MessageSquare,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Edit3,
  Send
} from 'lucide-react';
import VendorLayout from '../../components/Vendor/VendorLayout';
import StandardOrderDetailsModal from '../../components/order/StandardOrderDetailsModal';
import axios from 'axios';
import { getApiUrl } from '../../config';

const EnhancedVendorOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // pending, accepted, processing, shipped, delivered, rejected
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseAction, setResponseAction] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [trackingInfo, setTrackingInfo] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadVendorOrders();
  }, [activeTab]);

  const loadVendorOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      
      const response = await axios.get(getApiUrl(`/vendors/orders/?${params}`), { headers });
      
      if (response.data && response.data.success) {
        setOrders(response.data.orders || []);
      } else {
        console.log('Unexpected response format:', response.data);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading vendor orders:', error);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderResponse = async () => {
    if (!selectedOrder || !responseAction) return;
    
    try {
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.put(getApiUrl(`/vendors/orders/${selectedOrder._id}/respond`), {
        action: responseAction,
        notes: vendorNotes
      }, { headers });
      
      setShowResponseModal(false);
      setSelectedOrder(null);
      setResponseAction('');
      setVendorNotes('');
      loadVendorOrders();
      
      setSuccess(`Order ${responseAction} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error responding to order:', error);
      setError(`Failed to ${responseAction} order. Please try again.`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    
    try {
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.put(getApiUrl(`/vendors/orders/${selectedOrder._id}/status`), {
        status: newStatus,
        trackingInfo: trackingInfo
      }, { headers });
      
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus('');
      setTrackingInfo('');
      loadVendorOrders();
      
      setSuccess('Order status updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Check if order can be modified (not cancelled by user)
  const canModifyOrder = (order) => {
    return !(order.status === 'cancelled' && order.cancelledBy === 'user');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'accepted': return CheckCircle;
      case 'rejected': return XCircle;
      case 'processing': return Package;
      case 'shipped': return Truck;
      case 'delivered': return CheckCircle;
      default: return AlertCircle;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const getOrderSummary = () => {
    const summary = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      acc.totalCommission += order.commissionAmount || 0;
      return acc;
    }, { totalCommission: 0 });
    
    return summary;
  };

  const orderSummary = getOrderSummary();

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Alerts */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <div className="flex items-center text-green-800">
                <DollarSign className="w-5 h-5 mr-2" />
                <span className="font-medium">
                  Total Commission: ${(orderSummary.totalCommission || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-800">{orderSummary.pending || 0}</p>
              <p className="text-xs text-yellow-600">Pending</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-800">{orderSummary.accepted || 0}</p>
              <p className="text-xs text-green-600">Accepted</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-800">{orderSummary.processing || 0}</p>
              <p className="text-xs text-blue-600">Processing</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-800">{orderSummary.shipped || 0}</p>
              <p className="text-xs text-purple-600">Shipped</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-800">{orderSummary.delivered || 0}</p>
              <p className="text-xs text-emerald-600">Delivered</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-800">{orderSummary.rejected || 0}</p>
              <p className="text-xs text-red-600">Rejected</p>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'pending', label: 'Pending', icon: Clock },
              { key: 'accepted', label: 'Accepted', icon: CheckCircle },
              { key: 'processing', label: 'Processing', icon: Package },
              { key: 'shipped', label: 'Shipped', icon: Truck },
              { key: 'delivered', label: 'Delivered', icon: CheckCircle },
              { key: 'rejected', label: 'Rejected', icon: XCircle }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors text-sm ${
                    activeTab === tab.key
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Orders ({filteredOrders.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredOrders.map(order => {
              const StatusIcon = getStatusIcon(order.status);
              
              return (
                <div key={order._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <StatusIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{order.orderNumber || order._id?.slice(-6)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Forwarded: {new Date(order.forwardedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Customer Information */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Customer Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">{order.customer?.name || 'N/A'}</p>
                            <p className="text-gray-600 flex items-center mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              {order.customer?.email || 'N/A'}
                            </p>
                            <p className="text-gray-600 flex items-center mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              {order.customer?.phone || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 flex items-start">
                              <MapPin className="w-3 h-3 mr-1 mt-0.5" />
                              <span>
                                {order.shippingAddress?.street}<br />
                                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          <Package className="w-4 h-4 mr-2" />
                          Order Items ({order.items?.length || 0})
                        </h4>
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded">
                            <div>
                              <p className="font-medium text-sm">{item.productName || item.product?.name || 'Product'}</p>
                              <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">PKR {(item.itemTotal || (item.quantity * item.price)).toFixed(2)}</p>
                              {item.commissionAmount && (
                                <p className="text-xs text-green-600">Commission: ${item.commissionAmount.toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Totals */}
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Order Total: ${(order.totalAmount || 0).toFixed(2)}</p>
                          {order.commissionAmount && (
                            <p className="text-sm text-green-600">Your Commission: ${order.commissionAmount.toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      {/* Admin Notes */}
                      {order.adminNotes && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800 mb-1">Admin Notes:</p>
                          <p className="text-sm text-yellow-700">{order.adminNotes}</p>
                        </div>
                      )}

                      {/* Vendor Notes */}
                      {order.vendorNotes && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-1">Your Notes:</p>
                          <p className="text-sm text-blue-700">{order.vendorNotes}</p>
                        </div>
                      )}

                      {/* Tracking Information */}
                      {order.trackingInfo && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-1">Tracking Information:</p>
                          <p className="text-sm text-green-700">{order.trackingInfo}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="ml-6 flex flex-col space-y-2">
                      {canModifyOrder(order) ? (
                        <>
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setResponseAction('accept');
                                  setShowResponseModal(true);
                                }}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center text-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Accept
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setResponseAction('reject');
                                  setShowResponseModal(true);
                                }}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center text-sm"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </button>
                            </>
                          )}

                          {['accepted', 'processing', 'shipped'].includes(order.status) && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setNewStatus(order.status === 'accepted' ? 'processing' : 
                                          order.status === 'processing' ? 'shipped' : 'delivered');
                                setShowStatusModal(true);
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm"
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Update Status
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="text-red-600 text-sm font-medium">
                          Order cancelled by customer - cannot be modified
                        </div>
                      )}

                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center text-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No {activeTab} orders at this time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Response Modal */}
        {showResponseModal && selectedOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {responseAction === 'accept' ? 'Accept Order' : 'Reject Order'}
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Order #{selectedOrder.orderNumber || selectedOrder._id?.slice(-6)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total: ${(selectedOrder.totalAmount || 0).toFixed(2)}
                  </p>
                  {selectedOrder.commissionAmount && (
                    <p className="text-sm text-green-600">
                      Commission: ${selectedOrder.commissionAmount.toFixed(2)}
                    </p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {responseAction === 'accept' ? 'Acceptance Notes' : 'Rejection Reason'} (Optional)
                    </label>
                    <textarea
                      value={vendorNotes}
                      onChange={(e) => setVendorNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={responseAction === 'accept' 
                        ? "Add notes about processing time, special instructions, etc."
                        : "Explain why you're rejecting this order..."
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setSelectedOrder(null);
                      setResponseAction('');
                      setVendorNotes('');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOrderResponse}
                    className={`px-4 py-2 text-white rounded-md ${
                      responseAction === 'accept' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {responseAction === 'accept' ? 'Accept Order' : 'Reject Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && selectedOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Update Order Status
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Order #{selectedOrder.orderNumber || selectedOrder._id?.slice(-6)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Current Status: <span className="font-medium">{selectedOrder.status}</span>
                  </p>
                </div>
                
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
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                  
                  {(newStatus === 'shipped' || newStatus === 'delivered') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tracking Information
                      </label>
                      <input
                        type="text"
                        value={trackingInfo}
                        onChange={(e) => setTrackingInfo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Tracking number, carrier info, etc."
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setSelectedOrder(null);
                      setNewStatus('');
                      setTrackingInfo('');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateOrderStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standardized Order Details Modal */}
        <StandardOrderDetailsModal
          isOpen={!!selectedOrder && !showResponseModal && !showStatusModal}
          onClose={() => setSelectedOrder(null)}
          orderId={selectedOrder?._id || selectedOrder?.id}
        />
      </div>
    </VendorLayout>
  );
};

export default EnhancedVendorOrdersPage;
