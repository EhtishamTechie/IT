import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { vendorService } from '../../services/vendorService';

const ApplicationStatusPage = () => {
  const [applicationId, setApplicationId] = useState('');
  const [applicationData, setApplicationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!applicationId.trim()) {
      setError('Please enter your application ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await vendorService.checkApplicationStatus(applicationId.trim());

      if (response.data.success) {
        setApplicationData(response.data.data);
      } else {
        setError(response.data.message || 'Application not found');
      }
    } catch (err) {
      setError('Failed to check application status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'submitted': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'more_info_required': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return (
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'under_review':
        return (
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'approved':
        return (
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'more_info_required':
        return (
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getStatusMessage = (status) => {
    const messages = {
      'draft': 'Your application is saved as a draft. Complete and submit it to begin the review process.',
      'submitted': 'Your application has been submitted and is waiting for review.',
      'under_review': 'Your application is currently being reviewed by our team.',
      'approved': 'Congratulations! Your application has been approved and your vendor account has been created. You can now log in using the credentials provided below.',
      'rejected': 'Unfortunately, your application has been rejected. Please contact support for more information.',
      'more_info_required': 'We need additional information to complete your application review.'
    };
    return messages[status] || 'Application status unknown.';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-orange-500">IT</div>
              <span className="text-gray-900 font-medium">International Tijarat</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-orange-500 transition-colors">
                Home
              </Link>
              <Link to="/vendor/login" className="text-gray-700 hover:text-orange-500 transition-colors">
                Vendor Login
              </Link>
              <Link to="/vendor/register" className="text-orange-500 font-medium">
                Become a Vendor
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Check Application Status</h1>
          <p className="mt-2 text-gray-600">
            Enter your application ID to check the status of your vendor application
          </p>
        </div>

        {/* Search Form */}
        {!applicationData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="mb-4">
                <label htmlFor="applicationId" className="block text-sm font-medium text-gray-700 mb-2">
                  Application ID
                </label>
                <input
                  type="text"
                  id="applicationId"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your application ID (e.g., APP-2024-001234)"
                />
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {loading ? 'Checking...' : 'Check Status'}
              </button>
            </form>
          </div>
        )}

        {/* Application Status Results */}
        {applicationData && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(applicationData.status)}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Application Status
                    </h2>
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(applicationData.status)}`}>
                      {applicationData.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setApplicationData(null);
                    setApplicationId('');
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-gray-800">{getStatusMessage(applicationData.status)}</p>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Application Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Application ID:</span>
                      <span className="font-medium text-gray-900">{applicationData.applicationId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Business Name:</span>
                      <span className="font-medium text-gray-900">{applicationData.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submitted:</span>
                      <span className="font-medium text-gray-900">{formatDate(applicationData.submittedAt)}</span>
                    </div>
                    {applicationData.reviewedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reviewed:</span>
                        <span className="font-medium text-gray-900">{formatDate(applicationData.reviewedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {applicationData.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Review Notes</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">{applicationData.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Login Credentials Section - Only show for approved applications */}
            {applicationData.status === 'approved' && applicationData.loginCredentials && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="border-l-4 border-green-400 bg-green-50 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-green-800">
                        Your Vendor Account Is Ready!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p className="mb-3">Your vendor application has been approved and your account has been created. Use the credentials below to log in:</p>
                        
                        <div className="bg-white border border-green-200 rounded-md p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">
                                Email Address
                              </label>
                              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <span className="text-sm text-gray-900 font-mono">
                                  {applicationData.loginCredentials.email}
                                </span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(applicationData.loginCredentials.email)}
                                  className="text-green-600 hover:text-green-800 ml-2"
                                  title="Copy email"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">
                                Password
                              </label>
                              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <span className="text-sm text-gray-900 font-mono">
                                  {applicationData.loginCredentials.password}
                                </span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(applicationData.loginCredentials.password)}
                                  className="text-green-600 hover:text-green-800 ml-2"
                                  title="Copy password"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-green-200 pt-3">
                            <p className="text-xs text-green-600 mb-2">
                              <strong>Important:</strong> Please change your password after your first login for security.
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-600">Login URL:</span>
                              <a 
                                href={applicationData.loginCredentials.loginUrl}
                                className="text-xs text-green-700 hover:text-green-900 underline font-mono"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {applicationData.loginCredentials.loginUrl}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applicationData.status === 'approved' && (
                  <Link
                    to="/vendor/login"
                    className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-md font-medium text-center transition-colors"
                  >
                    Login to Your Account
                  </Link>
                )}

                {applicationData.status === 'rejected' && (
                  <Link
                    to="/vendor/register"
                    className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-md font-medium text-center transition-colors"
                  >
                    Submit New Application
                  </Link>
                )}

                {applicationData.status === 'more_info_required' && (
                  <a
                    href="mailto:vendor-support@internationaltijarat.com"
                    className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-md font-medium text-center transition-colors"
                  >
                    Contact Support
                  </a>
                )}

                <button
                  onClick={() => {
                    setApplicationData(null);
                    setApplicationId('');
                    setError('');
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-md font-medium text-center transition-colors"
                >
                  Check Another Application
                </button>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">Need Help?</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    If you have questions about your application or need assistance, our vendor support team is here to help.
                  </p>
                  <a
                    href="mailto:vendor-support@internationaltijarat.com"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Contact Vendor Support →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Don't have an Application ID?</h3>
            <p className="text-gray-600 mb-4">
              If you haven't submitted an application yet, you can start the vendor registration process.
            </p>
            <div className="space-x-4">
              <Link
                to="/vendor/register"
                className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Apply to Become a Vendor
              </Link>
              <Link
                to="/vendor/login"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium transition-colors"
              >
                Vendor Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl font-bold text-orange-500">IT</div>
                <span className="text-white font-medium">International Tijarat</span>
              </div>
              <p className="text-gray-400 mb-4">
                Your trusted global marketplace connecting buyers and vendors worldwide.
                Quality products, reliable service, competitive prices.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Vendor Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/vendor/register" className="hover:text-white transition-colors">Become a Vendor</Link></li>
                <li><Link to="/vendor/login" className="hover:text-white transition-colors">Vendor Login</Link></li>
                <li><Link to="/vendor/application-status" className="hover:text-white transition-colors">Check Application</Link></li>
                <li><a href="mailto:vendor-support@internationaltijarat.com" className="hover:text-white transition-colors">Vendor Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><a href="tel:+1-555-123-4567" className="hover:text-white transition-colors">Call Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400">
            <p>&copy; 2024 International Tijarat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ApplicationStatusPage;
