import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiUrl, getImageUrl } from '../config';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Package,
  Tag,
  User,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { createWhatsAppURL, getWhatsAppDisplayNumber } from '../utils/whatsappUtils';

const UsedProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`/used-products/public/${id}`));
      
      if (!response.ok) {
        throw new Error('Product not found');
      }

      const data = await response.json();
      if (data.success) {
        // Use the unified image URL configuration
        const transformedData = {
          ...data.data,
          images: data.data.images.map(img => getImageUrl('usedProducts', img))
        };
        console.log('Product data received:', transformedData);
        console.log('Product images:', transformedData.images);
        setProduct(transformedData);
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      navigate('/used-products');
    } finally {
      setLoading(false);
    }
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
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Loading product details...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/used-products')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Used Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/used-products')}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              {product.images && product.images.length > 0 ? (
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="aspect-w-16 aspect-h-12">
                    <img
                      src={getImageUrl('usedProducts', product.images[selectedImage])}
                      alt={product.title}
                      className="w-full h-96 object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Failed to load image:', product.images[selectedImage]);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  {product.images.length > 1 && (
                    <div className="flex space-x-2 overflow-x-auto">
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                            selectedImage === index
                              ? 'border-orange-500'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={getImageUrl('usedProducts', image)}
                            alt={`${product.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load thumbnail:', image);
                              e.target.style.display = 'none';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No images available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>
              
              <div className="flex items-center mb-6">
                <DollarSign className="w-6 h-6 text-green-600 mr-2" />
                <span className="text-3xl font-bold text-green-600">{formatPrice(product.price)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <Tag className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Category</span>
                    <p className="font-medium text-gray-900">{product.category}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Package className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Condition</span>
                    <p className="font-medium text-gray-900">{product.condition}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Location</span>
                    <p className="font-medium text-gray-900">{product.location}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Listed</span>
                    <p className="font-medium text-gray-900">{formatDate(product.createdAt)}</p>
                  </div>
                </div>
              </div>

              {product.brand && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Brand: </span>
                  <span className="font-medium text-gray-900">{product.brand}</span>
                </div>
              )}

              {product.model && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Model: </span>
                  <span className="font-medium text-gray-900">{product.model}</span>
                </div>
              )}

              {product.yearOfPurchase && (
                <div className="mb-6">
                  <span className="text-sm text-gray-500">Year of Purchase: </span>
                  <span className="font-medium text-gray-900">{product.yearOfPurchase}</span>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Seller</h3>
              
              {/* WhatsApp Contact - Primary CTA */}
              <div className="mb-4">
                <a
                  href={createWhatsAppURL(product.contactPhone, product.title, formatPrice(product.price))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.492"/>
                  </svg>
                  Chat on WhatsApp
                </a>
              </div>

              {/* Alternative Contact Methods */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Or contact directly:</p>
                
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-gray-400 mr-3" />
                  <a
                    href={`tel:${product.contactPhone}`}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {getWhatsAppDisplayNumber(product.contactPhone)}
                  </a>
                </div>

                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-400 mr-3" />
                  <a
                    href={`mailto:${product.contactEmail}`}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {product.contactEmail}
                  </a>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsedProductDetailPage;
