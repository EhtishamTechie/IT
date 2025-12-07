import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Clock, 
  Package, 
  Users, 
  Store,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getImageUrl } from '../config';
import LazyImage from '../components/LazyImage';

const ContactWholeseller = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/wholesale/suppliers`);
      if (response.data.success) {
        console.log('📦 [WHOLESALE] Fetched suppliers:', response.data.data);
        // Log first supplier's images for debugging
        if (response.data.data.length > 0 && response.data.data[0].suppliers.length > 0) {
          console.log('📸 [WHOLESALE] First supplier images:', {
            profileImage: response.data.data[0].suppliers[0].profileImage,
            productImages: response.data.data[0].suppliers[0].productImages
          });
        }
        setSuppliers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching wholesale suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = (supplier) => {
    const message = encodeURIComponent(
      `Hi ${supplier.supplierName},\n\nI'm interested in wholesale supply of ${supplier.categoryName} products.\n\nPlease share details about:\n- Product catalog\n- Pricing\n- Minimum order quantity\n- Delivery terms\n\nThank you!`
    );
    window.open(`https://wa.me/${supplier.whatsappNumber.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const handlePhoneCall = (phoneNumber) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  // Lightbox functions
  const openLightbox = (images, index) => {
    console.log('🖼️ [LIGHTBOX] Opening with images:', images);
    console.log('🖼️ [LIGHTBOX] Starting at index:', index);
    console.log('🖼️ [LIGHTBOX] Total images:', images?.length);
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lightboxOpen, lightboxImages]);

  const filteredSuppliers = suppliers.filter(category => {
    const matchesCategory = selectedCategory === 'all' || category.categoryName === selectedCategory;
    const matchesSearch = category.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.suppliers.some(supplier => 
                           supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.specialties.some(specialty => 
                             specialty.toLowerCase().includes(searchTerm.toLowerCase())
                           )
                         );
    return matchesCategory && matchesSearch;
  });

  const allCategories = suppliers.map(cat => cat.categoryName);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wholesale suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Wholesale Suppliers</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect directly with verified wholesale suppliers across different product categories. 
            Get competitive pricing and bulk supply solutions for your business needs.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search categories or suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Categories</option>
                {allCategories.map((category, index) => (
                  <option key={index} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Suppliers by Category */}
        {filteredSuppliers.length > 0 ? (
          <div className="space-y-8">
            {filteredSuppliers.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Category Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <Store className="w-6 h-6 text-white" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">{category.categoryName}</h2>
                      {category.categoryDescription && (
                        <p className="text-orange-100 mt-1">{category.categoryDescription}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suppliers List - Each supplier in its own row */}
                <div className="p-6 space-y-6">
                  {category.suppliers.map((supplier, supplierIndex) => (
                    <div key={supplierIndex} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Supplier Card (Takes 1/3 width on desktop) */}
                      <div className="lg:col-span-1 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow h-fit">
                        {/* Profile Logo */}
                        <div className="flex items-center gap-3 mb-4">
                          {supplier.profileImage ? (
                            <img
                              src={getImageUrl('wholesale-suppliers', supplier.profileImage)}
                              alt={`${supplier.supplierName} logo`}
                              className="w-16 h-16 object-contain rounded-lg border-2 border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={supplier.profileImage ? 'w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center hidden' : 'w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center'}>
                            <Store className="w-8 h-8 text-white" />
                          </div>
                          
                          {/* Supplier Name */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900">{supplier.supplierName}</h3>
                          </div>
                        </div>

                        {/* Specialties */}
                        {supplier.specialties && supplier.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {supplier.specialties.map((specialty, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Supplier Details */}
                        <div className="space-y-2 mb-4 text-sm text-gray-600">
                          {supplier.address && (
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{supplier.address}</span>
                            </div>
                          )}
                          {supplier.minimumOrderQuantity && (
                            <div className="flex items-center space-x-2">
                              <Package className="w-4 h-4" />
                              <span>Min Order: {supplier.minimumOrderQuantity}</span>
                            </div>
                          )}
                          {supplier.businessHours && (
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>{supplier.businessHours}</span>
                            </div>
                          )}
                          {supplier.deliveryAreas && supplier.deliveryAreas.length > 0 && (
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>Delivery: {supplier.deliveryAreas.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Contact Buttons */}
                        <div className="space-y-2">
                          <button
                            onClick={() => handleWhatsAppContact(supplier)}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handlePhoneCall(supplier.contactNumber)}
                              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center space-x-1 transition-colors text-sm"
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call</span>
                            </button>
                            
                            {supplier.email && (
                              <a
                                href={`mailto:${supplier.email}`}
                                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center space-x-1 transition-colors text-sm"
                              >
                                <Mail className="w-4 h-4" />
                                <span>Email</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Product Gallery (Takes 2/3 width on desktop) */}
                      <div className="lg:col-span-2">
                        {supplier.productImages && supplier.productImages.length > 0 ? (
                          <div className="border border-gray-200 rounded-lg p-5 h-full">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900">Product Gallery</h4>
                              <span className="text-sm text-gray-600">{supplier.productImages.length} images</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {supplier.productImages.map((image, imgIdx) => {
                                // Transform optimized structure for LazyImage with full paths
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
                                    key={imgIdx}
                                    className="aspect-square rounded-lg overflow-hidden cursor-pointer border border-gray-200 group hover:opacity-90 transition-opacity bg-gray-100"
                                    onClick={() => openLightbox(supplier.productImages, imgIdx)}
                                  >
                                    <LazyImage
                                      src={getImageUrl('wholesale-suppliers', image.filename)}
                                      alt={image.altText || `Product ${imgIdx + 1}`}
                                      className="w-full h-full object-cover"
                                      optimizedImage={optimizedForLazy}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="border border-gray-200 rounded-lg p-5 h-full flex items-center justify-center bg-gray-50">
                            <div className="text-center text-gray-400">
                              <ImageIcon className="w-12 h-12 mx-auto mb-3" />
                              <p className="text-sm font-medium">No product images available</p>
                              <p className="text-xs mt-1">Contact supplier for more information</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No wholesale suppliers are currently available.'}
            </p>
          </div>
        )}

        {/* Call-to-Action */}
        <div className="mt-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Looking to Become a Wholesale Supplier?</h2>
          <p className="text-orange-100 text-lg mb-6">
            Join our network of verified wholesale suppliers and reach thousands of potential customers.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-6 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors"
          >
            Contact Us to Register
          </a>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <ChevronLeft className="w-12 h-12" />
            </button>
          )}

          {/* Image Container */}
          <div 
            className="max-w-5xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <picture>
              <source 
                srcSet={`${getImageUrl('wholesale-suppliers', lightboxImages[lightboxIndex]?.optimized?.avif_600)} 600w`}
                type="image/avif"
              />
              <source 
                srcSet={`${getImageUrl('wholesale-suppliers', lightboxImages[lightboxIndex]?.optimized?.webp_600)} 600w`}
                type="image/webp"
              />
              <img
                src={getImageUrl('wholesale-suppliers', lightboxImages[lightboxIndex]?.optimized?.jpg_600 || lightboxImages[lightboxIndex]?.filename)}
                alt={lightboxImages[lightboxIndex]?.altText || 'Product image'}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            </picture>
            
            {/* Image Counter */}
            <div className="text-center text-white mt-4">
              <p className="text-sm">
                {lightboxIndex + 1} / {lightboxImages.length}
              </p>
              {lightboxImages[lightboxIndex]?.altText && (
                <p className="text-sm text-gray-300 mt-2">
                  {lightboxImages[lightboxIndex].altText}
                </p>
              )}
            </div>
          </div>

          {/* Next Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <ChevronRight className="w-12 h-12" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactWholeseller;
