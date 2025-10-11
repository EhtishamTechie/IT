import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import OTPVerification from '../../components/Auth/OTPVerification';
import emailVerificationService from '../../services/emailVerificationService';

const VendorRegisterPage = () => {
  const { register, isLoading: contextLoading } = useVendorAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);

  // Notification Component
  const Notification = ({ type, message, onClose }) => (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${
      type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
      'bg-red-50 border-red-200 text-red-800'
    } border rounded-lg shadow-lg p-4 animate-slide-in-right`}>
      <div className="flex items-start">
        {type === 'success' ? (
          <svg className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );

  // Auto-clear notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  const [formData, setFormData] = useState({
    // Basic Information
    email: '',
    businessName: '',
    businessType: 'company',
    description: '',
    
    // Contact Information
    contactPerson: {
      firstName: '',
      lastName: '',
      phone: ''
    },
    
    // Business Address
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    
    // Business Details
    categories: [],
    documents: {
      taxId: ''
    }
  });

  const businessTypes = [
    { value: 'individual', label: 'Individual/Sole Proprietorship' },
    { value: 'company', label: 'Company/Corporation' },
    { value: 'partnership', label: 'Partnership' }
  ];

  const popularCategories = [
    'Electronics', 'Fashion & Apparel', 'Home & Garden', 'Sports & Outdoors',
    'Books & Media', 'Health & Beauty', 'Toys & Games', 'Automotive',
    'Jewelry & Accessories', 'Art & Crafts', 'Food & Beverages', 'Office Supplies'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
      
      if (!formData.businessName) newErrors.businessName = 'Business name is required';
      if (!formData.businessType) newErrors.businessType = 'Business type is required';
    }

    if (step === 2) {
      if (!formData.contactPerson.firstName) newErrors['contactPerson.firstName'] = 'First name is required';
      if (!formData.contactPerson.lastName) newErrors['contactPerson.lastName'] = 'Last name is required';
      if (!formData.contactPerson.phone) newErrors['contactPerson.phone'] = 'Phone number is required';
    }

    if (step === 3) {
      if (!formData.address.street) newErrors['address.street'] = 'Street address is required';
      if (!formData.address.city) newErrors['address.city'] = 'City is required';
      if (!formData.address.state) newErrors['address.state'] = 'State is required';
      if (!formData.address.zipCode) newErrors['address.zipCode'] = 'ZIP code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;

    // Check if email verification is required
    if (!emailVerified) {
      try {
        setIsLoading(true); // Start loading for OTP sending
        const result = await emailVerificationService.sendVendorOTP(formData.email, formData.businessName);
        
        if (result.success) {
          setShowEmailVerification(true);
          setNotification({
            type: 'success',
            message: 'Verification code sent to your email!'
          });
        } else {
          // Handle specific validation errors with suggestions
          let errorMessage = result.message || result.error || 'Failed to send verification code';
          
          // If there's an email suggestion, offer it to the user
          if (result.suggestion) {
            errorMessage = `${errorMessage} (${result.suggestion})`;
          }
          
          setNotification({
            type: 'error',
            message: errorMessage
          });
        }
      } catch (error) {
        console.error('OTP Error:', error);
        
        // Handle detailed error messages from email validation
        let errorMessage = error.message || 'Failed to send verification code. Please try again.';
        
        // Check if the error contains email suggestions
        if (error.suggestion) {
          errorMessage = `${errorMessage} (Did you mean: ${error.suggestion}?)`;
        }
        
        setNotification({
          type: 'error',
          message: errorMessage
        });
      } finally {
        setIsLoading(false); // Stop loading after OTP process
      }
      return;
    }

    // Proceed with vendor registration after email verification
    try {
      setIsLoading(true); // Start loading for application submission
      const result = await register(formData);
      
      if (result.success) {
        setApplicationId(result.applicationId);
        setShowSuccess(true);
      } else {
        setErrors({ submit: result.message });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false); // Stop loading after submission
    }
  };

  // Handle successful email verification
  const handleEmailVerificationSuccess = () => {
    setEmailVerified(true);
    setShowEmailVerification(false);
    setNotification({
      type: 'success',
      message: 'Email verified successfully! You can now submit your application.'
    });
    
    // Remove auto-submit - let user click the submit button manually
    // This prevents double submission issue
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Back to Home Navigation */}
          <div className="text-center">
            <Link 
              to="/" 
              className="inline-flex items-center text-orange-600 hover:text-orange-700 transition-colors group mb-6"
            >
              <svg 
                className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for applying to become a vendor. Your application has been submitted successfully.
            </p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800">
                <strong>Application ID:</strong> {applicationId}
              </p>
              <p className="text-sm text-orange-700 mt-2">
                Please save this ID for your records. You can use it to check your application status.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/vendor/application-status')}
                className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition-colors font-medium"
              >
                Check Application Status
              </button>
              <Link
                to="/vendor/login"
                className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium text-center"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show email verification step
  if (showEmailVerification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Back to Home Navigation */}
          <div className="text-center">
            <Link 
              to="/" 
              className="inline-flex items-center text-orange-600 hover:text-orange-700 transition-colors group mb-6"
            >
              <svg 
                className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
            <p className="mt-2 text-gray-600">
              We've sent a verification code to <strong>{formData.email}</strong>
            </p>
          </div>

          <OTPVerification
            email={formData.email}
            onVerificationSuccess={handleEmailVerificationSuccess}
            onBack={() => setShowEmailVerification(false)}
            userType="vendor"
          />
        </div>

        {/* Notification */}
        {notification && <Notification {...notification} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back to Home Navigation */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-orange-600 hover:text-orange-700 transition-colors group"
          >
            <svg 
              className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Become a Vendor</h1>
          <p className="mt-2 text-gray-600">Join our marketplace and start selling your products</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-orange-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Business Info</span>
            <span>Contact Details</span>
            <span>Address & Categories</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Business Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Business Information
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business email"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.businessName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business name"
                  />
                  {errors.businessName && <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type *
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.businessType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.businessType && <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Describe your business and what products you sell"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="contactPerson.firstName"
                      value={formData.contactPerson.firstName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors['contactPerson.firstName'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="First name"
                    />
                    {errors['contactPerson.firstName'] && <p className="mt-1 text-sm text-red-600">{errors['contactPerson.firstName']}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="contactPerson.lastName"
                      value={formData.contactPerson.lastName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors['contactPerson.lastName'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Last name"
                    />
                    {errors['contactPerson.lastName'] && <p className="mt-1 text-sm text-red-600">{errors['contactPerson.lastName']}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="contactPerson.phone"
                    value={formData.contactPerson.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors['contactPerson.phone'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors['contactPerson.phone'] && <p className="mt-1 text-sm text-red-600">{errors['contactPerson.phone']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    name="documents.taxId"
                    value={formData.documents.taxId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter your business tax ID"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Address & Categories */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Business Address
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors['address.street'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="123 Business Street"
                  />
                  {errors['address.street'] && <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors['address.city'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="City"
                    />
                    {errors['address.city'] && <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors['address.state'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="State"
                    />
                    {errors['address.state'] && <p className="mt-1 text-sm text-red-600">{errors['address.state']}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors['address.zipCode'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="12345"
                    />
                    {errors['address.zipCode'] && <p className="mt-1 text-sm text-red-600">{errors['address.zipCode']}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="United States"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Categories
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Select the categories that best describe your products (optional)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {popularCategories.map((category) => (
                      <label key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.categories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                          className="mr-2 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {errors.submit && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                <Link
                  to="/vendor/login"
                  className="px-6 py-2 text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Already have an account?
                </Link>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isLoading && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    <span>
                      {isLoading ? 
                        (emailVerified ? 'Submitting Application...' : 'Sending Verification Code...') : 
                        (emailVerified ? 'Submit Application' : 'Verify Email & Submit')
                      }
                    </span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Notification */}
      {notification && <Notification {...notification} />}
    </div>
  );
};

export default VendorRegisterPage;
