import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl, getUploadUrl } from '../config';
import { 
  ShoppingBagIcon, 
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../components/Notification';
import StatusService from '../services/statusService';
import OrderService from '../services/orderService';

// Simple status definitions for 6-status system
const STATUS_INFO = {
  placed: {
    label: 'Order Placed',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: ShoppingCartIcon
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: ClockIcon
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: TruckIcon
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircleIcon
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircleIcon
  },
  cancelled_by_customer: {
    label: 'Cancelled by Customer',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    icon: XCircleIcon
  }
};

const SimpleOrderHistoryPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const ITEMS_PER_PAGE = 5;
  const { showError, NotificationComponent } = useNotification();

  // Fetch orders with pagination
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Fetching simple order history page:', page);
      
      const result = await OrderService.getUserOrders(page, ITEMS_PER_PAGE);
      
      // Process orders
      const mainOrders = result.orders.filter(order => {
        // Only show orders that are NOT admin/vendor parts
        return !order.partialOrderType && 
               !order.splitFromMixedOrder &&
               order.orderType !== 'admin_part' &&
               order.orderType !== 'vendor_part';
      });

      const processedOrders = mainOrders.map(order => {
        const finalStatus = order.unifiedStatus || order.status || 'placed';
        return {
          ...order,
          status: finalStatus,
          unifiedStatus: finalStatus
        };
      });

      // Get pagination info from the new response structure
      console.log('📊 API Response:', result);
      const { totalOrders, currentPage, totalPages, hasNextPage, hasPrevPage } = result.pagination;

      console.log(`📋 Showing ${processedOrders.length} orders for page ${currentPage} of ${totalPages} (${totalOrders} total orders)`);
      setOrders(processedOrders);
      setPage(currentPage);
      setTotalPages(totalPages);
      setHasNextPage(hasNextPage);
      setHasPrevPage(hasPrevPage);
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, [page]); // Depend on page to refetch when it changes

  // Load initial page when component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchOrders();
    }
  }, [isAuthenticated, fetchOrders]);

  // Handle page navigation
  const handlePrevPage = useCallback(() => {
    if (hasPrevPage) {
      setPage(prev => prev - 1);
    }
  }, [hasPrevPage]);

  const handleNextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please log in to view your orders</h2>
          <Link to="/login" className="text-blue-600 hover:text-blue-500 mt-2 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationComponent />
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
              <p className="text-base text-gray-500">View and manage your orders</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold shadow-md"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow">
            <div className="flex items-center">
              <XCircleIcon className="h-6 w-6 text-red-400" />
              <div className="ml-3">
                <h3 className="text-base font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto" />
            <h3 className="mt-6 text-2xl font-bold text-gray-900">No orders found</h3>
            <p className="mt-2 text-base text-gray-500">You haven't placed any orders yet.</p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-orange-500 hover:bg-orange-600 shadow-md"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {orders.map((order) => {
                const currentStatus = order.status || 'placed';
                const statusInfo = STATUS_INFO[currentStatus] || STATUS_INFO.placed;
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={order._id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`rounded-full p-2 border ${statusInfo.color} shadow-sm shrink-0`}>
                          <StatusIcon className="h-8 w-8" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 truncate">
                            Order #{order.orderNumber}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                              PKR {order.totalAmount}
                            </div>
                            <div className="flex items-center">
                              <ShoppingCartIcon className="h-4 w-4 mr-1" />
                              {order.cart?.length || 0} items
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold border ${statusInfo.color} shadow-sm`}>
                          {statusInfo.label}
                        </span>
                        <Link
                          to={`/order/${order._id}`}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    {order.cart && order.cart.length > 0 && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {order.cart.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm overflow-hidden">
                              {item.image && (
                                <img 
                                  src={getUploadUrl(item.image)} 
                                  alt={item.title || item.name}
                                  className="h-12 w-12 min-w-[3rem] object-cover rounded border border-gray-300"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0"> {/* min-w-0 prevents flex child from overflowing */}
                                <p className="text-sm font-semibold text-gray-900 truncate max-w-full">
                                  {item.title || item.name}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  Qty: {item.quantity} × PKR {item.price}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {order.cart.length > 3 && (
                          <p className="mt-2 text-sm text-gray-400">
                            +{order.cart.length - 3} more items
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Enhanced Pagination Controls */}
            <div className="flex items-center justify-center mt-8 gap-2">
              {/* Previous Button */}
              <button
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
                className={`px-3 py-2 rounded-lg font-medium text-sm border ${
                  hasPrevPage
                    ? 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
                    : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {/* Generate page numbers with smart display logic */}
                {(() => {
                  let pages = [];
                  
                  // For small number of pages, show all
                  if (totalPages <= 7) {
                    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                  } else {
                    // Always include first page
                    pages.push(1);
                    
                    // Calculate range around current page
                    let start = Math.max(2, page - 1);
                    let end = Math.min(totalPages - 1, page + 1);
                    
                    // Adjust for first pages
                    if (page <= 3) {
                      start = 2;
                      end = 4;
                    }
                    
                    // Adjust for last pages
                    if (page >= totalPages - 2) {
                      start = totalPages - 3;
                      end = totalPages - 1;
                    }
                    
                    // Add ellipsis after first page if needed
                    if (start > 2) {
                      pages.push('...');
                    }
                    
                    // Add pages around current page
                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }
                    
                    // Add ellipsis before last page if needed
                    if (end < totalPages - 1) {
                      pages.push('...');
                    }
                    
                    // Always include last page
                    pages.push(totalPages);
                  }
                  
                  // Return the page buttons
                  return pages.map((p, index) => {
                    if (p === '...') {
                      return <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>;
                    }
                    
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-2 rounded-lg text-sm border ${
                          page === p
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  });
                })()}
              </div>
              
              {/* Next Button */}
              <button
                onClick={handleNextPage}
                disabled={!hasNextPage}
                className={`px-3 py-2 rounded-lg font-medium text-sm border ${
                  hasNextPage
                    ? 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
                    : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
            
            {/* Page Info */}
            <div className="text-center mt-4 text-sm text-gray-600">
              Showing page {page} of {totalPages}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleOrderHistoryPage;
