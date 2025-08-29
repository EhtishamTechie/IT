import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../config';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Tag,
  RefreshCw,
  Store
} from 'lucide-react';
import AdminStatsService from '../../services/AdminStatsService';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const AdminDashboard = () => {
  const { adminAPI } = useAdminAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalVendors: 0,
    revenueGrowth: 0,
    deliveredOrders: 0,
    lastRevenueUpdate: null,
    loading: true
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [isCalculatingRevenue, setIsCalculatingRevenue] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculate revenue from delivered admin orders using frontend data
  const calculateRevenueFromOrders = (ordersList) => {
    if (!Array.isArray(ordersList) || ordersList.length === 0) {
      return { totalRevenue: 0, deliveredOrders: 0, lastUpdated: new Date().toISOString() };
    }

    let totalRevenue = 0;
    let deliveredOrdersCount = 0;
    const deliveredOrdersDetails = [];

    ordersList.forEach((order, index) => {
      const orderStatus = (order.status || '').toLowerCase();
      const isDelivered = orderStatus === 'delivered';
      
      if (isDelivered) {
        let orderAmount = 0;
        
        // METHOD 1: Calculate from cart items (PREFERRED)
        if (order.cart && Array.isArray(order.cart)) {
          orderAmount = order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } 
        // METHOD 2: Fallback to totalAmount
        else if (order.totalAmount) {
          orderAmount = parseFloat(order.totalAmount);
        }
        // METHOD 3: Last fallback to total
        else if (order.total) {
          orderAmount = parseFloat(order.total);
        }
        
        if (orderAmount > 0) {
          totalRevenue += orderAmount;
          deliveredOrdersCount++;
          deliveredOrdersDetails.push({
            id: order._id?.slice(-8) || index,
            amount: orderAmount,
            orderNumber: order.orderNumber
          });
        }
      }
    });

    console.log('💰 Revenue Calculation Summary:', {
      totalOrders: ordersList.length,
      deliveredOrders: deliveredOrdersCount,
      totalRevenue: totalRevenue,
      deliveredOrdersDetails: deliveredOrdersDetails
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,  // Round to 2 decimal places
      deliveredOrders: deliveredOrdersCount,
      lastUpdated: new Date().toISOString()
    };
  };

  const refreshRevenueCalculation = async () => {
    setIsCalculatingRevenue(true);
    
    try {
      console.log('🔄 Manual Refresh - Using backend revenue calculation...');
      
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${getApiUrl()}/admin/dashboard/revenue`, { headers });
      
      if (response.data && response.data.success) {
        const { totalRevenue, deliveredOrders, orderDetails } = response.data.data;
        
        setStats(prev => ({
          ...prev,
          totalRevenue: totalRevenue,
          deliveredOrders: deliveredOrders,
          lastRevenueUpdate: new Date().toISOString()
        }));
        
        alert(`✅ Revenue updated from backend! Found ${deliveredOrders} delivered orders with total revenue: $${totalRevenue}`);
      } else {
        alert('❌ Failed to calculate revenue from backend');
      }
    } catch (error) {
      console.error('🔄 Manual Refresh - Error:', error);
      alert('❌ Error refreshing revenue calculation. Please try again.');
    } finally {
      setIsCalculatingRevenue(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching enhanced dashboard data...');
      setStats(prev => ({ ...prev, loading: true }));
      
      // Fetch basic dashboard stats
      const response = await AdminStatsService.getDashboardStats();
      console.log('📊 Dashboard API Response:', response);
      
      // Fetch approved vendor count
      let vendorCount = 0;
      try {
        console.log('🏪 Fetching approved vendor count...');
        const vendorsResponse = await adminAPI.getVendors({ 
          limit: 1000, // Get all vendors
          status: 'approved' // Only approved vendors
        });
        
        console.log('🏪 Approved vendors response:', vendorsResponse);
        
        if (vendorsResponse.data && vendorsResponse.data.success) {
          const vendors = vendorsResponse.data.data?.vendors || vendorsResponse.data.vendors || [];
          // Filter for approved vendors if API doesn't filter properly
          const approvedVendors = vendors.filter(vendor => 
            vendor.verificationStatus === 'approved'
          );
          vendorCount = approvedVendors.length;
          console.log('🏪 Approved vendor count calculated:', vendorCount, 'approved vendors found');
        } else {
          console.warn('🏪 Failed to fetch approved vendors:', vendorsResponse.data?.message);
        }
      } catch (vendorError) {
        console.error('🏪 Error fetching approved vendors:', vendorError);
      }

      // DUAL REVENUE CALCULATION METHOD: Backend Primary + Frontend Fallback
      let revenueData = { totalRevenue: 0, deliveredOrders: 0, lastUpdated: new Date().toISOString() };
      
      // METHOD 1: Try Backend API first  
      try {
        console.log('💰 [Dashboard] Fetching revenue from backend...');
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        const revenueHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        
        const revenueResponse = await axios.get(`${getApiUrl()}/admin/dashboard/revenue`, { 
          headers: revenueHeaders 
        });

        if (revenueResponse.data && revenueResponse.data.success) {
          const { totalRevenue, deliveredOrders } = revenueResponse.data.data;
          revenueData = {
            totalRevenue: totalRevenue,
            deliveredOrders: deliveredOrders,
            lastUpdated: new Date().toISOString()
          };
          console.log('💰 [Dashboard] ✅ SUCCESS - Revenue data from backend:', revenueData);
        } else {
          throw new Error('Backend API failed - using fallback method');
        }
      } catch (revenueError) {
        console.error('💰 [Dashboard] ❌ Error fetching revenue from backend:', revenueError.message);
        
        // METHOD 2: Fallback to localStorage calculation
        try {
          console.log('💰 [Dashboard] 🔄 Falling back to localStorage...');
          const savedOrdersData = localStorage.getItem('adminMyOrders');
          
          if (savedOrdersData) {
            const orders = JSON.parse(savedOrdersData);
            revenueData = calculateRevenueFromOrders(orders);
            console.log('💰 [Dashboard] 📱 Using localStorage fallback for revenue:', revenueData);
          } else {
            console.log('💰 [Dashboard] No orders data found in localStorage');
          }
        } catch (fallbackError) {
          console.error('💰 [Dashboard] ❌ Fallback revenue calculation also failed:', fallbackError);
        }
      }
      
      if (response.success) {
        const data = response.stats;
        
        console.log('✅ Enhanced dashboard stats with My Orders calculated revenue:', {
          ...data,
          calculatedRevenue: revenueData.totalRevenue,
          deliveredOrders: revenueData.deliveredOrders,
          vendorCount
        });
        
        setStats({
          totalProducts: data.totalProducts || 0,
          totalOrders: data.totalOrders || 0,
          totalUsers: data.totalUsers || 0,
          totalRevenue: revenueData.totalRevenue,
          totalVendors: vendorCount,
          revenueGrowth: data.revenueGrowth || 0,
          deliveredOrders: revenueData.deliveredOrders,
          lastRevenueUpdate: revenueData.lastUpdated,
          loading: false
        });

        // Set recent orders from API
        setRecentOrders(data.recentOrders || []);
        
        // Set recent products from API
        setRecentProducts(data.recentProducts || []);
        
      } else {
        console.error('❌ Failed to fetch dashboard stats:', response.message);
        
        // Set basic stats without revenue
        setStats(prev => ({ 
          ...prev, 
          totalRevenue: revenueData.totalRevenue,
          totalVendors: vendorCount,
          deliveredOrders: revenueData.deliveredOrders,
          lastRevenueUpdate: revenueData.lastUpdated,
          loading: false 
        }));
      }
    } catch (error) {
      console.error('🚨 Error fetching dashboard data:', error);
      
      // Try to calculate revenue even if main API fails
      try {
        const savedOrdersData = localStorage.getItem('adminMyOrders');
        if (savedOrdersData) {
          const orders = JSON.parse(savedOrdersData);
          const revenueData = calculateRevenueFromOrders(orders);
          setStats(prev => ({ 
            ...prev, 
            totalRevenue: revenueData.totalRevenue,
            deliveredOrders: revenueData.deliveredOrders,
            lastRevenueUpdate: revenueData.lastUpdated,
            loading: false 
          }));
        } else {
          setStats(prev => ({ ...prev, loading: false }));
        }
      } catch (revenueError) {
        console.error('🚨 Could not calculate revenue either:', revenueError);
        setStats(prev => ({ ...prev, loading: false }));
      }
      
      // Fallback to empty data on error
      setRecentOrders([]);
      setRecentProducts([]);
    }
  };

  const getOrderStatusIcon = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'processing':
      case 'confirmed':
      case 'shipped':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOrderStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'delivered':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'processing':
      case 'confirmed':
      case 'shipped':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'cancelled':
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { color: 'text-red-600', text: 'Out of Stock' };
    if (stock < 20) return { color: 'text-orange-600', text: 'Low Stock' };
    return { color: 'text-green-600', text: 'In Stock' };
  };

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Loading real dashboard data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome to your admin dashboard. Here's what's happening with your business today.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={stats.loading}
          className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${stats.loading ? 'animate-spin' : ''}`} />
          {stats.loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-blue-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Products
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalProducts.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 px-5 py-3">
            <div className="text-sm">
              <a href="/admin/products" className="font-medium text-blue-700 hover:text-blue-900">
                View all products
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-green-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalOrders.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-green-50 px-5 py-3">
            <div className="text-sm">
              <a href="/admin/orders" className="font-medium text-green-700 hover:text-green-900">
                View all orders
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-purple-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalUsers.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 px-5 py-3">
            <div className="text-sm">
              <a href="/admin/users" className="font-medium text-purple-700 hover:text-purple-900">
                View all users
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-indigo-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Store className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Vendors
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalVendors.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-indigo-50 px-5 py-3">
            <div className="text-sm">
              <a href="/admin/vendors" className="font-medium text-indigo-700 hover:text-indigo-900">
                View all vendors
              </a>
            </div>
          </div>
        </div>

        {/* Enhanced Revenue Card */}
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border-2 border-orange-200">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-bold text-orange-600">
                      ${stats.totalRevenue.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
              <button
                onClick={refreshRevenueCalculation}
                disabled={isCalculatingRevenue}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isCalculatingRevenue ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="bg-orange-50 px-5 py-3 border-t border-orange-100">
            <div className="flex items-center text-orange-700 text-sm">
              <CheckCircle className="inline w-3 h-3 mr-1" />
              <span>From {stats.deliveredOrders || 0} delivered orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders and Products Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-white shadow-sm rounded-xl border border-orange-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.total}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center">
                        <ShoppingCart className="h-8 w-8 text-gray-300 mb-2" />
                        <p>No recent orders found</p>
                        <p className="text-xs text-gray-400">Orders will appear here once customers place them</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 text-right">
            <a href="/admin/orders" className="text-sm font-medium text-orange-600 hover:text-orange-900">
              View all orders →
            </a>
          </div>
        </div>

        {/* Recent Products */}
        <div className="bg-white shadow-sm rounded-xl border border-orange-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Product Inventory</h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentProducts.length > 0 ? (
                  recentProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${stockStatus.color}`}>
                            {product.stock} units
                          </span>
                          <div className={`text-xs ${stockStatus.color}`}>
                            {stockStatus.text}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${product.price}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center">
                        <Package className="h-8 w-8 text-gray-300 mb-2" />
                        <p>No products found</p>
                        <p className="text-xs text-gray-400">Add products to see them here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 text-right">
            <a href="/admin/products" className="text-sm font-medium text-orange-600 hover:text-orange-900">
              View all products →
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-xl border border-orange-100 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/admin/products"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
          >
            <Package className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Add Product</span>
          </a>
          <a
            href="/admin/orders"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
          >
            <ShoppingCart className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">View Orders</span>
          </a>
          <a
            href="/admin/users"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
          >
            <Users className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Manage Users</span>
          </a>
          <a
            href="/admin/categories"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
          >
            <Tag className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Categories</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
