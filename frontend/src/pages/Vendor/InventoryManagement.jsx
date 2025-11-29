import React, { useState, useEffect } from 'react';

import inventoryService from '../../services/inventoryService';

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    sortBy: 'lastStockUpdate',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
    } else if (activeTab === 'inventory') {
      fetchInventoryItems();
    } else if (activeTab === 'alerts') {
      fetchAlerts();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, filters, pagination.currentPage]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getOverview();
      setOverview(response.data);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: 20,
        ...filters
      };
      const response = await inventoryService.getInventoryItems(params);
      setInventoryItems(response.data.items);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getAlerts();
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const acknowledgeAlert = async (inventoryId, alertId) => {
    try {
      await inventoryService.acknowledgeAlert(inventoryId, alertId);
      fetchAlerts(); // Refresh alerts
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'in_stock': return 'text-green-600';
      case 'low_stock': return 'text-yellow-600';
      case 'out_of_stock': return 'text-red-600';
      case 'discontinued': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStockStatusBadge = (status) => {
    const colors = {
      'in_stock': 'bg-green-100 text-green-800',
      'low_stock': 'bg-yellow-100 text-yellow-800',
      'out_of_stock': 'bg-red-100 text-red-800',
      'discontinued': 'bg-gray-100 text-gray-800'
    };

    const labels = {
      'in_stock': 'In Stock',
      'low_stock': 'Low Stock',
      'out_of_stock': 'Out of Stock',
      'discontinued': 'Discontinued'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.discontinued}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
        <p className="text-gray-600">Monitor and manage your product inventory</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: FiBarChart2 },
            { id: 'inventory', name: 'Inventory', icon: FiPackage },
            { id: 'alerts', name: 'Alerts', icon: FiAlertTriangle },
            { id: 'analytics', name: 'Analytics', icon: FiTrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
              {tab.id === 'alerts' && alerts.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs rounded-full px-2 py-1 ml-1">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : overview ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                        <dd className="text-lg font-semibold text-gray-900">{overview.summary.totalItems}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Stock</dt>
                        <dd className="text-lg font-semibold text-gray-900">{overview.summary.totalStock.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Items</dt>
                        <dd className="text-lg font-semibold text-gray-900">{overview.summary.lowStockItems}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 text-red-600">$</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                        <dd className="text-lg font-semibold text-gray-900">{formatCurrency(overview.summary.totalValue)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
                </div>
                <div className="p-6">
                  {overview.recentMovements.length > 0 ? (
                    <div className="space-y-4">
                      {overview.recentMovements.map((movement, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center space-x-4">
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={movement.product.images?.[0] || '/api/placeholder/40/40'}
                              alt={movement.product.name}
                            />
                            <div>
                              <p className="font-medium text-gray-900">{movement.product.name}</p>
                              <p className="text-sm text-gray-500">SKU: {movement.product.sku}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-gray-900">
                                Stock: {movement.currentStock}
                              </span>
                              {getStockStatusBadge(movement.stockStatus)}
                            </div>
                            <p className="text-sm text-gray-500">
                              Updated: {formatDate(movement.lastStockUpdate)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No recent stock movements</p>
                  )}
                </div>
              </div>

              {/* Quick Alerts */}
              {overview.alerts.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {overview.alerts.slice(0, 5).map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className={`w-5 h-5 ${getAlertSeverityColor(alert.severity)}`} />
                            <div>
                              <p className="font-medium text-gray-900">{alert.productName}</p>
                              <p className="text-sm text-gray-600">{alert.message}</p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(alert.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="lastStockUpdate">Last Updated</option>
                  <option value="currentStock">Stock Level</option>
                  <option value="product.name">Product Name</option>
                  <option value="stockStatus">Status</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inventory Items */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Inventory Items</h3>
              <div className="flex space-x-2">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  <Download className="w-4 h-4 inline mr-2" />
                  Export
                </button>
                <button 
                  onClick={fetchInventoryItems}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryItems.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={item.product.images?.[0] || '/api/placeholder/40/40'}
                              alt={item.product.name}
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                              <div className="text-sm text-gray-500">PKR {item.product.price}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.currentStock}</div>
                          <div className="text-xs text-gray-500">Available: {item.availableStock}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.reservedStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStockStatusBadge(item.stockStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.lastStockUpdate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-indigo-600 hover:text-indigo-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {inventoryItems.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding products to your inventory.</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total items)
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Inventory Alerts</h3>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <AlertTriangle className={`w-6 h-6 mt-0.5 ${getAlertSeverityColor(alert.severity)}`} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">{alert.productName}</h4>
                            <span className="text-sm text-gray-500">({alert.productSku})</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(alert.createdAt)} • Severity: {alert.severity}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => acknowledgeAlert(alert.inventoryId, alert._id)}
                        className="ml-4 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active alerts</h3>
                  <p className="mt-1 text-sm text-gray-500">All your inventory items are properly stocked.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : analytics ? (
            <>
              {/* Stock Status Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Status Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {analytics.statusDistribution.map((status, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{status.count}</div>
                      <div className="text-sm text-gray-500 capitalize">{status._id.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-400">{status.totalStock} units</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Movement Analytics */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Movements (Last {analytics.period} days)</h3>
                <div className="space-y-3">
                  {analytics.movementAnalytics.map((movement, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {movement._id.replace('_', ' ')}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{movement.totalQuantity} units</div>
                        <div className="text-xs text-gray-500">{movement.count} transactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Value Products */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products by Stock Value</h3>
                <div className="space-y-3">
                  {analytics.topValueProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                        <div className="text-xs text-gray-500">SKU: {product.productSku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(product.stockValue)}</div>
                        <div className="text-xs text-gray-500">{product.currentStock} units</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
