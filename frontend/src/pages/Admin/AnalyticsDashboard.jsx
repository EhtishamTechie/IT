import React, { useState, useEffect } from 'react';
import API from '../../api';

// Custom SVG Icons
const ChartBarIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const TrendingUpIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const UsersIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const CurrencyDollarIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.467-.22-2.121-.659-1.172-.879-1.172-2.303 0-3.182C10.464 7.68 11.232 7.5 12 7.5c.768 0 1.536.22 2.121.659l.879.659m-4.242-2.818L12 4.5v1m0 14v1" />
  </svg>
);

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState({
    overview: {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
      revenueGrowth: 0,
      orderGrowth: 0,
      customerGrowth: 0
    },
    salesData: [],
    topProducts: [],
    customerData: [],
    recentActivity: []
  });
  
  const [dateRange, setDateRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls for analytics data
      const [
        overviewRes,
        salesRes,
        productsRes,
        customersRes,
        activityRes
      ] = await Promise.all([
        generateOverviewData(),
        generateSalesData(),
        generateTopProductsData(),
        generateCustomerData(),
        generateRecentActivityData()
      ]);
      
      setAnalytics({
        overview: overviewRes,
        salesData: salesRes,
        topProducts: productsRes,
        customerData: customersRes,
        recentActivity: activityRes
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock overview data
  const generateOverviewData = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      totalRevenue: 125439.50,
      totalOrders: 1247,
      totalCustomers: 856,
      totalProducts: 342,
      revenueGrowth: 12.5,
      orderGrowth: 8.3,
      customerGrowth: 15.7
    };
  };

  // Generate mock sales data
  const generateSalesData = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 1000,
        orders: Math.floor(Math.random() * 50) + 10,
        customers: Math.floor(Math.random() * 30) + 5
      });
    }
    
    return data;
  };

  // Generate mock top products data
  const generateTopProductsData = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return [
      { name: 'iPhone 14 Pro Max', sales: 156, revenue: 156000, growth: 23.5 },
      { name: 'Samsung Galaxy S23', sales: 142, revenue: 128000, growth: 18.2 },
      { name: 'Sony WH-1000XM4', sales: 89, revenue: 35600, growth: 12.8 },
      { name: 'MacBook Pro 13"', sales: 67, revenue: 134000, growth: 9.3 },
      { name: 'iPad Air', sales: 78, revenue: 46800, growth: 15.1 }
    ];
  };

  // Generate mock customer data
  const generateCustomerData = async () => {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    return {
      newCustomers: 67,
      returningCustomers: 123,
      customerRetentionRate: 67.8,
      averageOrderValue: 98.50,
      customerLifetimeValue: 425.30
    };
  };

  // Generate mock recent activity data
  const generateRecentActivityData = async () => {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return [
      { type: 'order', message: 'New order #IT-1746456789 placed', timestamp: '2 minutes ago', amount: 299.99 },
      { type: 'customer', message: 'New customer John Smith registered', timestamp: '5 minutes ago' },
      { type: 'payment', message: 'Payment received for order #IT-1746456788', timestamp: '8 minutes ago', amount: 156.50 },
      { type: 'order', message: 'Order #IT-1746456787 shipped', timestamp: '12 minutes ago' },
      { type: 'product', message: 'Product "iPhone 14" stock updated', timestamp: '15 minutes ago' }
    ];
  };

  // Simple chart component for sales data
  const SalesChart = ({ data }) => {
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        <div className="h-64 flex items-end justify-between space-x-1">
          {data.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="bg-blue-500 w-full rounded-t"
                style={{
                  height: `${(day.revenue / maxRevenue) * 200}px`,
                  minHeight: '4px'
                }}
                title={`$${day.revenue} on ${day.date}`}
              />
              <span className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Orders chart component
  const OrdersChart = ({ data }) => {
    const maxOrders = Math.max(...data.map(d => d.orders));
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Trend</h3>
        <div className="h-64 flex items-end justify-between space-x-1">
          {data.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="bg-green-500 w-full rounded-t"
                style={{
                  height: `${(day.orders / maxOrders) * 200}px`,
                  minHeight: '4px'
                }}
                title={`${day.orders} orders on ${day.date}`}
              />
              <span className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive insights into your business performance</p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6">
          <div className="flex space-x-4">
            {['7days', '30days', '90days'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {range === '7days' ? 'Last 7 Days' : range === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'sales', name: 'Sales' },
                { id: 'products', name: 'Products' },
                { id: 'customers', name: 'Customers' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${analytics.overview.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 flex items-center">
                      <TrendingUpIcon className="h-4 w-4 mr-1" />
                      +{analytics.overview.revenueGrowth}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analytics.overview.totalOrders.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 flex items-center">
                      <TrendingUpIcon className="h-4 w-4 mr-1" />
                      +{analytics.overview.orderGrowth}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UsersIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Customers</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analytics.overview.totalCustomers.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 flex items-center">
                      <TrendingUpIcon className="h-4 w-4 mr-1" />
                      +{analytics.overview.customerGrowth}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Products</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analytics.overview.totalProducts.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Active listings</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart data={analytics.salesData} />
              <OrdersChart data={analytics.salesData} />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {analytics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'order' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'customer' ? 'bg-green-100 text-green-600' :
                          activity.type === 'payment' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <div className="h-2 w-2 rounded-full bg-current"></div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.timestamp}</p>
                        </div>
                      </div>
                      {activity.amount && (
                        <span className="text-sm font-semibold text-green-600">
                          +${activity.amount}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart data={analytics.salesData} />
              <OrdersChart data={analytics.salesData} />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    ${analytics.salesData.reduce((sum, day) => sum + day.revenue, 0).toLocaleString()}
                  </p>
                  <p className="text-gray-500">Total Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {analytics.salesData.reduce((sum, day) => sum + day.orders, 0)}
                  </p>
                  <p className="text-gray-500">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    ${(analytics.salesData.reduce((sum, day) => sum + day.revenue, 0) / 
                       analytics.salesData.reduce((sum, day) => sum + day.orders, 0)).toFixed(2)}
                  </p>
                  <p className="text-gray-500">Average Order Value</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {analytics.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-600 font-semibold">#{index + 1}</span>
                        </div>
                        <div className="ml-4">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.sales} sales</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${product.revenue.toLocaleString()}</p>
                        <p className="text-sm text-green-600">+{product.growth}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-900 mb-2">New Customers</h4>
                <p className="text-3xl font-bold text-blue-600">{analytics.customerData.newCustomers}</p>
                <p className="text-sm text-gray-500">This period</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-900 mb-2">Returning Customers</h4>
                <p className="text-3xl font-bold text-green-600">{analytics.customerData.returningCustomers}</p>
                <p className="text-sm text-gray-500">This period</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-900 mb-2">Retention Rate</h4>
                <p className="text-3xl font-bold text-purple-600">{analytics.customerData.customerRetentionRate}%</p>
                <p className="text-sm text-gray-500">Customer retention</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-900 mb-4">Average Order Value</h4>
                <p className="text-4xl font-bold text-blue-600">${analytics.customerData.averageOrderValue}</p>
                <p className="text-sm text-gray-500 mt-2">Per customer order</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-900 mb-4">Customer Lifetime Value</h4>
                <p className="text-4xl font-bold text-green-600">${analytics.customerData.customerLifetimeValue}</p>
                <p className="text-sm text-gray-500 mt-2">Average CLV</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
