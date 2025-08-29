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
  RefreshCw,
  Eye,
  Ban
} from 'lucide-react';
import API from '../../api'; // Use authenticated API instead of raw axios
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../Notification';
import OrderStatusDisplay from './OrderStatusDisplay';
import OrderItemsList from './OrderItemsList';
import OrderCustomerInfo from './OrderCustomerInfo';
import OrderActions from './OrderActions';
import OrderService from '../../services/orderService'; // Import OrderService
import unifiedOrderStatusService from '../../services/unifiedOrderStatusService';
import realTimeOrderService from '../../services/realTimeOrderService';

const StandardOrderDetailsModal = ({ 
  orderId, 
  onClose, 
  onOrderUpdate,
  userRole = 'customer', // 'customer', 'admin', 'vendor'
  allowCancellation = true 
}) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingParts, setCancellingParts] = useState(new Set());

  // Load order details using the working split-details endpoint
  const loadOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Loading order details for:', orderId, 'userRole:', userRole);
      
      // Debug: Check what tokens we have
      const vendorToken = localStorage.getItem('vendorToken');
      const adminToken = localStorage.getItem('adminToken');
      const regularToken = localStorage.getItem('token');
      console.log('🔐 Available tokens:', {
        vendorToken: vendorToken ? `${vendorToken.substring(0, 20)}...` : 'none',
        adminToken: adminToken ? `${adminToken.substring(0, 20)}...` : 'none',
        regularToken: regularToken ? `${regularToken.substring(0, 20)}...` : 'none'
      });
      
      // Use different endpoints based on user role
      let endpoint;
      if (userRole === 'vendor') {
        endpoint = `/vendors/orders/${orderId}`;
      } else if (userRole === 'admin') {
        endpoint = `/orders/${orderId}/split-details`;
      } else {
        endpoint = `/orders/${orderId}/details`;
      }
      
      console.log('📡 Using endpoint:', endpoint);
      const response = await API.get(endpoint);
      
      console.log('📡 API Response:', response.data);
      console.log('📡 Full response object:', response);
      
      if (response.data.success) {
        let data;
        
        // Handle different response formats based on user role
        if (userRole === 'vendor') {
          // Vendor endpoint returns { success: true, data: { order: {...}, orderType: 'legacy_order' } }
          data = response.data.data.order;
          console.log('👤 VENDOR VIEW - Raw data received:', data);
          console.log('👤 VENDOR VIEW - Order status fields:', {
            status: data.status,
            orderStatus: data.orderStatus,
            vendorItems: data.vendorItems?.length || 0
          });
          console.log('👤 VENDOR VIEW - Vendor info in data:', {
            vendorField: data.vendor,
            vendorId: data.vendorId,
            vendorBusinessName: data.vendor?.businessName,
            vendorName: data.vendor?.name
          });
        } else if (userRole === 'admin') {
          // Admin split-details endpoint returns { success: true, data: { mainOrder: {...}, parts: [...] } }
          data = response.data.data;
          console.log('👤 ADMIN VIEW - Raw data received:', data);
          console.log('👤 ADMIN VIEW - Order status fields:', {
            mainOrderStatus: data.mainOrder?.status,
            isSplit: data.isSplit,
            parts: data.parts?.length || 0
          });
        } else {
          // Customer endpoints return { success: true, data: {...} }
          data = response.data.data;
          console.log('👤 CUSTOMER VIEW - Raw data received:', data);
          console.log('👤 CUSTOMER VIEW - Order status fields:', {
            status: data.status,
            orderStatus: data.orderStatus,
            statusDisplay: data.statusDisplay,
            items: data.items?.length || 0
          });
        }
        
        console.log('🔍 Raw order data received:', {
          orderNumber: data.orderNumber,
          status: data.status,
          orderStatus: data.orderStatus,
          forwardedToVendors: data.forwardedToVendors,
          itemsCount: data.items?.length || data.cart?.length || data.vendorItems?.length
        });
        console.log('📊 Raw order data:', data);
        console.log('📊 Order status fields:', {
          status: data.status,
          orderStatus: data.orderStatus,
          statusDisplay: data.statusDisplay
        });
        
        // Handle different response formats
        let transformedData;
        
        if (userRole === 'admin') {
          // Admin split-details endpoint returns data in the expected format already
          transformedData = data;
        } else if (userRole === 'vendor' && data.vendorItems) {
          // Vendor format from /vendors/orders/{id} endpoint
          transformedData = {
            mainOrder: {
              orderNumber: data.orderNumber,
              status: data.statusDisplay || data.status || data.orderStatus,
              totalAmount: data.vendorSubtotal, // Use vendor subtotal for vendors
              createdAt: data.createdAt,
              customerName: data.customerName || data.name,
              email: data.email,
              phone: data.phone,
              address: data.address,
              city: data.city,
              paymentMethod: data.paymentMethod,
              // Vendor-specific fields
              vendorAmount: data.vendorAmount,
              commissionAmount: data.commissionAmount,
              commissionRate: data.commissionRate
            },
            isSplit: false,
            parts: [],
            originalItems: data.vendorItems.map(item => ({
              _id: item._id,
              productName: item.productId?.name || item.title || item.name,
              quantity: item.quantity,
              price: item.price,
              // Image URL - backend now provides properly formatted URLs
              image: item.image,
              subtotal: item.price * item.quantity,
              // Use the main vendor info instead of item.vendor for vendor orders
              vendor: {
                _id: data.vendorId,
                businessName: data.vendor?.businessName || 'Unknown Vendor',
                name: data.vendor?.name || data.vendor?.businessName || 'Unknown Vendor',
                email: data.vendor?.email
              },
              status: item.status || data.status
            })).map((item, index) => {
              console.log(`🖼️ VENDOR ITEM ${index + 1} IMAGE DEBUG:`, {
                itemName: item.productName,
                imageUrl: item.image,
                hasImage: !!item.image,
                imageType: typeof item.image
              });
              
              // Test if image is accessible
              if (item.image) {
                console.log(`🌐 Testing image accessibility: ${item.image}`);
                fetch(item.image)
                  .then(response => {
                    console.log(`✅ Image ${index + 1} fetch result:`, {
                      status: response.status,
                      ok: response.ok,
                      url: item.image
                    });
                  })
                  .catch(error => {
                    console.error(`❌ Image ${index + 1} fetch failed:`, {
                      error: error.message,
                      url: item.image
                    });
                  });
              }
              
              return item;
            })
          };
        } else if (data.items) {
          // New format from /orders/{id}/details endpoint
          transformedData = {
            mainOrder: {
              orderNumber: data.orderNumber,
              status: data.statusDisplay || data.status || data.orderStatus, // Prioritize statusDisplay over status
              totalAmount: data.totalAmount,
              createdAt: data.createdAt,
              customerName: data.customer?.name,
              email: data.customer?.email,
              phone: data.customer?.phone,
              address: data.customer?.address,
              city: data.customer?.city,
              paymentMethod: data.paymentMethod
            },
            isSplit: false,
            parts: [],
            originalItems: data.items.map(item => ({
              _id: item._id, // Include item ID for cancellation
              productName: item.title,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              subtotal: item.itemTotal,
              vendor: item.assignedVendor,
              status: item.status // Include item status
            }))
          };
          
          console.log('🔄 Transformed data:', {
            mainOrderStatus: transformedData.mainOrder.status,
            itemStatuses: transformedData.originalItems.map(item => ({ name: item.productName, status: item.status }))
          });
        } else {
          // Old format from split-details endpoint
          transformedData = data;
        }
        
        // Transform the data to group by handlers and include cancellation capabilities
        const finalData = {
          ...transformedData,
          // Add forwarding status from API response
          forwardedToVendors: data.forwardedToVendors || false,
          // Group items by handler
          handlerGroups: groupItemsByHandler(transformedData),
          // Add cancellation status for each part
          parts: transformedData.parts?.map(part => ({
            ...part,
            canCancel: canCancelPart(part),
            isCancellable: canCancelPart(part) && !isNonCancellableStatus(part.status),
            cancelReason: part.cancellationReason || null
          })) || [],
          // Overall order cancellation status
          canCancelOrder: transformedData.parts?.some(part => canCancelPart(part)) || false
        };
        
        console.log('✅ Transformed order data:', finalData);
        setOrderDetails(finalData);
      } else {
        setError(response.data.message || 'Failed to load order details');
      }
    } catch (error) {
      console.error('🚨 Error loading order details:', error);
      console.error('🚨 Error response:', error.response?.data);
      console.error('🚨 Error status:', error.response?.status);
      console.error('🚨 Error message:', error.message);
      console.error('🚨 Request config:', error.config);
      if (error.response?.status === 404) {
        setError('Order not found');
      } else if (error.response?.status === 403) {
        setError('Access denied - you can only view your own orders');
      } else {
        setError('Failed to load order details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, userRole]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  // Real-time status update handler
  const handleRealTimeUpdate = useCallback((updatedOrder) => {
    console.log('📊 StandardOrderDetailsModal: Received real-time update for order:', orderId);
    console.log('📊 Updated order data:', updatedOrder);
    
    setOrderDetails(currentDetails => {
      if (!currentDetails) return currentDetails;
      
      // Update the main order status
      const updatedDetails = {
        ...currentDetails,
        mainOrder: {
          ...currentDetails.mainOrder,
          status: updatedOrder.unifiedStatus,
          lastUpdated: updatedOrder.lastUpdated
        },
        isSplit: updatedOrder.isSplit,
        parts: updatedOrder.parts
      };
      
      console.log('📊 StandardOrderDetailsModal: Updated order details:', updatedDetails);
      
      // Notify parent component of the update
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder);
      }
      
      return updatedDetails;
    });
  }, [orderId, onOrderUpdate]);

  // Set up real-time updates for this specific order
  useEffect(() => {
    if (orderId && orderDetails) {
      console.log('🔄 StandardOrderDetailsModal: Setting up real-time updates for order:', orderId);
      
      // Subscribe to real-time updates for this order
      realTimeOrderService.subscribeToOrderUpdates(orderId, handleRealTimeUpdate, 10000); // Check every 10 seconds
      
      // Cleanup on unmount or order change
      return () => {
        console.log('🧹 StandardOrderDetailsModal: Cleaning up real-time updates for order:', orderId);
        realTimeOrderService.unsubscribeFromOrderUpdates(orderId);
      };
    }
  }, [orderId, orderDetails !== null, handleRealTimeUpdate]);

  // Helper function to group items by handler
  const groupItemsByHandler = (data) => {
    const groups = {
      admin: {
        type: 'admin',
        name: 'International Tijarat',
        icon: ShoppingBag,
        color: 'blue',
        items: [],
        subtotal: 0,
        status: 'placed',
        canCancel: false
      },
      vendors: {}
    };

    if (data.isSplit && data.parts) {
      // For split orders, group by parts
      data.parts.forEach(part => {
        if (part.type === 'admin') {
          groups.admin.items = part.items || [];
          groups.admin.subtotal = part.subtotal || 0;
          groups.admin.status = part.status || 'placed';
          groups.admin.canCancel = canCancelPart(part);
          groups.admin.id = part.id; // For cancellation
        } else if (part.type === 'vendor') {
          const vendorId = part.vendorName || 'Unknown Vendor';
          groups.vendors[vendorId] = {
            type: 'vendor',
            name: part.vendorName || 'Unknown Vendor',
            icon: Store,
            color: 'green',
            items: part.items || [],
            subtotal: part.subtotal || 0,
            status: part.status || 'pending',
            canCancel: canCancelPart(part),
            id: part.id, // For cancellation
            contact: part.vendorContact || {}
          };
        }
      });
    } else {
      // For non-split orders, categorize by item vendor
      const originalItems = data.originalItems || [];
      originalItems.forEach(item => {
        if (item.vendor) {
          const vendorName = item.vendor.businessName || item.vendor.name || 'Unknown Vendor';
          if (!groups.vendors[vendorName]) {
            groups.vendors[vendorName] = {
              type: 'vendor',
              name: vendorName,
              icon: Store,
              color: 'green',
              items: [],
              subtotal: 0,
              status: 'placed', // Will be calculated based on items
              canCancel: false, // Will be calculated based on items
              contact: item.vendor
            };
          }
          groups.vendors[vendorName].items.push(item);
          groups.vendors[vendorName].subtotal += item.subtotal || (item.price * item.quantity);
          
          // Calculate group status based on individual item statuses
          const vendorItems = groups.vendors[vendorName].items;
          if (vendorItems.length === 1) {
            groups.vendors[vendorName].status = item.status || 'placed';
          } else {
            // For multiple items, use the most advanced status
            const statuses = vendorItems.map(vi => vi.status || 'placed');
            const statusPriority = { 'cancelled': 0, 'placed': 1, 'processing': 2, 'shipped': 3, 'delivered': 4 };
            const highestStatus = statuses.reduce((highest, current) => 
              (statusPriority[current] || 1) > (statusPriority[highest] || 1) ? current : highest, 'placed');
            groups.vendors[vendorName].status = highestStatus;
          }
          groups.vendors[vendorName].canCancel = canCancelMainOrder({ status: groups.vendors[vendorName].status });
        } else {
          groups.admin.items.push(item);
          groups.admin.subtotal += item.subtotal || (item.price * item.quantity);
          
          // Calculate admin group status based on individual item statuses
          if (groups.admin.items.length === 1) {
            groups.admin.status = item.status || 'placed';
          } else {
            // For multiple items, use the most advanced status
            const statuses = groups.admin.items.map(ai => ai.status || 'placed');
            const statusPriority = { 'cancelled': 0, 'placed': 1, 'processing': 2, 'shipped': 3, 'delivered': 4 };
            const highestStatus = statuses.reduce((highest, current) => 
              (statusPriority[current] || 1) > (statusPriority[highest] || 1) ? current : highest, 'placed');
            groups.admin.status = highestStatus;
          }
          groups.admin.canCancel = canCancelMainOrder({ status: groups.admin.status });
        }
      });
    }

    return groups;
  };

  // Helper function to determine if a part can be cancelled
  const canCancelPart = (part) => {
    if (!part) return false;
    const status = part.status?.toLowerCase();
    return !isNonCancellableStatus(status);
  };

  const canCancelMainOrder = (mainOrder) => {
    if (!mainOrder) return false;
    const status = mainOrder.status?.toLowerCase();
    return !isNonCancellableStatus(status);
  };

  const isNonCancellableStatus = (status) => {
    const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'rejected'];
    return nonCancellableStatuses.includes(status?.toLowerCase());
  };

  // Refresh order details
  const refreshOrderDetails = async () => {
    setRefreshing(true);
    await loadOrderDetails();
    setRefreshing(false);
    showSuccess('Order details refreshed');
  };

  // Cancel a specific order part
  const cancelOrderPart = async (part, reason) => {
    try {
      setCancellingParts(prev => new Set([...prev, part.id]));
      
      let endpoint;
      if (part.type === 'admin') {
        endpoint = `/orders/user/cancel-admin-part/${part.id}`;
      } else {
        endpoint = `/orders/user/cancel-vendor-part/${part.id}`;
      }
      
      const response = await API.post(endpoint, { reason });
      
      if (response.data.success) {
        showSuccess(`${part.type === 'admin' ? 'Admin' : 'Vendor'} part cancelled successfully`);
        await loadOrderDetails(); // Refresh data
        if (onOrderUpdate) onOrderUpdate(orderId);
      } else {
        throw new Error(response.data.message || 'Failed to cancel part');
      }
    } catch (error) {
      console.error('Error cancelling order part:', error);
      showError(error.response?.data?.message || `Failed to cancel ${part.type} part`);
    } finally {
      setCancellingParts(prev => {
        const newSet = new Set(prev);
        newSet.delete(part.id);
        return newSet;
      });
    }
  };

  // Cancel specific items in an order (for non-forwarded orders)
  const cancelOrderItems = async (itemIds, reason) => {
    try {
      console.log('🚫 Cancelling items:', { itemIds, reason, orderId });
      
      const response = await API.post(`/orders/user/cancel-items/${orderId}`, {
        itemsToCancel: itemIds,
        reason
      });
      
      console.log('📡 Cancel items response:', response.data);
      
      if (response.data.success) {
        showSuccess(`Successfully cancelled ${itemIds.length} item(s)`);
        await loadOrderDetails(); // Refresh data
        if (onOrderUpdate) onOrderUpdate(orderId);
      } else {
        throw new Error(response.data.message || 'Failed to cancel items');
      }
    } catch (error) {
      console.error('Error cancelling order items:', error);
      showError(error.response?.data?.message || 'Failed to cancel items');
    }
  };

  // Cancel entire order (for non-split orders) - Use working OrderService method
  const cancelEntireOrder = async (reason) => {
    try {
      console.log('🚫 cancelEntireOrder called with:', { orderId, reason });
      console.log('🔧 Using OrderService.cancelOrder method (working implementation)');
      
      // Use the proven working OrderService.cancelOrder method
      const response = await OrderService.cancelOrder(orderId, reason);
      
      console.log('📡 Cancel order response:', response);
      
      if (response.success) {
        showSuccess('Order cancelled successfully');
        await loadOrderDetails(); // Refresh data
        if (onOrderUpdate) onOrderUpdate(orderId);
      } else {
        throw new Error(response.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      console.error('❌ Error response:', error.response?.data);
      showError(error.response?.data?.message || error.message || 'Failed to cancel order');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600">Error</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => loadOrderDetails()}
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
                Order #{orderDetails.mainOrder?.orderNumber || 'N/A'}
              </h2>
              <p className="text-sm text-gray-600">
                Placed on {new Date(orderDetails.mainOrder?.createdAt).toLocaleDateString()}
              </p>
            </div>
            <OrderStatusDisplay 
              status={orderDetails.mainOrder?.status}
              isSplit={orderDetails.isSplit}
              parts={orderDetails.parts}
            />
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
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Details - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Customer Information */}
              <OrderCustomerInfo 
                mainOrder={orderDetails.mainOrder}
                userRole={userRole}
              />

              {/* Order Items Grouped by Handler */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Order Items by Handler</h3>
                  <p className="text-sm text-gray-600">
                    Items are grouped by who handles them (Admin or Vendor)
                  </p>
                </div>
                
                <div className="p-6 space-y-6">
                  {orderDetails.handlerGroups && (
                    <>
                      {/* Admin Items */}
                      {orderDetails.handlerGroups.admin.items.length > 0 && (
                        <OrderItemsList
                          group={orderDetails.handlerGroups.admin}
                          userRole={userRole}
                          allowCancellation={allowCancellation}
                          onCancelPart={cancelOrderPart}
                          onCancelItems={cancelOrderItems}
                          isOrderForwarded={orderDetails.forwardedToVendors}
                          isCancelling={cancellingParts.has(orderDetails.handlerGroups.admin.id)}
                        />
                      )}

                      {/* Vendor Items */}
                      {Object.values(orderDetails.handlerGroups.vendors).map((vendorGroup, index) => (
                        <OrderItemsList
                          key={index}
                          group={vendorGroup}
                          userRole={userRole}
                          allowCancellation={allowCancellation}
                          onCancelPart={cancelOrderPart}
                          onCancelItems={cancelOrderItems}
                          isOrderForwarded={orderDetails.forwardedToVendors}
                          isCancelling={cancellingParts.has(vendorGroup.id)}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary - Right Column */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${orderDetails.mainOrder?.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>$0.00</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>${orderDetails.mainOrder?.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <OrderActions
                orderDetails={orderDetails}
                userRole={userRole}
                allowCancellation={allowCancellation}
                onCancelOrder={cancelEntireOrder}
                onRefresh={refreshOrderDetails}
              />
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandardOrderDetailsModal;
