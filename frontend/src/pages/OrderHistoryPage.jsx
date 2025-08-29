import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircleIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import OrderService from '../services/orderService';
import StatusService from '../services/statusService';
import OrderCancellationModal from '../components/OrderCancellationModal';
import OrderStatusDisplay from '../components/order/OrderStatusDisplay';
import { useNotification } from '../components/Notification';

const OrderHistoryPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusPollingCleanup, setStatusPollingCleanup] = useState(null);
  
  // Modal and notification states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { showSuccess, showError, showWarning, NotificationComponent } = useNotification();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 [ORDER HISTORY] Starting to fetch orders...');
      console.log('🔍 [ORDER HISTORY] User is authenticated:', isAuthenticated);
      console.log('🔍 [ORDER HISTORY] Current user:', user);
      console.log('🔍 [ORDER HISTORY] User email:', user?.email);
      
      const response = await OrderService.getUserOrders();
      console.log('🔍 [ORDER HISTORY] Raw API response received:', response);
      console.log('🔍 [ORDER HISTORY] Response type:', typeof response);
      console.log('🔍 [ORDER HISTORY] Response keys:', response ? Object.keys(response) : 'null');
      
      // Handle different response formats
      let userOrders = [];
      if (response && response.orders && Array.isArray(response.orders)) {
        userOrders = response.orders;
        console.log('🔍 [ORDER HISTORY] Using response.orders:', userOrders.length, 'orders');
      } else if (response && Array.isArray(response)) {
        userOrders = response;
        console.log('🔍 [ORDER HISTORY] Using direct array response:', userOrders.length, 'orders');
      } else if (response && response.data && Array.isArray(response.data)) {
        userOrders = response.data;
        console.log('🔍 [ORDER HISTORY] Using response.data:', userOrders.length, 'orders');
      } else {
        console.log('🔍 [ORDER HISTORY] Unexpected response format, using empty array');
        console.log('🔍 [ORDER HISTORY] Response type:', typeof response);
        console.log('🔍 [ORDER HISTORY] Response keys:', response ? Object.keys(response) : 'null/undefined');
        userOrders = [];
      }
      
      console.log('🔍 [ORDER HISTORY] Final orders array to process:', userOrders.length, 'orders');
      if (userOrders.length > 0) {
        console.log('🔍 [ORDER HISTORY] First order sample:', {
          id: userOrders[0]._id,
          orderNumber: userOrders[0].orderNumber,
          status: userOrders[0].status,
          orderType: userOrders[0].orderType,
          resolvedStatus: userOrders[0].resolvedStatus,
          statusSource: userOrders[0].statusSource
        });
      }
      
      // Process orders and fetch real-time statuses with correct mixed order status calculation
      const processedOrders = await Promise.all(userOrders.map(async (order) => {
        console.log(`🔍 [ORDER PROCESSING] Processing order ${order.orderNumber}:`, {
          id: order._id,
          orderType: order.orderType,
          currentStatus: order.status,
          resolvedStatus: order.resolvedStatus,
          statusSource: order.statusSource,
          isSplitOrder: order.isSplitOrder
        });
        
        let actualStatus = order.status || 'placed';
        let isSplit = false;
        let parts = [];
        
        // For mixed orders, get the correct unified status from split-details
        if (order.orderType === 'mixed' || order.isSplitOrder) {
          try {
            console.log(`🔍 [ORDER PROCESSING] Fetching unified status for mixed order: ${order._id}`);
            const unifiedStatusInfo = await OrderService.getUnifiedOrderStatus(order._id);
            console.log(`🔍 [ORDER PROCESSING] Unified status response:`, unifiedStatusInfo);
            
            if (unifiedStatusInfo && unifiedStatusInfo.status) {
              actualStatus = unifiedStatusInfo.status;
              isSplit = unifiedStatusInfo.hasSplitOrder;
              parts = unifiedStatusInfo.parts || [];
              console.log(`✅ [ORDER PROCESSING] Mixed order ${order._id} unified status: ${actualStatus}`);
            }
          } catch (statusError) {
            console.warn(`⚠️ [ORDER PROCESSING] Could not get unified status for mixed order ${order._id}:`, statusError);
            // Fallback to original status
            actualStatus = order.status || 'placed';
          }
        } else {
          console.log(`📋 [ORDER PROCESSING] Non-mixed order ${order.orderNumber}, using status: ${actualStatus}`);
        }
        
        const processedOrder = {
          ...order,
          unifiedStatus: actualStatus,
          status: actualStatus,
          isSplit,
          parts,
          orderType: order.orderType || 'admin_only'
        };
        
        console.log(`✅ [ORDER PROCESSING] Final processed order ${order.orderNumber}:`, {
          id: processedOrder._id,
          orderType: processedOrder.orderType,
          finalStatus: processedOrder.status,
          unifiedStatus: processedOrder.unifiedStatus
        });
        
        return processedOrder;
      }));

      console.log('🔍 [ORDER HISTORY] All processed orders with status info:');
      processedOrders.forEach((order, index) => {
        console.log(`🔍 [ORDER HISTORY] Order ${index + 1}: ${order.orderNumber} → ${order.status} (${order.orderType})`);
      });
      
      setOrders(processedOrders);
      
      // Set up real-time status polling for all orders
      if (processedOrders.length > 0) {
        const orderIds = processedOrders.map(order => order._id);
        console.log('📊 Setting up real-time status polling for orders:', orderIds);
        
        // Clean up existing polling
        if (statusPollingCleanup) {
          statusPollingCleanup();
        }
        
        // Start new polling
        const cleanup = StatusService.startStatusPolling(orderIds, (statuses) => {
          console.log('📊 Received real-time status updates:', statuses);
          
          setOrders(currentOrders => {
            return currentOrders.map(order => {
              const statusData = statuses[order._id];
              if (statusData && statusData.success) {
                const latestStatus = statusData.data?.currentStatus || order.unifiedStatus;
                console.log(`🔄 Updating order ${order._id} status: ${order.unifiedStatus} → ${latestStatus}`);
                
                return {
                  ...order,
                  unifiedStatus: latestStatus,
                  status: latestStatus,
                  statusHistory: statusData.data?.statusHistory || order.statusHistory,
                  lastUpdated: new Date()
                };
              }
              return order;
            });
          });
        }, 30000); // Poll every 30 seconds
        
        setStatusPollingCleanup(() => cleanup);
      }
      
    } catch (err) {
      console.error('OrderHistoryPage: Error fetching orders:', err);
      console.error('OrderHistoryPage: Error details:', err.message);
      console.error('OrderHistoryPage: Error response:', err.response?.data);
      setError('Failed to load order history');
      setOrders([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, statusPollingCleanup]); // Add dependencies

  useEffect(() => {
    document.title = 'Order History | International Tijarat';
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, fetchOrders]);

  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      if (statusPollingCleanup) {
        console.log('🧹 OrderHistoryPage: Cleaning up status polling');
        statusPollingCleanup();
      }
    };
  }, [statusPollingCleanup]);

  // Helper function to check if order can be cancelled
  const canCancelOrder = (order) => {
    return StatusService.canCustomerCancelOrder(order);
  };

  // Handle view order navigation
  const handleViewOrder = (orderId) => {
    localStorage.setItem('orderDetailSource', '/orders');
    navigate(`/order-detail/${orderId}`);
  };

  // Get cancellation info for mixed orders
  const getMixedOrderCancellationInfo = (order) => {
    if (!order.isSplit || !order.parts) {
      return { cancellableParts: 0, shippedParts: 0, totalParts: 0 };
    }
    
    let cancellableParts = 0;
    let shippedParts = 0;
    const totalParts = order.parts.length;
    
    order.parts.forEach(part => {
      const status = (part.status || part.unifiedStatus || '').toLowerCase();
      if (['shipped', 'delivered'].includes(status)) {
        shippedParts++;
      } else if (['placed', 'processing'].includes(status)) {
        cancellableParts++;
      }
    });
    
    return { cancellableParts, shippedParts, totalParts };
  };

  const handleCancelOrder = async (order) => {
    const orderType = OrderService.getOrderType(order);
    
    // Check if order can be cancelled
    if (!canCancelOrder(order)) {
      if (orderType === 'mixed') {
        showWarning('No parts of this mixed order can be cancelled as they have already been shipped or delivered.');
      } else {
        showWarning('This order cannot be cancelled as it has already been shipped or delivered.');
      }
      return;
    }

    // For mixed orders, show additional context
    if (orderType === 'mixed') {
      const cancellationInfo = getMixedOrderCancellationInfo(order);
      const message = `This will cancel ${cancellationInfo.cancellableParts} part(s) of your mixed order. ${cancellationInfo.shippedParts} part(s) have already been shipped and cannot be cancelled.`;
      
      if (!confirm(message + '\n\nDo you want to proceed?')) {
        return;
      }
    }

    // Set the order to cancel and open modal
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = async (reason) => {
    if (!orderToCancel) return;

    setCancelLoading(true);
    try {
      console.log('🚫 Cancelling order:', orderToCancel._id, 'Reason:', reason);
      
      // Use the new status service for customer cancellation with commission reversal
      await StatusService.cancelOrderByCustomer(orderToCancel._id, reason);
      
      // Update the order in the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderToCancel._id 
            ? { 
                ...order, 
                status: 'cancelled_by_customer',
                unifiedStatus: 'cancelled_by_customer', 
                cancelledAt: new Date(), 
                cancellationReason: reason,
                cancelledBy: 'customer'
              }
            : order
        )
      );
      
      showSuccess('Order cancelled successfully! Commission has been reversed.');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      
      // Refresh orders to ensure we have the latest status
      setTimeout(() => {
        fetchOrders();
      }, 1000);
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to cancel order. Please try again.';
      showError(errorMessage);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleModalClose = () => {
    if (!cancelLoading) {
      setCancelModalOpen(false);
      setOrderToCancel(null);
    }
  };

  const handleOrderUpdate = useCallback(async (orderData) => {
    // Refresh orders when tracking modal updates to show current status
    console.log('📊 Order updated in tracking modal, refreshing order list...');
    console.log('📦 Updated order ID:', orderData);
    
    // Add a small delay to ensure backend processing is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Refresh the order list to show updated status
    console.log('🔄 Fetching updated orders...');
    await fetchOrders();
    console.log('✅ Order list refresh completed');
  }, [fetchOrders]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view your order history.</p>
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
            <p className="mt-4 text-gray-600">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <XCircleIcon className="w-16 h-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchOrders}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.name}! Here are your recent orders.
          </p>
        </div>

        {orders.length === 0 ? (
          /* No Orders */
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <ShoppingBagIcon className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Orders Yet</h2>
            <p className="text-gray-600 mb-6">
              You haven't placed any orders yet. Start shopping to see your order history here.
            </p>
            <Link
              to="/products"
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors inline-block shadow-md"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-8">
            {Array.isArray(orders) && orders.map((order) => (
              <div key={order._id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                {/* Order Header */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Order #{order.orderNumber || order._id}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status Badge */}
                    <OrderStatusDisplay 
                      status={order.unifiedStatus || order.status}
                      order={order}
                      isSplit={order.isSplit}
                      parts={order.parts}
                    />
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
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${typeColors[orderType]} shadow-sm`}>
                          {typeLabels[orderType]}
                        </span>
                      );
                    })()}
                    {/* Mixed Order Parts Status */}
                    {OrderService.getOrderType(order) === 'mixed' && order.statusParts && order.statusParts.length > 0 && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const shippedCount = order.statusParts.filter(part => 
                            ['shipped', 'delivered'].includes((part.status || '').toLowerCase())
                          ).length;
                          const cancelledCount = order.statusParts.filter(part => 
                            (part.status || '').toLowerCase() === 'cancelled'
                          ).length;
                          const totalParts = order.statusParts.length;
                          return (
                            <>
                              {shippedCount > 0 && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded shadow-sm">
                                  {shippedCount} Shipped
                                </span>
                              )}
                              {cancelledCount > 0 && (
                                <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded shadow-sm">
                                  {cancelledCount} Cancelled
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                ({totalParts} parts)
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    {/* Price Summary */}
                    <span className="text-lg font-bold text-orange-600">
                      ${order.cart ? order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
                {/* Order Items Preview */}
                <div className="p-6 bg-gray-50">
                  <div className="flex items-center gap-4 mb-4">
                    {(order.cart || []).slice(0, 3).map((item, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                        <img
                          src={item.image || '/placeholder-product.jpg'}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        {/* Vendor Badge */}
                        {item.vendor && (
                          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs px-1 py-0.5 rounded-full">
                            V
                          </div>
                        )}
                      </div>
                    ))}
                    {(order.cart || []).length > 3 && (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-sm">+{(order.cart || []).length - 3}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-4 sm:mb-0">
                      <p className="text-gray-600">
                        {(order.cart || []).length} item{(order.cart || []).length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        Delivery to {order.city}
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleViewOrder(order._id)}
                        className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        View Details
                      </button>
                      
                      <button
                        onClick={() => handleViewOrder(order._id)}
                        className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                      >
                        Track Order
                      </button>
                      
                      {/* Customer cancellation button - only show if customer can cancel */}
                      {canCancelOrder(order) && !StatusService.isAdminVendorCancellation(order) && (
                        <button
                          onClick={() => handleCancelOrder(order)}
                          className="bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        >
                          Cancel Order
                        </button>
                      )}
                      
                      {/* Show disabled cancel button for admin/vendor cancelled orders */}
                      {StatusService.isAdminVendorCancellation(order) && (
                        <button
                          disabled
                          className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed text-sm"
                          title="This order was cancelled by admin/vendor"
                        >
                          Cancelled by Admin
                        </button>
                      )}
                      
                      {/* Show commission reversal info for customer cancellations */}
                      {StatusService.isCustomerCancellation(order) && (
                        <div className="bg-blue-50 px-3 py-1 rounded text-xs text-blue-700">
                          Commission Reversed
                        </div>
                      )}
                      
                      {order.status === 'delivered' && (
                        <Link
                          to={`/products`}
                          className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                        >
                          Buy Again
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tracking Information */}
                {(order.unifiedStatus === 'shipped' || order.status === 'shipped') && (
                  <div className="bg-blue-50 p-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">🚚</span>
                      <span className="text-blue-800 font-medium">
                        {order.hasSplitOrder ? 'Your order parts are on the way!' : 'Your order is on the way!'}
                      </span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      Estimated delivery: {OrderService.estimateDeliveryDate(order.shipping?.method)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Show message if no orders */}
            {Array.isArray(orders) && orders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">You have no orders yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Support Section */}
        <div className="bg-gray-100 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            Have questions about an order? Our customer support team is here to help.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/ContactUsPage"
              className="text-orange-600 hover:text-orange-800 font-medium"
            >
              📧 Contact Support
            </Link>
            <a
              href="tel:+923005567507"
              className="text-orange-600 hover:text-orange-800 font-medium"
            >
              📞 Call Us: +92 300 5567507
            </a>
          </div>
        </div>
      </div>

      {/* Order Cancellation Modal */}
      <OrderCancellationModal
        isOpen={cancelModalOpen}
        onClose={handleModalClose}
        onConfirm={confirmCancelOrder}
        orderDetails={orderToCancel}
        loading={cancelLoading}
      />

      {/* Notification Component */}
      <NotificationComponent />
    </div>
  );
};

export default OrderHistoryPage;
