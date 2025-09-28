import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  Copy, 
  X,
  FileText,
  Camera
} from 'lucide-react';
import { getApiUrl, getImageUrl } from '../config';
import API from '../api.js';

const AdvancePaymentSection = ({ 
  onPaymentAccountSelect, 
  onReceiptUpload, 
  selectedPaymentAccount, 
  uploadedReceipt, 
  totalAmount,
  errors = {},
  onValidationChange
}) => {
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(selectedPaymentAccount || null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(uploadedReceipt || null);
  const [uploadError, setUploadError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Load active payment accounts
  useEffect(() => {
    const loadPaymentAccounts = async () => {
      try {
        setLoading(true);
        const response = await API.get('/payment-accounts/active');
        if (response.data.success) {
          const accounts = response.data.data;
          setPaymentAccounts(accounts);
          
          // Auto-select if only one payment method available
          if (accounts.length === 1) {
            setSelectedAccount(accounts[0]);
            onPaymentAccountSelect && onPaymentAccountSelect(accounts[0]);
          }
        }
      } catch (error) {
        console.error('Error loading payment accounts:', error);
        setUploadError('Failed to load payment methods');
      } finally {
        setLoading(false);
      }
    };

    loadPaymentAccounts();
  }, []); // Remove onPaymentAccountSelect dependency to prevent infinite loop

  // Validate payment selection and receipt upload
  useEffect(() => {
    const isValid = selectedAccount && receiptFile;
    onValidationChange && onValidationChange(isValid);
  }, [selectedAccount, receiptFile]); // Remove onValidationChange to prevent infinite loop

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    onPaymentAccountSelect && onPaymentAccountSelect(account);
    setUploadError('');
  };

  const handleReceiptUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid image (JPEG, PNG, WebP) or PDF file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setReceiptFile(file);
    onReceiptUpload && onReceiptUpload(file);
    setUploadError('');

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('pdf');
    }
  };

  const copyAccountNumber = (accountNumber) => {
    navigator.clipboard.writeText(accountNumber);
    setSuccess('Account number copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    onReceiptUpload && onReceiptUpload(null);
    // Reset file input
    const fileInput = document.getElementById('receipt-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (paymentAccounts.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">No payment methods available at the moment</p>
        <p className="text-sm text-gray-500 mt-1">Please contact support or try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Advance Payment Instructions
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ol className="list-decimal list-inside space-y-1">
                <li>Select a payment method below</li>
                <li>Transfer PKR {totalAmount?.toFixed(2)} to the selected account</li>
                <li>Upload a screenshot/photo of your payment receipt</li>
                <li>Your order will be processed after payment verification</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}
      
      {(uploadError || errors.paymentReceipt || errors.selectedPaymentAccount) && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {uploadError || errors.paymentReceipt || errors.selectedPaymentAccount}
        </div>
      )}

      {/* Payment Method Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {paymentAccounts.length === 1 ? 'Payment Method' : 'Select Payment Method'} <span className="text-red-500">*</span>
        </h3>
        
        <div className="space-y-3">
          {paymentAccounts.map((account) => (
            <div
              key={account._id}
              className={`relative border rounded-lg p-4 ${paymentAccounts.length > 1 ? 'cursor-pointer' : ''} transition-colors ${
                selectedAccount?._id === account._id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={paymentAccounts.length > 1 ? () => handleAccountSelect(account) : undefined}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {paymentAccounts.length > 1 && (
                    <div className="flex items-center">
                      <input
                        type="radio"
                        checked={selectedAccount?._id === account._id}
                        onChange={() => handleAccountSelect(account)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">
                        {account.paymentType === 'JazzCash' ? '📱' : 
                         account.paymentType === 'EasyPaisa' ? '💳' : '🏦'}
                      </span>
                      <h4 className="font-medium text-gray-900">{account.title}</h4>
                      <span className="text-sm text-gray-500">({account.paymentType})</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm text-gray-600">Account:</span>
                      <span className="font-mono text-sm text-gray-900">{account.accountNumber}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyAccountNumber(account.accountNumber);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Copy account number"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {account.instructions && (
                      <p className="text-sm text-gray-600">{account.instructions}</p>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="ml-4">
                  <div className="flex flex-col items-center space-y-4">
                    {/* Large QR Code Display */}
                    <div className="relative group cursor-pointer" onClick={() => setQrModalOpen(true)}>
                      <img
                        key={account._id} // Force re-render when account changes
                        src={getImageUrl('qr-codes', account.qrCode.split(/[/\\]/).pop())}
                        alt="Payment QR Code"
                        className="w-48 h-48 md:w-56 md:h-56 object-contain border-4 border-blue-300 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onLoad={(e) => {
                          console.log('✅ QR Code loaded successfully!', e.target.src);
                        }}
                        onError={(e) => {
                          console.error('❌ QR Code image failed to load:', e.target.src);
                        }}
                      />
                      <div className="absolute -top-3 -right-3 bg-blue-500 text-white rounded-full p-3 shadow-lg">
                        <QrCode className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-800 mb-1">Scan QR Code to Pay</p>
                      <p className="text-sm text-gray-600">Amount: Rs. {totalAmount}</p>
                      <p className="text-xs text-blue-600 mt-1">Tap QR code for larger view</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt Upload Section */}
      {selectedAccount && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Upload Payment Receipt <span className="text-red-500">*</span>
          </h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            {!receiptPreview ? (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload payment receipt or screenshot
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      PNG, JPG, WebP images up to 5MB
                    </span>
                  </label>
                  <input
                    id="receipt-upload"
                    name="receipt-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="sr-only"
                  />
                </div>
                <div className="mt-4">
                  <label
                    htmlFor="receipt-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="relative inline-block">
                  {receiptPreview === 'pdf' ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-20 w-20 text-red-500 mb-2" />
                      <span className="text-sm font-medium text-gray-900">PDF Receipt</span>
                      <span className="text-xs text-gray-500">{receiptFile?.name}</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={receiptPreview}
                        alt="Payment Receipt"
                        className="max-h-40 max-w-full object-contain border border-gray-200 rounded"
                      />
                      <button
                        onClick={removeReceipt}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex items-center justify-center space-x-4">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">Receipt uploaded successfully</span>
                  </div>
                  <label
                    htmlFor="receipt-upload"
                    className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Change file
                  </label>
                  <input
                    id="receipt-upload"
                    name="receipt-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                    className="sr-only"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            <p><strong>Tips for better verification:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Ensure the amount (PKR {totalAmount?.toFixed(2)}) is clearly visible</li>
              <li>Include the transaction ID and timestamp if available</li>
              <li>Make sure the image is clear and not blurry</li>
            </ul>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {selectedAccount && receiptPreview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <div>
              <h4 className="font-medium text-green-800">Payment Details Ready</h4>
              <p className="text-sm text-green-700 mt-1">
                Amount: PKR {totalAmount?.toFixed(2)} • Method: {selectedAccount.paymentType} • Receipt: Uploaded
              </p>
            </div>
          </div>
        </div>
      )}

    {/* QR Code Modal */}
    {qrModalOpen && selectedAccount && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={() => setQrModalOpen(false)}>
        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-screen overflow-auto" onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment QR Code</h3>
            <div className="flex justify-center mb-4">
              <img
                src={getImageUrl('qr-codes', selectedAccount.qrCode.split(/[/\\]/).pop())}
                alt="Payment QR Code"
                className="w-64 h-64 object-contain border-2 border-blue-200 rounded-lg"
              />
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">{selectedAccount.title}</h4>
              <p className="text-blue-800">Account: {selectedAccount.accountNumber}</p>
              <p className="text-lg font-bold text-blue-900 mt-2">Amount: Rs. {totalAmount}</p>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selectedAccount.instructions}</p>
            <button
              onClick={() => setQrModalOpen(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default AdvancePaymentSection;