import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateWhatsAppNumber } from '../utils/whatsappUtils';
import { DollarSign, CheckCircle, MapPin } from 'lucide-react';
import { config } from '../config';
import { propertyService } from '../services/propertyService';

const SellProperty = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Initialize state
  const [userProperties, setUserProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [reducePriceModal, setReducePriceModal] = useState({ show: false, propertyId: null, currentPrice: 0 });
  const [newPrice, setNewPrice] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: '',
    price: '',
    areaValue: '',
    areaUnit: 'sqft',
    bedrooms: '',
    bathrooms: '',
    propertyAge: '',
    furnishing: '',
    address: '',
    city: '',
    areaName: '',
    features: [],
    sellerName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
    sellerPhone: user?.phone || user?.phoneNumber || '',
    sellerEmail: user?.email || '',
    listingType: 'Sale'
  });
  
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [phoneError, setPhoneError] = useState('');

  // Cleanup image URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const propertyTypes = [
    'House',
    'Apartment', 
    'Villa',
    'Townhouse',
    'Office',
    'Shop',
    'Warehouse',
    'Plot',
    'Agricultural Land',
    'Industrial Land',
    'Commercial Building'
  ];

  const areaUnits = [
    { value: 'sqft', label: 'Square Feet' },
    { value: 'marla', label: 'Marla' },
    { value: 'kanal', label: 'Kanal' },
    { value: 'acre', label: 'Acre' }
  ];

  const propertyAges = [
    'New Construction',
    'Under 5 Years',
    '5-10 Years', 
    '10-20 Years',
    'Over 20 Years'
  ];

  const furnishingOptions = [
    'Fully Furnished',
    'Semi Furnished',
    'Unfurnished'
  ];

  const propertyFeatures = [
    'Parking',
    'Garden',
    'Balcony',
    'Elevator',
    'Security',
    'Swimming Pool',
    'Gym',
    'Backup Generator',
    'Solar System',
    'Servant Quarter',
    'Store Room',
    'Basement',
    'Roof Access',
    'Corner Property',
    'Main Road Access',
    'Near School',
    'Near Hospital',
    'Near Market'
  ];

  const majorCities = [
    'Karachi',
    'Lahore',
    'Islamabad',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Hyderabad',
    'Gujranwala',
    'Peshawar',
    'Quetta',
    'Sialkot',
    'Sargodha'
  ];

  // Fetch user's properties when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProperties();
    }
  }, [isAuthenticated]);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        sellerName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : prev.sellerName,
        sellerPhone: user?.phone || user?.phoneNumber || prev.sellerPhone,
        sellerEmail: user?.email || prev.sellerEmail
      }));
    }
  }, [user]);

  const fetchUserProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await fetch(`${config.API_BASE_URL}/properties/user/my-listings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Use propertyService to normalize the data
        const normalizedProperties = propertyService.normalizeProperties(data.data);
        // Sort properties by createdAt date in descending order (newest first)
        const sortedProperties = [...normalizedProperties].sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setUserProperties(sortedProperties || []);
      }
    } catch (error) {
      console.error('Error fetching user properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const markAsSold = async (propertyId) => {
    try {
      const response = await fetch(`${getApiUrl()}/properties/user/${propertyId}/mark-sold`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setUserProperties(prev => prev.map(property => 
          property._id === propertyId 
            ? { ...property, status: 'sold' }
            : property
        ));
        alert('Property marked as sold successfully!');
      } else {
        alert('Failed to mark property as sold');
      }
    } catch (error) {
      console.error('Error marking property as sold:', error);
      alert('Error occurred while updating property status');
    }
  };

  const handlePriceReduction = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    if (parseFloat(newPrice) >= reducePriceModal.currentPrice) {
      alert('New price must be lower than current price');
      return;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/properties/user/${reducePriceModal.propertyId}/update-price`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPrice: parseFloat(newPrice) })
      });

      if (response.ok) {
        setUserProperties(prev => prev.map(property => 
          property._id === reducePriceModal.propertyId 
            ? { ...property, price: parseFloat(newPrice) }
            : property
        ));
        setReducePriceModal({ show: false, propertyId: null, currentPrice: 0 });
        setNewPrice('');
        alert('Property price updated successfully!');
      } else {
        alert('Failed to update property price');
      }
    } catch (error) {
      console.error('Error updating property price:', error);
      alert('Error occurred while updating price');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'sellerPhone') {
      if (value && !validateWhatsAppNumber(value)) {
        setPhoneError('Please enter a valid WhatsApp number (e.g., +923001234567 or 03001234567)');
      } else {
        setPhoneError('');
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFeatureChange = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + images.length > 10) {
      alert('You can upload maximum 10 images');
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

    // Add new images to existing ones instead of replacing
    setImages(prev => [...prev, ...validFiles]);

    // Create previews for new images and add to existing previews
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
    
    if (!isAuthenticated) {
      alert('Please login to submit a property listing');
      return;
    }

    if (images.length === 0) {
      alert('Please upload at least one property image');
      return;
    }

    if (!validateWhatsAppNumber(formData.sellerPhone)) {
      alert('Please enter a valid WhatsApp number before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      
      // Structure area data
      submitData.append('area', JSON.stringify({
        value: parseFloat(formData.areaValue),
        unit: formData.areaUnit
      }));
      
      // Structure seller contact info
      submitData.append('sellerContact', JSON.stringify({
        name: formData.sellerName,
        phone: formData.sellerPhone,
        email: formData.sellerEmail
      }));

      // Convert areaName to area_name
      submitData.append('area_name', formData.areaName);

      // Add other fields with conditional exclusion based on property type
      const fieldsToExclude = [
        'areaValue', 
        'areaUnit', 
        'sellerName', 
        'sellerPhone', 
        'sellerEmail', 
        'areaName'
      ];

      // Conditionally exclude fields based on property type
      const propertyType = formData.propertyType;
      
      // Don't send bedrooms/bathrooms for non-residential properties
      if (!['House', 'Apartment', 'Villa', 'Townhouse'].includes(propertyType)) {
        fieldsToExclude.push('bedrooms', 'bathrooms');
      }
      
      // Don't send propertyAge for plots/land
      if (['Plot', 'Agricultural Land', 'Industrial Land'].includes(propertyType)) {
        fieldsToExclude.push('propertyAge');
      }
      
      // Don't send furnishing for non-furnishable properties
      if (!['House', 'Apartment', 'Villa', 'Townhouse', 'Office'].includes(propertyType)) {
        fieldsToExclude.push('furnishing');
      }

      Object.keys(formData).forEach(key => {
        if (!fieldsToExclude.includes(key)) {
          if (key === 'features') {
            submitData.append('features', JSON.stringify(formData.features));
          } else {
            // Only append non-empty values
            if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
              submitData.append(key, formData[key]);
            }
          }
        }
      });

      // Add images with proper handling
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        // Ensure the file is actually an image
        if (image.type.startsWith('image/')) {
          // Get file extension from original filename
          const extension = image.name.slice(image.name.lastIndexOf('.'));
          submitData.append('images', image, `property-${Date.now()}-${i}${extension}`);
        } else {
          throw new Error('One or more selected files are not images');
        }
      }

      const response = await fetch(`${config.API_BASE_URL}/properties/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitSuccess(true);
        setShowForm(false);
        // Reset form
        setFormData({
          title: '',
          description: '',
          propertyType: '',
          price: '',
          areaValue: '',
          areaUnit: 'sqft',
          bedrooms: '',
          bathrooms: '',
          propertyAge: '',
          furnishing: '',
          address: '',
          city: '',
          areaName: '',
          features: [],
          sellerName: user?.firstName + ' ' + user?.lastName || '',
          sellerPhone: '',
          sellerEmail: user?.email || '',
          listingType: 'Sale'
        });
        setImages([]);
        setImagePreviews([]);
        fetchUserProperties(); // Refresh the properties list
        
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        alert(result.message || 'Failed to submit property listing');
      }
    } catch (error) {
      console.error('Error submitting property:', error);
      alert('Network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    if (price >= 10000000) {
      return `${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `${(price / 100000).toFixed(1)} Lac`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toLocaleString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      approved: 'bg-green-100 text-green-800 border border-green-200',
      rejected: 'bg-red-100 text-red-800 border border-red-200',
      sold: 'bg-blue-100 text-blue-800 border border-blue-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Login Required</h2>
            <p className="text-gray-600 mb-8">
              Please login to your account to list properties for sale
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-800">Property Submitted Successfully!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your property listing has been submitted for review. It will be published once approved by our team.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header - Only show when user has existing properties */}
        {!loadingProperties && userProperties.length > 0 && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Manage Your Properties</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track and manage your property listings. Update pricing, mark as sold, and manage availability.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Add New Property Card - Only show when user has existing properties */}
          {!loadingProperties && userProperties.length > 0 && (
            <div 
              onClick={() => setShowForm(true)}
              className="bg-white border-2 border-dashed border-orange-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 group"
            >
              <div className="text-4xl text-orange-400 mb-4 group-hover:text-orange-600 transition-colors">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Add New Property</h3>
              <p className="text-sm text-gray-500">List a new property for sale</p>
            </div>
          )}

          {/* Loading State */}
          {loadingProperties && (
            <div className="col-span-full flex justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="text-gray-600 font-medium">Loading your properties...</span>
              </div>
            </div>
          )}

          {/* User Properties */}
          {userProperties.map((property) => (
            <Link 
              key={property._id} 
              to={`/properties/${property._id}`}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden block"
            >
              {/* Property Image */}
              <div className="relative h-48">
                <img 
                  src={propertyService.getImageUrl(property.images?.[0])}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (!e.target.src.includes('no-image.png')) {
                      e.target.src = '/assets/no-image.png';
                    }
                  }}
                />
                <div className="absolute top-2 left-2">
                  {getStatusBadge(property.status)}
                </div>
                {property.images && property.images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    +{property.images.length - 1} more
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <span className="text-xs text-orange-600 font-medium">{property.propertyType}</span>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{property.title}</h3>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-orange-600">
                    {formatPrice(property.price)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {property.areaValue} {property.areaUnit}
                  </span>
                </div>
                
                <div className="flex items-center text-xs text-gray-500 mb-3">
                  <MapPin className="w-3 h-3 mr-1" />
                  {property.city}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-2">
                  {property.status === 'approved' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setReducePriceModal({ 
                            show: true, 
                            propertyId: property._id, 
                            currentPrice: property.price 
                          });
                        }}
                        className="flex-1 flex items-center justify-center bg-orange-600 text-white px-4 py-2 rounded text-xs font-medium hover:bg-orange-700 transition-colors"
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Reduce Price
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          markAsSold(property._id);
                        }}
                        className="flex-1 flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark as Sold
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Enhanced Empty State for First-Time Users */}
        {!loadingProperties && userProperties.length === 0 && (
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl mb-8">
              <div className="max-w-3xl mx-auto px-6">
                <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Property Marketplace</h2>
                <p className="text-lg text-gray-700 mb-6">
                  List your property and reach thousands of potential buyers through our professional real estate platform.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-orange-600 text-white px-8 py-4 rounded-lg hover:bg-orange-700 transition-colors font-semibold text-lg shadow-lg"
                >
                  List Your Property
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
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">1. List Your Property</h4>
                  <p className="text-gray-600">Upload photos, add detailed description, set your price, and provide property specifications.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">2. Professional Review</h4>
                  <p className="text-gray-600">Our real estate team reviews your listing to ensure quality and accuracy.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">3. Connect with Buyers</h4>
                  <p className="text-gray-600">Buyers contact our team who coordinate with you for property viewings and negotiations.</p>
                </div>
              </div>
            </div>

            {/* Property Types Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Property Types We Accept</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {propertyTypes.map((type, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 text-center hover:bg-orange-50 transition-colors">
                    <div className="text-sm font-medium text-gray-700">{type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits Section */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Why List With Us?</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Professional real estate platform</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Wide reach to serious buyers</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Dedicated support team</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Verified buyer inquiries</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Listing Tips</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">High-quality photos from multiple angles</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Detailed, accurate descriptions</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Competitive market pricing</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Complete property information</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to List Your Property?</h3>
              <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
                Join our professional real estate platform and reach serious buyers looking for properties like yours.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-white text-orange-600 px-8 py-4 rounded-lg hover:bg-orange-50 transition-colors font-semibold text-lg shadow-lg"
              >
                List Your Property Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Price Reduction Modal */}
      {reducePriceModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Update Property Price</h3>
            <p className="text-gray-600 mb-4">
              Current Price: <span className="font-semibold">{formatPrice(reducePriceModal.currentPrice)}</span>
            </p>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Enter new price"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <div className="flex space-x-3">
              <button
                onClick={handlePriceReduction}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Update Price
              </button>
              <button
                onClick={() => {
                  setReducePriceModal({ show: false, propertyId: null, currentPrice: 0 });
                  setNewPrice('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Submission Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">List New Property</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    maxLength="200"
                    placeholder="e.g., Beautiful 3 Bedroom House in DHA"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type *
                  </label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select Property Type</option>
                    {propertyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Type *
                  </label>
                  <select
                    name="listingType"
                    value={formData.listingType}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="Sale">For Sale</option>
                    <option value="Rent">For Rent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="e.g., 250000"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Area Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area Size *
                  </label>
                  <input
                    type="number"
                    name="areaValue"
                    value={formData.areaValue}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="e.g., 1200"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area Unit *
                  </label>
                  <select
                    name="areaUnit"
                    value={formData.areaUnit}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {areaUnits.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Property Details - Optimized */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Bedrooms - only show for residential properties */}
                {['House', 'Apartment', 'Villa', 'Townhouse'].includes(formData.propertyType) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      name="bedrooms"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                      min="0"
                      max="20"
                      placeholder="e.g., 3"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Bathrooms - only show for residential properties */}
                {['House', 'Apartment', 'Villa', 'Townhouse'].includes(formData.propertyType) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      min="0"
                      max="20"
                      placeholder="e.g., 2"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Property Age - don't show for plots/land */}
                {!['Plot', 'Agricultural Land', 'Industrial Land'].includes(formData.propertyType) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Age
                    </label>
                    <select
                      name="propertyAge"
                      value={formData.propertyAge}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select Age</option>
                      {propertyAges.map(age => (
                        <option key={age} value={age}>{age}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Furnishing - only for residential and office */}
                {['House', 'Apartment', 'Villa', 'Townhouse', 'Office'].includes(formData.propertyType) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Furnishing
                    </label>
                    <select
                      name="furnishing"
                      value={formData.furnishing}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select Furnishing</option>
                      {furnishingOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Location Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select City</option>
                    {majorCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area/Society *
                  </label>
                  <input
                    type="text"
                    name="areaName"
                    value={formData.areaName}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., DHA Phase 5"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complete Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    maxLength="300"
                    placeholder="Street address with landmarks"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  maxLength="2000"
                  rows="4"
                  placeholder="Provide detailed description of your property including special features, nearby amenities, and any additional information..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">{formData.description.length}/2000 characters</p>
              </div>

              {/* Property Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Features
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {propertyFeatures.map(feature => (
                    <label key={feature} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature)}
                        onChange={() => handleFeatureChange(feature)}
                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-700">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Seller Contact Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="sellerName"
                      value={formData.sellerName}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      name="sellerPhone"
                      value={formData.sellerPhone}
                      onChange={handleInputChange}
                      required
                      placeholder="+923001234567 or 03001234567"
                      className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        phoneError ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {phoneError && (
                      <p className="text-red-600 text-sm mt-1">{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="sellerEmail"
                      value={formData.sellerEmail}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Note: Your contact information will be shared only with our team for coordination purposes. 
                  Buyers will contact our company directly for inquiries.
                </p>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Images * (Maximum 10 images)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upload high-quality images of your property. You can select multiple images at once or add them one by one. First image will be the main display image.
                </p>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        >
                          ×
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 bg-orange-600 text-white text-xs px-2 py-1 rounded">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Property Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellProperty;
