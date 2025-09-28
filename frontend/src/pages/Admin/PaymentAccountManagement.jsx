import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  QrCode,
  Copy
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { getApiUrl } from '../../config';

const PaymentAccountManagement = () => {
  const { adminAPI } = useAdminAuth();
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    accountNumber: '',
    paymentType: 'JazzCash',
    instructions: 'Please transfer the advance payment and upload the receipt screenshot.',
    displayOrder: 0,
    isActive: true
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment type options
  const paymentTypes = [
    { value: 'JazzCash', label: 'JazzCash', icon: '📱' },
    { value: 'EasyPaisa', label: 'EasyPaisa', icon: '💳' },
    { value: 'Bank Transfer', label: 'Bank Transfer', icon: '🏦' }
  ];

  // Load payment accounts
  const loadPaymentAccounts = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.get('/payment-accounts');
      if (response.data.success) {
        setPaymentAccounts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading payment accounts:', error);
      setErrors({ general: 'Failed to load payment accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentAccounts();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrors({ qrCode: 'Please select a valid image file (JPEG, PNG, or WebP)' });
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ qrCode: 'File size must be less than 5MB' });
        return;
      }
      
      setSelectedFile(file);
      setErrors(prev => ({ ...prev, qrCode: '' }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Account title is required';
    }
    
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }
    
    if (!editingAccount && !selectedFile) {
      newErrors.qrCode = 'QR code image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('accountNumber', formData.accountNumber);
      formDataToSend.append('paymentType', formData.paymentType);
      formDataToSend.append('instructions', formData.instructions);
      formDataToSend.append('displayOrder', formData.displayOrder);
      formDataToSend.append('isActive', formData.isActive);
      
      if (selectedFile) {
        formDataToSend.append('qrCode', selectedFile);
      }
      
      let response;
      if (editingAccount) {
        response = await adminAPI.put(`/payment-accounts/${editingAccount._id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await adminAPI.post('/payment-accounts', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      if (response.data.success) {
        setSuccess(editingAccount ? 'Payment account updated successfully!' : 'Payment account created successfully!');
        resetForm();
        loadPaymentAccounts();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error saving payment account:', error);
      setErrors({ 
        general: error.response?.data?.message || 'Failed to save payment account'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      accountNumber: '',
      paymentType: 'JazzCash',
      instructions: 'Please transfer the advance payment and upload the receipt screenshot.',
      displayOrder: 0,
      isActive: true
    });
    setSelectedFile(null);
    setImagePreview(null);
    setEditingAccount(null);
    setShowForm(false);
    setErrors({});
  };

  // Handle edit
  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      title: account.title,
      accountNumber: account.accountNumber,
      paymentType: account.paymentType,
      instructions: account.instructions,
      displayOrder: account.displayOrder,
      isActive: account.isActive
    });
    setImagePreview(account.qrCode ? `${getApiUrl()}/${account.qrCode}` : null);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment account? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await adminAPI.delete(`/payment-accounts/${id}`);
      if (response.data.success) {
        setSuccess('Payment account deleted successfully!');
        loadPaymentAccounts();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting payment account:', error);
      setErrors({ 
        general: error.response?.data?.message || 'Failed to delete payment account'
      });
    }
  };

  // Toggle active status
  const toggleActiveStatus = async (id, currentStatus) => {
    try {
      const response = await adminAPI.put(`/payment-accounts/${id}`, {
        isActive: !currentStatus
      });
      if (response.data.success) {
        setSuccess(`Payment account ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
        loadPaymentAccounts();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setErrors({ 
        general: error.response?.data?.message || 'Failed to update status'
      });
    }
  };

  // Copy account number
  const copyAccountNumber = (accountNumber) => {
    navigator.clipboard.writeText(accountNumber);
    setSuccess('Account number copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Account Management</h1>
            <p className="text-gray-600 mt-1">Manage payment accounts for advance payment system</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Account</span>
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}
      
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          {errors.general}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingAccount ? 'Edit Payment Account' : 'Add Payment Account'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., JazzCash - Muhammad Ali"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type *
                </label>
                <select
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {paymentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  placeholder="03001234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.accountNumber && <p className="text-red-600 text-xs mt-1">{errors.accountNumber}</p>}
              </div>

              {/* QR Code Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code Image *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="QR Code Preview" 
                          className="mx-auto h-32 w-32 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedFile(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <QrCode className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="qr-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload QR code</span>
                            <input
                              id="qr-upload"
                              name="qr-upload"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleFileSelect}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
                {errors.qrCode && <p className="text-red-600 text-xs mt-1">{errors.qrCode}</p>}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions for Customers
                </label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Active (visible to customers)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 text-white rounded-md transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed ${
                    submitting 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{editingAccount ? 'Update Account' : 'Create Account'}</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Accounts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Payment Accounts</h2>
            <button
              onClick={loadPaymentAccounts}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Loading payment accounts...</p>
          </div>
        ) : paymentAccounts.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No payment accounts found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Create your first payment account
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paymentAccounts.map((account) => (
              <div key={account._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {paymentTypes.find(type => type.value === account.paymentType)?.icon}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {account.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          account.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Payment Type</p>
                        <p className="font-medium">{account.paymentType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Account Number</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium font-mono">{account.accountNumber}</p>
                          <button
                            onClick={() => copyAccountNumber(account.accountNumber)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Instructions</p>
                        <p className="text-sm">{account.instructions}</p>
                      </div>
                    </div>

                    {account.qrCode && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">QR Code</p>
                        <img 
                          src={`${getApiUrl().replace('/api', '')}/${account.qrCode}`}
                          alt="QR Code"
                          className="h-32 w-32 object-contain border-2 border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleActiveStatus(account._id, account.isActive)}
                      className={`p-2 rounded-md transition-colors ${
                        account.isActive
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={account.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {account.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentAccountManagement;
