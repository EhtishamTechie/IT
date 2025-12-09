import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Store, 
  Phone, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Package, 
  Clock,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getImageUrl } from '../config';
import LazyImage from '../components/LazyImage';

const WholesaleSupplierDetail = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchSupplierDetail();
  }, [supplierId]);

  const fetchSupplierDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/wholesale/supplier/${supplierId}`);
      if (response.data.success) {
        setSupplier(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching supplier details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hi ${supplier.supplierName},\n\nI'm interested in your wholesale products.\n\nPlease share details about:\n- Product catalog\n- Pricing\n- Minimum order quantity\n- Delivery terms\n\nThank you!`
    );
    window.open(`https://wa.me/${supplier.whatsappNumber.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % supplier.productImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + supplier.productImages.length) % supplier.productImages.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lightboxOpen, supplier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supplier details...</p>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Supplier Not Found</h2>
          <p className="text-gray-600 mb-6">The supplier you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/contact-wholeseller')}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Back to Suppliers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-6xl mx-auto px-3">
        {/* Back Button */}
        <button
          onClick={() => navigate('/contact-wholeseller')}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-3 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Suppliers</span>
        </button>

        {/* Supplier Info Card */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Logo & Basic Info */}
            <div className="text-center md:text-left">
              <div className="flex justify-center md:justify-start mb-3">
                {supplier.profileImage ? (
                  <img
                    src={getImageUrl('wholesale-suppliers', supplier.profileImage)}
                    alt={supplier.supplierName}
                    className="w-24 h-24 object-contain rounded-lg border-2 border-gray-200"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={supplier.profileImage ? 'w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center hidden' : 'w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center'}>
                  <Store className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-xl font-bold text-gray-900 mb-2">{supplier.supplierName}</h1>
              
              {supplier.specialties && supplier.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center md:justify-start mb-3">
                  {supplier.specialties.map((specialty, idx) => (
                    <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      {specialty}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Middle: Details */}
            <div className="space-y-2 text-sm">
              {supplier.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{supplier.address}</span>
                </div>
              )}
              {supplier.minimumOrderQuantity && (
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">Min Order: {supplier.minimumOrderQuantity}</span>
                </div>
              )}
              {supplier.businessHours && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{supplier.businessHours}</span>
                </div>
              )}
              {supplier.deliveryAreas && supplier.deliveryAreas.length > 0 && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Delivery: {supplier.deliveryAreas.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Right: Contact Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleWhatsAppContact}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${supplier.contactNumber}`}
                  className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-sm"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call</span>
                </a>
                
                {supplier.email && (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description/Notes Section */}
        {supplier.description && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">About</h2>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{supplier.description}</p>
          </div>
        )}

        {/* Product Gallery */}
        {supplier.productImages && supplier.productImages.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Product Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {supplier.productImages.map((image, idx) => {
                const optimizedForLazy = image.optimized ? {
                  avif: {
                    '300w': getImageUrl('wholesale-suppliers', image.optimized.avif_300),
                    '600w': getImageUrl('wholesale-suppliers', image.optimized.avif_600)
                  },
                  webp: {
                    '300w': getImageUrl('wholesale-suppliers', image.optimized.webp_300),
                    '600w': getImageUrl('wholesale-suppliers', image.optimized.webp_600)
                  }
                } : null;

                return (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer border border-gray-200 hover:border-orange-400 hover:shadow-lg transition-all bg-gray-100"
                    onClick={() => openLightbox(idx)}
                  >
                    <LazyImage
                      src={getImageUrl('wholesale-suppliers', image.filename)}
                      alt={image.altText || `Product ${idx + 1}`}
                      className="w-full h-full object-cover"
                      optimizedImage={optimizedForLazy}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && supplier.productImages && supplier.productImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous Button */}
          {supplier.productImages.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <ChevronLeft className="w-12 h-12" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-5xl max-h-[90vh] px-16">
            <picture>
              <source
                srcSet={getImageUrl('wholesale-suppliers', supplier.productImages[lightboxIndex]?.optimized?.avif_600)}
                type="image/avif"
              />
              <source
                srcSet={getImageUrl('wholesale-suppliers', supplier.productImages[lightboxIndex]?.optimized?.webp_600)}
                type="image/webp"
              />
              <img
                src={getImageUrl('wholesale-suppliers', supplier.productImages[lightboxIndex]?.optimized?.jpg_600 || supplier.productImages[lightboxIndex]?.filename)}
                alt={supplier.productImages[lightboxIndex]?.altText || `Product ${lightboxIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain"
              />
            </picture>
          </div>

          {/* Next Button */}
          {supplier.productImages.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <ChevronRight className="w-12 h-12" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {lightboxIndex + 1} / {supplier.productImages.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesaleSupplierDetail;
