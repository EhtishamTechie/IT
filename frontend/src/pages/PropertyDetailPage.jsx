import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, 
  Home, 
  Phone, 
  Mail, 
  Calendar, 
  Bed, 
  Bath, 
  Square, 
  Building, 
  Car, 
  Wifi, 
  Shield, 
  Zap, 
  Droplets,
  ArrowLeft,
  Heart
} from 'lucide-react';
import axios from 'axios';
import { config } from '../config';
import { getImageUrl } from '../services/propertyService';

const PropertyDetailPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching property with ID:', id);
        
        const response = await axios.get(`${config.API_BASE_URL}/properties/public/${id}`);
        
        if (response.data.success) {
          const propertyData = response.data.data;
          console.log('Received property data:', propertyData);
          
          // Process images
          if (propertyData.images && Array.isArray(propertyData.images)) {
            propertyData.images = propertyData.images.map(image => {
              const imageUrl = getImageUrl(image);
              console.log('Processing image:', { original: image, processed: imageUrl });
              return imageUrl;
            });
          }
          
          setProperty(propertyData);
        } else {
          console.error('Failed to fetch property:', response.data.message);
        }
      } catch (error) {
        console.error('Error fetching property details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPropertyDetails();
    }
  }, [id]);

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

  const getFeatureIcon = (feature) => {
    const featureIcons = {
      'parking': Car,
      'wifi': Wifi,
      'security': Shield,
      'power_backup': Zap,
      'water_supply': Droplets,
      'gym': Building,
      'swimming_pool': Droplets,
      'garden': Home,
      'elevator': Building
    };
    return featureIcons[feature.toLowerCase()] || Home;
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hi, I'm interested in your property: ${property.title}\n\nProperty ID: ${property.propertyId}\nLocation: ${property.area_name}, ${property.city}\n\nPlease share more details.`
    );
    window.open(`https://wa.me/923005567507?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Home className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Property not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/properties"
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/properties"
              className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Properties
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="aspect-video bg-gray-200 relative">
                {property.images && property.images.length > 0 ? (
                  <>
                    <img
                      src={getImageUrl(property.images[currentImageIndex])}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.warn('Image load error:', e.target.src);
                        e.target.src = '/assets/no-image.png';
                      }}
                    />
                    {property.status === 'sold' && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-red-600 text-white px-4 py-2 rounded-lg transform rotate-12 shadow-lg">
                          <span className="text-lg font-bold">SOLD</span>
                        </div>
                      </div>
                    )}
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
                        src={getImageUrl(image)}
                        alt={`${property.title} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('❌ [Thumbnail] Load failed:', e.target.src);
                          e.target.src = '/assets/no-image.png';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>{property.address}, {property.area_name}, {property.city}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Listed {new Date(property.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mt-2 flex flex-col space-y-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      {property.propertyType}
                    </span>
                    {property.status === 'sold' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        SOLD
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-b border-gray-200">
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
                {property.area && property.area.value && (
                  <div className="flex items-center space-x-2">
                    <Square className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900 font-medium">{property.area.value} {property.area.unit}</span>
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
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </div>

              {/* Features */}
              {property.features && property.features.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Features & Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(showAllFeatures ? property.features : property.features.slice(0, 6)).map((feature, index) => {
                      const IconComponent = getFeatureIcon(feature);
                      return (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          <IconComponent className="w-5 h-5 text-orange-600" />
                          <span className="text-gray-900 capitalize">{feature.replace('_', ' ')}</span>
                        </div>
                      );
                    })}
                  </div>
                  {property.features.length > 6 && (
                    <button
                      onClick={() => setShowAllFeatures(!showAllFeatures)}
                      className="mt-3 text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {showAllFeatures ? 'Show Less' : `Show ${property.features.length - 6} More Features`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {property.status === 'sold' ? 'Property Information' : 'Contact for this Property'}
              </h3>
              
              {property.status === 'sold' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-800 font-semibold">Property Sold</span>
                  </div>
                  <p className="text-sm text-red-700">
                    This property has been sold and is no longer available for purchase.
                  </p>
                </div>
              )}
              
              <div className="space-y-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Property ID</p>
                  <p className="text-lg font-semibold text-gray-900">{property.propertyId}</p>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Contact International Tijarat</p>
                  <p className="text-lg font-semibold text-gray-900">+92 300 5567507</p>
                </div>
              </div>

              {property.status === 'sold' ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">Looking for similar properties?</p>
                  <Link
                    to="/properties"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Home className="w-5 h-5" />
                    <span>Browse Other Properties</span>
                  </Link>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleWhatsAppContact}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors mb-4"
                  >
                    <Phone className="w-5 h-5" />
                    <span>WhatsApp Now</span>
                  </button>

                  <button
                    onClick={() => window.location.href = `tel:+923005567507`}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Call Now</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;
