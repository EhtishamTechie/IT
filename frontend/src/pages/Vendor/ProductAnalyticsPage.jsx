import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Legend
} from 'recharts';

const ProductAnalyticsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [analytics, setAnalytics] = useState({
    views: [],
    sales: [],
    performance: {},
    stockHistory: [],
    topRegions: [],
    customerInsights: {}
  });
  const [timeRange, setTimeRange] = useState('30'); // days
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    loadProductAndAnalytics();
  }, [id, timeRange, refresh]);

  const loadProductAndAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      // Load product details and analytics in parallel
      const [productResponse, analyticsResponse] = await Promise.all([
        vendorService.getProduct(id),
        vendorService.getProductAnalytics(id)
      ]);

      setProduct(productResponse.data);
      setAnalytics(analyticsResponse.data || {
        views: [],
        sales: [],
        performance: {},
        stockHistory: [],
        topRegions: [],
        customerInsights: {}
      });
    } catch (err) {
      setError('Failed to load product analytics');
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

  const getPerformanceColor = (value, type = 'positive') => {
    if (type === 'positive') {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return value <= 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  const COLORS = ['#FF9900', '#FFB366', '#FFCC99', '#FFE5CC', '#FFF2E5'];

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  if (error || !product) {
    return (
      <VendorLayout>
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">{error || 'Product not found'}</div>
          <button
            onClick={() => navigate('/vendor/products')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
          >
            Back to Products
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
              onClick={() => navigate('/vendor/products')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Analytics</h1>
              <p className="text-gray-600">{product.name}</p>
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

        {/* Product Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{product.name}</h2>
                <p className="text-gray-600">{product.brand}</p>
                <p className="text-sm text-gray-500 mt-1">SKU: {product.sku || 'N/A'}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : product.status === 'inactive'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {product.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Current Stock</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(product.stock)}</div>
              <div className={`text-sm ${
                product.stock <= (product.lowStockThreshold || 10) ? 'text-red-600' : 'text-green-600'
              }`}>
                {product.stock <= (product.lowStockThreshold || 10) ? 'Low Stock' : 'In Stock'}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.performance?.totalViews || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-lg">👁</span>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getPerformanceColor(analytics.performance?.viewsChange)}`}>
                {analytics.performance?.viewsChange >= 0 ? '+' : ''}
                {analytics.performance?.viewsChange || 0}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.performance?.totalSales || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getPerformanceColor(analytics.performance?.salesChange)}`}>
                {analytics.performance?.salesChange >= 0 ? '+' : ''}
                {analytics.performance?.salesChange || 0}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.performance?.totalRevenue || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getPerformanceColor(analytics.performance?.revenueChange)}`}>
                {analytics.performance?.revenueChange >= 0 ? '+' : ''}
                {analytics.performance?.revenueChange || 0}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((analytics.performance?.conversionRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${getPerformanceColor(analytics.performance?.conversionChange)}`}>
                {analytics.performance?.conversionChange >= 0 ? '+' : ''}
                {(analytics.performance?.conversionChange || 0).toFixed(1)}% from last period
              </span>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Views and Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Views Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Views</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={analytics.views || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Performance</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={analytics.sales || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#10B981" />
                  <Bar dataKey="revenue" fill="#FF9900" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Regional Performance and Stock History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Regions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Regions</h3>
            {analytics.topRegions && analytics.topRegions.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={analytics.topRegions}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sales"
                    >
                      {analytics.topRegions.map((entry, index) => (
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
                No regional data available yet
              </div>
            )}
          </div>

          {/* Stock History */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Level History</h3>
            {analytics.stockHistory && analytics.stockHistory.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={analytics.stockHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="stock" 
                      stroke="#FF9900" 
                      strokeWidth={2}
                      dot={{ fill: '#FF9900' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No stock history data available yet
              </div>
            )}
          </div>
        </div>

        {/* Customer Insights */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {formatNumber(analytics.customerInsights?.uniqueCustomers || 0)}
              </div>
              <div className="text-sm text-gray-600">Unique Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {(analytics.customerInsights?.averageOrderValue || 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Average Order Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {(analytics.customerInsights?.repeatPurchaseRate || 0 * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Repeat Purchase Rate</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate(`/vendor/products/${id}/edit`)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Edit Product
          </button>
          <button
            onClick={() => navigate('/vendor/products')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    </VendorLayout>
  );
};

export default ProductAnalyticsPage;
