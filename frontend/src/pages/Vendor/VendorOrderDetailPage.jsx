import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { vendorService } from '../../services/vendorService';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

const VendorOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { vendor } = useVendorAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: '',
    trackingNumber: ''
  });

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getVendorOrder(orderId);
      
      if (response.data.success) {
        setOrder(response.data.order);
        setStatusUpdate(prev => ({
          ...prev,
          status: response.data.order.status
        }));
      } else {
        setError('Failed to load order details');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      setError('Error loading order details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdating(true);
      const response = await vendorService.updateOrderStatus(orderId, statusUpdate);
      
      if (response.data.success) {
        setOrder(response.data.order);
        setStatusUpdate(prev => ({ ...prev, notes: '', trackingNumber: '' }));
        // Show success message
      } else {
        setError(response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Confirmed': 'bg-blue-100 text-blue-800 border-blue-200',
      'Shipped': 'bg-purple-100 text-purple-800 border-purple-200',
      'Delivered': 'bg-green-100 text-green-800 border-green-200',
      'Cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return <Clock size={16} />;
      case 'Confirmed': return <CheckCircle size={16} />;
      case 'Shipped': return <Truck size={16} />;
      case 'Delivered': return <Package size={16} />;
      case 'Cancelled': return <X size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getNextStatuses = (currentStatus) => {
    const statusFlow = {
      'Pending': ['Confirmed', 'Cancelled'],
      'Confirmed': ['Shipped', 'Cancelled'],
      'Shipped': ['Delivered'],
      'Delivered': [],
      'Cancelled': []
    };
    return statusFlow[currentStatus] || [];
  };

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  if (error) {
    return (
      <VendorLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/vendor/orders')}
            className="mt-2 text-red-700 hover:text-red-800 font-medium"
          >
            Back to Orders
          </button>
        </div>
      </VendorLayout>
    );
  }

  if (!order) {
    return (
      <VendorLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Order not found</h2>
          <button
            onClick={() => navigate('/vendor/orders')}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Orders
          </button>
        </div>
      </VendorLayout>
    );
  }

  // Filter cart items for this vendor
  const vendorItems = order.cart?.filter(item => 
    item.vendor && item.vendor.toString() === vendor.id
  ) || [];

  const vendorTotal = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <VendorLayout>
      <div className="w-full max-w-none space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/vendor/orders')}
              className="text-gray-600 hover:text-gray-900 mb-2 flex items-center"
            >
              ← Back to Orders
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(order.status)}
                  <span>{order.status}</span>
                </div>
              </span>
              <span className="text-gray-500">
                <Calendar size={16} className="inline mr-1" />
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User size={20} className="mr-2" />
                Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{order.customerInfo?.name || order.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900 flex items-center">
                    <Mail size={16} className="mr-1" />
                    {order.customerInfo?.email || order.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900 flex items-center">
                    <Phone size={16} className="mr-1" />
                    {order.customerInfo?.phone || order.phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-gray-900">{order.paymentMethod}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin size={20} className="mr-2" />
                  Shipping Address
                </h2>
                <p className="text-gray-900">
                  {order.shippingAddress.address || order.address}<br />
                  {order.shippingAddress.city || order.city}
                  {order.shippingAddress.zipCode && `, ${order.shippingAddress.zipCode}`}
                  {order.shippingAddress.country && <br />}
                  {order.shippingAddress.country}
                </p>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package size={20} className="mr-2" />
                Your Products in this Order
              </h2>
              <div className="space-y-4">
                {vendorItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} × ${item.price}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Your Total:</span>
                <span className="font-bold text-lg text-orange-600">${vendorTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Order Actions */}
          <div className="space-y-6">
            {/* Status Update */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
              
              {getNextStatuses(order.status).length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Status
                    </label>
                    <select
                      value={statusUpdate.status}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={order.status}>{order.status} (Current)</option>
                      {getNextStatuses(order.status).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {statusUpdate.status === 'Shipped' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        value={statusUpdate.trackingNumber}
                        onChange={(e) => setStatusUpdate(prev => ({ ...prev, trackingNumber: e.target.value }))}
                        placeholder="Enter tracking number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={statusUpdate.notes}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes about the status update"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    onClick={handleStatusUpdate}
                    disabled={updating || statusUpdate.status === order.status}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      updating || statusUpdate.status === order.status
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">
                  No status updates available for this order.
                </p>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign size={20} className="mr-2" />
                Order Summary
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="font-medium">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Items:</span>
                  <span className="font-medium">{vendorItems.length}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-semibold">Your Revenue:</span>
                  <span className="font-bold text-orange-600">${vendorTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorOrderDetailPage;
