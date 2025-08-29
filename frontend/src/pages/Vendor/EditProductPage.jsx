import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { vendorService } from '../../services/vendorService';
import { getUploadUrl } from '../../config';

const EditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    mainCategory: '',
    subCategory: '',
    brand: '',
    keywords: ''
  });

  // Get main categories (categories without parent) and subcategories based on actual database structure
  const mainCategories = categories.filter(cat => !cat.parentCategory);
  const getSubcategories = (mainCategoryId) => {
    return categories.filter(cat => 
      cat.parentCategory && 
      (typeof cat.parentCategory === 'string' ? cat.parentCategory === mainCategoryId : cat.parentCategory._id === mainCategoryId)
    );
  };

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      setPageLoading(true);
      await Promise.all([loadCategories(), loadProduct()]);
    } catch (err) {
      setError('Failed to load product data');
    } finally {
      setPageLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await vendorService.getCategories();
      console.log('📂 Edit Form - Categories loaded for dropdown:', response.data);
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadProduct = async () => {
    try {
      const response = await vendorService.getVendorProductById(id);
      console.log('🔍 Edit Product - Full product data:', response);
      
      if (response.success) {
        const product = response.product; // ✅ Fixed: use response.product instead of response.data
        console.log('📝 Product object:', product);
        console.log('📝 Product categories:', {
          mainCategory: product.mainCategory,
          subCategory: product.subCategory,
          mainCategoryType: typeof product.mainCategory?.[0],
          subCategoryType: typeof product.subCategory?.[0]
        });
        
        // Handle category mapping - the form expects category NAMES, not IDs
        let mainCategoryValue = '';
        let subCategoryValue = '';
        
        if (product.mainCategory && product.mainCategory.length > 0) {
          const mainCat = product.mainCategory[0];
          console.log('🔍 Main category raw data:', mainCat, 'Type:', typeof mainCat);
          
          if (typeof mainCat === 'object' && mainCat !== null) {
            // If it's a populated object {_id: "...", name: "shoes"} - use the name
            mainCategoryValue = mainCat.name || '';
          } else {
            // If it's a string, check if it looks like an ObjectId or a name
            if (mainCat.length === 24 && /^[0-9a-fA-F]{24}$/.test(mainCat)) {
              // It's an ObjectId - we need to find the category name
              console.log('⚠️ Got ObjectId for main category, need to find name:', mainCat);
              // We'll handle this after categories are loaded
            } else {
              // It's likely a category name
              mainCategoryValue = mainCat;
            }
          }
        }
        
        if (product.subCategory && product.subCategory.length > 0) {
          const subCat = product.subCategory[0];
          console.log('🔍 Sub category raw data:', subCat, 'Type:', typeof subCat);
          
          if (typeof subCat === 'object' && subCat !== null) {
            // If it's a populated object {_id: "...", name: "accessories"} - use the name
            subCategoryValue = subCat.name || '';
          } else {
            // If it's a string, check if it looks like an ObjectId or a name
            if (subCat.length === 24 && /^[0-9a-fA-F]{24}$/.test(subCat)) {
              // It's an ObjectId - we need to find the category name
              console.log('⚠️ Got ObjectId for sub category, need to find name:', subCat);
              // We'll handle this after categories are loaded
            } else {
              // It's likely a category name
              subCategoryValue = subCat;
            }
          }
        }
        
        setFormData({
          name: product.title || product.name || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          stock: product.stock?.toString() || '',
          mainCategory: mainCategoryValue,
          subCategory: subCategoryValue,
          brand: product.brand || '',
          keywords: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || '')
        });
        
        console.log('📝 Form data set:', {
          mainCategory: mainCategoryValue,
          subCategory: subCategoryValue
        });
        
        if (product.image) {
          setExistingImage(product.image);
        }
      } else {
        setError('Product not found');
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Failed to load product');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      
      console.log('📝 EDIT FORM - Form data before submit:', formData);
      console.log('📷 EDIT FORM - Image file:', imageFile);
      
      // Map form fields to backend expectations
      submitData.append('title', formData.name); // Backend expects 'title'
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('stock', formData.stock);
      submitData.append('brand', formData.brand);
      submitData.append('tags', formData.keywords);
      
      // Handle categories - ensure they're arrays for backend compatibility
      const mainCategory = formData.mainCategory ? [formData.mainCategory] : [];
      const subCategory = formData.subCategory ? [formData.subCategory] : [];
      
      console.log('📂 EDIT FORM - Categories to send:', {
        mainCategory,
        subCategory,
        mainCategoryString: JSON.stringify(mainCategory),
        subCategoryString: JSON.stringify(subCategory)
      });
      
      submitData.append('mainCategory', JSON.stringify(mainCategory));
      submitData.append('subCategory', JSON.stringify(subCategory));
      
      if (imageFile) {
        submitData.append('image', imageFile);
        console.log('📷 EDIT FORM - Adding image file to FormData');
      }
      
      // Debug FormData contents
      console.log('📝 EDIT FORM - FormData contents:');
      for (let pair of submitData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }

      const response = await vendorService.updateVendorProduct(id, submitData);
      
      if (response.success) {
        setSuccess('Product updated successfully! Redirecting...');
        setTimeout(() => {
          navigate('/vendor/products');
        }, 2000);
      } else {
        setError(response.message || 'Failed to update product');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6 p-6">
          {/* Header - Website Theme Colors */}
          <div className="bg-[#131921] rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Product
                </h1>
                <p className="text-gray-300 mt-1">Update your product information</p>
              </div>
              <button
                onClick={() => navigate('/vendor/products')}
                className="flex items-center text-gray-300 hover:text-orange-500 transition-colors bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Products
              </button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-6 py-4 rounded-lg shadow-sm flex items-center">
              <svg className="w-6 h-6 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h4 className="font-semibold">Success!</h4>
                <p>{success}</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-sm flex items-center">
              <svg className="w-6 h-6 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold">Error!</h4>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Product Form - Professional Design */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Basic Information
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Product Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                      placeholder="Enter product name"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                      onWheel={(e) => e.target.blur()} // Prevent scroll wheel from changing value
                      required
                      step="0.01"
                      min="0"
                      autoComplete="off"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={(e) => setFormData(prev => ({...prev, stock: e.target.value}))}
                      onWheel={(e) => e.target.blur()} // Prevent scroll wheel from changing value
                      required
                      min="0"
                      autoComplete="off"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                      placeholder="0"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
                      placeholder="Describe your product..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Categories & Organization Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Categories & Organization
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Main Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Category *
                    </label>
                    <select
                      name="mainCategory"
                      value={formData.mainCategory}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev, 
                          mainCategory: e.target.value,
                          subCategory: '' // Reset subcategory when main category changes
                        }));
                      }}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select main category</option>
                      {mainCategories.map((category) => (
                        <option key={category._id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sub Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub Category
                    </label>
                    <select
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                      disabled={!formData.mainCategory}
                    >
                      <option value="">
                        {!formData.mainCategory ? 'Select main category first' : 'Select sub category (optional)'}
                      </option>
                      {formData.mainCategory && (() => {
                        const selectedMainCategory = mainCategories.find(cat => cat.name === formData.mainCategory);
                        if (selectedMainCategory) {
                          const subcategories = getSubcategories(selectedMainCategory._id);
                          return subcategories.map((subcat) => (
                            <option key={subcat._id} value={subcat.name}>
                              {subcat.name}
                            </option>
                          ));
                        }
                        return null;
                      })()}
                    </select>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                      placeholder="Enter brand name"
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Keywords / Tags
                    </label>
                    <input
                      type="text"
                      name="keywords"
                      value={formData.keywords}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                      placeholder="Enter keywords separated by commas"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate keywords with commas (e.g., electronics, phone, mobile)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Image Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Product Image
                </h3>
              </div>
              <div className="p-6">
                
                {/* Current Image Display */}
                {(existingImage || imagePreview) && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {imagePreview ? 'New Image Preview (Watermark will be applied):' : 'Current Image:'}
                    </p>
                    <div className="relative inline-block">
                      <img
                        src={imagePreview || existingImage}
                        alt="Product"
                        className="w-32 h-32 rounded-lg border border-gray-300"
                      />
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <div className="absolute bottom-1 left-1 bg-orange-100 text-orange-800 px-1 py-0.5 rounded text-xs">
                        🛡️ Protected
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {existingImage && !imagePreview ? 'Upload New Image (Optional)' : 'Product Image'}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                    <input
                      type="file"
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                      id="imageUpload"
                    />
                    <label htmlFor="imageUpload" className="cursor-pointer">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        <span className="text-orange-500 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate('/vendor/products')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating Product...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </VendorLayout>
  );
};

export default EditProductPage;
