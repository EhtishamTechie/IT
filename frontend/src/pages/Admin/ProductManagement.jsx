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
    shipping: '',
    keywords: '',
    mainCategory: '',
    subCategory: '',
    image: null,
    images: [],
    video: null,
    imagePreview: null,
    imagePreviews: [],
    videoPreview: null,
    // SEO Fields
    slug: '',
    metaTitle: '',
    metaDescription: '',
    altText: '',
    seoKeywords: '',
    canonicalUrl: ''
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
      submitData.append('shipping', formData.shipping || '0');
      submitData.append('keywords', formData.keywords);
      
      // Add SEO fields
      if (formData.slug) submitData.append('slug', formData.slug);
      if (formData.metaTitle) submitData.append('metaTitle', formData.metaTitle);
      if (formData.metaDescription) submitData.append('metaDescription', formData.metaDescription);
      if (formData.altText) submitData.append('altText', formData.altText);
      if (formData.seoKeywords) submitData.append('seoKeywords', formData.seoKeywords);
      if (formData.canonicalUrl) submitData.append('canonicalUrl', formData.canonicalUrl);
      
      // Send categories as arrays with proper IDs
      if (formData.mainCategory) {
        submitData.append('mainCategory', formData.mainCategory);
        submitData.append('category', formData.mainCategory); // Legacy field
      }
      
      if (formData.subCategory) {
        submitData.append('subCategory', formData.subCategory);
        submitData.append('subcategory', formData.subCategory); // Legacy field
      }
      
      // Handle file uploads for multiple images and video
      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((file, index) => {
          if (file instanceof File) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 11);
            const ext = file.name.split('.').pop().toUpperCase();
            const filename = `product-${timestamp}-${random}-${index}.${ext}`;
            
            const renamedFile = new File([file], filename, { type: file.type });
            submitData.append('images', renamedFile);
            console.log('📸 [PRODUCT SAVE] Appending image file:', filename);
          }
        });
      }
      
      if (formData.video && formData.video instanceof File) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        const ext = formData.video.name.split('.').pop().toUpperCase();
        const filename = `product-video-${timestamp}-${random}.${ext}`;
        
        const renamedFile = new File([formData.video], filename, { type: formData.video.type });
        submitData.append('video', renamedFile);
        console.log('🎥 [PRODUCT SAVE] Appending video file:', filename);
      }

      // Handle PRIMARY image upload (dedicated primary image field)
      if (formData.image && formData.image instanceof File) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        const ext = formData.image.name.split('.').pop().toUpperCase();
        const filename = `product-primary-${timestamp}-${random}.${ext}`;
        
        const renamedFile = new File([formData.image], filename, { type: formData.image.type });
        submitData.append('image', renamedFile);
        console.log('📸 [PRODUCT SAVE] Appending PRIMARY image file:', filename);
        console.log('📸 [PRODUCT SAVE] Primary image file object:', renamedFile);
      } else if (editingProduct && editingProduct.image && !formData.image && (!formData.images || formData.images.length === 0)) {
        // Keep existing image if editing and no new images selected
        submitData.append('image', editingProduct.image);
        console.log('📸 [PRODUCT SAVE] Keeping existing image:', editingProduct.image);
      } else {
        console.log('⚠️ [PRODUCT SAVE] No primary image to append - formData.image:', formData.image);
      }

      console.log('💾 [PRODUCT SAVE] FormData contents:');
      console.log('💾 [PRODUCT SAVE] formData.image (before append):', formData.image);
      console.log('💾 [PRODUCT SAVE] formData.images (before append):', formData.images);
      for (let [key, value] of submitData.entries()) {
        console.log(`💾 [PRODUCT SAVE] ${key}:`, value);
        if (key === 'image' && value instanceof File) {
          console.log(`💾 [PRODUCT SAVE] PRIMARY IMAGE FILE Details - Name: ${value.name}, Size: ${value.size}, Type: ${value.type}`);
        }
        if (key === 'images' && value instanceof File) {
          console.log(`💾 [PRODUCT SAVE] MULTIPLE IMAGE FILE Details - Name: ${value.name}, Size: ${value.size}, Type: ${value.type}`);
        }
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

      // Process images and video URLs
      let imagePreview = null;
      let imagePreviews = [];
      let videoPreview = null;
      
      // Handle primary image for backward compatibility
      if (product.image) {
        if (product.image.startsWith('http')) {
          imagePreview = product.image;
        } else {
          const cleanPath = product.image
            .replace(/^\/+/, '')
            .replace(/^uploads\/+/, '')
            .replace(/^products\/+/, '');
          imagePreview = `${config.BASE_URL}/uploads/products/${cleanPath}`;
        }
        console.log('🔧 Image preview URL:', imagePreview);
      }
      
      // Handle multiple images
      if (product.images && Array.isArray(product.images)) {
        imagePreviews = product.images.map(img => {
          if (img.startsWith('http')) {
            return img;
          } else {
            const cleanPath = img
              .replace(/^\/+/, '')
              .replace(/^uploads\/+/, '')
              .replace(/^products\/+/, '');
            return `${config.BASE_URL}/uploads/products/${cleanPath}`;
          }
        });
        console.log('🔧 Multiple image previews:', imagePreviews);
      }
      
      // Handle video
      if (product.video) {
        if (product.video.startsWith('http')) {
          videoPreview = product.video;
        } else {
          const cleanPath = product.video
            .replace(/^\/+/, '')
            .replace(/^uploads\/+/, '')
            .replace(/^products\/+/, '');
          videoPreview = `${config.BASE_URL}/uploads/products/${cleanPath}`;
        }
        console.log('🔧 Video preview URL:', videoPreview);
      }
      
      // Set form data
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price ? product.price.toString() : '',
        stock: product.stock !== undefined ? product.stock.toString() : '0',
        shipping: product.shipping !== undefined ? product.shipping.toString() : '0',
        keywords: Array.isArray(product.keywords) ? product.keywords.join(', ') : product.keywords || '',
        mainCategory: mainCat,
        subCategory: subCat,
        image: null,
        images: [],
        video: null,
        imagePreview,
        imagePreviews,
        videoPreview,
        existingImage: product.image, // Store the original image path
        existingImages: product.images || [], // Store original images
        existingVideo: product.video, // Store original video
        // SEO Fields
        slug: product.slug || '',
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        altText: product.altText || '',
        seoKeywords: Array.isArray(product.seoKeywords) ? product.seoKeywords.join(', ') : product.seoKeywords || '',
        canonicalUrl: product.canonicalUrl || ''
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
      shipping: '',
      keywords: '',
      mainCategory: '',
      subCategory: '',
      image: null,
      images: [],
      video: null,
      imagePreview: null,
      imagePreviews: [],
      videoPreview: null,
      // SEO Fields
      slug: '',
      metaTitle: '',
      metaDescription: '',
      altText: '',
      seoKeywords: '',
      canonicalUrl: ''
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
                        <Package className="w-4 h-4 inline mr-1" />
                        Shipping Cost ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.shipping}
                        onChange={(e) => setFormData(prev => ({...prev, shipping: e.target.value}))}
                        onWheel={(e) => e.target.blur()} // Prevent scroll wheel from changing value
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">Shipping fee for this product. For multiple products, highest shipping fee applies.</p>
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

                {/* SEO Optimization Section */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Search className="w-5 h-5 mr-2 text-green-600" />
                    SEO Optimization
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Enhanced</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SEO Slug */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')}))}
                        placeholder="auto-generated-from-title"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from title. Used in URL: /product/your-slug</p>
                    </div>

                    {/* Meta Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SEO Meta Title
                      </label>
                      <input
                        type="text"
                        maxLength="60"
                        value={formData.metaTitle}
                        onChange={(e) => setFormData(prev => ({...prev, metaTitle: e.target.value}))}
                        placeholder="Optimized title for search engines"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.metaTitle.length}/60 characters. Leave empty to use product title.
                      </p>
                    </div>

                    {/* Meta Description */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SEO Meta Description
                      </label>
                      <textarea
                        rows={3}
                        maxLength="160"
                        value={formData.metaDescription}
                        onChange={(e) => setFormData(prev => ({...prev, metaDescription: e.target.value}))}
                        placeholder="Brief description that appears in search results..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.metaDescription.length}/160 characters. Leave empty to auto-generate from product description.
                      </p>
                    </div>

                    {/* Alt Text with Enhanced SEO Features */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image Alt Text
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          SEO Critical
                        </span>
                      </label>
                      <input
                        type="text"
                        maxLength="125"
                        value={formData.altText}
                        onChange={(e) => setFormData(prev => ({...prev, altText: e.target.value}))}
                        placeholder={formData.title ? `${formData.title} - Buy online at International Tijarat` : "Descriptive text for product images"}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      />
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-gray-500">
                          {formData.altText.length}/125 characters. Helps screen readers and SEO.
                        </p>
                        
                        {/* Auto-generate Alt Text Button */}
                        {formData.title && (
                          <button
                            type="button"
                            onClick={() => {
                              const category = formData.category || '';
                              const autoAltText = `${formData.title}${formData.brand ? ` by ${formData.brand}` : ''}${category ? ` - ${category}` : ''} - Buy online at International Tijarat`;
                              setFormData(prev => ({
                                ...prev,
                                altText: autoAltText.substring(0, 125)
                              }));
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            Auto-generate from product details
                          </button>
                        )}
                      </div>
                      
                      {/* Advanced Image SEO Guidance */}
                      <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Advanced Image SEO (Admin)
                        </h5>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs text-blue-800">
                          <div>
                            <h6 className="font-medium mb-1">✅ Best Practices:</h6>
                            <ul className="space-y-1">
                              <li>• Include product name + category</li>
                              <li>• Add quality descriptors</li>
                              <li>• Include brand if applicable</li>
                              <li>• Use natural language</li>
                            </ul>
                          </div>
                          <div>
                            <h6 className="font-medium mb-1">🔧 System Features:</h6>
                            <ul className="space-y-1">
                              <li>• Auto-watermarking enabled</li>
                              <li>• SEO-friendly filenames</li>
                              <li>• Multiple size generation</li>
                              <li>• Image optimization</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SEO Keywords */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SEO Keywords
                      </label>
                      <input
                        type="text"
                        value={formData.seoKeywords}
                        onChange={(e) => setFormData(prev => ({...prev, seoKeywords: e.target.value}))}
                        placeholder="keyword1, keyword2, keyword3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate with commas. Focus on specific product keywords.</p>
                    </div>

                    {/* Canonical URL */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Canonical URL (Advanced)
                      </label>
                      <input
                        type="url"
                        value={formData.canonicalUrl}
                        onChange={(e) => setFormData(prev => ({...prev, canonicalUrl: e.target.value}))}
                        placeholder="https://internationaltijarat.com/product/your-slug"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate. Used to prevent duplicate content issues.</p>
                    </div>
                  </div>

                  {/* SEO Preview */}
                  {(formData.metaTitle || formData.title) && (
                    <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Search Engine Preview:</h4>
                      <div className="space-y-1">
                        <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                          {formData.metaTitle || formData.title}
                        </div>
                        <div className="text-green-600 text-sm">
                          internationaltijarat.com/product/{formData.slug || 'product-slug'}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {formData.metaDescription || (formData.description ? formData.description.substring(0, 160) + '...' : 'Product description will appear here...')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Upload Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Product Media
                  </h3>
                  
                  {/* Multiple Images Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Images (Multiple)
                    </label>
                    <p className="text-sm text-gray-600 mb-3">
                      Upload multiple product images. Each time you select files, they will be added to your existing images.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        if (files.length > 0) {
                          const readers = files.map(file => {
                            return new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.onload = (e) => resolve({ file, preview: e.target.result });
                              reader.readAsDataURL(file);
                            });
                          });
                          
                          Promise.all(readers).then(results => {
                            setFormData(prev => ({
                              ...prev,
                              images: [...prev.images, ...results.map(r => r.file)],
                              imagePreviews: [...prev.imagePreviews, ...results.map(r => r.preview)]
                            }));
                          });
                        }
                      }}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: JPG, PNG, GIF. Max size: 5MB each. Select multiple images.
                    </p>
                    
                    {/* Clear All Images Button */}
                    {(formData.images.length > 0 || formData.imagePreviews.length > 0) && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          images: [],
                          imagePreviews: []
                        }))}
                        className="mt-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Clear All Images
                      </button>
                    )}
                    
                    {/* Image Previews */}
                    {(formData.imagePreviews.length > 0 || formData.existingImages?.length > 0) && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Existing Images */}
                        {formData.existingImages?.map((img, index) => (
                          <div key={`existing-${index}`} className="relative group">
                            <img
                              src={`${config.BASE_URL}/uploads/products/${img.replace(/^\/+/, '').replace(/^uploads\/+/, '').replace(/^products\/+/, '')}`}
                              alt={`Existing ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                              Existing
                            </div>
                          </div>
                        ))}
                        
                        {/* New Image Previews */}
                        {formData.imagePreviews.map((preview, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  images: prev.images.filter((_, i) => i !== index),
                                  imagePreviews: prev.imagePreviews.filter((_, i) => i !== index)
                                }));
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                              New
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Video Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Video (Optional)
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setFormData(prev => ({
                            ...prev,
                            video: file,
                            videoPreview: url
                          }));
                        }
                      }}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: MP4, WebM, OGG, AVI, MOV. Max size: 50MB.
                    </p>
                    
                    {/* Video Preview */}
                    {(formData.videoPreview || formData.existingVideo) && (
                      <div className="mt-4">
                        <div className="relative">
                          <video
                            src={formData.videoPreview || (formData.existingVideo && `${config.BASE_URL}/uploads/products/${formData.existingVideo.replace(/^\/+/, '').replace(/^uploads\/+/, '').replace(/^products\/+/, '')}`)}
                            controls
                            className="w-full h-48 object-cover rounded-lg border"
                          >
                            Your browser does not support the video tag.
                          </video>
                          {formData.videoPreview && (
                            <button
                              type="button"
                              onClick={() => {
                                if (formData.videoPreview) {
                                  URL.revokeObjectURL(formData.videoPreview);
                                }
                                setFormData(prev => ({
                                  ...prev,
                                  video: null,
                                  videoPreview: null
                                }));
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                            {formData.videoPreview ? 'New Video' : 'Existing Video'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Primary Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Image (Main Product Image)
                    </label>
                    <p className="text-sm text-gray-600 mb-3">
                      Upload the main image that will be displayed as the primary product image. This is separate from the multiple images above.
                    </p>
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
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This will be the main image shown in product listings and at the top of product detail pages.
                    </p>
                    
                    {formData.imagePreview && (
                      <div className="mt-4 relative w-32 h-32">
                        <img
                          src={formData.imagePreview}
                          alt="Primary image preview"
                          className="w-full h-full object-cover rounded-lg border-2 border-orange-500"
                        />
                        <div className="absolute -top-2 -left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded font-bold">
                          PRIMARY
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({...prev, image: null, imagePreview: null}))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
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
