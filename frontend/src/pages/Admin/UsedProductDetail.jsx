import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Package,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  MessageCircle,
  Star,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl, getImageUrl } from '../../config';

const UsedProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Fetch product details
  const fetchProduct = async () => {
    try {
      setLoading(true);
      console.log('Fetching product with productId:', productId);
      const response = await fetch(`${getApiUrl()}/admin/used-products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      console.log('Fetch response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }

      const data = await response.json();
      console.log('Product data received:', data);
      
      // Transform image URLs using our standardized configuration
      const transformedProduct = {
        ...data,
        images: data.images.map(img => getImageUrl('usedProducts', img))
      };
      console.log('Transformed product data:', transformedProduct);
      setProduct(transformedProduct);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product details');
      navigate('/admin/used-products');
    } finally {
      setLoading(false);
    }
  };

  // Handle approval
  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this product? It will be visible to all users.')) {
      return;
    }

    try {
      setActionLoading(true);
      console.log('Attempting to approve product:', productId);
      const response = await fetch(`${getApiUrl()}/admin/used-products/${productId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({})
      });

      console.log('Approve response status:', response.status);
      console.log('Approve response:', response);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Approve error response:', errorData);
        throw new Error(`Failed to approve product: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('Approve success result:', result);
      toast.success('Product approved successfully');
      fetchProduct(); // Refresh product data
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error(`Failed to approve product: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    try {
      setActionLoading(true);
      console.log('Attempting to reject product:', productId, 'with reason:', rejectionReason);
      const response = await fetch(`${getApiUrl()}/admin/used-products/${productId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ adminNotes: rejectionReason })
      });

      console.log('Reject response status:', response.status);
      console.log('Reject response:', response);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Reject error response:', errorData);
        throw new Error(`Failed to reject product: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('Reject success result:', result);
      toast.success('Product rejected successfully');
      setShowRejectionModal(false);
      setRejectionReason('');
      fetchProduct(); // Refresh product data
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error(`Failed to reject product: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone and will remove the product from the website listing.')) {
      return;
    }

    try {
      setActionLoading(true);
      console.log('Attempting to delete product:', productId);
      const response = await fetch(`${getApiUrl()}/admin/used-products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Delete error response:', errorData);
        throw new Error(`Failed to delete product: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('Delete success result:', result);
      toast.success('Product deleted successfully');
      navigate('/admin/used-products');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete product: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  useEffect(() => {
    if (product) {
      console.log('Product data:', product);
      console.log('Product images:', product.images);
      console.log('Selected image index:', selectedImage);
      console.log('Selected image URL:', product.images[selectedImage]);
    }
  }, [product, selectedImage]);

  const getStatusBadge = (status) => {
    console.log('getStatusBadge called with status:', status);
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      sold: 'bg-blue-100 text-blue-800 border-blue-200',
      active: 'bg-green-100 text-green-800 border-green-200'
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      sold: Package,
      active: CheckCircle
    };

    const Icon = icons[status];
    console.log('Icon component for status', status, ':', Icon);

    if (!Icon) {
      console.error('No icon found for status:', status);
      return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
          {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
        <Icon className="w-4 h-4 mr-2" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    console.log('UsedProductDetail: Component is loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    console.log('UsedProductDetail: No product found');
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  console.log('UsedProductDetail: Rendering product:', product.id, 'Status:', product.status);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/used-products')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
            <p className="text-sm text-gray-500">Review and manage used product submission</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {product.status === 'pending' && (
            <>
              <button
                onClick={() => setShowRejectionModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Images */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Images</h3>
            {product.images && product.images.length > 0 ? (
              <div className="space-y-4">
                {/* Main Image */}
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setShowImageModal(true)}
                >
                  <img
                    src={getImageUrl('usedProducts', product.images[selectedImage])}
                    alt={product.title}
                    className="w-full h-96 object-cover rounded-lg"
                    onError={(e) => {
                      console.error('Image failed to load:', getImageUrl(product.images[selectedImage]));
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    onLoad={(e) => {
                      console.log('Image loaded successfully:', product.images[selectedImage]);
                      e.target.nextSibling.style.display = 'none';
                    }}
                  />
                  {/* Error fallback */}
                  <div className="hidden w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Image failed to load</p>
                      <p className="text-gray-400 text-xs mt-1">{product.images[selectedImage]}</p>
                    </div>
                  </div>
                </div>
                
                {/* Thumbnail Gallery */}
                {product.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={getImageUrl('usedProducts', image)}
                          alt={`${product.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Thumbnail failed to load:', getImageUrl(image));
                            e.target.style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No images available</p>
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-lg text-gray-900">{product.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{product.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-gray-900">{product.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  <p className="mt-1 text-gray-900 capitalize">{product.condition}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <p className="mt-1 text-xl font-bold text-green-600">{formatPrice(product.price)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-gray-900">{product.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Status:</span>
                {getStatusBadge(product.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  Submitted: {formatDate(product.createdAt)}
                </div>
                {product.reviewedAt && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Reviewed: {formatDate(product.reviewedAt)}
                  </div>
                )}
                {product.reviewedBy && (
                  <div className="flex items-center text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    Reviewed by: {product.reviewedBy.firstName} {product.reviewedBy.lastName}
                  </div>
                )}
              </div>

              {product.rejectionReason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Rejection Reason:</strong> {product.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Seller Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Seller Information</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {product.user?.firstName} {product.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">User ID: {product.user?._id}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-900">{product.user?.email}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-900">{product.contactPhone}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-900">{product.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-900">{product.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Seller
              </button>
              <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Website
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="max-w-4xl max-h-screen p-4">
            <div className="relative">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <img
                src={getImageUrl('usedProducts', product.images[selectedImage])}
                alt={product.title}
                className="max-w-full max-h-screen object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Reject Product
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for rejection (optional)
                  </label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejection to help the seller understand..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowRejectionModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Product'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsedProductDetail;
