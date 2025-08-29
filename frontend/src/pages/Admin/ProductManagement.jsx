import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Upload,
  Save,
  X,
  Eye,
  Package,
  ChevronDown,
  ImageIcon,
  DollarSign,
  Tag,
  FileText,
  Hash,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl, config } from '../../config';

import { getImageUrl as configGetImageUrl } from '../../config';

// Helper function to get the correct image URL
// Use this at the top of the file
const getImageUrl = (imagePath) => {
  if (!imagePath) return '/assets/no-image.png';
  return configGetImageUrl('products', imagePath);
};

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStock, setSelectedStock] = useState('all'); // Add stock filter
  const [categories, setCategories] = useState([]); // Dynamic categories from backend
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [itemsPerPage] = useState(20); // Fixed items per page
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    keywords: '',
    mainCategory: '',
    subCategory: '',
    image: null,
    imagePreview: null
  });

  // Create mappings for category IDs to names and vice versa
  const [categoryNameMap, setCategoryNameMap] = useState({});
  const [categoryIdMap, setCategoryIdMap] = useState({});
  
  // Initialize category mappings when categories are loaded
  useEffect(() => {
    const nameMap = {};
    const idMap = {};
    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        if (cat._id && cat.name) {
          nameMap[cat._id] = cat.name;
          idMap[cat.name] = cat._id;
        }
      });
    }
    setCategoryNameMap(nameMap);
    setCategoryIdMap(idMap);
  }, [categories]);

  // Function to get category name from ID
  const getCategoryName = (categoryId) => {
    return categoryNameMap[categoryId] || categoryId;
  };

  // Function to get category ID from name
  const getCategoryId = (categoryName) => {
    return categoryIdMap[categoryName] || categoryName;
  };

  // Build category map from actual database relationships
  const categoryMap = (() => {
    if (!Array.isArray(categories)) return {};
    
    const map = {};
    
    // Get main categories (no parent)
    const mainCategories = categories.filter(cat => !cat.parentCategory);
    
    // Build map: main category name -> subcategory names
    mainCategories.forEach(mainCat => {
      const subcategories = categories.filter(cat => {
        const parentId = cat.parentCategory?._id || cat.parentCategory;
        return parentId === mainCat._id;
      });
      
      map[mainCat.name] = subcategories.map(sub => sub.name);
    });
    
    console.log('ProductManagement categoryMap built from DB:', map);
    return map;
  })();

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [currentPage]); // Add currentPage dependency

  // Effect to reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadProducts();
    }
  }, [searchTerm, selectedCategory, selectedStock]);

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('🔄 [ADMIN] Loading categories...');
      const response = await axios.get(`${getApiUrl()}/admin/categories/`, { headers });
      const categoriesData = response.data.data || response.data || [];
      console.log('🔄 [ADMIN] Categories response:', categoriesData);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      console.log('🔄 [ADMIN] Categories set, count:', categoriesData?.length || 0);
    } catch (error) {
      console.error('❌ [ADMIN] Error loading categories:', error);
      // Fallback to empty array if categories can't be loaded
      setCategories([]);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Build query parameters for pagination and filtering
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        approvalStatus: 'all' // Load all products regardless of approval status
      });

      // Add search parameter if present
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      // Note: Category and stock filtering will be done client-side for now
      // since the API doesn't support these filters yet
      
      console.log('Making paginated request to admin products API with params:', params.toString());
      const response = await axios.get(`${getApiUrl()}/admin/products/?${params.toString()}`, { headers });
      console.log('Admin products response:', response.data);
      
      if (response.data.success) {
        setProducts(response.data.products || []);
        setCurrentPage(response.data.pagination?.currentPage || 1);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalProducts(response.data.pagination?.totalProducts || 0);
      } else {
        setProducts([]);
        setTotalPages(1);
        setTotalProducts(0);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to load products: ' + (error.response?.data?.message || error.message));
      setProducts([]);
      setTotalPages(1);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('💾 Saving product with categories:', {
      mainCategory: formData.mainCategory,
      subCategory: formData.subCategory,
      isEditing: !!editingProduct
    });
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      } : {};
      
      console.log('💾 [PRODUCT SAVE] Submitting product data:', {
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        isEditing: !!editingProduct,
        productId: editingProduct?._id,
        hasImage: !!formData.image
      });
      
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('stock', formData.stock);
      submitData.append('keywords', formData.keywords);
      
      // Send categories as arrays with proper IDs
      if (formData.mainCategory) {
        submitData.append('mainCategory', formData.mainCategory);
        submitData.append('category', formData.mainCategory); // Legacy field
      }
      
      if (formData.subCategory) {
        submitData.append('subCategory', formData.subCategory);
        submitData.append('subcategory', formData.subCategory); // Legacy field
      }
      
      // Handle image upload for both new and edit
      if (formData.image && formData.image instanceof File) {
        // Create unique filename with timestamp and random string
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11); // Generate shorter random string
        const ext = formData.image.name.split('.').pop().toUpperCase(); // Make extension uppercase
        const filename = `product-${timestamp}-${random}.${ext}`; // Use 'product-' prefix
        
        console.log('📸 [PRODUCT SAVE] Generated filename:', filename);
        
        // Create a new File object with the custom filename
        const renamedFile = new File([formData.image], filename, {
          type: formData.image.type
        });
        
        // Append both image and filename to ensure server gets the correct name
        submitData.append('image', renamedFile);
        submitData.append('filename', filename); // Add filename separately for server reference
        
        console.log('📸 [PRODUCT SAVE] Appending image file:', filename);
      } else if (editingProduct && editingProduct.image && !formData.image) {
        // Keep existing image if editing and no new image selected
        submitData.append('image', editingProduct.image);
        console.log('📸 [PRODUCT SAVE] Keeping existing image:', editingProduct.image);
      }

      console.log('💾 [PRODUCT SAVE] FormData contents:');
      for (let [key, value] of submitData.entries()) {
        console.log(`💾 [PRODUCT SAVE] ${key}:`, value);
      }

      if (editingProduct) {
        console.log('💾 [PRODUCT SAVE] Updating existing product...');
        const response = await axios.put(`${getApiUrl()}/admin/products/${editingProduct._id}`, submitData, { headers });
        console.log('✅ [PRODUCT SAVE] Update response:', response.data);
        
        // Ensure we update the product in our local state with the new image
        if (response.data.product) {
          const updatedProduct = response.data.product;
          
          // Ensure the image path is properly formatted
          if (updatedProduct.image && !updatedProduct.image.startsWith('product-')) {
            // Extract just the filename if it's a full path
            const filename = updatedProduct.image.split('/').pop();
            if (filename) {
              updatedProduct.image = filename;
            }
          }
          
          console.log('✅ [PRODUCT SAVE] Updated product with image:', updatedProduct.image);
          
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p._id === updatedProduct._id ? updatedProduct : p
            )
          );
        }
        
        alert('Product updated successfully');
      } else {
        console.log('💾 [PRODUCT SAVE] Creating new product...');
        const response = await axios.post(`${getApiUrl()}/admin/products`, submitData, { headers });
        console.log('✅ [PRODUCT SAVE] Create response:', response.data);
        alert('Product added successfully');
      }

      // Reset form and reload products
      resetForm();
      await loadProducts(); // Added await to ensure products are reloaded with fresh data
    } catch (error) {
      console.error('❌ Error saving product:', error);
      console.error('❌ Error details:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.delete(`${getApiUrl()}/admin/products/${productId}`, { headers });
      alert('Product deleted successfully');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleEdit = (product) => {
    if (!product) return;
    
    console.log('🔧 Starting product edit:', product);
    
    try {
      // Set the editing product first
      setEditingProduct(product);

      // Ensure we have categories loaded
      if (Object.keys(categoryMap).length === 0) {
        loadCategories();
      }

      // Extract main category with proper mapping
      let mainCat = '';
      if (product.mainCategory?._id) {
        mainCat = product.mainCategory._id;
      } else if (Array.isArray(product.mainCategory) && product.mainCategory[0]?._id) {
        mainCat = product.mainCategory[0]._id;
      } else if (product.mainCategory) {
        mainCat = product.mainCategory;
      }

      // Extract sub category with proper mapping
      let subCat = '';
      if (product.subCategory?._id) {
        subCat = product.subCategory._id;
      } else if (Array.isArray(product.subCategory) && product.subCategory[0]?._id) {
        subCat = product.subCategory[0]._id;
      } else if (product.subCategory) {
        subCat = product.subCategory;
      }

      console.log('🔧 Extracted categories:', {
        mainCat,
        subCat,
        originalMain: product.mainCategory,
        originalSub: product.subCategory
      });

      // Process the image URL
      let imagePreview = null;
      if (product.image) {
        // Handle both full URLs and relative paths
        if (product.image.startsWith('http')) {
          imagePreview = product.image;
        } else {
          // Ensure the path is properly formatted
          const cleanPath = product.image
            .replace(/^\/+/, '')
            .replace(/^uploads\/+/, '')
            .replace(/^products\/+/, '');
          imagePreview = `${config.BASE_URL}/uploads/products/${cleanPath}`;
        }
        console.log('🔧 Image preview URL:', imagePreview);
      }
      
      // Set form data
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price ? product.price.toString() : '',
        stock: product.stock !== undefined ? product.stock.toString() : '0',
        keywords: Array.isArray(product.keywords) ? product.keywords.join(', ') : product.keywords || '',
        mainCategory: mainCat,
        subCategory: subCat,
        image: null,
        imagePreview,
        existingImage: product.image // Store the original image path
      });

      // Show the form
      setShowAddForm(true);

      console.log('🔧 Form data set:', { mainCat, subCat, imagePreview });
    } catch (error) {
      console.error('Error processing product for edit:', error);
      alert('Failed to load product for editing. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      stock: '',
      keywords: '',
      mainCategory: '',
      subCategory: '',
      image: null,
      imagePreview: null
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const filteredProducts = products.filter(product => {
    // Only apply client-side filters for category and stock since API doesn't support them yet
    // Search is now handled server-side
    const matchesCategory = !selectedCategory || (() => {
      // Handle different category data structures
      if (Array.isArray(product.mainCategory) && product.mainCategory.length > 0) {
        const mainCat = product.mainCategory[0];
        // Check if it's an object with name property or just a string
        const categoryName = typeof mainCat === 'object' ? mainCat.name : mainCat;
        return categoryName === selectedCategory;
      } else if (typeof product.mainCategory === 'string') {
        return product.mainCategory === selectedCategory;
      } else if (product.mainCategoryName) {
        return product.mainCategoryName === selectedCategory;
      } else if (product.categoryName) {
        return product.categoryName === selectedCategory;
      }
      return false;
    })();
    
    const matchesStock = selectedStock === 'all' ||
                        (selectedStock === 'in-stock' && product.stock > 5) ||
                        (selectedStock === 'low-stock' && product.stock > 0 && product.stock <= 5) ||
                        (selectedStock === 'out-of-stock' && product.stock === 0);
    return matchesCategory && matchesStock;
  });

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, totalProducts)} of{' '}
            <span className="font-semibold">{totalProducts}</span> products
            {(searchTerm || selectedCategory || selectedStock !== 'all') && (
              <span className="text-blue-600"> (filtered)</span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-1">
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === totalPages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          {!loading && (
            <p className="text-gray-600 mt-1">
              {totalProducts > 0 ? (
                <>
                  {totalProducts} product{totalProducts !== 1 ? 's' : ''} total
                  {(searchTerm || selectedCategory || selectedStock !== 'all') && (
                    <span>, showing {filteredProducts.length} filtered</span>
                  )}
                </>
              ) : (
                'No products found'
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            loadCategories(); // Refresh categories when opening add form
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {Object.keys(categoryMap).map((category, index) => (
                <option key={`filter-${index}-${category}`} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock (≤5)</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <img
                src={getImageUrl(product.image)}
                alt={product.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                <p className="text-lg font-bold text-blue-600 mt-2">${product.price}</p>
                {/* Stock Status */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.stock !== undefined ? (
                    <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                      product.stock === 0 ? 'bg-red-100 text-red-800' :
                      product.stock <= 5 ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {product.stock === 0 ? 'Out of Stock' : 
                       product.stock <= 5 ? `Low Stock: ${product.stock}` :
                       `In Stock: ${product.stock}`}
                    </div>
                  ) : (
                    <div className="text-sm px-2 py-1 rounded-full inline-block bg-gray-100 text-gray-600">
                      Stock not set
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {product.mainCategoryName || product.categoryName || 
                     (Array.isArray(product.mainCategory) && product.mainCategory.length > 0
                       ? (typeof product.mainCategory[0] === 'string' 
                          ? product.mainCategory[0] 
                          : product.mainCategory[0]?.name || 'Category')
                       : 'No Category')}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm || selectedCategory || selectedStock !== 'all' 
                ? 'Try adjusting your filters'
                : 'Start by adding your first product'}
            </p>
          </div>
        )}
      </div>

      {renderPagination()}

      {/* Add/Edit Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {editingProduct ? 'Update product information' : 'Create a new product listing'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Basic Information
                  </h3>
                  
                  {/* Image Preview Section */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Image
                    </label>
                    <div className="flex items-start space-x-4">
                      <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                        {formData.imagePreview ? (
                          <img 
                            src={formData.imagePreview}
                            alt="Product preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image preview failed to load:', formData.imagePreview);
                              e.target.src = '/assets/no-image.png';
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setFormData(prev => ({
                                ...prev,
                                image: file,
                                imagePreview: URL.createObjectURL(file)
                              }));
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Select a new image to change the current one
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                        placeholder="Enter product name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                        placeholder="Describe your product in detail..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                        onWheel={(e) => e.target.blur()} // Prevent scroll wheel from changing value
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Hash className="w-4 h-4 inline mr-1" />
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({...prev, stock: e.target.value}))}
                        onWheel={(e) => e.target.blur()} // Prevent scroll wheel from changing value
                        placeholder="0"
                        autoComplete="off"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">Number of items available in inventory</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Hash className="w-4 h-4 inline mr-1" />
                        Keywords
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., smartphone, electronic, mobile"
                        value={formData.keywords}
                        onChange={(e) => setFormData(prev => ({...prev, keywords: e.target.value}))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
                    </div>
                  </div>
                </div>

                {/* Category Selection Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Tag className="w-5 h-5 mr-2 text-blue-600" />
                    Category Selection
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Main Category Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Category *
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={formData.mainCategory}
                          onChange={(e) => {
                            const newMainCategory = e.target.value;
                            console.log('🔄 Main category changing to:', newMainCategory);
                            console.log('🔄 Current subcategory:', formData.subCategory);
                            console.log('🔄 Is editing product:', !!editingProduct);
                            
                            const availableSubCategories = categoryMap[newMainCategory] || [];
                            console.log('🔄 Available subcategories:', availableSubCategories);
                            
                            const shouldKeepSubCategory = editingProduct && 
                              availableSubCategories.includes(formData.subCategory);
                            
                            console.log('🔄 Should keep subcategory:', shouldKeepSubCategory);
                            
                            setFormData(prev => ({
                              ...prev, 
                              mainCategory: newMainCategory,
                              // Keep subcategory if it's valid for the new main category
                              subCategory: shouldKeepSubCategory ? prev.subCategory : ''
                            }));
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white"
                        >
                          <option value="">Select Main Category</option>
                          {Object.keys(categoryMap).map((categoryName, index) => (
                            <option key={`main-${index}-${categoryName}`} value={getCategoryId(categoryName)}>
                              {categoryName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sub Category Dropdown - Only show when main category is selected */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sub Category
                      </label>
                      <div className="relative">
                        <select
                          value={formData.subCategory}
                          onChange={(e) => setFormData(prev => ({...prev, subCategory: e.target.value}))}
                          disabled={!formData.mainCategory}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none ${
                            !formData.mainCategory ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                        >
                          <option value="">
                            {!formData.mainCategory ? 'Select main category first' : 'Select Sub Category (Optional)'}
                          </option>
                          {formData.mainCategory && categoryMap[getCategoryName(formData.mainCategory)]?.map((subcatName, index) => (
                            <option key={`sub-${index}-${subcatName}`} value={getCategoryId(subcatName)}>
                              {subcatName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {!formData.mainCategory ? 'Please select a main category first' : 'Choose a specific subcategory for better organization'}
                      </p>
                    </div>
                  </div>

                  {/* Category Preview */}
                  {formData.mainCategory && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Category Path:</strong> {getCategoryName(formData.mainCategory)}
                        {formData.subCategory && ` > ${getCategoryName(formData.subCategory)}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Image Upload and Preview Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Product Image
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="w-full sm:w-1/2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Image
                      </label>
                      <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden">
                        {formData.imagePreview ? (
                          <>
                            <img
                              src={formData.imagePreview}
                              alt="Product preview"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error('Image preview failed to load:', formData.imagePreview);
                                e.target.src = '/assets/no-image.png';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, image: null, imagePreview: null}))}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <ImageIcon className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setFormData(prev => ({
                                  ...prev, 
                                  image: file,
                                  imagePreview: e.target.result
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Supported formats: JPG, PNG. Max size: 5MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingProduct ? 'Update Product' : 'Add Product'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProductManagement;
