import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { CheckCircle } from 'lucide-react';

const VendorApplicationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminAPI } = useAdminAuth();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApplication();
  }, [id]);

  const loadApplication = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getVendorApplication(id);
      
      if (response.data.success) {
        setApplication(response.data.data);
      } else {
        setError('Application not found');
      }
    } catch (error) {
      console.error('Load application error:', error);
      setError('Error loading application details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this vendor application?')) {
      return;
    }

    const password = prompt('Enter a default password for the vendor (or leave empty for auto-generated):');
    const notes = prompt('Add approval notes (optional):');

    try {
      const response = await adminAPI.approveVendorApplication(id, {
        password: password || undefined,
        notes: notes || undefined
      });

      if (response.data.success) {
        const vendorData = response.data.data;
        console.log('🔍 Approval response data:', vendorData);
        
        // Show detailed success message with vendor login information
        const message = `Vendor application approved successfully!

Vendor Email: ${vendorData.email}
Temporary Password: ${vendorData.temporaryPassword}
Login URL: ${vendorData.loginUrl}

An email notification has been sent to the vendor with these login details.

Please inform the vendor to change their password after first login.`;

        alert(message);
        navigate('/admin/vendor-applications');
      } else {
        alert(response.data.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Approve application error:', error);
      alert('Error approving application');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await adminAPI.rejectVendorApplication(id, { reason });

      if (response.data.success) {
        alert('Vendor application rejected successfully!');
        navigate('/admin/vendor-applications');
      } else {
        alert(response.data.message || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Reject application error:', error);
      alert('Error rejecting application');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      'submitted': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
      'under_review': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Under Review' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      'more_info_required': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'More Info Required' }
    };

    const config = statusConfig[status] || statusConfig['draft'];
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <Link to="/admin/vendor-applications" className="text-orange-600 hover:text-orange-500 mt-4 inline-block">
            ← Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin/dashboard" className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-orange-500">IT</div>
                <span className="text-gray-900 font-medium">Admin Portal</span>
              </Link>
            </div>
            <nav className="flex space-x-4">
              <Link to="/admin/dashboard" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/admin/vendor-applications" className="bg-orange-100 text-orange-700 px-3 py-2 rounded-md text-sm font-medium">
                Vendor Applications
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/admin/vendor-applications" className="text-gray-700 hover:text-gray-900">
                Vendor Applications
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-gray-500 md:ml-2">{application.applicationId}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header with Actions */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{application.businessName}</h1>
                <p className="text-gray-600">Application ID: {application.applicationId}</p>
              </div>
              <div className="flex items-center space-x-4">
                {getStatusBadge(application.status)}
                {(application.status === 'submitted' || application.status === 'under_review') && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleApprove}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Approve Application
                    </button>
                    <button
                      onClick={handleReject}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Reject Application
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Credentials Section - Show when approved */}
        {application.status === 'approved' && (
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <div className="border-l-4 border-green-400 bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Vendor Account Created Successfully
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>The vendor account has been created with the following details:</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Login Email</label>
                <div className="mt-1 flex">
                  <input 
                    type="text" 
                    value={application.email} 
                    readOnly 
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                  <button 
                    onClick={() => navigator.clipboard.writeText(application.email)}
                    className="ml-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                    title="Copy email"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Password</label>
                <div className="mt-1 flex">
                  <input 
                    type="text" 
                    value="VendorPass123" 
                    readOnly 
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-yellow-50 font-mono text-sm"
                  />
                  <button 
                    onClick={() => navigator.clipboard.writeText("VendorPass123")}
                    className="ml-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                    title="Copy password"
                  >
                    📋
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">⚠️ Vendor should change this password after first login</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Vendor Login URL</label>
                <div className="mt-1 flex">
                  <input 
                    type="text" 
                    value="http://localhost:5173/vendor/login" 
                    readOnly 
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("http://localhost:5173/vendor/login");
                      window.open("http://localhost:5173/vendor/login", "_blank");
                    }}
                    className="ml-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                    title="Copy URL and open"
                  >
                    🔗
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                📧 <strong>Email Notification:</strong> The vendor has been automatically notified via email with these login credentials.
              </p>
            </div>
          </div>
        )}

        {/* Application Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Business Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <p className="mt-1 text-sm text-gray-900">{application.businessName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{application.businessType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{application.email}</p>
              </div>
              {application.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{application.description}</p>
                </div>
              )}
              {application.intendedCategories && application.intendedCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Intended Categories</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {application.intendedCategories.map((category, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <p className="mt-1 text-sm text-gray-900">
                  {application.contactPerson?.firstName} {application.contactPerson?.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{application.contactPerson?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-sm text-gray-900">
                  {application.address?.street}<br />
                  {application.address?.city}, {application.address?.state} {application.address?.zipCode}<br />
                  {application.address?.country}
                </p>
              </div>
            </div>
          </div>

          {/* Application Timeline */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Application Timeline</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Application Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(application.applicationDate || application.createdAt)}
                </p>
              </div>
              {application.reviewedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reviewed Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(application.reviewedAt)}</p>
                </div>
              )}
              {application.reviewedBy && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reviewed By</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {application.reviewedBy.name || application.reviewedBy.email}
                  </p>
                </div>
              )}
              {application.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Review Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{application.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {application.documents?.taxId?.value && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                  <p className="mt-1 text-sm text-gray-900">{application.documents.taxId.value}</p>
                </div>
              )}
              {application.documents?.businessLicense?.filename && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business License</label>
                  <p className="mt-1 text-sm text-gray-900">{application.documents.businessLicense.filename}</p>
                </div>
              )}
              {application.documents?.bankStatement?.filename && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Statement</label>
                  <p className="mt-1 text-sm text-gray-900">{application.documents.bankStatement.filename}</p>
                </div>
              )}
              {!application.documents?.taxId?.value && 
               !application.documents?.businessLicense?.filename && 
               !application.documents?.bankStatement?.filename && (
                <p className="text-sm text-gray-500">No documents uploaded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorApplicationDetailPage;
