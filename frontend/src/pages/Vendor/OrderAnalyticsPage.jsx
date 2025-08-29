import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { vendorService } from '../../services/vendorService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

const OrderAnalyticsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({
    overview: {},
    orderTrends: [],
    revenueTrends: [],
    statusDistribution: [],
    topProducts: [],
    customerInsights: {},
    performanceMetrics: {}
  });
  const [timeRange, setTimeRange] = useState('30'); // days
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, refresh]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await vendorService.getOrderAnalytics({
        timeRange,
        includeMetrics: true
      });

      setAnalytics(response.data || {
        overview: {},
        orderTrends: [],
        revenueTrends: [],
        statusDistribution: [],
        topProducts: [],
        customerInsights: {},
        performanceMetrics: {}
      });
    } catch (err) {
      setError('Failed to load order analytics');
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefresh(!refresh);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number || 0);
  };

  const getChangeColor = (value) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const COLORS = ['#FF9900', '#FFB366', '#FFCC99', '#FFE5CC', '#FFF2E5', '#E6F3FF'];

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Order Analytics</h1>
              <p className="text-gray-600">Track your order performance and insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={handleRefresh}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.overview?.totalOrders || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getChangeColor(analytics.overview?.ordersChange || 0)}`}>
                {analytics.overview?.ordersChange >= 0 ? '+' : ''}
                {analytics.overview?.ordersChange || 0}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.overview?.totalRevenue || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getChangeColor(analytics.overview?.revenueChange || 0)}`}>
                {analytics.overview?.revenueChange >= 0 ? '+' : ''}
                {analytics.overview?.revenueChange || 0}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.overview?.averageOrderValue || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getChangeColor(analytics.overview?.aovChange || 0)}`}>
                {analytics.overview?.aovChange >= 0 ? '+' : ''}
                {analytics.overview?.aovChange || 0}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fulfillment Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((analytics.overview?.fulfillmentRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getChangeColor(analytics.overview?.fulfillmentChange || 0)}`}>
                {analytics.overview?.fulfillmentChange >= 0 ? '+' : ''}
                {(analytics.overview?.fulfillmentChange || 0).toFixed(1)}% from last period
              </span>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Order Trends and Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Trends */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Trends</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={analytics.orderTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#FF9900" 
                    fill="#FFB366" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Trends */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={analytics.revenueTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#FF9900" 
                    strokeWidth={2}
                    dot={{ fill: '#FF9900', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Status Distribution and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
            {analytics.statusDistribution && analytics.statusDistribution.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No order data available yet
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
            {analytics.topProducts && analytics.topProducts.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={analytics.topProducts} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#FF9900" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No product sales data available yet
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {((analytics.performanceMetrics?.onTimeDeliveryRate || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">On-Time Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {((analytics.performanceMetrics?.returnRate || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Return Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {(analytics.performanceMetrics?.averageProcessingTime || 0).toFixed(1)} hrs
              </div>
              <div className="text-sm text-gray-600">Avg Processing Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {((analytics.performanceMetrics?.customerSatisfaction || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Customer Satisfaction</div>
            </div>
          </div>
        </div>

        {/* Customer Insights */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {formatNumber(analytics.customerInsights?.totalCustomers || 0)}
              </div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {formatNumber(analytics.customerInsights?.newCustomers || 0)}
              </div>
              <div className="text-sm text-gray-600">New Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {((analytics.customerInsights?.repeatCustomerRate || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Repeat Customer Rate</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate('/vendor/orders')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            View All Orders
          </button>
          <button
            onClick={() => {/* TODO: Export functionality */}}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Export Report
          </button>
        </div>
      </div>
    </VendorLayout>
  );
};

export default OrderAnalyticsPage;
