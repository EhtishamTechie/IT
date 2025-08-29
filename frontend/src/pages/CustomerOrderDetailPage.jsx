import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getApiUrl, getUploadUrl } from '../config';
import { 
  ArrowLeftIcon, 
  XCircleIcon, 
  CheckCircleIcon, 
  TruckIcon, 
  ClockIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CreditCardIcon,
  CalendarIcon,
  PackageIcon,
  StoreIcon,
  RefreshCwIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import OrderService from '../services/orderService';
import OrderCancellationModal from '../components/OrderCancellationModal';
import { useNotification } from '../components/Notification';

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showSuccess, showError, showWarning, NotificationComponent } = useNotification();
  
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Cancellation modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      console.log('🔍 Loading order details for:', orderId);
      console.log('🔐 Checking authentication...');
      
      // Get authentication token
      const token = localStorage.getItem('token');
      const headers = token ? { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};
      
      console.log('🔐 Token exists:', !!token);
      console.log('🔐 Headers:', headers);
      
      // Use the customer split-details endpoint with authentication
      const response = await fetch(`${getApiUrl()}/orders/${orderId}/split-details`, {
        method: 'GET',
        headers: headers
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('📡 Order details response:', result);
      
      if (result.success && result.data) {
        setOrderDetails(result.data);
      } else {
        setError(result.message || 'Failed to load order details');
      }
    } catch (error) {
      console.error('❌ Error loading order details:', error);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadOrderDetails(true);
  };

  const handleCancelOrder = () => {
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = async (reason) => {
    if (!orderDetails) return;

    setCancelLoading(true);
    try {
      await OrderService.cancelOrder(orderId, reason);
      
      showSuccess('Order cancelled successfully!');
      setCancelModalOpen(false);
      
      // Refresh order details to show updated status
      await loadOrderDetails(true);
      
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      showError(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleModalClose = () => {
    setCancelModalOpen(false);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'placed': 
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'confirmed':
      case 'processing': 
        return <ClockIcon className="w-5 h-5 text-orange-600" />;
      case 'shipped': 
        return <TruckIcon className="w-5 h-5 text-blue-600" />;
      case 'delivered': 
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'cancelled':
      case 'rejected': 
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default: 
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'placed': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed':
      case 'processing': 
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'shipped': 
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivered': 
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
      case 'rejected': 
        return 'bg-red-100 text-red-800 border-red-300';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const canCancelOrder = () => {
    if (!orderDetails) return false;
    
    // Check if overall order can be cancelled
    const mainStatus = orderDetails.mainOrder?.status?.toLowerCase();
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'rejected'];
    
    return !nonCancellableStatuses.includes(mainStatus);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view order details.</p>
          <Link
            to="/login"
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
            <button
              onClick={() => navigate('/orders')}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { mainOrder, parts, isSplit, originalItems } = orderDetails;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/orders')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Orders
              </button>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(mainOrder.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(mainOrder.status)}`}>
                  {mainOrder.status}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {canCancelOrder() && (
                <button
                  onClick={handleCancelOrder}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Order #{mainOrder.orderNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Placed on {formatDate(mainOrder.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Order Status</h2>
                {isSplit && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    Multi-Part Order
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(mainOrder.status)}
                    <div>
                      <p className="font-medium text-gray-900">Overall Status</p>
                      <p className="text-sm text-gray-600">Main order status</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(mainOrder.status)}`}>
                    {mainOrder.status}
                  </span>
                </div>
                
                {/* Show individual parts for mixed orders */}
                {isSplit && parts && parts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 border-t pt-4">Individual Parts</h3>
                    {parts.map((part, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {part.type === 'admin' ? (
                            <UserIcon className="w-5 h-5 text-blue-600" />
                          ) : (
                            <StoreIcon className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {part.type === 'admin' ? 'Admin Part' : `Vendor Part (${part.vendorName || 'Unknown'})`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {part.items?.length || 0} item(s) • {formatCurrency(part.totalAmount)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(part.status)}`}>
                          {part.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
              
              {isSplit && parts && parts.length > 0 ? (
                // Show items grouped by parts for mixed orders
                parts.map((part, partIndex) => (
                  <div key={partIndex} className="mb-6 last:mb-0">
                    <div className="flex items-center space-x-2 mb-3">
                      {part.type === 'admin' ? (
                        <UserIcon className="w-4 h-4 text-blue-600" />
                      ) : (
                        <StoreIcon className="w-4 h-4 text-green-600" />
                      )}
                      <h3 className="font-medium text-gray-900">
                        {part.type === 'admin' ? 'Admin Items' : `Vendor Items (${part.vendorName || 'Unknown'})`}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(part.status)}`}>
                        {part.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                      {(part.items || []).map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                          <img
                            src={item.image || '/placeholder-product.jpg'}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.productName}</h4>
                            <p className="text-sm text-gray-600">
                              Quantity: {item.quantity} × {formatCurrency(item.price)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Show original items for non-split orders
                <div className="space-y-3">
                  {(originalItems || []).map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                      <img
                        src={item.image || '/placeholder-product.jpg'}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.subtotal || (item.price * item.quantity))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{mainOrder.customerName}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MailIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{mainOrder.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{mainOrder.phone}</span>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{mainOrder.address}</p>
                    <p className="text-gray-600">{mainOrder.city}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CreditCardIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{mainOrder.paymentMethod || 'COD'}</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(mainOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order Placed</p>
                    <p className="text-sm text-gray-600">{formatDate(mainOrder.createdAt)}</p>
                  </div>
                </div>
                
                {/* Add more timeline events based on order status */}
                {mainOrder.status !== 'placed' && (
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Status: {mainOrder.status}</p>
                      <p className="text-sm text-gray-600">Last updated</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Cancellation Modal */}
      <OrderCancellationModal
        isOpen={cancelModalOpen}
        onClose={handleModalClose}
        onConfirm={confirmCancelOrder}
        orderDetails={mainOrder}
        loading={cancelLoading}
      />

      {/* Notification Component */}
      <NotificationComponent />
    </div>
  );
};

export default OrderDetailPage;
