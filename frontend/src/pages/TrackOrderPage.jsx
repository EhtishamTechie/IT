import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TruckIcon } from '@heroicons/react/24/outline';
import OrderService from '../services/orderService';
import StandardOrderDetailsModal from '../components/order/StandardOrderDetailsModal';

const TrackOrderPage = () => {
  const { orderNumber } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(orderNumber || '');
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const loadOrderStatus = useCallback(async (orderNum) => {
    try {
      setLoading(true);
      setError(null);
      console.log('TrackOrderPage: Fetching order status for:', orderNum);
      
      const response = await OrderService.getOrderById(orderNum);
      console.log('TrackOrderPage: Order response:', response);
      
      // Extract order data from response
      const order = response.order || response;
      setOrderData(order);
      
      // Show the standard order details modal
      setShowOrderDetails(true);
    } catch (err) {
      console.error('TrackOrderPage: Error fetching order:', err);
      setError('Order not found or invalid order number');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderNumber) {
      loadOrderStatus(orderNumber);
    } else {
      setLoading(false);
    }
  }, [orderNumber, loadOrderStatus]);

  const handleSearchOrder = useCallback(() => {
    if (searchInput.trim()) {
      loadOrderStatus(searchInput.trim());
    }
  }, [searchInput, loadOrderStatus]);

  const handleInputKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearchOrder();
    }
  }, [handleSearchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order tracking...</p>
        </div>
      </div>
    );
  }

  // Show search form if no order number or order not found
  if (!orderNumber || error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <TruckIcon className="w-16 h-16 text-orange-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
              <p className="text-gray-600">Enter your order number to track your package</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-center">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number
                </label>
                <input
                  type="text"
                  id="orderNumber"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleInputKeyPress}
                  placeholder="Enter your order number (e.g., ORD-123456789)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <button
                onClick={handleSearchOrder}
                disabled={!searchInput.trim() || loading}
                className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Track Order'}
              </button>
            </div>

            <div className="mt-8 text-center">
              <Link to="/" className="text-orange-600 hover:text-orange-800 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TruckIcon className="w-16 h-16 text-orange-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
            <p className="text-xl text-gray-600 mb-4">Order Number: {orderNumber}</p>
            
            {orderData && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 inline-block">
                  <p className="text-orange-800">
                    <span className="font-semibold">Current Status:</span>{' '}
                    <span className="capitalize">{orderData.status || 'Processing'}</span>
                  </p>
                </div>
                
                <div>
                  <button
                    onClick={() => setShowUnifiedTracking(true)}
                    className="bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold text-lg"
                  >
                    View Detailed Order Tracking
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search for another order */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold mb-4">Track Another Order</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter order number"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              onClick={() => loadOrderStatus(searchInput)}
              disabled={!searchInput.trim()}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Track Order
            </button>
          </div>
        </div>

        {/* Standard Order Details Modal */}
        {showOrderDetails && orderData && (
          <StandardOrderDetailsModal 
            orderId={orderData._id}
            onClose={() => setShowOrderDetails(false)}
            userRole="customer"
          />
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;
