import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  X, 
  Home, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Mail,
  DollarSign,
  Building,
  Bed,
  Bath,
  Square,
  Eye,
  Trash2
} from 'lucide-react';
import { config } from '../../config';
import { propertyService } from '../../services/propertyService';
import axios from 'axios';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchPropertyDetails();
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/admin/properties/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setProperty(response.data.property);
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyAction = async (action) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      let endpoint = '';
      let method = 'PATCH';
      let data = {};
      
      switch (action) {
        case 'approve':
          endpoint = `${config.API_BASE_URL}/admin/properties/${id}/approve`;
          data = { notes: 'Approved by admin' };
          break;
        case 'reject':
          endpoint = `${config.API_BASE_URL}/admin/properties/${id}/reject`;
          const rejectionReason = window.prompt('Please provide a reason for rejection:');
          if (!rejectionReason) {
            setActionLoading(false);
            return;
          }
          data = { adminNotes: rejectionReason };
          break;
        case 'delete':
          endpoint = `${config.API_BASE_URL}/admin/properties/${id}`;
          method = 'DELETE';
          break;
        default:
          return;
      }

      const response = await axios({
        method,
        url: endpoint,
        headers: { Authorization: `Bearer ${token}` },
        data
      });

      if (response.data.success) {
        if (action === 'delete') {
          alert('Property deleted successfully');
          navigate('/admin/properties');
          return; // Exit early after successful deletion
        } else {
          const newStatus = action === 'approve' ? 'approved' : 'rejected';
          alert(`Property ${newStatus} successfully`);
          setProperty(prev => ({ 
            ...prev, 
            status: newStatus
          }));
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing property:`, error);
      alert(`Failed to ${action} property`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      sold: { color: 'bg-blue-100 text-blue-800', text: 'Sold' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <Home className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Property not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The property you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => navigate('/admin/properties')}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/properties')}
            className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Properties
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Property Details</h1>
            <p className="text-gray-600">Review and manage property listing</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(property.status)}
          {property.status === 'pending' && (
            <>
              <button
                onClick={() => handlePropertyAction('approve')}
                disabled={actionLoading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handlePropertyAction('reject')}
                disabled={actionLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </>
          )}
          <button
            onClick={() => handlePropertyAction('delete')}
            disabled={actionLoading}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Images */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="aspect-video bg-gray-200 relative">
              {property.images && property.images.length > 0 ? (
                <>
                  <img
                    src={propertyService.getImageUrl(property.images[currentImageIndex])}
                    alt={property.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Failed to load property image:', property.images[currentImageIndex]);
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-gray-200" 
                    style={{display: 'none'}}
                  >
                    <Home className="w-16 h-16 text-gray-400" />
                  </div>
                  {property.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === 0 ? property.images.length - 1 : prev - 1
                        )}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === property.images.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                      >
                        →
                      </button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {property.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-3 h-3 rounded-full ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {property.images && property.images.length > 1 && (
              <div className="p-4 flex space-x-2 overflow-x-auto">
                {property.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 ${
                      index === currentImageIndex ? 'border-orange-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={propertyService.getImageUrl(image)}
                      alt={`${property.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Failed to load thumbnail:', image);
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) {
                          e.target.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div 
                      className="w-full h-full flex items-center justify-center bg-gray-200" 
                      style={{display: 'none'}}
                    >
                      <Home className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h2>
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{property.address}, {property.areaName}, {property.city}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {property.views || 0} views
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Listed {new Date(property.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">
                  {formatPrice(property.price)}
                </div>
                {property.listingType === 'rent' && (
                  <span className="text-lg text-gray-600">/month</span>
                )}
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    {property.propertyType}
                  </span>
                </div>
              </div>
            </div>

            {/* Property Features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-200">
              {property.bedrooms && (
                <div className="flex items-center space-x-2">
                  <Bed className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900 font-medium">{property.bedrooms} Bedrooms</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center space-x-2">
                  <Bath className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900 font-medium">{property.bathrooms} Bathrooms</span>
                </div>
              )}
              {property.areaValue && (
                <div className="flex items-center space-x-2">
                  <Square className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900 font-medium">{property.areaValue} {property.areaUnit}</span>
                </div>
              )}
              {property.propertyAge && (
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900 font-medium">{property.propertyAge}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </div>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Features & Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {property.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-900 capitalize text-sm">{feature.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Property Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Property ID</span>
                <p className="font-medium text-gray-900">{property.propertyId}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Listing Type</span>
                <p className="font-medium text-gray-900 capitalize">{property.listingType || 'sale'}</p>
              </div>
              {property.furnishing && (
                <div>
                  <span className="text-sm text-gray-600">Furnishing</span>
                  <p className="font-medium text-gray-900 capitalize">{property.furnishing}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-600">Status</span>
                <div className="mt-1">{getStatusBadge(property.status)}</div>
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{property.sellerContact?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Property Owner</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{property.sellerContact?.phone || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Contact Number</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{property.sellerContact?.email || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Email Address</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => {
                  const phone = property.sellerContact?.phone?.replace(/\D/g, '');
                  if (phone) {
                    window.open(`https://wa.me/${phone}?text=Hi, I'm from International Tijarat admin team regarding your property listing: ${property.title}`, '_blank');
                  } else {
                    alert('No contact number available');
                  }
                }}
                disabled={!property.sellerContact?.phone}
                className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
                  property.sellerContact?.phone 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Contact Seller</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
