import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateWhatsAppNumber } from '../utils/whatsappUtils';
import { createWhatsAppURL } from '../utils/whatsappUtils';
import { getApiUrl, getImageUrl } from '../config';

const SellUsedProduct = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [userProducts, setUserProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [reducePriceModal, setReducePriceModal] = useState({ show: false, productId: null, currentPrice: 0 });
  const [newPrice, setNewPrice] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    condition: '',
    contactPhone: user?.phone || user?.phoneNumber || '',
    contactEmail: user?.email || '',
    location: '',
    yearOfPurchase: '',
    brand: '',
    model: ''
  });
  
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [phoneError, setPhoneError] = useState('');

  const categories = [
    'Vehicles',
    'Electronics',
    'Furniture',
    'Home Appliances',
    'Sports & Recreation',
    'Books & Media',
    'Clothing & Accessories',
    'Tools & Equipment',
    'Other'
  ];

  const conditions = [
    { value: 'Excellent', label: 'Excellent - Like new, barely used' },
    { value: 'Good', label: 'Good - Minor signs of wear' },
    { value: 'Fair', label: 'Fair - Noticeable wear but functional' },
    { value: 'Poor', label: 'Poor - Heavy wear, needs repair' }
  ];

  // Show login prompt if not authenticated
  React.useEffect(() => {
    // User will see the login prompt instead of automatic redirect
    // This provides better UX than a blank page
  }, [isAuthenticated, navigate]);

  // Fetch user's products when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProducts();
    }
  }, [isAuthenticated]);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        contactPhone: user?.phone || user?.phoneNumber || prev.contactPhone,
        contactEmail: user?.email || prev.contactEmail
      }));
    }
  }, [user]);

  const fetchUserProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch(`${getApiUrl()}/used-products/user/my-submissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Transform the image URLs
        const productsWithImages = (data.data || []).map(product => ({
          ...product,
          images: product.images.map(img => getImageUrl('usedProducts', img))
        }));
        setUserProducts(productsWithImages);
      }
    } catch (error) {
      console.error('Error fetching user products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const markAsSold = async (productId) => {
    try {
      const response = await fetch(`${getApiUrl()}/used-products/user/${productId}/mark-sold`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setUserProducts(prev => prev.map(product => 
          product._id === productId 
            ? { ...product, status: 'sold' }
            : product
        ));
        alert('Product marked as sold successfully!');
      } else {
        alert('Failed to mark product as sold');
      }
    } catch (error) {
      console.error('Error marking product as sold:', error);
      alert('Error marking product as sold');
    }
  };

  const handleReducePrice = async () => {
    const newPriceValue = parseFloat(newPrice);

    if (!newPriceValue || newPriceValue <= 0) {
      alert('Please enter a valid price');
      return;
    }

    if (newPriceValue >= reducePriceModal.currentPrice) {
      alert('New price must be lower than current price');
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/used-products/user/${reducePriceModal.productId}/update-price`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price: newPriceValue })
      });

      if (response.ok) {
        // Update local state
        setUserProducts(prev => prev.map(p => 
          p._id === reducePriceModal.productId 
            ? { ...p, price: newPriceValue }
            : p
        ));
        setReducePriceModal({ show: false, productId: null, currentPrice: 0 });
        setNewPrice('');
        alert('Price updated successfully!');
      } else {
        alert('Failed to update price');
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Error updating price');
    }
  };

  // Helper functions
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Excellent': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fair': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Poor': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rejected': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'sold': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate WhatsApp number in real-time
    if (name === 'contactPhone') {
      if (value && !validateWhatsAppNumber(value)) {
        setPhoneError('Please enter a valid WhatsApp number (e.g., +923001234567, 923001234567, or 03001234567)');
      } else {
        setPhoneError('');
      }
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + images.length > 6) {
      alert('You can upload maximum 6 images');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not a valid image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (images.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    // Validate WhatsApp number before submission
    if (!validateWhatsAppNumber(formData.contactPhone)) {
      alert('Please enter a valid WhatsApp number before submitting');
      setPhoneError('Please enter a valid WhatsApp number (e.g., +923001234567, 923001234567, or 03001234567)');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      
      // Append form data
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Append images
      images.forEach(image => {
        submitData.append('images', image);
      });

      // Submit with FormData for multipart/form-data
      const response = await fetch(`${getApiUrl()}/used-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          price: '',
          condition: '',
          contactPhone: '',
          contactEmail: user?.email || '',
          location: '',
          yearOfPurchase: '',
          brand: '',
          model: ''
        });
        setImages([]);
        setImagePreviews([]);
        setShowForm(false);
        
        // Refresh the user products list
        await fetchUserProducts();
        
        alert('Product submitted successfully! It will be reviewed within 24-48 hours.');
      } else {
        alert(result.message || 'Error submitting your product');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error submitting your product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to sell your used products. Please sign in to your account or create a new one.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/login?redirect=/sell-used-products')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 w-full"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register?redirect=/sell-used-products')}
                className="border border-orange-500 text-orange-500 hover:bg-orange-50 px-6 py-3 rounded-lg font-medium transition-colors duration-200 w-full"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Submission Successful!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for submitting your used product! Our team will review your submission within 24-48 hours.
              You will receive an email notification once the review is complete.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setSubmitSuccess(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Submit Another Product
              </button>
              <div>
                <button
                  onClick={() => navigate('/used-products')}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  Browse Used Products
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Only show when user has existing products */}
        {!loadingProducts && userProducts.length > 0 && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Manage Your Products</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track and manage your listed products. View performance, update pricing, and manage availability.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Add New Product Card - Only show when user has existing products */}
          {!loadingProducts && userProducts.length > 0 && (
            <div 
              onClick={() => setShowForm(true)}
              className="bg-white border-2 border-dashed border-orange-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 group"
            >
              <div className="text-4xl text-orange-400 mb-4 group-hover:text-orange-600 transition-colors">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Add New Product</h3>
              <p className="text-sm text-gray-500">List a new item for sale</p>
            </div>
          )}

          {/* Loading State */}
          {loadingProducts && (
            <div className="col-span-full flex justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="text-gray-600 font-medium">Loading your products...</span>
              </div>
            </div>
          )}

          {/* User Products */}
          {userProducts.map((product) => (
            <div key={product._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div 
                className="relative cursor-pointer group"
                onClick={() => navigate(`/seller/product/${product._id}`)}
              >
                <div className="aspect-w-16 aspect-h-10 bg-gray-200">
                  <img
                    src={(() => {
                      try {
                        // If no images or empty array, use default placeholder
                        if (!product.images || product.images.length === 0 || !product.images[0]) {
                          return '/assets/no-image.png';
                        }

                        const imagePath = product.images[0];
                        
                        // If it's a full URL, use it directly
                        if (imagePath.startsWith('http')) {
                          return imagePath;
                        }
                        
                        // If it has /uploads/ prefix, strip it out as getUploadUrl will add it
                        const cleanPath = imagePath.replace(/^\/uploads\//, '');
                        
                        // Get the full URL from the config
                        return getUploadUrl(cleanPath);
                      } catch (error) {
                        console.error('Error loading image:', error);
                        return '/assets/no-image.png';
                      }
                    })()}
                    alt={product.title || product.name}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      console.warn('Image load error:', e.target.src);
                      e.target.src = '/assets/no-image.png';
                    }}
                  />
                </div>
                
                {/* Status and Condition Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${getStatusColor(product.status)}`}>
                    {product.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm border ${getConditionColor(product.condition)}`}>
                    {product.condition}
                  </span>
                </div>

                {/* Views Counter */}
                <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-xs font-medium">
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{product.views || 0} views</span>
                  </div>
                </div>
              </div>
              
              <div 
                className="p-5 cursor-pointer"
                onClick={() => navigate(`/seller/product/${product._id}`)}
              >
                <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                  {product.title || product.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">{product.description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(product.createdAt)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">Category</div>
                    <div className="text-xs text-gray-500 capitalize">{product.category}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                {product.status === 'approved' && (
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsSold(product._id);
                      }}
                      className="flex-1 bg-gray-700 text-white text-sm py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                      Mark as Sold
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReducePriceModal({ show: true, productId: product._id, currentPrice: product.price });
                      }}
                      className="flex-1 bg-orange-600 text-white text-sm py-2.5 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                    >
                      Reduce Price
                    </button>
                  </div>
                )}
                
                {product.status === 'pending' && (
                  <div className="text-center py-3">
                    <div className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Awaiting Review
                    </div>
                  </div>
                )}
                
                {product.status === 'rejected' && (
                  <div className="text-center py-3">
                    <div className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 mb-2">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Rejected
                    </div>
                    <p className="text-xs text-gray-600">Please review and resubmit</p>
                  </div>
                )}
                
                {product.status === 'sold' && (
                  <div className="text-center py-3">
                    <div className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sold
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* No Products Message - Enhanced Informative Section */}
        {!loadingProducts && userProducts.length === 0 && (
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl mb-8">
              <div className="max-w-3xl mx-auto px-6">
                <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Used Products Marketplace</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Turn your unused items into cash! Start selling your pre-owned products to thousands of buyers worldwide.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-orange-600 text-white px-8 py-4 rounded-lg hover:bg-orange-700 transition-colors font-semibold text-lg shadow-lg"
                >
                  Start Selling Now
                </button>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">1. List Your Product</h4>
                  <p className="text-gray-600">Upload photos, add description, set your price, and provide product details.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">2. Get Approved</h4>
                  <p className="text-gray-600">Our team reviews your listing to ensure quality and authenticity.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">3. Connect & Sell</h4>
                  <p className="text-gray-600">Buyers contact you directly via WhatsApp to arrange purchase and delivery.</p>
                </div>
              </div>
            </div>

            {/* Categories Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">What Can You Sell?</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map((category, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 text-center hover:bg-orange-50 transition-colors">
                    <div className="text-sm font-medium text-gray-700">{category}</div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-6">
                <p className="text-gray-600">And many more categories! If it's legal and in good condition, you can sell it.</p>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Why Sell With Us?</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Free to list your products</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Reach thousands of potential buyers</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Direct communication via WhatsApp</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Quality moderation for trusted marketplace</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Selling Tips</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Take clear, well-lit photos</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Write detailed, honest descriptions</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Set competitive, fair prices</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Respond quickly to buyer inquiries</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Start Selling?</h3>
              <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
                Join thousands of sellers who have successfully sold their used products on our platform. 
                Create your first listing in just a few minutes!
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-white text-orange-600 px-8 py-4 rounded-lg hover:bg-orange-50 transition-colors font-semibold text-lg shadow-lg"
              >
                List Your First Product
              </button>
            </div>
          </div>
        )}
        </div>

      {/* Add Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Product</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Product Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., iPhone 13 Pro Max 256GB"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Asking Price (USD) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Condition *
                    </label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select condition</option>
                      {conditions.map(cond => (
                        <option key={cond.value} value={cond.value}>{cond.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand & Model */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={handleInputChange}
                        placeholder="e.g., Apple"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        placeholder="e.g., iPhone 13 Pro Max"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Year of Purchase */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Year of Purchase
                    </label>
                    <input
                      type="number"
                      name="yearOfPurchase"
                      value={formData.yearOfPurchase}
                      onChange={handleInputChange}
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder={new Date().getFullYear()}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      placeholder="Describe your product in detail. Include its current condition, any accessories included, reason for selling, etc."
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleInputChange}
                        required
                        placeholder="+923001234567 or 03001234567"
                        className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 ${
                          phoneError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {phoneError && (
                        <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Buyers will contact you via WhatsApp. Supported formats: +923001234567, 923001234567, 03001234567
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        required
                        placeholder="your.email@example.com"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      placeholder="City, State"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Images * (Max 6, 5MB each)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors duration-200">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="space-y-2">
                          <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <div className="text-gray-600">
                            <span className="font-medium text-orange-500">Click to upload</span> or drag and drop
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </div>
                      </label>
                    </div>

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-200"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    <p>* Required fields</p>
                    <p>Your submission will be reviewed within 24-48 hours</p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        'Submit for Review'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reduce Price Modal */}
      {reducePriceModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Reduce Price</h3>
            <p className="text-gray-600 mb-4">
              Current price: {formatPrice(reducePriceModal.currentPrice)}
            </p>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              min="0"
              step="0.01"
              max={reducePriceModal.currentPrice}
              placeholder="Enter new price"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setReducePriceModal({ show: false, productId: null, currentPrice: 0 });
                  setNewPrice('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleReducePrice}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700"
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellUsedProduct;
