import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  User,
  Calendar,
  DollarSign,
  XCircle,
  AlertCircle,
  ShoppingBag,
  Store,
  X,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from './Notification';
import { getApiUrl } from '../config';

const EnhancedOrderTracking = ({ orderId, onClose, onOrderUpdate }) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingParts, setCancellingParts] = useState(new Set());

  const loadOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Loading enhanced order details for:', orderId);
      
      // Use the split-details endpoint for comprehensive data
      const response = await axios.get(`${getApiUrl()}/orders/${orderId}/split-details`);
      
      console.log('📡 Enhanced API Response:', response.data);
      
      if (response.data.success) {
        const data = response.data.data;
        
        // Transform the data to include cancellation capabilities
        const transformedData = {
          ...data,
          // Add cancellation status for each part
          parts: data.parts?.map(part => ({
            ...part,
            canCancel: canCancelPart(part),
            isCancellable: canCancelPart(part) && !['shipped', 'delivered', 'cancelled', 'rejected'].includes(part.status?.toLowerCase()),
            cancelReason: part.cancellationReason || null
          })) || [],
          // Overall order cancellation status
          canCancelOrder: data.parts?.some(part => canCancelPart(part)) || false
        };
        
        console.log('✅ Enhanced order data:', transformedData);
        setOrderDetails(transformedData);
      } else {
        setError(response.data.message || 'Failed to load order details');
      }
    } catch (error) {
      console.error('❌ Error loading enhanced order details:', error);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  // Helper function to determine if a part can be cancelled
  const canCancelPart = (part) => {
    if (!part) return false;
    
    const status = part.status?.toLowerCase();
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'rejected'];
    
    return !nonCancellableStatuses.includes(status);
  };

  // Refresh order details
  const refreshOrderDetails = async () => {
    setRefreshing(true);
    await loadOrderDetails();
    setRefreshing(false);
    showSuccess('Order details refreshed');
  };

  // Cancel a specific order part
  const cancelOrderPart = async (part) => {
    if (!part.isCancellable) {
      showWarning(`Cannot cancel ${part.type} part - it has already been ${part.status?.toLowerCase() || 'processed'}`);
      return;
    }

    const reason = prompt(`Please provide a reason for cancelling the ${part.type} part:`);
    if (!reason) return;

    setCancellingParts(prev => new Set(prev).add(part.id || part.orderNumber));

    try {
      let cancelEndpoint;
      let cancelData = { reason };

      if (part.type === 'admin') {
        // Cancel admin part
        cancelEndpoint = `/api/orders/user/cancel/${part.id}`;
      } else if (part.type === 'vendor') {
        // Cancel vendor part - this will need a special endpoint
        cancelEndpoint = `/api/orders/user/cancel-vendor-part/${part.id}`;
        cancelData.vendorOrderId = part.id;
      }

      console.log(`🚫 Cancelling ${part.type} part:`, part.orderNumber);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(`${getApiUrl()}${cancelEndpoint}`, cancelData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        showSuccess(`${part.type === 'admin' ? 'Admin' : 'Vendor'} part cancelled successfully`);
        
        // Refresh order details to show updated status
        await refreshOrderDetails();
        
        // Notify parent component of the update
        if (onOrderUpdate) {
          onOrderUpdate(orderId);
        }
      } else {
        showError(response.data.message || 'Failed to cancel order part');
      }
    } catch (error) {
      console.error(`❌ Error cancelling ${part.type} part:`, error);
      showError(error.response?.data?.message || 'Failed to cancel order part');
    } finally {
      setCancellingParts(prev => {
        const newSet = new Set(prev);
        newSet.delete(part.id || part.orderNumber);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'placed': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'shipped': return <Truck className="w-4 h-4 text-blue-600" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': 
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'placed': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'processing': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': 
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading order details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Order</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={loadOrderDetails}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!orderDetails) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Order {orderDetails.mainOrder?.orderNumber || 'N/A'}
              </h2>
              <p className="text-sm text-gray-500">
                Placed on {orderDetails.mainOrder?.createdAt ? 
                  new Date(orderDetails.mainOrder.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshOrderDetails}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh order details"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {orderDetails.canCancelOrder && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  Cancellable Parts Available
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Order Overview */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Customer</p>
              <p className="text-sm text-gray-600">{orderDetails.mainOrder?.customerName || 'N/A'}</p>
              <p className="text-sm text-gray-600">{orderDetails.mainOrder?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Total Amount</p>
              <p className="text-lg font-semibold text-gray-900">
                ${orderDetails.mainOrder?.totalAmount?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Overall Status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(orderDetails.mainOrder?.status)}`}>
                {getStatusIcon(orderDetails.mainOrder?.status)}
                <span className="ml-1 capitalize">{orderDetails.mainOrder?.status || 'Unknown'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Order Parts */}
        <div className="px-6 py-6">
          {orderDetails.isSplit && orderDetails.parts?.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Order Parts ({orderDetails.parts.length})
                </h3>
                <div className="text-sm text-gray-500">
                  Split order managed separately for optimal delivery
                </div>
              </div>

              {orderDetails.parts.map((part, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Part Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full ${
                          part.type === 'admin' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}></div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {part.type === 'admin' ? '🏢 Admin Handled' : `🏪 ${part.vendorName || 'Vendor'}`}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Order: {part.orderNumber} • ${part.subtotal?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(part.status)}`}>
                          {getStatusIcon(part.status)}
                          <span className="ml-1 capitalize">{part.status || 'Unknown'}</span>
                        </span>
                        
                        {/* Cancellation Button */}
                        {part.isCancellable && (
                          <button
                            onClick={() => cancelOrderPart(part)}
                            disabled={cancellingParts.has(part.id || part.orderNumber)}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {cancellingParts.has(part.id || part.orderNumber) ? (
                              <>
                                <div className="animate-spin w-3 h-3 border border-red-600 border-t-transparent rounded-full mr-1"></div>
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancel Part
                              </>
                            )}
                          </button>
                        )}
                        
                        {!part.isCancellable && ['shipped', 'delivered'].includes(part.status?.toLowerCase()) && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Cannot cancel - {part.status?.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Cancellation Details */}
                    {part.status?.toLowerCase() === 'cancelled' && part.cancelReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-900">Cancellation Reason:</p>
                        <p className="text-sm text-red-800">{part.cancelReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Part Items */}
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {(part.items || []).map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{item.productName}</h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>Qty: {item.quantity}</span>
                              <span>Price: ${item.price?.toFixed(2) || '0.00'}</span>
                              <span className="font-medium">Total: ${item.subtotal?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Show original items for non-split orders */
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Order Items
              </h3>

              {orderDetails.originalItems && orderDetails.originalItems.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            📦 Order Items ({orderDetails.originalItems.length})
                          </h4>
                          <p className="text-sm text-gray-500">
                            Order: {orderDetails.mainOrder?.orderNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ${orderDetails.mainOrder?.totalAmount?.toFixed(2) || '0.00'}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(orderDetails.mainOrder?.status)}`}>
                          {getStatusIcon(orderDetails.mainOrder?.status)}
                          <span className="ml-1 capitalize">{orderDetails.mainOrder?.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {orderDetails.originalItems.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{item.productName}</h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>Qty: {item.quantity}</span>
                              <span>Price: ${item.price?.toFixed(2) || '0.00'}</span>
                              <span className="font-medium">Total: ${item.subtotal?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Fallback when originalItems is empty - show debug info */
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Order Details Loading</h4>
                    <p className="text-gray-500 mb-4">
                      Order has been placed but details are being processed.
                    </p>
                    
                    {/* Debug information */}
                    <div className="text-left bg-gray-50 rounded-lg p-4 mt-4">
                      <h5 className="font-medium text-gray-900 mb-2">Debug Information:</h5>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Order ID: {orderId}</p>
                        <p>Order Number: {orderDetails.mainOrder?.orderNumber || 'N/A'}</p>
                        <p>Status: {orderDetails.mainOrder?.status || 'N/A'}</p>
                        <p>Is Split: {orderDetails.isSplit ? 'Yes' : 'No'}</p>
                        <p>Parts Count: {orderDetails.parts?.length || 0}</p>
                        <p>Original Items Count: {orderDetails.originalItems?.length || 0}</p>
                        <p>Total Amount: ${orderDetails.mainOrder?.totalAmount || 0}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={refreshOrderDetails}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Refresh Order Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedOrderTracking;
