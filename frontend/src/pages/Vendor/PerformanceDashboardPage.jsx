import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { vendorService } from '../../services/vendorService';

const PerformanceDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const [comparisonMode, setComparisonMode] = useState('previous_period');
  const [error, setError] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    loadPerformanceData();
  }, [timeRange, comparisonMode]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        timeRange,
        comparison: comparisonMode
      };

      const response = await vendorService.getPerformanceMetrics(params);
      setPerformanceData(response.data);
    } catch (err) {
      setError('Failed to load performance data');
      console.error('Error loading performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getMetricIcon = (metric) => {
    const icons = {
      revenue: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      orders: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      products: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      customers: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    };
    return icons[metric] || icons.revenue;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change) => {
    if (change > 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    }
    if (change < 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    );
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

  if (error && !performanceData) {
    return (
      <VendorLayout>
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={loadPerformanceData}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </VendorLayout>
    );
  }

  const {
    overview = {},
    trends = [],
    comparisons = {},
    kpis = {},
    goals = {},
    insights = []
  } = performanceData || {};

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your business performance and growth metrics</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
            
            <select
              value={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="previous_period">vs Previous Period</option>
              <option value="previous_year">vs Previous Year</option>
              <option value="industry_average">vs Industry Average</option>
            </select>
          </div>
        </div>

        {/* KPI Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Performance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.revenue)}</p>
                <div className={`flex items-center mt-1 text-sm ${getChangeColor(comparisons.revenue?.change)}`}>
                  {getChangeIcon(comparisons.revenue?.change)}
                  <span className="ml-1">
                    {comparisons.revenue?.change >= 0 ? '+' : ''}
                    {formatPercentage(Math.abs(comparisons.revenue?.change || 0))}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                {getMetricIcon('revenue')}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Goal: {formatCurrency(goals.revenue?.target)}</span>
                <span>{formatPercentage(goals.revenue?.progress)} achieved</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (goals.revenue?.progress || 0) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Orders Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders Performance</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(overview.orders)}</p>
                <div className={`flex items-center mt-1 text-sm ${getChangeColor(comparisons.orders?.change)}`}>
                  {getChangeIcon(comparisons.orders?.change)}
                  <span className="ml-1">
                    {comparisons.orders?.change >= 0 ? '+' : ''}
                    {formatPercentage(Math.abs(comparisons.orders?.change || 0))}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                {getMetricIcon('orders')}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Goal: {formatNumber(goals.orders?.target)}</span>
                <span>{formatPercentage(goals.orders?.progress)} achieved</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (goals.orders?.progress || 0) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Product Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Product Performance</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(overview.productsSold)}</p>
                <div className={`flex items-center mt-1 text-sm ${getChangeColor(comparisons.products?.change)}`}>
                  {getChangeIcon(comparisons.products?.change)}
                  <span className="ml-1">
                    {comparisons.products?.change >= 0 ? '+' : ''}
                    {formatPercentage(Math.abs(comparisons.products?.change || 0))}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                {getMetricIcon('products')}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Avg. Conversion Rate</span>
                <span>{formatPercentage(overview.conversionRate)}</span>
              </div>
            </div>
          </div>

          {/* Customer Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Growth</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(overview.newCustomers)}</p>
                <div className={`flex items-center mt-1 text-sm ${getChangeColor(comparisons.customers?.change)}`}>
                  {getChangeIcon(comparisons.customers?.change)}
                  <span className="ml-1">
                    {comparisons.customers?.change >= 0 ? '+' : ''}
                    {formatPercentage(Math.abs(comparisons.customers?.change || 0))}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                {getMetricIcon('customers')}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Retention Rate</span>
                <span>{formatPercentage(overview.retentionRate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Trends</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedMetric('revenue')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedMetric === 'revenue' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setSelectedMetric('orders')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedMetric === 'orders' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setSelectedMetric('customers')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedMetric === 'customers' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Customers
              </button>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [
                  selectedMetric === 'revenue' ? formatCurrency(value) : formatNumber(value),
                  selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
                ]} 
              />
              <Area 
                type="monotone" 
                dataKey={selectedMetric} 
                stroke={selectedMetric === 'revenue' ? '#FF9900' : selectedMetric === 'orders' ? '#2563EB' : '#7C3AED'} 
                fill={selectedMetric === 'revenue' ? '#FF9900' : selectedMetric === 'orders' ? '#2563EB' : '#7C3AED'} 
                fillOpacity={0.3} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Performance Indicators */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <span className="text-sm font-medium text-gray-700">Average Order Value</span>
                  <p className="text-xs text-gray-500">Revenue per order</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(kpis.averageOrderValue)}</span>
                  <div className={`text-xs ${getChangeColor(kpis.aovChange)}`}>
                    {kpis.aovChange >= 0 ? '+' : ''}{formatPercentage(kpis.aovChange)}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <span className="text-sm font-medium text-gray-700">Customer Acquisition Cost</span>
                  <p className="text-xs text-gray-500">Cost to acquire new customer</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(kpis.customerAcquisitionCost)}</span>
                  <div className={`text-xs ${getChangeColor(-kpis.cacChange)}`}>
                    {kpis.cacChange <= 0 ? '' : '-'}{formatPercentage(Math.abs(kpis.cacChange))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <span className="text-sm font-medium text-gray-700">Customer Lifetime Value</span>
                  <p className="text-xs text-gray-500">Total value per customer</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(kpis.customerLifetimeValue)}</span>
                  <div className={`text-xs ${getChangeColor(kpis.clvChange)}`}>
                    {kpis.clvChange >= 0 ? '+' : ''}{formatPercentage(kpis.clvChange)}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">Return on Investment</span>
                  <p className="text-xs text-gray-500">ROI on marketing spend</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">{formatPercentage(kpis.returnOnInvestment)}</span>
                  <div className={`text-xs ${getChangeColor(kpis.roiChange)}`}>
                    {kpis.roiChange >= 0 ? '+' : ''}{formatPercentage(kpis.roiChange)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    insight.type === 'positive' ? 'bg-green-400' :
                    insight.type === 'negative' ? 'bg-red-400' :
                    'bg-yellow-400'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    {insight.action && (
                      <p className="text-xs text-orange-600 mt-2 font-medium">{insight.action}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {(!insights || insights.length === 0) && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-gray-500">No insights available yet</p>
                  <p className="text-sm text-gray-400 mt-1">Insights will appear as you accumulate more data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Goal Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="2"
                  />
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#FF9900"
                    strokeWidth="2"
                    strokeDasharray={`${(goals.revenue?.progress || 0) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {Math.round((goals.revenue?.progress || 0) * 100)}%
                  </span>
                </div>
              </div>
              <h4 className="font-medium text-gray-900">Revenue Goal</h4>
              <p className="text-sm text-gray-600">{formatCurrency(goals.revenue?.current)} of {formatCurrency(goals.revenue?.target)}</p>
            </div>
            
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="2"
                  />
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeDasharray={`${(goals.orders?.progress || 0) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {Math.round((goals.orders?.progress || 0) * 100)}%
                  </span>
                </div>
              </div>
              <h4 className="font-medium text-gray-900">Orders Goal</h4>
              <p className="text-sm text-gray-600">{formatNumber(goals.orders?.current)} of {formatNumber(goals.orders?.target)}</p>
            </div>
            
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="2"
                  />
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="2"
                    strokeDasharray={`${(goals.customers?.progress || 0) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {Math.round((goals.customers?.progress || 0) * 100)}%
                  </span>
                </div>
              </div>
              <h4 className="font-medium text-gray-900">Customers Goal</h4>
              <p className="text-sm text-gray-600">{formatNumber(goals.customers?.current)} of {formatNumber(goals.customers?.target)}</p>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default PerformanceDashboardPage;
