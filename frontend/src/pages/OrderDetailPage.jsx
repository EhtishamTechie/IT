import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  TruckIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import OrderService from '../services/orderService';
import StatusService from '../services/statusService';
import OrderCancellationModal from '../components/OrderCancellationModal';
import { useNotification } from '../components/Notification';

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showError, showWarning, NotificationComponent } = useNotification();

  // State management
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [statusPollingCleanup, setStatusPollingCleanup] = useState(null);
  
  // Modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Fetch order details with real-time status
  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📦 [ORDER DETAIL] Fetching order details for:', orderId);
      
      // Get order details
      const orderData = await OrderService.getOrderDetails(orderId);
      console.log('📦 [ORDER DETAIL] Raw order data received:', orderData);
      console.log('📦 [ORDER DETAIL] Order data success:', orderData?.success);
      console.log('📦 [ORDER DETAIL] Order data keys:', orderData ? Object.keys(orderData) : 'null');
      
      if (orderData.success && orderData.data) {
        let order = orderData.data;
        console.log('📦 [ORDER DETAIL] Order details:', {
          id: order._id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          resolvedStatus: order.resolvedStatus,
          statusSource: order.statusSource,
          isSplit: order.isSplit,
          isSplitOrder: order.isSplitOrder
        });
        
        // For mixed orders, get the correct unified status from split-details
        if (order.orderType === 'mixed' || order.isSplit) {
          try {
            console.log(`🔍 [ORDER DETAIL] Fetching unified status for mixed order: ${orderId}`);
            const unifiedStatusInfo = await OrderService.getUnifiedOrderStatus(orderId);
            if (unifiedStatusInfo && unifiedStatusInfo.status) {
              order = {
                ...order,
                status: unifiedStatusInfo.status,
                unifiedStatus: unifiedStatusInfo.status,
                isSplit: unifiedStatusInfo.hasSplitOrder,
                parts: unifiedStatusInfo.parts || []
              };
              console.log(`✅ Mixed order ${orderId} unified status: ${unifiedStatusInfo.status}`);
            }
          } catch (statusError) {
            console.warn(`⚠️ Could not get unified status for mixed order ${orderId}:`, statusError);
            // Continue with original order data
          }
        }
        
        setOrder(order);
        
        // Fetch real-time status
        try {
          const statusData = await StatusService.getOrderStatus(orderId);
          if (statusData.success) {
            setStatusHistory(statusData.data.statusHistory || []);
            
            // Update order with latest status
            setOrder(prevOrder => ({
              ...prevOrder,
              unifiedStatus: statusData.data.currentStatus || prevOrder.unifiedStatus,
              status: statusData.data.currentStatus || prevOrder.status
            }));
          }
        } catch (statusError) {
          console.warn('⚠️ Could not fetch real-time status:', statusError);
        }
        
        // Set up real-time status polling
        const cleanup = StatusService.startStatusPolling([orderId], (statuses) => {
          const statusData = statuses[orderId];
          if (statusData && statusData.success) {
            const latestStatus = statusData.data?.currentStatus;
            const newStatusHistory = statusData.data?.statusHistory || [];
            
            console.log('🔄 Real-time status update:', latestStatus);
            
            setOrder(prevOrder => ({
              ...prevOrder,
              unifiedStatus: latestStatus || prevOrder.unifiedStatus,
              status: latestStatus || prevOrder.status
            }));
            
            setStatusHistory(newStatusHistory);
          }
        }, 15000); // Poll every 15 seconds
        
        setStatusPollingCleanup(() => cleanup);
        
      } else {
        setError('Order not found');
      }
      
    } catch (err) {
      console.error('❌ Error fetching order details:', err);
      setError(err.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchOrderDetails();
  }, [isAuthenticated, fetchOrderDetails, navigate]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (statusPollingCleanup) {
        console.log('🧹 Cleaning up status polling');
        statusPollingCleanup();
      }
    };
  }, [statusPollingCleanup]);

  // Handle order cancellation
  const handleCancelOrder = () => {
    if (!StatusService.canCustomerCancelOrder(order)) {
      showWarning('This order cannot be cancelled as it has already been shipped or delivered.');
      return;
    }
    
    if (StatusService.isAdminVendorCancellation(order)) {
      showWarning('This order was already cancelled by admin/vendor.');
      return;
    }
    
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = async (reason) => {
    setCancelLoading(true);
    try {
      console.log('🚫 Cancelling order:', orderId, 'Reason:', reason);
      
      await StatusService.cancelOrderByCustomer(orderId, reason);
      
      // Update local state
      setOrder(prevOrder => ({
        ...prevOrder,
        status: 'cancelled_by_customer',
        unifiedStatus: 'cancelled_by_customer',
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancelledBy: 'customer'
      }));
      
      showSuccess('Order cancelled successfully! Commission has been reversed.');
      setCancelModalOpen(false);
      
      // Refresh order details
      setTimeout(() => {
        fetchOrderDetails();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      showError(error.response?.data?.message || 'Failed to cancel order. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleModalClose = () => {
    if (!cancelLoading) {
      setCancelModalOpen(false);
    }
  };

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount || 0);
  };

  // Calculate shipping cost for the order
  const calculateOrderShipping = (order) => {
    if (!order.cart || order.cart.length === 0) return 0;
    
    // Get the maximum shipping cost from all items
    const shippingCosts = order.cart.map(item => {
      const shipping = item.shipping || item.productData?.shipping || 0;
      return Number(shipping);
    }).filter(cost => !isNaN(cost) && cost > 0);
    
    if (shippingCosts.length === 0) return 0;
    
    const maxShippingCost = Math.max(...shippingCosts);
    
    // Check if order qualifies for free shipping (10,000 or more)
    const subtotal = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (subtotal >= 10000) {
      return 0; // Free shipping for orders >= 10,000
    }
    
    return maxShippingCost;
  };

  // Calculate order subtotal (without shipping)
  const calculateOrderSubtotal = (order) => {
    if (!order.cart || order.cart.length === 0) return 0;
    return order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    const statusDisplay = StatusService.getStatusDisplay(status);
    const iconMap = {
      '📝': <ClockIcon className="w-5 h-5" />,
      '⚙️': <ClockIcon className="w-5 h-5" />,
      '🚚': <TruckIcon className="w-5 h-5" />,
      '✅': <CheckCircleIcon className="w-5 h-5" />,
      '❌': <XCircleIcon className="w-5 h-5" />,
      '🚫': <XCircleIcon className="w-5 h-5" />,
      '⚠️': <ExclamationTriangleIcon className="w-5 h-5" />
    };
    
    return iconMap[statusDisplay.icon] || <ClockIcon className="w-5 h-5" />;
  };

  const getStatusColor = (status) => {
    const statusDisplay = StatusService.getStatusDisplay(status);
    const colorMap = {
      'blue': 'text-blue-600 bg-blue-50',
      'yellow': 'text-yellow-600 bg-yellow-50',
      'indigo': 'text-indigo-600 bg-indigo-50',
      'green': 'text-green-600 bg-green-50',
      'red': 'text-red-600 bg-red-50',
      'orange': 'text-orange-600 bg-orange-50',
      'gray': 'text-gray-600 bg-gray-50'
    };
    
    return colorMap[statusDisplay.color] || 'text-gray-600 bg-gray-50';
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-x-4">
              <button
                onClick={fetchOrderDetails}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/orders"
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link
              to="/orders"
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = order.unifiedStatus || order.status || 'placed';
  const statusDisplay = StatusService.getStatusDisplay(currentStatus);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center text-gray-500 hover:text-orange-600 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Orders
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.orderNumber || order._id}
              </h1>
              <p className="text-gray-500 mt-1">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-base font-semibold ${getStatusColor(currentStatus)} shadow-md`}>
                {getStatusIcon(currentStatus)}
                <span className="ml-2">{statusDisplay.text}</span>
              </div>
              {/* Order Type Badge */}
              {(() => {
                const orderType = OrderService.getOrderType(order);
                const typeColors = {
                  'admin_only': 'bg-blue-100 text-blue-800',
                  'vendor_only': 'bg-green-100 text-green-800',
                  'mixed': 'bg-purple-100 text-purple-800'
                };
                const typeLabels = {
                  'admin_only': 'Admin Only',
                  'vendor_only': 'Vendor Only',
                  'mixed': 'Mixed Order'
                };
                return (
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${typeColors[orderType]} shadow-sm`}>
                    {typeLabels[orderType]}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Order Items</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {(order.cart || []).map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
                    <img
                      src={item.image || '/placeholder-product.jpg'}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                      {item.vendor && (
                        <p className="text-xs text-green-600">Vendor: {item.vendor.businessName || 'Vendor'}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History */}
            {statusHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Status History</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {statusHistory.map((entry, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${getStatusColor(entry.status)} shadow-sm`}>
                          {getStatusIcon(entry.status)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {StatusService.getStatusDisplay(entry.status).text}
                          </p>
                          <p className="text-sm text-gray-500">
                            {entry.reason || 'Status update'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(entry.timestamp)} by {entry.updatedBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-orders for Mixed Orders */}
            {order.isSplit && order.parts && order.parts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Sub-orders</h2>
                  <p className="text-sm text-gray-500">This mixed order has been split into multiple parts</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {order.parts.map((part, index) => (
                    <div key={index} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {part.partialOrderType === 'vendor_part' ? 'Vendor Part' : 'Admin Part'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {(part.cart || []).length} item(s)
                          </p>
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(part.status || part.unifiedStatus)} shadow-sm`}>
                          {getStatusIcon(part.status || part.unifiedStatus)}
                          <span className="ml-1">
                            {StatusService.getStatusDisplay(part.status || part.unifiedStatus).text}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          {formatCurrency(part.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(calculateOrderSubtotal(order))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-semibold">
                    {calculateOrderShipping(order) > 0 
                      ? formatCurrency(calculateOrderShipping(order))
                      : 'Free'
                    }
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-lg font-bold text-orange-600">
                      {formatCurrency(calculateOrderSubtotal(order) + calculateOrderShipping(order))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Actions */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                {/* Customer cancellation */}
                {StatusService.canCustomerCancelOrder(order) && !StatusService.isAdminVendorCancellation(order) && (
                  <button
                    onClick={handleCancelOrder}
                    className="w-full bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-semibold shadow-sm"
                  >
                    Cancel Order
                  </button>
                )}
                {/* Disabled cancel for admin/vendor cancellations */}
                {StatusService.isAdminVendorCancellation(order) && (
                  <div className="w-full bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-center font-semibold shadow-sm">
                    <p className="text-sm">Cancelled by Admin/Vendor</p>
                    <p className="text-xs">Commission not reversed</p>
                  </div>
                )}
                {/* Commission reversal info */}
                {StatusService.isCustomerCancellation(order) && (
                  <div className="w-full bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-center font-semibold shadow-sm">
                    <p className="text-sm">Cancelled by Customer</p>
                    <p className="text-xs">Commission Reversed</p>
                  </div>
                )}
                <Link
                  to="/orders"
                  className="w-full bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center block font-semibold shadow-sm"
                >
                  Back to Orders
                </Link>
                {currentStatus === 'delivered' && (
                  <Link
                    to="/products"
                    className="w-full bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors text-center block font-semibold shadow-sm"
                  >
                    Buy Again
                  </Link>
                )}
              </div>
            </div>

            {/* Shipping Information */}
            {order.shipping && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Shipping Information</h2>
                </div>
                <div className="p-6 space-y-2">
                  <p className="text-gray-500">
                    <span className="font-semibold">Address:</span>
                  </p>
                  <p className="text-gray-900">
                    {order.address}<br />
                    {order.city}, {order.postalCode}
                  </p>
                  {order.shipping.method && (
                    <p className="text-gray-500 mt-4">
                      <span className="font-semibold">Method:</span> {order.shipping.method}
                    </p>
                  )}
                  {order.tracking && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900">Tracking Information</p>
                      <p className="text-sm text-blue-800">
                        Tracking Number: {order.tracking.trackingNumber}
                      </p>
                      {order.tracking.carrier && (
                        <p className="text-sm text-blue-800">
                          Carrier: {order.tracking.carrier}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Cancellation Modal */}
      <OrderCancellationModal
        isOpen={cancelModalOpen}
        onClose={handleModalClose}
        onConfirm={confirmCancelOrder}
        orderDetails={order}
        loading={cancelLoading}
      />

      {/* Notification Component */}
      <NotificationComponent />
    </div>
  );
};

export default OrderDetailPage;
