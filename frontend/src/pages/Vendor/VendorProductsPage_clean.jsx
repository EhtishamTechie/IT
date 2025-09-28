import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { vendorService } from '../../services/vendorService';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { config } from '../../config';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye,
  AlertCircle,
  DollarSign,
  Box
} from 'lucide-react';

const VendorProductsPage = () => {
  console.log('🔥 VENDOR PRODUCTS PAGE (CLEAN) COMPONENT MOUNTED!');
  
  const { vendor } = useVendorAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [vendorCategories, setVendorCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  console.log('🔥 VENDOR FROM CONTEXT:', vendor);
  console.log('🔥 INITIAL STATS STATE:', stats);
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    stockStatus: '', // New filter for stock status
    minPrice: '',
    maxPrice: '',
    sort: 'newest'
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    limit: 12
  });

  useEffect(() => {
    console.log('🔥 USE EFFECT TRIGGERED!');
    fetchProducts();
    fetchVendorCategories();
  }, [filters, pagination.currentPage]);

  // Calculate stats whenever products change
  useEffect(() => {
    if (products.length >= 0) { // Run even if 0 products to show accurate stats
      calculateStatsFromProducts();
    }
  }, [products]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await vendorService.getVendorProducts(params);
      
      console.log('🖼️ VENDOR PRODUCTS FETCH DEBUG:');
      console.log('Full response:', response);
      console.log('Products array:', response.products);
      if (response.products && response.products.length > 0) {
        console.log('First product images:', response.products[0].images);
        console.log('First product image field:', response.products[0].image);
      }
      
      if (response.success) {
        setProducts(response.products || []);
        setPagination(prev => ({
          ...prev,
          totalPages: response.totalPages || 1,
          totalProducts: response.totalProducts || 0
        }));
      } else {
        setError('Failed to load products');
      }
    } catch (error) {
      console.error('Products fetch error:', error);
      setError('Error loading products');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('🔍 Calculating stats from products data...');
      // Calculate stats directly from the products array
      calculateStatsFromProducts();
    } catch (error) {
      console.error('Stats calculation error:', error);
    }
  };

  const calculateStatsFromProducts = () => {
    console.log('📊 Calculating product statistics from current products array...');
    console.log('📊 Products array length:', products.length);
    console.log('📊 Sample product:', products[0]);
    
    const calculatedStats = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, product) => sum + (product.price || 0), 0),
      lowStockProducts: products.filter(product => (product.stock || 0) < 5 && (product.stock || 0) > 0).length,
      outOfStockProducts: products.filter(product => (product.stock || 0) === 0).length
    };
    
    console.log('📊 Calculated stats:', calculatedStats);
    setStats(calculatedStats);
  };

  const fetchVendorCategories = async () => {
    try {
      console.log('🔍 Fetching categories...');
      const response = await vendorService.getCategories();
      console.log('📂 Categories response (full):', response);
      console.log('📂 Response type:', typeof response);
      console.log('📂 Response.success:', response.success);
      console.log('📂 Response.data:', response.data);
      console.log('📂 Response.data type:', typeof response.data);
      console.log('📂 Response.data length:', response.data?.length);
      
      // Handle the response structure: response contains { success: true, data: categories }
      // This matches how VendorCategoriesPage.jsx handles it
      if (response.success && response.data) {
        console.log('📂 ✅ Valid response structure found');
        console.log('📂 Categories array:', response.data);
        console.log('📂 Setting categories count:', response.data.length);
        
        // Ensure we're setting an array
        const categoriesArray = Array.isArray(response.data) ? response.data : [];
        setVendorCategories(categoriesArray);
        console.log('📂 ✅ Categories set successfully, count:', categoriesArray.length);
        console.log('📂 ✅ Current vendorCategories state should be:', categoriesArray);
      } else {
        console.log('📂 ❌ Invalid response structure:', {
          hasSuccess: !!response.success,
          hasData: !!response.data,
          response: response
        });
        setVendorCategories([]);
      }
    } catch (error) {
      console.error('📂 ❌ Categories fetch error:', error);
      setVendorCategories([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await vendorService.deleteVendorProduct(productId);
      if (response.success) {
        setProducts(products.filter(p => p._id !== productId));
        // Stats will be automatically recalculated when products state changes
      } else {
        setError('Failed to delete product');
      }
    } catch (error) {
      console.error('Delete product error:', error);
      setError('Error deleting product');
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return 'out-of-stock';
    if (stock < 5) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusColor = (stock) => {
    if (stock === 0) return 'text-red-600 bg-red-100';
    if (stock < 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const StatsCard = ({ title, value, icon: Icon, color = "orange" }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const ProductRow = ({ product }) => {
    // Import config at the top level of the file
    const { UPLOADS_URL } = config;
    
    // Determine image source with fallbacks and better logging
    let imageSource = '/placeholder-product.jpg'; // Default fallback
    
    if (product.images && product.images.length > 0) {
      // Use the full URL directly if provided, otherwise treat as relative path
      imageSource = product.images[0].startsWith('http') ? 
        product.images[0] : 
        `${config.UPLOADS_URL}/${product.images[0].replace(/^\/?(uploads\/?)?/, '')}`;
      console.log('📷 Using product.images[0]:', imageSource);
    } else if (product.image) {
      // Use the full URL directly if provided, otherwise treat as relative path
      imageSource = product.image.startsWith('http') ? 
        product.image : 
        `${config.UPLOADS_URL}/${product.image.replace(/^\/?(uploads\/?)?/, '')}`;
      console.log('📷 Using product.image:', imageSource);
    } else {
      console.log('📷 No image found, using placeholder');
    }
    
    return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <img
            src={imageSource}
            alt={product.title}
            className="h-12 w-12 rounded-lg object-cover"
            onLoad={(e) => {
              console.log(`  Image loaded successfully: ${e.target.src}`);
            }}
            onError={(e) => {
              // Prevent infinite loop by checking if we're already using a placeholder
              if (!e.target.src.includes('data:image')) {
                console.log(`  Image failed to load: ${e.target.src}`);
                console.log('  Switching to placeholder...');
                // Use a simple data URI placeholder to prevent infinite loops
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkMyMC40MTgzIDE2IDI0IDE5LjU4MTcgMjQgMjRDMjQgMjguNDE4MyAyMC40MTgzIDMyIDE2IDMyQzExLjU4MTcgMzIgOCAyOC40MTgzIDggMjRDOCAxOS41ODE3IDExLjU4MTcgMTYgMTYgMTZaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0zMiAzMkgxNkwyNCAxNkwzMiAzMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg==';
              }
            }}
          />
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{product.title}</div>
            <div className="text-sm text-gray-500">{product.description?.substring(0, 50)}...</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">PKR {product.price}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(product.stock || 0)}`}>
          {product.stock || 0}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(product.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center gap-2">
          <Link
            to={`/product/${product._id}`}
            className="text-orange-600 hover:text-orange-900"
            title="View Product"
          >
            <Eye size={16} />
          </Link>
          <Link
            to={`/vendor/products/${product._id}/edit`}
            className="text-blue-600 hover:text-blue-900"
            title="Edit"
          >
            <Edit3 size={16} />
          </Link>
          <button
            onClick={() => handleDeleteProduct(product._id)}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
            <p className="text-gray-600">Manage your product catalog</p>
          </div>
          <Link
            to="/vendor/products/add"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add Product
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Products"
            value={stats.totalProducts || 0}
            icon={Package}
            color="orange"
          />
          <StatsCard
            title="Total Value"
            value={`$${stats.totalValue || 0}`}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Low Stock"
            value={stats.lowStockProducts || 0}
            icon={AlertCircle}
            color="yellow"
          />
          <StatsCard
            title="Out of Stock"
            value={stats.outOfStockProducts || 0}
            icon={Box}
            color="red"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter - Only Vendor Categories */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {vendorCategories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Stock Status Filter */}
            <select
              value={filters.stockStatus}
              onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Stock Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock (&lt; 5)</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>

            {/* Sort */}
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first product.</p>
                <div className="mt-6">
                  <Link
                    to="/vendor/products/add"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Add Product
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Table */}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map(product => (
                      <ProductRow key={product._id} product={product} />
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between items-center">
                      <div className="text-sm text-gray-700">
                        Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.limit, pagination.totalProducts)} of{' '}
                        {pagination.totalProducts} results
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                          disabled={pagination.currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm font-medium">
                          Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorProductsPage;
