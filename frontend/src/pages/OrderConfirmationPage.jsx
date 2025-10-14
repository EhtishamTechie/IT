import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  XCircleIcon, 
  CheckCircleIcon, 
  TruckIcon, 
  CheckIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import OrderService from '../services/orderService';
import { getImageUrl } from '../config';

const OrderConfirmationPage = () => {
  const { orderNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  console.log('OrderConfirmationPage: orderNumber from params:', orderNumber);
  console.log('OrderConfirmationPage: location.state:', location.state);
  
  const [order, setOrder] = useState(location.state?.order || null);
  const [paymentResult, setPaymentResult] = useState(location.state?.paymentResult || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState(null);

  console.log('OrderConfirmationPage: initial order state:', order);
  console.log('OrderConfirmationPage: initial loading state:', loading);

  useEffect(() => {
    document.title = `Order Confirmation - ${orderNumber} | International Tijarat`;
    
    // Always fetch latest order data to ensure status is up-to-date
    if (orderNumber) {
      console.log('OrderConfirmationPage: Fetching latest order data for:', orderNumber);
      fetchOrderDetails();
    }
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    try {
      console.log('OrderConfirmationPage: Fetching order details for:', orderNumber);
      setLoading(true);
      setError(null);
      
      const response = await OrderService.getOrderById(orderNumber);
      console.log('OrderConfirmationPage: Raw backend response:', response);
      
      // Transform backend data to frontend format
      const orderData = transformBackendOrder(response);
      console.log('OrderConfirmationPage: Transformed order data:', orderData);
      setOrder(orderData);
    } catch (err) {
      console.error('OrderConfirmationPage: Error fetching order:', err);
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  };

  // Calculate shipping cost based on cart items
  const calculateShippingCost = (cartItems) => {
    if (!cartItems || cartItems.length === 0) return 0;
    
    // Get the maximum shipping cost from all items
    const shippingCosts = cartItems.map(item => {
      const shipping = item.shipping || item.productData?.shipping || 0;
      console.log(`Shipping for ${item.title}: ${shipping}`);
      return Number(shipping);
    }).filter(cost => !isNaN(cost) && cost > 0);
    
    console.log('All shipping costs:', shippingCosts);
    
    if (shippingCosts.length === 0) return 0;
    
    const maxShippingCost = Math.max(...shippingCosts);
    console.log('Maximum shipping cost:', maxShippingCost);
    
    // Check if order qualifies for free shipping (10,000 or more)
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log('Order subtotal:', subtotal);
    
    if (subtotal >= 10000) {
      console.log('Order qualifies for free shipping (subtotal >= 10000)');
      return 0;
    }
    
    return maxShippingCost;
  };

  // Transform backend order format to frontend format
  const transformBackendOrder = (backendOrder) => {
    // Handle both direct order and wrapped response
    const order = backendOrder.order || backendOrder;
    
    // Use stored shipping cost or calculate from cart items as fallback
    let shippingCost = 0;
    if (order.shippingCost !== undefined) {
      // Use stored shipping cost (for new orders)
      shippingCost = order.shippingCost;
      console.log('🚢 [ORDER CONFIRMATION] Using stored shipping cost:', shippingCost);
    } else {
      // Fallback: calculate shipping cost from cart items (for old orders)
      shippingCost = calculateShippingCost(order.cart);
      console.log('🚢 [ORDER CONFIRMATION] Calculated shipping cost from cart:', shippingCost);
    }
    
    const subtotal = order.cart ? order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
    
    return {
      orderNumber: order._id || order.orderNumber || orderNumber,
      status: order.status || 'placed',
      
      // Transform customer info
      customerInfo: {
        name: order.name,
        email: order.email,
        phone: order.phone
      },
      
      // Transform shipping info
      shippingInfo: {
        street: order.address,
        city: order.city,
        state: '', // Not stored in backend
        zipCode: '', // Not stored in backend
        country: 'Pakistan', // Default
        method: 'standard' // Default
      },
      
      // Transform payment info
      paymentInfo: {
        method: order.paymentMethod || 'COD'
      },
      
      // Transform cart items to items
      items: order.cart ? order.cart.map(item => ({
        name: item.title,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        productId: item.productId,
        shipping: item.shipping || item.productData?.shipping || 0
      })) : [],
      
      // Calculate totals with actual shipping
      totals: {
        subtotal: subtotal,
        shipping: shippingCost,
        tax: 0, // Default
        discount: 0, // Default
        total: subtotal + shippingCost
      },
      
      // Keep original data for reference
      _original: order
    };
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <XCircleIcon className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
          <Link
            to="/"
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircleIcon className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-xl text-gray-600 mb-4">Thank you for your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0">
                    <img
                      src={getImageUrl('products', item.image) || '/placeholder-product.jpg'}
                      alt={item.name || item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/no-image.png';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name || item.title}</h3>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                      {/* Vendor Information */}
                      {item.vendor && (
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500">Sold by:</span>
                          <span className="text-xs font-medium text-emerald-600 ml-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {typeof item.vendor === 'object' && item.vendor.businessName 
                              ? item.vendor.businessName 
                              : item.vendor.name || 'Verified Vendor'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        PKR {(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        PKR {item.price} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Delivery Address</h3>
                  <div className="text-gray-600">
                    <p>{order.customerInfo?.name || order.customer?.name}</p>
                    <p>{order.shippingInfo?.street || order.shippingAddress?.street}</p>
                    <p>
                      {order.shippingInfo?.city || order.shippingAddress?.city}, {order.shippingInfo?.state || order.shippingAddress?.state} {order.shippingInfo?.zipCode || order.shippingAddress?.zipCode}
                    </p>
                    <p>{order.shippingInfo?.country || order.shippingAddress?.country}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Shipping Method</h3>
                  <p className="text-gray-600 capitalize">
                    {(order.shippingInfo?.method || order.shipping?.method)?.replace('_', ' ') || 'Standard Shipping'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated delivery: {OrderService.estimateDeliveryDate(order.shippingInfo?.method || order.shipping?.method)}
                  </p>
                  <p className="text-sm font-medium text-orange-600 mt-2">
                    Shipping Cost: {order.totals?.shipping > 0 
                      ? `PKR ${order.totals.shipping.toFixed(2)}` 
                      : 'Free (Order ≥ PKR 10,000)'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Payment Method</h3>
                  <p className="text-gray-600 capitalize">
                    {(order.paymentInfo?.method || order.payment?.method)?.replace('_', ' ') || 'Credit Card'}
                  </p>
                  {paymentResult && (
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Payment Successful
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
                  <div className="text-gray-600">
                    <p>{order.customerInfo?.email || order.customer?.email}</p>
                    <p>{order.customerInfo?.phone || order.customer?.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>PKR {order.totals?.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>
                    {order.totals?.shipping > 0 
                      ? `PKR ${order.totals.shipping.toFixed(2)}` 
                      : 'Free'
                    }
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>PKR {order.totals?.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
              <div className="space-y-3">
                <button
                  onClick={handlePrint}
                  className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  🖨️ Print Receipt
                </button>
                
                <Link
                  to={`/order/${order.orderNumber || orderNumber}`}
                  className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                >
                  <TruckIcon className="w-5 h-5 mr-2" />
                  Track Order
                </Link>
                
                {isAuthenticated && (
                  <Link
                    to="/orders"
                    className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
                  >
                    📋 View Order History
                  </Link>
                )}
                
                <Link
                  to="/products"
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                  🛍️ Continue Shopping
                </Link>
                
                <Link
                  to="/"
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  🏠 Return to Homepage
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Support Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-800 mb-4">
            If you have any questions about your order, please don't hesitate to contact us.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/ContactUsPage"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              📧 Contact Support
            </Link>
            <a
              href="tel:+923005567507"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              📞 Call Us: +92 300 5567507
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
