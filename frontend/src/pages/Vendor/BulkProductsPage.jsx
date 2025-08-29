import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { vendorService } from '../../services/vendorService';

const BulkProductsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    lowStock: false,
    search: ''
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Bulk update form data
  const [bulkUpdateData, setBulkUpdateData] = useState({
    status: '',
    category: '',
    priceAdjustment: {
      type: 'percentage', // 'percentage' or 'fixed'
      value: '',
      operation: 'increase' // 'increase' or 'decrease'
    },
    stock: {
      operation: 'set', // 'set', 'increase', 'decrease'
      value: ''
    }
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [pagination.page, filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      const response = await vendorService.getVendorProducts(queryParams);
      setProducts(response.data.products || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await vendorService.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId, checked) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.length === 0) {
      setError('Please select products and an action');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let response;
      
      switch (bulkAction) {
        case 'delete':
          if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
            setLoading(false);
            return;
          }
          response = await vendorService.bulkDeleteProducts(selectedProducts);
          break;
          
        case 'update_status':
          if (!bulkUpdateData.status) {
            setError('Please select a status to update');
            setLoading(false);
            return;
          }
          response = await vendorService.bulkUpdateProducts(selectedProducts, {
            status: bulkUpdateData.status
          });
          break;
          
        case 'update_category':
          if (!bulkUpdateData.category) {
            setError('Please select a category to update');
            setLoading(false);
            return;
          }
          response = await vendorService.bulkUpdateProducts(selectedProducts, {
            category: bulkUpdateData.category
          });
          break;
          
        case 'update_prices':
          if (!bulkUpdateData.priceAdjustment.value) {
            setError('Please enter a price adjustment value');
            setLoading(false);
            return;
          }
          response = await vendorService.bulkUpdatePrices(selectedProducts, bulkUpdateData.priceAdjustment);
          break;
          
        case 'update_stock':
          if (!bulkUpdateData.stock.value) {
            setError('Please enter a stock value');
            setLoading(false);
            return;
          }
          response = await vendorService.bulkUpdateStock(selectedProducts, bulkUpdateData.stock);
          break;
          
        default:
          setError('Invalid bulk action');
          setLoading(false);
          return;
      }

      if (response.data.success) {
        setSuccess(`Successfully updated ${selectedProducts.length} products`);
        setSelectedProducts([]);
        setBulkAction('');
        loadProducts();
      } else {
        setError(response.data.message || 'Bulk operation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      category: '',
      lowStock: false,
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStockStatus = (stock, lowStockThreshold = 10) => {
    if (stock === 0) return { text: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    if (stock <= lowStockThreshold) return { text: 'Low Stock', color: 'text-yellow-600 bg-yellow-50' };
    return { text: 'In Stock', color: 'text-green-600 bg-green-50' };
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Product Management</h1>
            <p className="text-gray-600">Manage multiple products at once</p>
          </div>
          <button
            onClick={() => navigate('/vendor/products')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Products
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Product name, SKU..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) => handleFilterChange('lowStock', e.target.checked)}
                  className="mr-2 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Low Stock Only</span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Bulk Actions ({selectedProducts.length} selected)
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Action
                </label>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Choose an action...</option>
                  <option value="update_status">Update Status</option>
                  <option value="update_category">Update Category</option>
                  <option value="update_prices">Update Prices</option>
                  <option value="update_stock">Update Stock</option>
                  <option value="delete">Delete Products</option>
                </select>
              </div>

              <div>
                {/* Dynamic form based on selected action */}
                {bulkAction === 'update_status' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Status
                    </label>
                    <select
                      value={bulkUpdateData.status}
                      onChange={(e) => setBulkUpdateData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Select Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                )}

                {bulkAction === 'update_category' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Category
                    </label>
                    <select
                      value={bulkUpdateData.category}
                      onChange={(e) => setBulkUpdateData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {bulkAction === 'update_prices' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Price Adjustment
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={bulkUpdateData.priceAdjustment.operation}
                        onChange={(e) => setBulkUpdateData(prev => ({
                          ...prev,
                          priceAdjustment: { ...prev.priceAdjustment, operation: e.target.value }
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={bulkUpdateData.priceAdjustment.value}
                        onChange={(e) => setBulkUpdateData(prev => ({
                          ...prev,
                          priceAdjustment: { ...prev.priceAdjustment, value: e.target.value }
                        }))}
                        placeholder="Amount"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <select
                        value={bulkUpdateData.priceAdjustment.type}
                        onChange={(e) => setBulkUpdateData(prev => ({
                          ...prev,
                          priceAdjustment: { ...prev.priceAdjustment, type: e.target.value }
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">$</option>
                      </select>
                    </div>
                  </div>
                )}

                {bulkAction === 'update_stock' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Stock Update
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={bulkUpdateData.stock.operation}
                        onChange={(e) => setBulkUpdateData(prev => ({
                          ...prev,
                          stock: { ...prev.stock, operation: e.target.value }
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="set">Set to</option>
                        <option value="increase">Increase by</option>
                        <option value="decrease">Decrease by</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={bulkUpdateData.stock.value}
                        onChange={(e) => setBulkUpdateData(prev => ({
                          ...prev,
                          stock: { ...prev.stock, value: e.target.value }
                        }))}
                        placeholder="Quantity"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleBulkAction}
                disabled={loading || !bulkAction}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Apply Action'}
              </button>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Products</h2>
              <div className="text-sm text-gray-600">
                {pagination.total} total products
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
                  return (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product._id)}
                          onChange={(e) => handleSelectProduct(product._id, e.target.checked)}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-10 h-10 rounded-md object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.brand}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.sku || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                          {product.stock} ({stockStatus.text})
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          product.status === 'active' 
                            ? 'text-green-600 bg-green-50'
                            : product.status === 'inactive'
                            ? 'text-red-600 bg-red-50'
                            : 'text-yellow-600 bg-yellow-50'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.category?.name || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default BulkProductsPage;
