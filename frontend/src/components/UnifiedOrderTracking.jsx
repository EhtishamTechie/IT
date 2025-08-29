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
  Store
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getUploadUrl } from '../config';

const UnifiedOrderTracking = ({ orderId, onClose, onOrderUpdate }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      console.log('🔍 Loading order details for:', orderId);
      console.log('🔍 Order ID type:', typeof orderId);
      
      // Use the customer split-details endpoint with authentication
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.get(`${getApiUrl()}/orders/${orderId}/split-details`, {
        headers
      });
      
      console.log('📡 API Response:', response.data);
      
      if (response.data.success) {
        const data = response.data.data;
        console.log('✅ Order data received:', data);
        console.log('📊 Main order status from API:', data.mainOrder?.status);
        
        // Transform the API response to match our component expectations
        const transformedData = {
          mainOrder: {
            _id: orderId,
            orderNumber: data.mainOrder.orderNumber || 'N/A',
            name: data.mainOrder.customerName || 'N/A',
            customerName: data.mainOrder.customerName || 'N/A',
            email: data.mainOrder.email || 'N/A',
            phone: data.mainOrder.phone || 'N/A',
            address: data.mainOrder.address || 'N/A',
            city: data.mainOrder.city || 'N/A',
            paymentMethod: data.mainOrder.paymentMethod || 'N/A',
            totalAmount: data.mainOrder.totalAmount || 0,
            status: data.mainOrder.status || 'placed', // Use the calculated status from backend
            orderType: data.mainOrder.orderType || 'mixed',
            createdAt: data.mainOrder.createdAt
          },
          
          // Handle both split and non-split orders
          items: data.isSplit 
            ? // For split orders: transform parts to items format
              (data.parts || []).reduce((allItems, part) => {
                const partItems = (part.items || []).map(item => ({
                  _id: item._id || `${part.orderNumber}-${item.productName}`,
                  title: item.productName,
                  image: item.image,
                  price: item.price,
                  quantity: item.quantity,
                  status: part.status || 'placed',
                  handledBy: part.type === 'admin' ? 'admin' : 'vendor',
                  vendor: part.type === 'vendor' ? { 
                    name: part.vendorName,
                    email: part.vendorContact?.email 
                  } : null,
                  trackingNumber: part.trackingNumber,
                  carrier: part.carrier,
                  statusHistory: item.statusHistory || [],
                  partType: part.type,
                  orderNumber: part.orderNumber
                }));
                return [...allItems, ...partItems];
              }, [])
            : // For non-split orders: use originalItems
              (data.originalItems || []).map(item => ({
                _id: item._id || `original-${item.productName}`,
                title: item.productName,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                status: data.mainOrder.status || 'placed',
                handledBy: 'admin',
                vendor: null,
                trackingNumber: null,
                carrier: null,
                statusHistory: [],
                partType: 'original',
                orderNumber: data.mainOrder.orderNumber
              })),
          
          // Organize by handler type
          adminItems: (data.parts || []).filter(part => part.type === 'admin')
            .reduce((items, part) => [...items, ...(part.items || [])], []),
          vendorItems: (data.parts || []).filter(part => part.type === 'vendor')
            .reduce((items, part) => [...items, ...(part.items || [])], []),
          
          // Summary information
          orderType: data.isSplit ? 'mixed' : 'admin_only',
          hasVendorItems: (data.parts || []).some(part => part.type === 'vendor'),
          hasAdminItems: (data.parts || []).some(part => part.type === 'admin'),
          isSplit: data.isSplit,
          parts: data.parts || [], // Keep the parts structure for detailed view
          
          // Legacy structure for compatibility
          adminOrder: null,
          vendorOrders: []
        };
        
        console.log('🔄 Transformed order data:', transformedData);
        console.log('🎯 Final main order status:', transformedData.mainOrder.status);
        setOrderDetails(transformedData);
        
        // Note: onOrderUpdate callback is only called when there are actual status changes
        // Not when just loading/displaying existing data to prevent infinite loops
      } else {
        setError(response.data.message || 'Failed to load order details');
      }
    } catch (error) {
      console.error('❌ Error loading order details:', error);
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
  }, [orderId]); // Removed onOrderUpdate from dependencies to prevent infinite loop

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'accepted': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing': return <Clock className="w-5 h-5 text-orange-600" />;
      case 'placed': return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-blue-600" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'placed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount) => {
    return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="flex items-center justify-center text-red-600 mb-4">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-center mb-2 text-gray-800">Error</h3>
          <p className="text-center text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return null;
  }

  const { mainOrder, items, adminItems, vendorItems, hasVendorItems, hasAdminItems } = orderDetails;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Order Details</h2>
            <p className="text-gray-600">#{mainOrder.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-8 h-8" />
          </button>
        </div>

        <div className="p-6">
          {/* Order Status and Basic Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                {getStatusIcon(mainOrder.status)}
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(mainOrder.status)}`}>
                    {mainOrder.status}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-medium">{formatDate(mainOrder.createdAt)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium text-lg">{formatCurrency(mainOrder.totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Customer Details
              </h3>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {mainOrder.name}</p>
                <p><span className="font-medium">Email:</span> {mainOrder.email}</p>
                <p><span className="font-medium">Phone:</span> {mainOrder.phone}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                Shipping Address
              </h3>
              <div className="space-y-2">
                <p>{mainOrder.address}</p>
                <p>{mainOrder.city}</p>
                <p><span className="font-medium">Payment Method:</span> {mainOrder.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-purple-600" />
              Order Items ({items.length})
            </h3>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item._id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    {item.image && (
                      <img 
                        src={item.image.startsWith('http') ? item.image : `${getUploadUrl()}/uploads/${item.image}`}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{item.title}</h4>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                          {item.vendor && (
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Store className="w-4 h-4 mr-1" />
                              Vendor: {item.vendor.name}
                            </p>
                          )}
                          {item.trackingNumber && (
                            <p className="text-sm text-blue-600 mt-1">
                              Tracking: {item.trackingNumber}
                              {item.carrier && ` (${item.carrier})`}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount</span>
              <span>{formatCurrency(mainOrder.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedOrderTracking;
