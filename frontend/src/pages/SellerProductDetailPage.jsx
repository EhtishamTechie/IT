import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getImageUrl } from '../config';

const SellerProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reducePriceModal, setReducePriceModal] = useState({ show: false, currentPrice: 0 });
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProduct();
  }, [id, isAuthenticated]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/used-products/user/my-submissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const foundProduct = data.data.find(p => p._id === id);
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          setError('Product not found or you do not have permission to view it.');
        }
      } else {
        setError('Failed to fetch product details');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Error loading product details');
    } finally {
      setLoading(false);
    }
  };

  const markAsSold = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/used-products/user/${id}/mark-sold`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setProduct(prev => ({ ...prev, status: 'sold' }));
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
      const response = await fetch(`${getApiUrl()}/used-products/user/${id}/update-price`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price: newPriceValue })
      });

      if (response.ok) {
        setProduct(prev => ({ ...prev, price: newPriceValue }));
        setReducePriceModal({ show: false, currentPrice: 0 });
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'sold': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="text-gray-600 font-medium">Loading product details...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/sell-used-products')}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Back to My Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/sell-used-products')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Products
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header with Status */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{product.title}</h1>
                <p className="text-orange-100">Product Management Dashboard</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(product.status)}`}>
                  {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getConditionColor(product.condition)}`}>
                  {product.condition}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Product Images</h3>
              <div className="grid grid-cols-2 gap-4">
                {product.images && product.images.length > 0 ? (
                  product.images.map((image, index) => (
                    <div key={index} className="aspect-w-1 aspect-h-1">
                      <img
                        src={getImageUrl('usedProducts', image) || '/assets/no-image.png'}
                        alt={`${product.title} ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          console.warn('Image load error:', e.target.src);
                          e.target.src = '/assets/no-image.png';
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No images available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Product Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Price</span>
                  <span className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Category</span>
                  <span className="text-gray-900 capitalize">{product.category}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Views</span>
                  <span className="text-gray-900">{product.views || 0}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Listed</span>
                  <span className="text-gray-900">{formatTimeAgo(product.createdAt)}</span>
                </div>
                
                {product.brand && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Brand</span>
                    <span className="text-gray-900">{product.brand}</span>
                  </div>
                )}
                
                {product.model && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Model</span>
                    <span className="text-gray-900">{product.model}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Location</span>
                  <span className="text-gray-900">{product.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-8 pb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
            <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
              {product.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="px-8 pb-8 border-t border-gray-200 pt-6">
            {product.status === 'approved' && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={markAsSold}
                  className="bg-gray-700 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Mark as Sold
                </button>
                <button
                  onClick={() => setReducePriceModal({ show: true, currentPrice: product.price })}
                  className="bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  Reduce Price
                </button>
              </div>
            )}

            {product.status === 'pending' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-3 rounded-lg bg-yellow-100 text-yellow-800">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Your product is under review. You'll be notified once it's approved.
                </div>
              </div>
            )}

            {product.status === 'rejected' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-3 rounded-lg bg-red-100 text-red-800 mb-4">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Product was rejected. Please review and resubmit.
                </div>
                {product.adminNotes && (
                  <p className="text-sm text-gray-600">Admin notes: {product.adminNotes}</p>
                )}
              </div>
            )}

            {product.status === 'sold' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-3 rounded-lg bg-gray-100 text-gray-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  This product has been marked as sold.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reduce Price Modal */}
      {reducePriceModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reduce Price</h3>
            <p className="text-gray-600 mb-4">
              Current price: <span className="font-semibold">{formatPrice(reducePriceModal.currentPrice)}</span>
            </p>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              min="0"
              step="0.01"
              max={reducePriceModal.currentPrice}
              placeholder="Enter new price"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReducePriceModal({ show: false, currentPrice: 0 });
                  setNewPrice('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReducePrice}
                className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium"
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

export default SellerProductDetailPage;
