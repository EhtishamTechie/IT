import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, EyeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getApiUrl, getUploadUrl } from '../config';

const AdminProductApproval = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch products based on filter
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `${getApiUrl()}/admin/products`;
      if (filter !== 'all') {
        url += `?approvalStatus=${filter}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        console.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update product approval status
  const updateProductStatus = async (productId, status, rejectionReason = '') => {
    try {
      const response = await fetch(`${getApiUrl()}/admin/products/${productId}/approval`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvalStatus: status,
          rejectionReason: rejectionReason
        })
      });

      if (response.ok) {
        // Refresh the products list
        fetchProducts();
        setShowModal(false);
        setSelectedProduct(null);
      } else {
        console.error('Failed to update product status');
      }
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const ProductModal = ({ product, onClose, onApprove, onReject }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    if (!product) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{product.title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Vendor: {product.vendor?.businessName || 'Unknown'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Image */}
              <div>
                {product.image ? (
                  <img
                    src={`${getUploadUrl()}/uploads/${product.image}`}
                    alt={product.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No Image</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Price</label>
                    <p className="text-lg font-bold text-green-600">${product.price}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stock</label>
                    <p className="text-gray-900">{product.stock} units</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Categories</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {product.mainCategory?.map((cat, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(product.approvalStatus)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-900 mt-1">{product.description}</p>
            </div>

            {/* Vendor Information */}
            {product.vendor && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Business Name:</span>
                    <p>{product.vendor.businessName}</p>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>
                    <p>{product.vendor.email}</p>
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>
                    <p>{product.vendor.contactPhone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Rating:</span>
                    <p>{product.vendor.rating || 'No rating'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {product.approvalStatus === 'pending' && (
              <div className="flex gap-4">
                {!showRejectForm ? (
                  <>
                    <button
                      onClick={() => onApprove(product._id)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      <CheckIcon className="w-5 h-5" />
                      Approve Product
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      Reject Product
                    </button>
                  </>
                ) : (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Please provide a reason for rejection..."
                    />
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={() => onReject(product._id, rejectionReason)}
                        disabled={!rejectionReason.trim()}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Product Approval Management</h1>
            <p className="mt-2 text-gray-600">Review and approve vendor products for the marketplace</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'pending', label: 'Pending Review', icon: ClockIcon },
                { key: 'approved', label: 'Approved', icon: CheckIcon },
                { key: 'rejected', label: 'Rejected', icon: XMarkIcon },
                { key: 'all', label: 'All Products', icon: EyeIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === key
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-4">
                  {/* Product Image */}
                  <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
                    {product.image ? (
                      <img
                        src={`${getUploadUrl()}/uploads/${product.image}`}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.title}</h3>
                    <p className="text-sm text-gray-600">
                      by {product.vendor?.businessName || 'Unknown Vendor'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-green-600">${product.price}</span>
                      {getStatusBadge(product.approvalStatus)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowModal(true);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium"
                    >
                      View Details
                    </button>
                    {product.approvalStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => updateProductStatus(product._id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-2">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
            <p className="text-gray-600">No products match the current filter.</p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setShowModal(false);
            setSelectedProduct(null);
          }}
          onApprove={(productId) => updateProductStatus(productId, 'approved')}
          onReject={(productId, reason) => updateProductStatus(productId, 'rejected', reason)}
        />
      )}
    </div>
  );
};

export default AdminProductApproval;
