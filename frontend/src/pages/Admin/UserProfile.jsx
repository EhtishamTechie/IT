import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  Package,
  MapPin,
  Clock,
  Eye
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getUploadUrl } from '../../config';

// Helper function to safely extract string values from potentially complex objects
const safeString = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    return value.name || value.country || value.title || value.value || String(value);
  }
  return '';
};

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  
  // Pagination states for orders
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 10;

  useEffect(() => {
    if (userId) {
      loadUserDetails();
      loadUserOrders();
    }
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('🔍 Loading user details for ID:', userId);
      console.log('🔑 Using token:', token ? token.substring(0, 20) + '...' : 'No token');
      
      const response = await axios.get(`${getApiUrl()}/admin/users/${userId}`, { headers });
      
      console.log('📊 Response received:', response.status, response.data);
      
      if (response.data.success) {
        setUser(response.data.user);
        console.log('✅ User data set:', response.data.user.name);
      } else if (response.data) {
        setUser(response.data);
        console.log('✅ User data set (fallback):', response.data.name);
      }
    } catch (error) {
      console.error('❌ Error loading user details:', error.response?.status, error.response?.data, error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserOrders = async (page = 1) => {
    try {
      setOrdersLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${getApiUrl()}/admin/users/${userId}/orders?page=${page}&limit=${ordersPerPage}`, { headers });
      
      if (response.data.success && Array.isArray(response.data.orders)) {
        setOrders(response.data.orders);
        setTotalOrders(response.data.totalOrders || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(page);
      } else if (Array.isArray(response.data)) {
        setOrders(response.data);
        setTotalOrders(response.data.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading user orders:', error);
      setOrders([]);
      setTotalOrders(0);
      setTotalPages(1);
    } finally {
      setOrdersLoading(false);
    }
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

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">User not found</p>
        <button 
          onClick={() => navigate('/admin/users')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Users</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{user.name}</h2>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-3" />
                    <span>{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-3" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.address && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-3" />
                      <span>
                        {typeof user.address === 'string' 
                          ? user.address 
                          : [
                              safeString(user.address.street),
                              safeString(user.address.city),
                              safeString(user.address.state),
                              safeString(user.address.zipCode),
                              safeString(user.address.country)
                            ].filter(Boolean).join(', ')
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-3" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-3" />
                    <span>Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ShoppingBag className="w-8 h-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-900">{user.orderCount || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="w-8 h-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600">Total Spent</p>
                        <p className="text-2xl font-bold text-green-900">${(user.totalSpent || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'customer' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                  <span className={`ml-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
          {totalOrders > 0 && (
            <span className="text-sm text-gray-500">
              {totalOrders} total order{totalOrders !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {ordersLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => {
              // Calculate total from cart items
              const total = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              
              return (
                <div key={order._id || order.orderNumber} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-semibold text-gray-900">Order #{order.orderNumber || order._id}</p>
                        <p className="text-sm text-gray-500">{formatDate(order.createdAt || order.date)}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{order.cart?.length || 0} item(s)</p>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.cart?.map((item, index) => (
                      <div key={item._id || item.productId || index} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                          {item.productId?.image ? (
                            <img 
                              src={`${getUploadUrl()}/uploads/${item.productId.image}`} 
                              alt={item.productId.title || item.title || 'Product'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full ${item.productId?.image ? 'hidden' : 'flex'} items-center justify-center`}>
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.productId?.title || item.title || item.name || 'Product'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.productId?.mainCategory && (
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded mr-2">
                                {item.productId.mainCategory}
                              </span>
                            )}
                            Quantity: {item.quantity || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                          <p className="text-sm text-gray-500">${(item.price || 0).toFixed(2)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>

                {/* Shipping Address */}
                {(order.address || order.shippingAddress) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="text-sm">Shipped to: {order.address || order.shippingAddress}</span>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
        
        {/* Order History Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ordersPerPage) + 1}-{Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadUserOrders(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNumber = currentPage <= 3 
                    ? index + 1 
                    : currentPage >= totalPages - 2 
                      ? totalPages - 4 + index
                      : currentPage - 2 + index;
                  
                  if (pageNumber < 1 || pageNumber > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => loadUserOrders(pageNumber)}
                      className={`px-3 py-2 border rounded-lg text-sm ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => loadUserOrders(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
