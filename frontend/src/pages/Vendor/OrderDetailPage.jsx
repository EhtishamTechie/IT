import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { vendorService } from '../../services/vendorService';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [order, setOrder] = useState(null);
  const [commissionRate, setCommissionRate] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState({
    trackingNumber: '',
    carrier: '',
    notes: ''
  });
  const [showTrackingForm, setShowTrackingForm] = useState(false);

  useEffect(() => {
    loadOrderDetails();
    loadCommissionRate();
  }, [id]);

  const loadCommissionRate = async () => {
    try {
      const response = await vendorService.getDashboard();
      if (response.data.success && response.data.data && response.data.data.commissionRate !== undefined) {
        setCommissionRate(response.data.data.commissionRate);
      }
    } catch (error) {
      console.error('Failed to load commission rate:', error);
      setCommissionRate(20); // Fallback
    }
  };

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getVendorOrder(id);
      setOrder(response.data);
      
      // Pre-fill tracking info if it exists
      if (response.data.tracking) {
        setTrackingInfo({
          trackingNumber: response.data.tracking.trackingNumber || '',
          carrier: response.data.tracking.carrier || '',
          notes: response.data.tracking.notes || ''
        });
      }
    } catch (err) {
      setError('Failed to load order details');
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setError('');
      const response = await vendorService.updateOrderStatus(id, newStatus);
      
      if (response.data.success) {
        setSuccess(`Order status updated to ${newStatus}`);
        loadOrderDetails(); // Refresh order data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to update order status');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleTrackingSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await vendorService.updateOrderTracking(id, trackingInfo);
      
      if (response.data.success) {
        setSuccess('Tracking information updated successfully');
        setShowTrackingForm(false);
        loadOrderDetails();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to update tracking information');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tracking information');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-orange-100 text-orange-800 border-orange-200',
      shipped: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      returned: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusOptions = (currentStatus) => {
    const statusFlow = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: ['returned'],
      cancelled: [],
      returned: []
    };
    return statusFlow[currentStatus] || [];
  };

  const getStatusProgress = (status) => {
    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  // Filter order items for this vendor
  const vendorItems = order?.items?.filter(item => 
    item.vendor?.toString() === order.vendorId || 
    item.vendorId === order.vendorId
  ) || [];

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  if (error && !order) {
    return (
      <VendorLayout>
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => navigate('/vendor/orders')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
          >
            Back to Orders
          </button>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/vendor/orders')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Orders
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order?.orderNumber || order?._id?.slice(-8)}
              </h1>
              <p className="text-gray-600">
                Placed on {formatDate(order?.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(order?.status)}`}>
              {order?.status}
            </span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Order Progress */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Progress</h2>
          <div className="relative">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Pending</span>
              <span>Confirmed</span>
              <span>Processing</span>
              <span>Shipped</span>
              <span>Delivered</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getStatusProgress(order?.status)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {vendorItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      {item.product?.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.product?.name || item.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        SKU: {item.product?.sku || 'N/A'}
                      </p>
                      {item.variant && (
                        <p className="text-sm text-gray-500">
                          Variant: {item.variant}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        Total: {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Actions</h2>
              <div className="space-y-4">
                {getStatusOptions(order?.status).length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update Order Status
                    </label>
                    <div className="flex space-x-2">
                      {getStatusOptions(order?.status).map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(status)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                        >
                          Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    No status updates available for this order.
                  </div>
                )}

                {/* Tracking Information */}
                {(order?.status === 'shipped' || order?.status === 'delivered') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Tracking Information
                      </label>
                      <button
                        onClick={() => setShowTrackingForm(!showTrackingForm)}
                        className="text-orange-600 hover:text-orange-800 text-sm"
                      >
                        {showTrackingForm ? 'Cancel' : 'Update Tracking'}
                      </button>
                    </div>
                    
                    {order?.tracking && !showTrackingForm ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-600">Tracking Number:</span>
                            <p className="text-sm text-gray-900">{order.tracking.trackingNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">Carrier:</span>
                            <p className="text-sm text-gray-900">{order.tracking.carrier || 'N/A'}</p>
                          </div>
                          {order.tracking.notes && (
                            <div className="md:col-span-2">
                              <span className="text-sm font-medium text-gray-600">Notes:</span>
                              <p className="text-sm text-gray-900">{order.tracking.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : showTrackingForm ? (
                      <form onSubmit={handleTrackingSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tracking Number
                            </label>
                            <input
                              type="text"
                              value={trackingInfo.trackingNumber}
                              onChange={(e) => setTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="Enter tracking number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Carrier
                            </label>
                            <select
                              value={trackingInfo.carrier}
                              onChange={(e) => setTrackingInfo(prev => ({ ...prev, carrier: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                              <option value="">Select Carrier</option>
                              <option value="FedEx">FedEx</option>
                              <option value="UPS">UPS</option>
                              <option value="USPS">USPS</option>
                              <option value="DHL">DHL</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={trackingInfo.notes}
                            onChange={(e) => setTrackingInfo(prev => ({ ...prev, notes: e.target.value }))}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Any additional notes about shipping"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                          >
                            Update Tracking
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowTrackingForm(false)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        No tracking information provided yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary & Customer Info */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">
                    {formatCurrency(vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="text-gray-900">
                    {formatCurrency(order?.shippingCost || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-900">
                    {formatCurrency(order?.taxAmount || 0)}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission ({commissionRate || order?.commissionRate || 'Loading...'}%):</span>
                    <span className="text-red-600">
                      -{formatCurrency(order?.commissionAmount || 0)}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">Your Earnings:</span>
                    <span className="text-green-600">
                      {formatCurrency(order?.vendorAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Contact Details</h3>
                  <p className="text-sm text-gray-900">
                    {order?.shippingAddress?.firstName} {order?.shippingAddress?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order?.user?.email || order?.shippingAddress?.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order?.shippingAddress?.phone}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Shipping Address</h3>
                  <div className="text-sm text-gray-900">
                    <p>{order?.shippingAddress?.street}</p>
                    {order?.shippingAddress?.apartment && (
                      <p>{order?.shippingAddress?.apartment}</p>
                    )}
                    <p>
                      {order?.shippingAddress?.city}, {order?.shippingAddress?.state} {order?.shippingAddress?.zipCode}
                    </p>
                    <p>{order?.shippingAddress?.country}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="text-gray-900">{order?.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    order?.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : order?.paymentStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order?.paymentStatus}
                  </span>
                </div>
                {order?.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="text-gray-900 font-mono text-sm">
                      {order?.transactionId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default OrderDetailPage;
