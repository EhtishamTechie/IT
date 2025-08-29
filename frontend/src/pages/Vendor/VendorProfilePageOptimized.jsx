import React, { useState, useEffect } from 'react';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { vendorAPI, getImageUrl } from '../../services/vendorService';

const VendorProfilePageOptimized = () => {
  const { vendor, updateVendor } = useVendorAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isEditing, setIsEditing] = useState({
    profile: false,
    bank: false
  });

  // Initialize profile with empty values
  const [profile, setProfile] = useState({
    businessName: String(''),
    contactPerson: String(''),
    email: String(''),
    phone: String(''),
    address: String(''),
    city: String(''),
    state: String(''),
    postalCode: String(''),
    country: String('Pakistan'),
    businessType: String(''),
    taxId: String(''),
    bankName: String(''),
    accountNumber: String(''),
    accountTitle: String(''),
    businessDescription: String(''),
    website: String(''),
    logo: String('')
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Initialize profile when vendor data changes
  useEffect(() => {
    const initializeProfile = async () => {
      if (!vendor || !isInitialLoad) return;

      try {
        console.log('🔄 Initializing vendor profile...');
        // First try to get the complete profile
        const profileResponse = await vendorAPI.getProfile();
        const vendorData = profileResponse?.data?.success && profileResponse?.data?.vendor 
          ? profileResponse.data.vendor 
          : vendor;

        console.log('📋 Received vendor data:', vendorData);

        // Initialize profile data with proper mapping
        const profileData = {
          businessName: String(vendorData.businessName || ''),
          contactPerson: String(
            vendorData.contactPerson?.firstName 
              ? `${vendorData.contactPerson.firstName} ${vendorData.contactPerson.lastName || ''}`.trim()
              : vendorData.contactPerson || ''
          ),
          email: String(vendorData.email || ''),
          phone: String(vendorData.contactPerson?.phone || vendorData.phone || ''),
          address: String(vendorData.address?.street || vendorData.address || ''),
          city: String(vendorData.address?.city || vendorData.city || ''),
          state: String(vendorData.address?.state || vendorData.state || ''),
          postalCode: String(vendorData.address?.zipCode || vendorData.postalCode || ''),
          country: String(vendorData.address?.country || vendorData.country || 'Pakistan'),
          businessType: String(vendorData.businessType || ''),
          taxId: String(vendorData.documents?.taxId || vendorData.taxId || ''),
          bankName: String(vendorData.bankDetails?.bankName || ''),
          accountNumber: String(vendorData.bankDetails?.accountNumber || ''),
          accountTitle: String(vendorData.bankDetails?.accountTitle || ''),
          businessDescription: String(vendorData.description || vendorData.businessDescription || ''),
          website: String(vendorData.socialMedia?.website || vendorData.website || ''),
          logo: String(vendorData.logo || '')
        };

        console.log('📝 Mapped profile data:', profileData);

        // Update states with the complete data
        setProfile(profileData);

        // Clean and update logo preview if available
        if (vendorData.logo) {
          // Clean up the logo path
          const cleanLogoPath = vendorData.logo
            .replace(/undefined/g, '') // Remove undefined strings
            .replace(/\/vendor-logos\/vendor-logos\//g, '/vendor-logos/')
            .replace(/\/uploads\/uploads\//g, '/uploads/')
            .replace(/\/+/g, '/'); // Replace multiple slashes with single slash
          
          const logoUrl = getImageUrl(cleanLogoPath);
          setLogoPreview(logoUrl);
          
          console.log('🖼️ Setting initial logo preview:', {
            original: vendorData.logo,
            cleaned: cleanLogoPath,
            finalUrl: logoUrl
          });
          
          // Store the clean path in profile
          profileData.logo = cleanLogoPath;
        }

        // Update vendor context with complete data
        if (profileResponse?.data?.success) {
          updateVendor(vendorData);
        }

      } catch (error) {
        console.error('❌ Error initializing profile:', error);
        // If profile fetch fails, use vendor data as fallback
        const fallbackProfile = {
          businessName: String(vendor.businessName || ''),
          contactPerson: String(vendor.contactPerson || ''),
          email: String(vendor.email || ''),
          phone: String(vendor.phone || ''),
          address: String(vendor.address || ''),
          city: String(vendor.city || ''),
          state: String(vendor.state || ''),
          postalCode: String(vendor.postalCode || ''),
          country: String(vendor.country || 'Pakistan'),
          businessType: String(vendor.businessType || ''),
          taxId: String(vendor.taxId || ''),
          bankName: String(vendor.bankDetails?.bankName || ''),
          accountNumber: String(vendor.bankDetails?.accountNumber || ''),
          accountTitle: String(vendor.bankDetails?.accountTitle || ''),
          businessDescription: String(vendor.businessDescription || ''),
          website: String(vendor.website || ''),
          logo: String(vendor.logo || '')
        };
        
        setProfile(fallbackProfile);
        
        if (vendor.logo) {
          const logoUrl = getImageUrl(vendor.logo);
          setLogoPreview(logoUrl);
        }
      } finally {
        setIsInitialLoad(false);
      }
    };

    initializeProfile();
  }, [vendor, isInitialLoad]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: String(value || '') // Ensure value is always a string
    }));
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    setUploadingLogo(true);
    try {
      console.log('📤 Uploading logo...');
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await vendorAPI.uploadLogo(formData);
      console.log('📥 Logo upload response:', response);
      
      // Check for successful response from backend
      if (response?.success) {
        // Clean logo path from response
        let logoPath = response.logo || response.logoPath || response.data?.vendor?.logo;
        if (logoPath) {
          // Clean up any malformed paths
          logoPath = logoPath
            .replace(/undefined/g, '')
            .replace(/\/vendor-logos\/vendor-logos\//g, '/vendor-logos/')
            .replace(/\/uploads\/uploads\//g, '/uploads/')
            .replace(/\/+/g, '/'); // Replace multiple slashes with single slash
        }
        console.log('✅ Logo uploaded successfully:', {
          originalResponse: response.logo,
          cleanedPath: logoPath
        });
        return logoPath;
      } else {
        const errorMsg = response?.message || 'Logo upload failed - no success flag';
        console.error('❌ Logo upload failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Logo upload error:', error);
      // Extract meaningful error message
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Unknown logo upload error';
      throw new Error(errorMessage);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Handle logo upload if there's a new logo
      let newLogo = profile.logo;
      if (logoFile) {
        try {
          console.log('📤 Starting logo upload...', { fileSize: logoFile.size, fileType: logoFile.type });
          const logoPath = await uploadLogo();
          
          if (logoPath) {
            newLogo = logoPath;
            setLogoPreview(getImageUrl(logoPath));
          } else {
            setError('Unable to upload logo. Please try again.');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('❌ Logo upload failed:', error);
          setError('Unable to upload logo. Please try again.');
          setLoading(false);
          return;
        }
      }

      const updateData = {
        businessName: profile.businessName,
        contactPerson: profile.contactPerson,
        businessDescription: profile.businessDescription,
        businessType: profile.businessType,
        website: profile.website,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postalCode,
        country: profile.country,
        taxId: profile.taxId,
        bankDetails: {
          bankName: profile.bankName,
          accountNumber: profile.accountNumber,
          accountTitle: profile.accountTitle
        }
      };

      // Only include logo if there's a new one
      if (newLogo && newLogo !== profile.logo) {
        updateData.logo = newLogo;
      }

      console.log('📤 Sending profile update:', updateData);

      const response = await vendorAPI.updateProfile(updateData);
      console.log('📥 Profile update response:', response);
      
      if (!response?.success) {
        const errorMsg = response?.message || 'Failed to update profile - no success flag';
        console.error('❌ Profile update failed:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ Profile updated successfully:', response);

      // Update vendor context with new data
      if (response?.data || response?.vendor) {
        const updatedVendor = response.data || response.vendor;
        updateVendor(updatedVendor);
        console.log('🔄 Updated vendor context:', updatedVendor);
      }

      // Clear file upload state
      if (newLogo && newLogo !== profile.logo) {
        setLogoFile(null);
        setProfile(prev => ({ ...prev, logo: newLogo }));
      }

      setSuccess('Profile updated successfully!');
      
      // Exit edit mode
      setIsEditing(prev => ({
        ...prev,
        profile: false,
        bank: false
      }));

    } catch (err) {
      console.error('❌ Profile update error:', err);
      // Extract meaningful error message
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Unknown profile update error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await vendorAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully!');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file size must be less than 5MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      setError(''); // Clear any previous error
    }
  };

  const toggleEdit = (section) => {
    setIsEditing(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
    setError('');
    setSuccess('');
  };

  const cancelEdit = (section) => {
    setIsEditing(prev => ({
      ...prev,
      [section]: false
    }));
    setError('');
    setSuccess('');
    // Reset logo changes if canceling
    if (section === 'profile' && logoFile) {
      setLogoFile(null);
      // Reset logo preview to original
      if (profile.logo) {
        setLogoPreview(getImageUrl(profile.logo));
      } else {
        setLogoPreview('');
      }
    }
  };

  const tabs = [
    { 
      id: 'profile', 
      name: 'Business Profile', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    { 
      id: 'bank', 
      name: 'Bank Details', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    { 
      id: 'password', 
      name: 'Password', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ];

  if (isInitialLoad) {
    return (
      <VendorLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#131921] mb-2">Profile Settings</h1>
              <p className="text-gray-600 text-lg">Manage your business information and account settings</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
              vendor?.verificationStatus === 'approved' 
                ? 'bg-green-50 text-green-700 border-green-200'
                : vendor?.verificationStatus === 'pending'
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {vendor?.verificationStatus || 'Pending'}
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-sm">
            <div className="flex">
              <svg className="w-5 h-5 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-sm">
            <div className="flex">
              <svg className="w-5 h-5 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex px-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-5 px-6 border-b-3 font-semibold text-sm transition-all duration-200 flex items-center space-x-3 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-[#131921] hover:bg-gray-100'
                  }`}
                >
                  <span className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : ''}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {!isEditing.profile ? (
                  // Card View
                  <div className="space-y-6">
                    {/* Header with Edit Button */}
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#131921]">Business Information</h3>
                        <p className="text-gray-600">Your business details and contact information</p>
                      </div>
                      <button
                        onClick={() => toggleEdit('profile')}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Profile</span>
                      </button>
                    </div>

                    {/* Business Logo */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Business Logo</h4>
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Business Logo"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log('🖼️ Logo preview failed to load, using placeholder');
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{profile.businessName || 'No business name set'}</p>
                          <p className="text-sm text-gray-600">{logoPreview ? 'Logo uploaded' : 'No logo uploaded'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Business Info Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Business Information */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Basic Information</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Business Name</label>
                            <p className="text-gray-900">{profile.businessName || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Contact Person</label>
                            <p className="text-gray-900">{profile.contactPerson || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Email</label>
                            <p className="text-gray-900">{profile.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Phone</label>
                            <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Business Details */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Business Details</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Business Type</label>
                            <p className="text-gray-900 capitalize">{profile.businessType || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Tax ID</label>
                            <p className="text-gray-900">{profile.taxId || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Website</label>
                            <p className="text-gray-900">{profile.website || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Address Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Street Address</label>
                            <p className="text-gray-900">{profile.address || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">City</label>
                            <p className="text-gray-900">{profile.city || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">State/Province</label>
                            <p className="text-gray-900">{profile.state || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Country</label>
                            <p className="text-gray-900">{profile.country || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Business Description */}
                      <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Business Description</h4>
                        <p className="text-gray-900">{profile.businessDescription || 'No description provided'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Edit Form
                  <form onSubmit={handleProfileSubmit} className="space-y-8">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#131921]">Edit Business Information</h3>
                        <p className="text-gray-600">Update your business details and contact information</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => cancelEdit('profile')}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>

                    {/* Business Logo Section */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Business Logo</h4>
                      <div className="flex items-start space-x-6">
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                          <div className="w-24 h-24 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                              <img
                                src={logoPreview}
                                alt="Business Logo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.log('🖼️ Logo preview failed to load, using placeholder');
                                  e.target.src = '/assets/default-vendor-logo.png';
                                }}
                              />
                            ) : (
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        {/* Logo Upload */}
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Business Logo
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          />
                          <p className="mt-2 text-sm text-gray-500">
                            Recommended: Square image, max 5MB (JPEG, PNG, GIF)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Business Name *
                        </label>
                        <input
                          type="text"
                          name="businessName"
                          required
                          value={profile.businessName}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          placeholder="Enter your business name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          name="contactPerson"
                          required
                          value={profile.contactPerson}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          placeholder="Contact person name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={profile.email}
                          onChange={handleChange}
                          disabled
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                          placeholder="Email address"
                        />
                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={profile.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          placeholder="Phone number"
                        />
                      </div>
                    </div>

                    {/* Business Type and Tax ID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Business Type
                        </label>
                        <select
                          name="businessType"
                          value={profile.businessType}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white"
                        >
                          <option value="">Select business type</option>
                          <option value="individual">Individual</option>
                          <option value="company">Company</option>
                          <option value="partnership">Partnership</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Tax ID / NTN
                        </label>
                        <input
                          type="text"
                          name="taxId"
                          value={profile.taxId}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          placeholder="Enter tax identification number"
                        />
                      </div>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={profile.website}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="https://www.yourwebsite.com"
                      />
                    </div>

                    {/* Business Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Business Description
                      </label>
                      <textarea
                        name="businessDescription"
                        rows="4"
                        value={profile.businessDescription}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="Describe your business, products, and services..."
                      />
                    </div>

                    {/* Address Information */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-semibold text-[#131921] mb-6">Address Information</h3>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Address *
                          </label>
                          <input
                            type="text"
                            name="address"
                            required
                            value={profile.address}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                            placeholder="Enter complete business address"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              City *
                            </label>
                            <input
                              type="text"
                              name="city"
                              required
                              value={profile.city}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                              placeholder="City"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              State/Province
                            </label>
                            <input
                              type="text"
                              name="state"
                              value={profile.state}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                              placeholder="State/Province"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              name="postalCode"
                              value={profile.postalCode}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                              placeholder="Postal Code"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Country
                            </label>
                            <select
                              name="country"
                              value={profile.country}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white"
                            >
                              <option value="Pakistan">Pakistan</option>
                              <option value="India">India</option>
                              <option value="Bangladesh">Bangladesh</option>
                              <option value="Afghanistan">Afghanistan</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <div className="space-y-6">
                {!isEditing.bank ? (
                  // Card View
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#131921]">Bank Details</h3>
                        <p className="text-gray-600">Your bank account information for payments</p>
                      </div>
                      <button
                        onClick={() => toggleEdit('bank')}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Bank Details</span>
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Bank Name</label>
                          <p className="text-gray-900 text-lg">{profile.bankName || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Account Title</label>
                          <p className="text-gray-900 text-lg">{profile.accountTitle || 'Not provided'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Account Number</label>
                          <p className="text-gray-900 text-lg font-mono">
                            {profile.accountNumber ? 
                              `****-****-${profile.accountNumber.slice(-4)}` : 
                              'Not provided'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Edit Form
                  <form onSubmit={handleProfileSubmit} className="space-y-8">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#131921]">Edit Bank Details</h3>
                        <p className="text-gray-600">Update your bank account information for payments</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => cancelEdit('bank')}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          name="bankName"
                          required
                          value={profile.bankName}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          placeholder="Enter bank name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Account Title *
                        </label>
                        <input
                          type="text"
                          name="accountTitle"
                          required
                          value={profile.accountTitle}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          placeholder="Account holder name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          name="accountNumber"
                          required
                          value={profile.accountNumber}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          placeholder="Enter account number"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-6">
                      <div className="flex">
                        <svg className="w-6 h-6 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 className="text-sm font-semibold text-blue-800 mb-2">Bank Information Security</h3>
                          <p className="text-sm text-blue-700">
                            Your bank details are securely stored and used only for payment processing. Make sure all information is accurate to avoid payment delays.
                          </p>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-8">
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-[#131921] mb-2">Change Password</h3>
                  <p className="text-gray-600">Update your account password for better security.</p>
                </div>
                
                <div className="max-w-md space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
                  <div className="flex">
                    <svg className="w-6 h-6 text-yellow-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-800 mb-2">Password Security</h3>
                      <p className="text-sm text-yellow-700">
                        Your password should be at least 6 characters long. Use a combination of letters, numbers, and special characters for better security.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Changing...
                      </span>
                    ) : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorProfilePageOptimized;
