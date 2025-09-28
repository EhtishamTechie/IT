import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { vendorAPI } from '../../services/vendorService';

const VendorAnalyticsPage = () => {
  const { vendor } = useVendorAuth();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Debug logging for troubleshooting
      console.log('🔄 Loading analytics data...', {
        vendor: vendor ? {
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          isAdminViewing: vendor.isAdminViewing
        } : 'No vendor data',
        timeRange: timeRange
      });

      // Check if vendor data is available
      if (!vendor || !vendor._id) {
        console.error('❌ No vendor data available for analytics');
        setError('Vendor authentication required. Please log in again.');
        setAnalyticsData(createFallbackAnalytics());
        return;
      }

      // Use optimized backend analytics endpoint
      const response = await vendorAPI.getAnalyticsStats(timeRange);
      
      console.log('📊 Analytics API Response:', {
        success: response?.data?.success,
        hasData: !!response?.data?.data,
        hasAnalytics: !!response?.data?.data?.analytics,
        responseKeys: response?.data ? Object.keys(response.data) : 'No data'
      });
      
      if (response?.data?.success && response.data.data?.analytics) {
        const analytics = response.data.data.analytics;
        console.log('✅ Backend analytics loaded successfully:', {
          totalOrders: analytics.summary?.totalOrders || 0,
          deliveredOrders: analytics.summary?.deliveredOrders || 0,
          totalRevenue: analytics.summary?.totalRevenue || 0,
          salesDataPoints: analytics.charts?.salesData?.length || 0,
          topProducts: analytics.charts?.topProducts?.length || 0
        });
        
        setAnalyticsData(analytics);
        
        // Clear any previous errors on success
        if (analytics.summary.totalOrders > 0 || analytics.summary.deliveredOrders > 0) {
          setError('');
        } else {
          setError('No analytics data available yet. Start selling to see insights!');
        }
      } else {
        console.warn('⚠️ Backend analytics response invalid:', response?.data);
        
        // Check if it's an authentication error
        if (response?.status === 401 || response?.status === 403) {
          setError('Authentication failed. Please log in again.');
        } else if (response?.data?.message) {
          setError(`Analytics error: ${response.data.message}`);
        } else {
          setError('Unable to load analytics. This might be because you have no sales data yet.');
        }
        
        setAnalyticsData(createFallbackAnalytics());
      }
    } catch (err) {
      console.error('❌ Analytics loading error:', err);
      
      // Provide more specific error messages
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Please ensure your vendor account is approved.');
      } else if (err.response?.status === 404) {
        setError('Analytics service not found. Please contact support.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Unable to load analytics data. This might be because you have no sales data yet.');
      }
      
      setAnalyticsData(createFallbackAnalytics());
    } finally {
      setLoading(false);
    }
  };

  const createFallbackAnalytics = () => {
    console.log('🔧 Creating fallback analytics data');
    
    // Create sample data for better UX when no real data exists
    const generateSampleSalesData = () => {
      const data = [];
      const now = new Date();
      
      for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        data.push({
          date: date.toISOString().split('T')[0],
          sales: 0,
          orders: 0,
          revenue: 0
        });
      }
      return data;
    };

    return {
      summary: {
        totalOrders: 0,
        deliveredOrders: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        productsSold: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        repeatCustomerRate: 0
      },
      charts: {
        salesData: generateSampleSalesData(),
        revenueData: generateSampleSalesData(),
        topProducts: [],
        categoryData: [],
        orderStatusData: [],
        stockData: []
      },
      period: {
        timeRange: parseInt(timeRange),
        startDate: new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        thisMonthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      }
    };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format numbers
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  if (loading) {
    return (
      <VendorLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your analytics...</p>
            </div>
          </div>
        </div>
      </VendorLayout>
    );
  }

  if (error && !analyticsData) {
    return (
      <VendorLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto pt-8 px-4">
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Analytics</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadAnalyticsData}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </VendorLayout>
    );
  }

  // Extract analytics data
  const { summary = {}, charts = {} } = analyticsData || {};
  const {
    totalOrders = 0,
    deliveredOrders = 0,
    totalRevenue = 0,
    monthlyRevenue = 0,
    productsSold = 0,
    avgOrderValue = 0,
    conversionRate = 0,
    repeatCustomerRate = 0
  } = summary;

  const {
    salesData = [],
    revenueData = [],
    topProducts = [],
    categoryData = [],
    orderStatusData = [],
    stockData = []
  } = charts;

  // Legacy fallback for order status (if backend doesn't provide it)
  const legacyOrderStatusData = orderStatusData.length > 0 ? orderStatusData : [
    { name: 'Delivered', value: deliveredOrders, color: '#10B981' },
    { name: 'Processing', value: Math.max(0, totalOrders - deliveredOrders), color: '#F59E0B' }
  ].filter(item => item.value > 0);

  return (
    <VendorLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between text-white">
              <div>
                <h1 className="text-3xl font-bold">Your Business Report</h1>
                <p className="text-orange-100 mt-1">Simple insights to grow your sales</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
                <label className="text-sm font-medium text-orange-100 block mb-1">Time Period</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="7" className="text-gray-900">Last 7 Days</option>
                  <option value="30" className="text-gray-900">Last 30 Days</option>
                  <option value="90" className="text-gray-900">Last 90 Days</option>
                </select>
                
                {/* Debug Info - Only show in development or when there's an error */}
                {(import.meta.env.DEV || error) && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        console.log('🐛 DEBUG INFO:', {
                          vendor: vendor ? {
                            id: vendor._id,
                            businessName: vendor.businessName,
                            email: vendor.email,
                            isAdminViewing: vendor.isAdminViewing
                          } : 'No vendor data',
                          analyticsData: analyticsData ? {
                            hasData: true,
                            totalOrders: analyticsData.summary?.totalOrders,
                            totalRevenue: analyticsData.summary?.totalRevenue,
                            salesDataLength: analyticsData.charts?.salesData?.length,
                            topProductsLength: analyticsData.charts?.topProducts?.length
                          } : 'No analytics data',
                          timeRange,
                          error: error || 'No error'
                        });
                        alert('Debug info logged to console. Check developer tools.');
                      }}
                      className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-orange-200 transition-colors"
                    >
                      Debug Info
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Money Earned */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</h3>
                  <p className="text-sm text-green-600 font-medium">Money Earned</p>
                  <p className="text-xs text-gray-500">After platform fees</p>
                </div>
              </div>
            </div>

            {/* Orders Received */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">{formatNumber(totalOrders)}</h3>
                  <p className="text-sm text-blue-600 font-medium">Orders Received</p>
                  <p className="text-xs text-gray-500">Total in period</p>
                </div>
              </div>
            </div>

            {/* Products Listed */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">{formatNumber(topProducts?.length || 0)}</h3>
                  <p className="text-sm text-purple-600 font-medium">Products Listed</p>
                  <p className="text-xs text-gray-500">0 active</p>
                </div>
              </div>
            </div>

            {/* Average Order */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(avgOrderValue)}</h3>
                  <p className="text-sm text-orange-600 font-medium">Average Order</p>
                  <p className="text-xs text-gray-500">Customer spends</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Sales Trends Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trends</h3>
              {salesData && salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#6B7280' }} 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                        if (name === 'sales') return [formatNumber(value), 'Items Sold'];
                        if (name === 'orders') return [formatNumber(value), 'Orders'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        });
                      }}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#F97316" fillOpacity={1} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No sales data available</p>
                  <p className="text-sm text-gray-400 mt-1">Sales trends will appear here once you start making sales</p>
                </div>
              )}
            </div>

            {/* Order Status Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
              {legacyOrderStatusData && legacyOrderStatusData.length > 0 ? (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={legacyOrderStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                        labelLine={false}
                      >
                        {legacyOrderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No order data available</p>
                  <p className="text-sm text-gray-400 mt-1">Order status breakdown will appear here once you receive orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          {topProducts && topProducts.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <span>Best Sellers (by Revenue)</span>
                <span className="text-sm text-gray-500">Top {Math.min(5, topProducts.length)} products</span>
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts.slice(0, 5)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                      if (name === 'sales') return [formatNumber(value), 'Units Sold'];
                      if (name === 'orders') return [formatNumber(value), 'Orders'];
                      return [value, name];
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Bar dataKey="revenue" fill="#F97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Products details table */}
              <div className="mt-4 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Units</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topProducts.slice(0, 5).map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-right">
                          {formatNumber(product.sales)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-right font-semibold">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-right">
                          {formatNumber(product.orders)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Sellers</h3>
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-500 font-medium">No product sales data</p>
                <p className="text-sm text-gray-400 mt-1 text-center">Your best-selling products will appear here once customers<br />start purchasing your items</p>
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Status</h3>
            {stockData && stockData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Pie Chart */}
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={stockData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                        labelLine={false}
                      >
                        {stockData.map((entry, index) => (
                          <Cell key={`stock-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [formatNumber(value), `${name} Products`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Stock Summary Cards */}
                <div className="space-y-4">
                  {stockData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: item.color + '40', backgroundColor: item.color + '10' }}>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color }}></div>
                        <span className="font-medium text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-bold text-lg" style={{ color: item.color }}>
                        {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                  
                  {/* Total Products */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 mt-4">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-3 bg-gray-400"></div>
                      <span className="font-medium text-gray-700">Total Products</span>
                    </div>
                    <span className="font-bold text-lg text-gray-600">
                      {formatNumber(stockData.reduce((sum, item) => sum + item.value, 0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-500 font-medium">No inventory data available</p>
                <p className="text-sm text-gray-400 mt-1 text-center">Add products to your store to see inventory tracking</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorAnalyticsPage;
