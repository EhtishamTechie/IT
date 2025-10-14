import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getApiUrl, getUploadUrl, getImageUrl } from '../config';
import { 
  ArrowLeftIcon, 
  XCircleIcon, 
  CheckCircleIcon, 
  TruckIcon, 
  ClockIcon,
  UserIcon,
  PhoneIcon, 
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  CalendarIcon,
  ShoppingCartIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useNotification } from '../components/Notification';
import StatusService from '../services/statusService';
import OrderService from '../services/orderService';

// Simple status definitions for 6-status system
const STATUS_INFO = {
  placed: {
    label: 'Order Placed',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: ShoppingCartIcon,
    description: 'Order has been placed and is awaiting processing'
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: ClockIcon,
    description: 'Order is being prepared'
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: TruckIcon,
    description: 'Order is on the way'
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircleIcon,
    description: 'Order has been delivered successfully'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircleIcon,
    description: 'Order has been cancelled'
  },
  cancelled_by_customer: {
    label: 'Cancelled by Customer',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    icon: XCircleIcon,
    description: 'Order was cancelled by customer (commission reversed)'
  }
};

const SimpleOrderDetailPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { vendor, loading: vendorLoading } = useVendorAuth();
  const currentUser = user || vendor;
  // Helper to get back path for navigation
  const getBackPath = useCallback(() => {
    // Check for source parameter in URL first (most reliable)
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    if (source) {
      switch (source) {
        case 'admin-vendor-orders':
          return '/admin/multi-vendor-orders';
        case 'admin-orders':
          return '/admin/orders';
        case 'vendor-orders':
          return '/vendor/orders';
        default:
          break;
      }
    }
    // Check localStorage for navigation source
    const navSource = localStorage.getItem('orderDetailSource');
    if (navSource) {
      return navSource;
    }
    // Try referrer information with authentication validation
    const referrer = document.referrer;
    const _currentUser = user || vendor;
    if (referrer) {
      if (referrer.includes('/admin/multi-vendor-orders') && ((_currentUser?.role?.includes('admin')) || localStorage.getItem('adminToken'))) {
        return '/admin/multi-vendor-orders';
      }
      if (referrer.includes('/admin/orders') && ((_currentUser?.role?.includes('admin')) || localStorage.getItem('adminToken'))) {
        return '/admin/orders';
      }
      if (referrer.includes('/admin/') && ((_currentUser?.role?.includes('admin')) || localStorage.getItem('adminToken'))) {
        return '/admin/orders';
      }
      if (referrer.includes('/vendor/orders') && (vendor || (_currentUser?.role === 'vendor' && localStorage.getItem('vendorToken')))) {
        return '/vendor/orders';
      }
      if (referrer.includes('/vendor/') && (vendor || (_currentUser?.role === 'vendor' && localStorage.getItem('vendorToken')))) {
        return '/vendor/orders';
      }
      if (referrer.includes('/orders')) {
        return '/orders';
      }
    }
    // Fallback to role-based detection
    if ((_currentUser?.role?.includes('admin')) || localStorage.getItem('adminToken')) {
      return '/admin/orders';
    }
    if (vendor || (_currentUser?.role === 'vendor' && localStorage.getItem('vendorToken'))) {
      return '/vendor/orders';
    }
    return '/orders';
  }, [user, vendor]);
  // Helper to get back label for navigation
  const getBackLabel = useCallback(() => {
    const backPath = getBackPath && getBackPath();
    if (!backPath) return 'Order History';
    if (backPath.includes('/admin/multi-vendor-orders')) {
      return 'Vendor Orders (Admin)';
    }
    if (backPath.includes('/admin/orders')) {
      return 'My Orders (Admin)';
    }
    if (backPath.includes('/vendor/orders')) {
      return 'My Orders (Vendor)';
    }
    return 'Order History';
  }, [getBackPath]);
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, NotificationComponent } = useNotification();
  
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [testResult, setTestResult] = useState('');

  // Check if any authentication is available (regular user, admin, or vendor)
  const hasVendorToken = !!localStorage.getItem('vendorToken');
  const hasAdminToken = !!localStorage.getItem('adminToken');
  const hasRegularToken = !!localStorage.getItem('token');
  
  const isAnyUserAuthenticated = isAuthenticated || vendor || hasVendorToken || hasAdminToken || hasRegularToken;

  // Shipping calculation functions
  const calculateOrderShipping = (order) => {
    if (!order || (!order.cart && !order.items)) {
      console.log('🚢 [SHIPPING DEBUG] No order or cart data available');
      return 0;
    }
    
    const cartItems = order.cart || order.items || [];
    
    console.log('🚢 [SHIPPING DEBUG] Order data:', {
      orderId: order._id,
      cart: cartItems?.length || 0,
      totalAmount: order.totalAmount,
      shippingCost: order.shippingCost,
      endpoint: order._endpoint || 'unknown',
      cartItems: cartItems?.map(item => ({
        title: item.title,
        shipping: item.shipping,
        productData: item.productData
      }))
    });
    
    // Use stored shipping cost first (for new orders)
    if (order.shippingCost !== undefined && order.shippingCost !== null) {
      console.log('🚢 [SHIPPING DEBUG] Using stored shippingCost:', order.shippingCost);
      return order.shippingCost;
    }
    
    // Fallback: Try to get shipping from cart items (for old orders)
    if (cartItems.length > 0) {
      const shippingCosts = cartItems.map(item => {
        const shipping = item.shipping || item.productData?.shipping || 0;
        return Number(shipping);
      }).filter(cost => !isNaN(cost) && cost > 0);
      
      console.log('🚢 [SHIPPING DEBUG] Cart shipping costs:', shippingCosts);
      
      if (shippingCosts.length > 0) {
        const maxShippingCost = Math.max(...shippingCosts);
        
        // Check if order qualifies for free shipping (10,000 or more)
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (subtotal >= 10000) {
          console.log('🚢 [SHIPPING DEBUG] Free shipping - subtotal >= 10000');
          return 0; // Free shipping for orders >= 10,000
        }
        
        console.log('🚢 [SHIPPING DEBUG] Using cart max shipping:', maxShippingCost);
        return maxShippingCost;
      }
    }
    
    // Last fallback: Calculate from totalAmount vs cart total (for very old orders)
    if (cartItems.length > 0) {
      const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const storedTotal = order.totalAmount || 0;
      const impliedShipping = storedTotal - cartTotal;
      
      if (impliedShipping > 0 && impliedShipping < 1000) { // Reasonable shipping cost
        console.log('🚢 [SHIPPING DEBUG] Implied shipping from total difference:', impliedShipping);
        return impliedShipping;
      }
    }
    
    console.log('🚢 [SHIPPING DEBUG] No shipping cost found, returning 0');
    return 0;
  };

  // Calculate order subtotal (without shipping)
  const calculateOrderSubtotal = (order) => {
    if (!order) return 0;
    
    const cartItems = order.cart || order.items || [];
    
    if (cartItems.length === 0) {
      // If no cart, use totalAmount as fallback (assuming it includes shipping)
      return order.totalAmount || 0;
    }
    
    const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log('🧮 [SUBTOTAL DEBUG] Cart subtotal:', cartSubtotal, 'vs stored total:', order.totalAmount);
    
    // Use cart calculation for consistency
    return cartSubtotal;
  };

  // Debug authentication state
  useEffect(() => {
    console.log('🔐 Authentication Debug:', {
      isAuthenticated,
      vendor: vendor ? 'Present' : 'None',
      vendorLoading,
      hasVendorToken,
      hasAdminToken,
      hasRegularToken,
      isAnyUserAuthenticated,
      currentUser: currentUser ? 'Present' : 'None'
    });
  }, [isAuthenticated, vendor, vendorLoading, hasVendorToken, hasAdminToken, hasRegularToken, isAnyUserAuthenticated, currentUser]);

  // ...existing code...

  // Place the main return at the end of the component
  // ...existing code...

  const handleBackNavigation = () => {
    const backPath = getBackPath();
    const referrer = document.referrer;
    const navSource = localStorage.getItem('orderDetailSource');
    
    console.log('🔙 Smart navigation debug:');
    console.log('   📍 Referrer:', referrer);
    console.log('   📦 Nav source (localStorage):', navSource);
    console.log('   👤 User role:', user?.role);
    console.log('   � Admin token:', localStorage.getItem('adminToken') ? 'present' : 'none');
    console.log('   🔑 Vendor token:', localStorage.getItem('vendorToken') ? 'present' : 'none');
    console.log('   🎯 Chosen path:', backPath);
    console.log('   🏷️ Back label:', getBackLabel());
    
    // Clean up localStorage after getting the path
    if (navSource) {
      localStorage.removeItem('orderDetailSource');
      console.log('🧹 Cleaned up localStorage navigation source');
    }
    
    navigate(backPath);
  };

  // Simple order loading - no complex calculations
  const loadOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading simple order details for:', orderId);
      const _currentUser = user || vendor;
      console.log('👤 User context:', { 
        role: _currentUser?.role, 
        isVendor: !!vendor,
        isAdmin: !!_currentUser?.role?.includes('admin'),
        vendorToken: !!localStorage.getItem('vendorToken'), 
        adminToken: !!localStorage.getItem('adminToken'),
        regularToken: !!localStorage.getItem('token')
      });
      
      let apiUrl;
      let authToken;
      
      // Determine the correct endpoint and token based on user context
      // Priority: current user context > localStorage tokens
      if (_currentUser?.role === 'admin' || localStorage.getItem('adminToken')) {
        // Admin context - use admin split-details endpoint
        apiUrl = getApiUrl(`/orders/${orderId}/split-details`);
        authToken = localStorage.getItem('adminToken') || localStorage.getItem('token');
        console.log('👑 Using admin endpoint:', apiUrl);
      } else if (vendor || _currentUser?.role === 'vendor' || localStorage.getItem('vendorToken')) {
        // Vendor context - use vendor endpoint
        apiUrl = `${getApiUrl()}/vendors/orders/${orderId}`;
        authToken = localStorage.getItem('vendorToken') || localStorage.getItem('token');
        console.log('🏪 Using vendor endpoint:', apiUrl);
      } else {
        // Customer context - use customer split-details endpoint
        apiUrl = `${getApiUrl()}/orders/${orderId}/split-details`;
        authToken = localStorage.getItem('token');
        console.log('👤 Using customer endpoint:', apiUrl);
      }
      
      console.log('🚀 Making API request to:', apiUrl);
      console.log('🔑 Using auth token:', authToken ? 'Present' : 'Missing');
      console.log('🔑 Token preview:', authToken ? authToken.substring(0, 20) + '...' : 'None');
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        // Log the error response
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
        
        // If primary endpoint fails, try fallback based on context
        console.log('⚠️ Primary endpoint failed, trying fallback');
        
        let fallbackUrl;
        if (user?.role === 'vendor' || localStorage.getItem('vendorToken')) {
          // For vendors, no good fallback - vendor orders are specific
          throw new Error('Vendor order not found or access denied');
        } else {
          // For admin/customer, try regular details endpoint
          fallbackUrl = `${getApiUrl()}/orders/${orderId}/details`;
        }
        
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (!fallbackResponse.ok) {
          throw new Error('Failed to load order');
        }
        
        const result = await fallbackResponse.json();
        console.log('📡 Fallback order response:', result);
        
        // Process the fallback result
        if (result.success) {
          processOrderData(result, fallbackUrl);
          return;
        } else {
          throw new Error('Failed to load order from fallback endpoint');
        }
      }
      
      const result = await response.json();
      console.log('📡 Order response:', result);
      console.log('💳 Payment receipt in response:', result.data?.paymentReceipt);
      
      // Process the successful result
      processOrderData(result, apiUrl);
      
    } catch (error) {
      console.error('❌ Load order error:', error);
      setError(error.message);
      setLoading(false);
    }
  }, [orderId, currentUser?.role, vendor]);

  const processOrderData = (result, endpoint = 'unknown') => {
    try {
      console.log('🔄 Processing order data from endpoint:', endpoint);
      console.log('🔄 Processing order data:', result);
      
      if (result.success) {
        // Handle split-details response format
        const responseData = result.data;
        
        console.log('📊 Response data:', responseData);
        console.log('📊 Response data keys:', Object.keys(responseData || {}));
        
        // Check if this is a vendor order response
        if (responseData.vendorItems && responseData.vendorId) {
          // Vendor order format (legacy or new vendor_order)
          console.log('🏪 Vendor order format detected:', responseData.orderType);
          console.log('🏪 Vendor items:', responseData.vendorItems);
          console.log('🏪 Customer data:', responseData.customer);
          
          const transformedOrderData = {
            ...responseData,
            _endpoint: endpoint, // Add endpoint marker
            // Map vendorItems to items and cart for consistency
            items: responseData.vendorItems?.map(item => ({
              title: item.productName || item.title || item.name,
              name: item.productName || item.title || item.name,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              itemTotal: item.price * item.quantity,
              status: responseData.status || 'placed',
              assignedVendor: item.vendor ? {
                name: item.vendor.businessName || item.vendor.name
              } : null
            })) || [],
            cart: responseData.vendorItems || [],
            orderType: responseData.orderType || 'legacy_order',
            isSplit: false,
            parts: [],
            customer: responseData.customer || {
              name: responseData.customerName || responseData.name,
              email: responseData.email,
              phone: responseData.phone,
              address: responseData.address,
              city: responseData.city
            }
          };
          
          console.log('🔄 Transformed vendor order data:', transformedOrderData);
          console.log('🔄 Items array:', transformedOrderData.items);
          console.log('🔄 Customer info:', transformedOrderData.customer);
          setOrderDetails(transformedOrderData);
          
        } else if (responseData.mainOrder && responseData.hasOwnProperty('isSplit')) {
          // New split-details format
          const { mainOrder, parts, isSplit, originalItems } = responseData;
          
          console.log('📊 Split-details format detected:', {
            mainOrder: mainOrder?.orderNumber,
            status: mainOrder?.status,
            isSplit,
            partsCount: parts?.length || 0,
            itemsCount: originalItems?.length || 0
          });
          
          // Transform to expected format for SimpleOrderDetailPage
          const transformedOrderData = {
            ...mainOrder,
            _endpoint: endpoint, // Add endpoint marker
            // Use items from originalItems if available, otherwise from mainOrder
            items: originalItems?.map(item => ({
              title: item.productName,
              name: item.productName,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              itemTotal: item.subtotal,
              status: item.status || mainOrder?.status || 'placed',
              assignedVendor: item.vendor ? {
                name: item.vendor.businessName || item.vendor.name
              } : null
            })) || mainOrder?.cart || [],
            cart: originalItems?.map(item => ({
              title: item.productName,
              name: item.productName,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              shipping: item.shipping || 0 // Include shipping from items
            })) || mainOrder?.cart || [],
            orderType: isSplit ? 'mixed' : (mainOrder?.orderType || 'admin_only'),
            isSplit: isSplit,
            parts: parts || [],
            customer: {
              name: mainOrder?.customerName,
              email: mainOrder?.email,
              phone: mainOrder?.phone,
              address: mainOrder?.address,
              city: mainOrder?.city
            }
          };
          
          console.log('🔄 Transformed order data:', transformedOrderData);
          setOrderDetails(transformedOrderData);
        } else {
          // Old format - direct order data
          console.log('📡 Direct order format detected:', responseData);
          setOrderDetails({
            ...responseData,
            _endpoint: endpoint // Add endpoint marker
          });
        }
      } else {
        setError(result.message || 'Failed to load order details');
      }
    } catch (error) {
      console.error('❌ Error processing order data:', error);
      setError('Failed to process order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && (isAnyUserAuthenticated || hasVendorToken || hasAdminToken || hasRegularToken)) {
      loadOrderDetails();
    }
  }, [orderId, isAnyUserAuthenticated, hasVendorToken, hasAdminToken, hasRegularToken, loadOrderDetails]);

  // Simple customer cancellation using new API
  const handleCancelOrder = async () => {
    if (!orderDetails || cancelling) return;
    
    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled', 'cancelled_by_customer'].includes(orderDetails.status)) {
      showError('This order cannot be cancelled');
      return;
    }

    setCancelling(true);
    try {
      console.log('🚫 Cancelling order via new API:', orderId);
      
      const response = await fetch(`${getApiUrl()}/status/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason: 'Customer requested cancellation'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(result.message || 'Order cancelled successfully!');
        await loadOrderDetails(); // Refresh to show new status
      } else {
        showError(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      showError('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Cancel individual vendor part/sub-order
  const handleCancelVendorPart = async (part) => {
    if (!orderDetails || !part || cancelling) return;
    
    // Check if part can be cancelled
    if (['delivered', 'cancelled', 'cancelled_by_customer'].includes(part.status)) {
      showError('This part cannot be cancelled');
      return;
    }

    if (!window.confirm(`Are you sure you want to cancel the ${part.type === 'admin' ? 'admin' : part.vendorName} part of this order?`)) {
      return;
    }

    setCancelling(true);
    try {
      console.log('🚫 Cancelling vendor part:', {
        orderId,
        partType: part.type,
        vendorName: part.vendorName,
        vendorId: part.vendorId,
        vendorOrderId: part.vendorOrderId,
        adminOrderId: part.adminOrderId,
        partStatus: part.status,
        commissionWillReverse: part.type !== 'admin' && part.status !== 'placed'
      });
      
      let response;
      
      if (part.type === 'admin') {
        // Cancel admin part - no commission reversal
        if (!part.adminOrderId && !part.id) {
          showError('Admin order ID not found');
          return;
        }
        
        const adminOrderId = part.adminOrderId || part.id;
        response = await fetch(`${getApiUrl()}/orders/user/cancel-admin-part/${adminOrderId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            reason: 'Customer requested part cancellation'
          })
        });
      } else {
        // Cancel vendor part - commission reversal will happen in backend if status != 'placed'
        if (!part.vendorOrderId && !part.id) {
          showError('Vendor order ID not found');
          return;
        }
        
        const vendorOrderId = part.vendorOrderId || part.id;
        response = await fetch(`${getApiUrl()}/orders/user/cancel-vendor-part/${vendorOrderId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            reason: 'Customer requested part cancellation'
          })
        });
      }

      const result = await response.json();
      
      if (result.success) {
        const statusMessage = part.type === 'admin' 
          ? `Admin part cancelled successfully!`
          : `${part.vendorName} part cancelled successfully!${part.status !== 'placed' ? ' Commission has been reversed.' : ''}`;
        showSuccess(statusMessage);
        await loadOrderDetails(); // Refresh to show new status
      } else {
        showError(result.message || 'Failed to cancel part');
      }
    } catch (error) {
      console.error('❌ Error cancelling vendor part:', error);
      showError('Failed to cancel part');
    } finally {
      setCancelling(false);
    }
  };

  const testStatusEndpoints = async () => {
    try {
      setTestResult('🧪 Testing endpoints...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setTestResult('❌ No auth token found');
        return;
      }

      console.log('🔍 Testing API endpoints for order:', orderId);
      let results = '🧪 ENDPOINT TESTING RESULTS:\n\n';
      
      // Test the old endpoint
      try {
        const oldResponse = await fetch(`${getApiUrl()}/orders/${orderId}/details`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const oldData = await oldResponse.json();
        console.log('🔵 OLD ENDPOINT FULL RESPONSE:', oldData);
        console.log('🔵 OLD ENDPOINT ORDER DATA:', oldData.data);
        console.log('🔵 OLD ENDPOINT ITEMS:', oldData.data?.items || oldData.data?.cart);
        
        if (oldResponse.ok && oldData.success) {
          results += '✅ OLD ENDPOINT (/api/orders/ID/details):\n';
          results += `   Status: ${oldData.data?.status || 'No status'}\n`;
          results += `   Order Type: ${oldData.data?.orderType || 'Unknown'}\n`;
          results += `   Items Count: ${oldData.data?.items?.length || oldData.data?.cart?.length || 0}\n`;
          
          // Show individual item statuses
          const items = oldData.data?.items || oldData.data?.cart || [];
          if (items.length > 0) {
            results += `   Item Statuses: `;
            const itemStatuses = items.map(item => item.status || 'unknown');
            results += `[${itemStatuses.join(', ')}]\n`;
          }
          results += '\n';
        } else {
          results += '❌ OLD ENDPOINT FAILED:\n';
          results += `   Error: ${oldData.message || 'Unknown error'}\n\n`;
        }
      } catch (oldError) {
        console.log('Old endpoint error:', oldError);
        results += '❌ OLD ENDPOINT ERROR:\n';
        results += `   ${oldError.message}\n\n`;
      }

      // Test the new endpoint - FORCE REFRESH THE BACKEND LOGS
      console.log('🟢 TESTING NEW ENDPOINT - CHECK BACKEND CONSOLE FOR VENDOR SEARCH LOGS');
      try {
        const newResponse = await fetch(`${getApiUrl()}/orders/${orderId}/split-details?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const newData = await newResponse.json();
        console.log('🟢 NEW ENDPOINT FULL RESPONSE:', newData);
        console.log('🟢 NEW ENDPOINT ORDER DATA:', newData.data);
        console.log('🟢 NEW ENDPOINT MAIN ORDER:', newData.data?.mainOrder);
        console.log('🟢 NEW ENDPOINT PARTS:', newData.data?.parts);
        console.log('🟢 NEW ENDPOINT ORIGINAL ITEMS:', newData.data?.originalItems);
        
        if (newResponse.ok && newData.success) {
          results += '✅ NEW ENDPOINT (/api/orders/ID/split-details):\n';
          results += `   Main Order Status: ${newData.data?.mainOrder?.status || 'No mainOrder status'}\n`;
          results += `   Direct Status: ${newData.data?.status || 'No direct status'}\n`;
          results += `   Is Split: ${newData.data?.isSplit}\n`;
          results += `   Parts Count: ${newData.data?.parts?.length || 0}\n`;
          results += `   Original Items Count: ${newData.data?.originalItems?.length || 0}\n`;
          
          // Show parts statuses if available
          if (newData.data?.parts && newData.data.parts.length > 0) {
            results += `   Parts Statuses: `;
            const partStatuses = newData.data.parts.map(part => part.status || 'unknown');
            results += `[${partStatuses.join(', ')}]\n`;
            
            // Show detailed part info
            newData.data.parts.forEach((part, index) => {
              results += `   Part ${index + 1}: ${part.type || 'unknown'} - ${part.status || 'unknown'}\n`;
            });
          }
          
          // Show original items statuses if available
          if (newData.data?.originalItems && newData.data.originalItems.length > 0) {
            results += `   Original Item Statuses: `;
            const itemStatuses = newData.data.originalItems.map(item => item.status || 'unknown');
            results += `[${itemStatuses.join(', ')}]\n`;
          }
          results += '\n';
        } else {
          results += '❌ NEW ENDPOINT FAILED:\n';
          results += `   Error: ${newData.message || 'Unknown error'}\n\n`;
        }
      } catch (newError) {
        console.log('New endpoint error:', newError);
        results += '❌ NEW ENDPOINT ERROR:\n';
        results += `   ${newError.message}\n\n`;
      }

      results += '📝 CHECK CONSOLE FOR DETAILED JSON RESPONSES\n';
      results += '🔍 ANALYSIS: Check if item/part statuses differ from main order status\n';
      results += '⚠️ CHECK BACKEND CONSOLE FOR VENDOR SEARCH DEBUG LOGS';
      setTestResult(results);

    } catch (error) {
      console.error('Test failed:', error);
      setTestResult('❌ Test failed: ' + error.message);
    }
  };

  // Show loading while checking vendor authentication
  if (vendorLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Only redirect to login if no authentication tokens exist at all
  if (!isAnyUserAuthenticated && !hasVendorToken && !hasAdminToken && !hasRegularToken) {
    console.log('❌ No authentication found, redirecting to login');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please log in to view order details</h2>
          <Link to="/login" className="text-blue-600 hover:text-blue-500 mt-2 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Error Loading Order</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={loadOrderDetails}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Order Not Found</h2>
          <button 
            onClick={handleBackNavigation}
            className="mt-4 text-blue-600 hover:text-blue-500 inline-block"
          >
            Back to {getBackLabel()}
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = orderDetails.status || 'placed';
  const statusInfo = STATUS_INFO[currentStatus] || STATUS_INFO.placed;
  const StatusIcon = statusInfo.icon;

  const canCancel = !['shipped', 'delivered', 'cancelled', 'cancelled_by_customer'].includes(currentStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationComponent />
      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={handleBackNavigation}
                className="mr-4 p-2 rounded-md text-white bg-orange-500 hover:bg-orange-600"
                title={`Back to ${getBackLabel()}`}
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-blue-900">Order Details</h1>
                <p className="text-sm text-blue-700">Order #{orderDetails.orderNumber}</p>
              </div>
            </div>
            {/* Simple Refresh Button */}
            <button
              onClick={loadOrderDetails}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-orange-600 rounded-md hover:bg-orange-600"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Order Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Card - NO BLINKING */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <StatusIcon className="h-8 w-8 text-gray-400 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Order Status</h3>
                    <p className="text-sm text-gray-500">{statusInfo.description}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              
              {/* Item Status Summary - Only show for non-mixed orders */}
              {(orderDetails.items || orderDetails.cart) && 
               (orderDetails.items || orderDetails.cart).length > 1 && 
               orderDetails.orderType !== 'mixed' && 
               !orderDetails.isSplit && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Item Status Breakdown:</h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const items = orderDetails.items || orderDetails.cart;
                      const statusCounts = items.reduce((acc, item) => {
                        const status = item.status || 'placed';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                      }, {});
                      
                      return Object.entries(statusCounts).map(([status, count]) => {
                        const statusInfo = STATUS_INFO[status] || STATUS_INFO.placed;
                        return (
                          <span key={status} className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${statusInfo.color}`}>
                            {count} {statusInfo.label}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              
              {/* Mixed Order Info - Show unified status explanation for mixed orders */}
              {(orderDetails.orderType === 'mixed' || orderDetails.isSplit) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Mixed Order</h4>
                    <p className="text-xs text-blue-700">
                      This order contains items from multiple sources. The status shown above represents the overall progress of your entire order.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Test Results Display */}
            {testResult && (
              <div className="bg-gray-50 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🧪 Endpoint Test Results</h3>
                <pre className="text-xs text-gray-700 bg-white p-4 rounded border overflow-auto max-h-96 whitespace-pre-wrap">
                  {testResult}
                </pre>
                <button
                  onClick={() => setTestResult('')}
                  className="mt-3 text-sm text-red-600 hover:text-red-800"
                >
                  Clear Results
                </button>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
              
              {console.log('🔍 RENDERING ORDER - orderDetails:', orderDetails)}
              {console.log('🔍 RENDERING ORDER - isSplit:', orderDetails?.isSplit)}
              {console.log('🔍 RENDERING ORDER - parts:', orderDetails?.parts)}
              
              {/* Check if this is a mixed order with vendor parts */}
              {orderDetails?.isSplit && orderDetails?.parts && orderDetails.parts.length > 0 ? (
                /* Display as vendor groups/sub-orders with cancellation */
                <div className="space-y-6">
                  {orderDetails.parts.map((part, partIndex) => {
                    const partStatus = part.status || 'placed';
                    const partStatusInfo = STATUS_INFO[partStatus] || STATUS_INFO.placed;
                    const PartStatusIcon = partStatusInfo.icon;
                    const canCancelPart = ['placed', 'processing'].includes(partStatus) && 
                                      !['cancelled', 'cancelled_by_customer'].includes(partStatus);
                    
                    // Debug logging
                    console.log('🔍 PART DEBUG:', {
                      partIndex,
                      vendorName: part.vendorName,
                      actualStatus: part.status,
                      partStatus,
                      canCancelPart,
                      type: part.type
                    });
                    
                    return (
                      <div key={partIndex} className="border border-gray-200 rounded-lg p-4">
                        {/* Vendor Part Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${part.type === 'admin' ? 'bg-blue-100' : 'bg-green-100'}`}>
                              {part.type === 'admin' ? (
                                <div className="w-5 h-5 bg-blue-600 rounded"></div>
                              ) : (
                                <div className="w-5 h-5 bg-green-600 rounded"></div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {part.type === 'admin' ? 'Admin Items' : `${part.vendorName || 'Vendor Items'}`}
                              </h4>
                              <div className="flex items-center mt-1">
                                <PartStatusIcon className="h-4 w-4 text-gray-400 mr-2" />
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${partStatusInfo.color}`}>
                                  {partStatusInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Sub-order Cancel Button */}
                          {canCancelPart && (
                            <button
                              onClick={() => handleCancelVendorPart(part)}
                              disabled={cancelling}
                              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {cancelling ? 'Cancelling...' : 'Cancel This Part'}
                            </button>
                          )}
                        </div>
                        
                        {/* Items in this vendor part */}
                        <div className="space-y-3 pl-6 border-l-2 border-gray-100">
                          {(part.items || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                              <div className="flex-shrink-0">
                                {item.image && (
                                  <img 
                                    src={getImageUrl('products', item.image) || '/placeholder-product.jpg'}
                                    alt={item.productName || item.title || item.name}
                                    className="h-12 w-12 object-cover rounded"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/placeholder-product.jpg';
                                    }}
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-900">
                                  {item.productName || item.title || item.name}
                                </h5>
                                <p className="text-sm text-gray-500">
                                  Quantity: {item.quantity} × PKR {item.price}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  PKR {(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Display as individual items for non-split orders */
                <div className="space-y-4">
                  {(orderDetails.items || orderDetails.cart)?.map((item, index) => {
                    const itemStatus = item.status || 'placed';
                    const itemStatusInfo = STATUS_INFO[itemStatus] || STATUS_INFO.placed;
                    const ItemStatusIcon = itemStatusInfo.icon;
                    
                    return (
                      <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <div className="flex-shrink-0">
                          {item.image && (
                            <img 
                              src={getImageUrl('products', item.image) || '/placeholder-product.jpg'}
                              alt={item.title || item.name}
                              className="h-16 w-16 object-cover rounded"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder-product.jpg';
                              }}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{item.title || item.name}</h4>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                          <p className="text-sm font-medium text-gray-900">PKR {item.price} each</p>
                          
                          {/* Individual Item Status */}
                          <div className="flex items-center mt-2">
                            <ItemStatusIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${itemStatusInfo.color}`}>
                              {itemStatusInfo.label}
                            </span>
                            {(item.assignedVendor || item.vendor) && (
                              <span className="ml-2 text-xs text-gray-500">
                                by {item.assignedVendor?.name || item.vendor?.businessName || item.vendor?.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-sm font-medium text-gray-900">
                            PKR {(item.itemTotal || (item.price * item.quantity)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {!(orderDetails.items || orderDetails.cart) || (orderDetails.items || orderDetails.cart).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No items found in this order.</p>
                    </div>
                  ) : null}
                </div>
              )}
              
              {/* Order Total */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="space-y-2">
                  {(() => {
                    if (!orderDetails) return null;
                    
                    const cartItems = orderDetails.cart || orderDetails.items || [];
                    const cartSubtotal = cartItems.length > 0 ? 
                      cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
                    const calculatedShipping = calculateOrderShipping(orderDetails);
                    const storedTotal = orderDetails.totalAmount || 0;
                    
                    console.log('💰 [TOTAL DEBUG]', {
                      cartSubtotal,
                      calculatedShipping,
                      storedTotal,
                      hasShippingCost: orderDetails.shippingCost !== undefined,
                      shippingCostValue: orderDetails.shippingCost,
                      cartItemsCount: cartItems.length,
                      endpoint: orderDetails._endpoint || 'unknown'
                    });
                    
                    // Always show breakdown if we have cart/items data
                    if (cartItems.length > 0) {
                      return (
                        <>
                          <div className="flex items-center justify-between text-gray-700">
                            <span>Subtotal</span>
                            <span>PKR {cartSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-gray-700">
                            <span>Shipping</span>
                            <span>
                              {calculatedShipping > 0 
                                ? `PKR ${calculatedShipping.toFixed(2)}`
                                : 'Free'
                              }
                            </span>
                          </div>
                          <div className="border-t border-gray-200 pt-2">
                            <div className="flex items-center justify-between text-lg font-medium text-gray-900">
                              <span>Total Amount</span>
                              <span>PKR {(cartSubtotal + calculatedShipping).toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      );
                    } else {
                      // No cart data - just show total
                      return (
                        <div className="flex items-center justify-between text-lg font-medium text-gray-900">
                          <span>Total Amount</span>
                          <span>PKR {storedTotal.toFixed(2)}</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Customer Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                {/* Different actions based on order type */}
                {orderDetails?.isSplit && orderDetails?.parts && orderDetails.parts.length > 0 ? (
                  /* Mixed order with vendor parts */
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                      <p className="font-medium mb-1">Mixed Order</p>
                      <p>This order contains items from multiple vendors. You can cancel individual vendor parts using the "Cancel This Part" buttons above, or cancel the entire order below (only if all parts are still 'placed').</p>
                    </div>
                    
                    {/* Full Order Cancellation - Only show if ALL parts are 'placed' */}
                    {(() => {
                      const allPartsPlaced = orderDetails.parts.every(part => part.status === 'placed');
                      return allPartsPlaced && canCancel ? (
                        <button
                          onClick={handleCancelOrder}
                          disabled={cancelling}
                          className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel Entire Order'}
                        </button>
                      ) : null;
                    })()}
                    
                    {!orderDetails.parts.every(part => part.status === 'placed') && (
                      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium mb-1">Cannot Cancel Entire Order</p>
                        <p>Some parts of this order have already been processed. You can only cancel individual parts that are still cancellable.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Single vendor order */
                  <div>
                    {/* Order Cancellation */}
                    {canCancel && (
                      <button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                )}
                
                {/* No Cancellation Available */}
                {!canCancel && (
                  <p className="text-sm text-gray-500 text-center">
                    This order cannot be cancelled
                  </p>
                )}
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order Date</p>
                    <p className="text-sm text-gray-500">
                      {new Date(orderDetails.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Customer</p>
                    <p className="text-sm text-gray-500">{orderDetails.customer?.name || orderDetails.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-500">{orderDetails.customer?.email || orderDetails.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-500">{orderDetails.customer?.phone || orderDetails.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-500">
                      {orderDetails.customer?.address || orderDetails.address}
                      {(orderDetails.customer?.city || orderDetails.city) && `, ${orderDetails.customer?.city || orderDetails.city}`}
                      {(orderDetails.customer?.postalCode || orderDetails.postalCode) && ` ${orderDetails.customer?.postalCode || orderDetails.postalCode}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Proof Section */}
            {console.log('💳 PaymentReceipt check:', orderDetails?.paymentReceipt || orderDetails?.mainOrder?.paymentReceipt)}
            {(orderDetails.paymentReceipt || orderDetails?.mainOrder?.paymentReceipt) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Proof</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">Payment Receipt</p>
                      <div className="relative">
                        <img 
                          src={getImageUrl('payment-receipts', orderDetails.paymentReceipt || orderDetails?.mainOrder?.paymentReceipt)} 
                          alt="Payment Receipt"
                          className="max-w-full h-auto max-h-96 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => window.open(getImageUrl('payment-receipts', orderDetails.paymentReceipt || orderDetails?.mainOrder?.paymentReceipt), '_blank')}
                        />
                        <div className="mt-2">
                          <button
                            onClick={() => window.open(getImageUrl('payment-receipts', orderDetails.paymentReceipt || orderDetails?.mainOrder?.paymentReceipt), '_blank')}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            View Full Size
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status History */}
            {orderDetails.statusHistory && orderDetails.statusHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status History</h3>
                <div className="space-y-3">
                  {orderDetails.statusHistory.map((entry, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {STATUS_INFO[entry.status]?.label || entry.status}
                        </p>
                        <p className="text-sm text-gray-500">{entry.reason}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleOrderDetailPage;
