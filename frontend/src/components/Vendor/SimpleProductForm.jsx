import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorService } from '../../services/vendorService';
import { getImageUrl } from '../../config';

const SimpleProductForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreview, setVideoPreview] = useState(null);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    shipping: '',
    mainCategory: '',
    subCategory: '',
    brand: '',
    keywords: '',
    // SEO Fields
    slug: '',
    metaTitle: '',
    metaDescription: '',
    altText: '',
    seoKeywords: ''
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
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await vendorService.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMultipleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Accumulate images instead of replacing them
      setImageFiles(prev => [...prev, ...files]);
      
      const readers = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(readers).then(newPreviews => {
        setImagePreviews(prev => [...prev, ...newPreviews]);
      });
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const removeMultipleImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setPrimaryImageIndex(0);
  };

  const removeImageAt = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Adjust primary image index if needed
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > index) {
      setPrimaryImageIndex(prev => prev - 1);
    }
  };

  const setPrimaryImage = (index) => {
    setPrimaryImageIndex(index);
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      
      // Map form fields to backend expectations
      submitData.append('title', formData.name); // Backend expects 'title'
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('shipping', formData.shipping);
      submitData.append('stock', formData.stock);
      submitData.append('keywords', formData.keywords);
      
      // Add SEO fields
      if (formData.slug) submitData.append('slug', formData.slug);
      if (formData.metaTitle) submitData.append('metaTitle', formData.metaTitle);
      if (formData.metaDescription) submitData.append('metaDescription', formData.metaDescription);
      if (formData.altText) submitData.append('altText', formData.altText);
      if (formData.seoKeywords) submitData.append('seoKeywords', formData.seoKeywords);
      
      // Handle categories - ensure they're arrays for backend compatibility
      const mainCategory = formData.mainCategory ? [formData.mainCategory] : [];
      const subCategory = formData.subCategory ? [formData.subCategory] : [];
      submitData.append('mainCategory', JSON.stringify(mainCategory));
      submitData.append('subCategory', JSON.stringify(subCategory));
      
      // Handle multiple images
      if (imageFiles && imageFiles.length > 0) {
        console.log('📤 Appending multiple images:', imageFiles.length);
        imageFiles.forEach((file) => {
          submitData.append('images', file);
        });
        
        // Send primary image index
        submitData.append('primaryImageIndex', primaryImageIndex.toString());
      }
      
      // Handle video
      if (videoFile) {
        console.log('📤 Appending video:', videoFile.name);
        submitData.append('video', videoFile);
      }

      const response = await vendorService.addVendorProduct(submitData);
      
      console.log('✅ Product creation response:', response);
      
      if (response.success) {
        setSuccess('Product created successfully! Redirecting...');
        setTimeout(() => {
          navigate('/vendor/products');
        }, 2000);
      } else {
        setError(response.message || 'Failed to create product');
      }
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Header - Website Theme Colors */}
        <div className="bg-[#131921] rounded-lg shadow-lg">
          <div className="flex items-center justify-between p-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Product
              </h1>
              <p className="text-gray-300 mt-1">Create a new product for your store</p>
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
            
            <div className="p-6 space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-gray-900"
                  placeholder="Enter product name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 resize-none text-gray-900"
                  placeholder="Describe your product in detail..."
                />
              </div>

              {/* Price and Stock Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 inline mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-gray-900"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 inline mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Shipping Cost (PKR) *
                  </label>
                  <input
                    type="number"
                    name="shipping"
                    required
                    min="0"
                    step="0.01"
                    value={formData.shipping}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-gray-900"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Shipping fee for this product. For multiple products, highest shipping fee applies.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 inline mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    name="stock"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-gray-900"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-gray-900"
                  placeholder="Brand name (optional)"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Keywords/Tags
                </label>
                <input
                  type="text"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-gray-900"
                  placeholder="e.g., smartphone, electronics, mobile (separate with commas)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Keywords help customers find your product easier
                </p>
              </div>
            </div>
          </div>

          {/* Category Selection Section - Like Admin */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Category Selection
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main Category Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Main Category *
                  </label>
                  <div className="relative">
                    <select
                      name="mainCategory"
                      required
                      value={formData.mainCategory}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev, 
                          mainCategory: e.target.value,
                          subCategory: '' // Reset subcategory when main category changes
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 appearance-none bg-white text-gray-900"
                    >
                      <option value="">Select Main Category</option>
                      {mainCategories.map((category) => (
                        <option key={category._id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Sub Category Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sub Category
                  </label>
                  <div className="relative">
                    <select
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleInputChange}
                      disabled={!formData.mainCategory}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 appearance-none ${
                        !formData.mainCategory ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white text-gray-900'
                      }`}
                    >
                      <option value="">
                        {!formData.mainCategory ? 'Select main category first' : 'Select Sub Category (Optional)'}
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
                    <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {!formData.mainCategory ? 'Please select a main category first' : 'Choose a specific subcategory for better organization'}
                  </p>
                </div>
              </div>

              {/* Category Preview */}
              {formData.mainCategory && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <strong>Category Path:</strong> {formData.mainCategory}
                    {formData.subCategory && ` > ${formData.subCategory}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Product Media Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Product Media
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Multiple Images Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images (Multiple) - Recommended
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Upload multiple product images. Click "Add More Images" to keep adding images to your existing selection. 
                  The first image is set as primary by default, but you can change it by clicking "Set Primary" on any image.
                </p>
                {imagePreviews.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors bg-gray-50 hover:bg-orange-50">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600 mb-2 font-medium">Select multiple product images</p>
                    <p className="text-sm text-gray-500 mb-4">PNG, JPG up to 5MB each. Select up to 10 images.</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleImagesChange}
                      className="hidden"
                      id="multipleImageUpload"
                    />
                    <label
                      htmlFor="multipleImageUpload"
                      className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg cursor-pointer transition-colors font-medium shadow-sm"
                    >
                      Choose Images
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className={`relative group ${primaryImageIndex === index ? 'ring-2 ring-orange-500' : ''}`}>
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                          />
                          
                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeImageAt(index)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          
                          {/* Primary Image Indicator */}
                          {primaryImageIndex === index ? (
                            <div className="absolute top-1 left-1 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                              PRIMARY
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(index)}
                              className="absolute top-1 left-1 bg-gray-600 hover:bg-orange-500 text-white px-2 py-1 rounded text-xs transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Set Primary
                            </button>
                          )}
                          
                          {/* Image Number */}
                          <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={removeMultipleImages}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                      >
                        Remove All
                      </button>
                      <label
                        htmlFor="multipleImageUpload"
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg cursor-pointer transition-colors text-sm"
                      >
                        Add More Images
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleMultipleImagesChange}
                        className="hidden"
                        id="multipleImageUpload"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Video (Optional)
                </label>
                {!videoPreview ? (
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors bg-purple-50 hover:bg-purple-100">
                    <svg className="w-16 h-16 mx-auto text-purple-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-purple-600 mb-2 font-medium">Upload product video</p>
                    <p className="text-sm text-purple-500 mb-4">MP4, WebM up to 50MB</p>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="hidden"
                      id="videoUpload"
                    />
                    <label
                      htmlFor="videoUpload"
                      className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-lg cursor-pointer transition-colors font-medium shadow-sm"
                    >
                      Choose Video
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Video Preview</p>
                    <div className="relative inline-block">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full max-w-md h-64 rounded-lg border border-gray-200 shadow-sm"
                      >
                        Your browser does not support the video tag.
                      </video>
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="absolute bottom-2 left-2 bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                        🎥 Product Video
                      </div>
                    </div>
                  </div>
                )}
              </div>


            </div>
          </div>

          {/* SEO Optimization Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm border border-green-200">
            <div className="px-6 py-4 border-b border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                SEO Optimization
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Enhanced</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">Optimize your product for search engines and better visibility</p>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SEO Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')}))}
                    placeholder="auto-generated-from-product-name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate. Used in URL: /product/your-slug</p>
                </div>

                {/* Meta Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Meta Title
                  </label>
                  <input
                    type="text"
                    name="metaTitle"
                    maxLength="60"
                    value={formData.metaTitle}
                    onChange={handleInputChange}
                    placeholder="Optimized title for search engines"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.metaTitle.length}/60 characters. Leave empty to use product name.
                  </p>
                </div>

                {/* Meta Description */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Meta Description
                  </label>
                  <textarea
                    name="metaDescription"
                    rows={3}
                    maxLength="160"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    placeholder="Brief description that appears in search results..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.metaDescription.length}/160 characters. Leave empty to auto-generate from description.
                  </p>
                </div>

                {/* Alt Text with Smart Suggestions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Alt Text
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      SEO Important
                    </span>
                  </label>
                  <input
                    type="text"
                    name="altText"
                    maxLength="125"
                    value={formData.altText}
                    onChange={handleInputChange}
                    placeholder={formData.name ? `${formData.name} - Buy online at International Tijarat` : "Descriptive text for product images"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-gray-500">
                      {formData.altText.length}/125 characters. Helps screen readers and SEO.
                    </p>
                    
                    {/* Auto-generate Alt Text Button */}
                    {formData.name && (
                      <button
                        type="button"
                        onClick={() => {
                          const category = mainCategories.find(cat => cat._id === formData.mainCategory)?.name || '';
                          const autoAltText = `${formData.name}${formData.brand ? ` by ${formData.brand}` : ''}${category ? ` - ${category}` : ''} - Buy online at International Tijarat`;
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
                  
                  {/* Image SEO Tips */}
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Image SEO Tips
                    </h5>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Include product name and key features in alt text</li>
                      <li>• Add category or brand for better context</li>
                      <li>• Use descriptive words like "high-quality", "premium"</li>
                      <li>• Images are automatically watermarked and optimized</li>
                      <li>• First image is most important for SEO</li>
                    </ul>
                  </div>
                </div>

                {/* SEO Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Keywords
                  </label>
                  <input
                    type="text"
                    name="seoKeywords"
                    value={formData.seoKeywords}
                    onChange={handleInputChange}
                    placeholder="seo-keyword1, seo-keyword2, seo-keyword3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate with commas. Focus on specific product keywords.</p>
                </div>
              </div>

              {/* SEO Preview */}
              {(formData.metaTitle || formData.name) && (
                <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Search Engine Preview:</h4>
                  <div className="space-y-1">
                    <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                      {formData.metaTitle || formData.name}
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
          </div>

          {/* Form Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/vendor/products')}
                className="px-8 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Product...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Product
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleProductForm;
