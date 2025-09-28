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
  Filter
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getImageUrl } from '../config';

const ContactWholeseller = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/wholesale/suppliers`);
      if (response.data.success) {
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

                {/* Suppliers Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.suppliers.map((supplier, supplierIndex) => (
                      <div key={supplierIndex} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                        {/* Card Content with Logo on Left, Details on Right */}
                        <div className="flex gap-4 mb-4">
                          {/* Large Logo on Left */}
                          <div className="flex-shrink-0">
                            {supplier.profileImage ? (
                              <img
                                src={getImageUrl('wholesale-suppliers', supplier.profileImage)}
                                alt={`${supplier.supplierName} logo`}
                                className="w-24 h-24 object-contain rounded-lg border-2 border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center ${supplier.profileImage ? 'hidden' : 'flex'}`}>
                              <Store className="w-12 h-12 text-white" />
                            </div>
                          </div>

                          {/* Supplier Info on Right */}
                          <div className="flex-1 min-w-0">
                            {/* Supplier Header */}
                            <div className="mb-3">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{supplier.supplierName}</h3>
                              {supplier.specialties && supplier.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {supplier.specialties.slice(0, 2).map((specialty, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      {specialty}
                                    </span>
                                  ))}
                                  {supplier.specialties.length > 2 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                      +{supplier.specialties.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Supplier Details */}
                        <div className="space-y-2 mb-4 text-sm text-gray-600">
                          {supplier.address && (
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{supplier.address}</span>
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
                              <span>Delivery: {supplier.deliveryAreas.slice(0, 2).join(', ')}{supplier.deliveryAreas.length > 2 ? '...' : ''}</span>
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
                    ))}
                  </div>
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
    </div>
  );
};

export default ContactWholeseller;
