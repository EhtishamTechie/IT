import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, Filter } from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getImageUrl } from '../config';

const ContactWholeseller = () => {
  const navigate = useNavigate();
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

  // Flatten all suppliers from all categories
  const allSuppliers = suppliers.flatMap(category => 
    category.suppliers.map(supplier => ({
      ...supplier,
      categoryName: category.categoryName
    }))
  );

  // Filter suppliers
  const filteredSuppliers = allSuppliers.filter(supplier => {
    const matchesCategory = selectedCategory === 'all' || supplier.categoryName === selectedCategory;
    const matchesSearch = 
      supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.specialties && supplier.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const allCategories = [...new Set(suppliers.map(cat => cat.categoryName))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-3">
      <div className="max-w-7xl mx-auto px-3">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Wholesale Suppliers</h1>
          <p className="text-xs text-gray-600">Connect with verified wholesale suppliers</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded shadow-sm border p-2 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Categories</option>
                {allCategories.map((category, index) => (
                  <option key={index} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Suppliers Grid */}
        {filteredSuppliers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredSuppliers.map((supplier, index) => (
              <div
                key={index}
                onClick={() => navigate(`/wholesale/${supplier._id}`)}
                className="bg-white border border-gray-200 rounded p-2 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer group"
              >
                {/* Category Badge */}
                <div className="flex items-center justify-center gap-1 mb-1.5 bg-orange-50 rounded-sm py-1">
                  <Store className="w-2.5 h-2.5 text-orange-600" />
                  <span className="text-[9px] font-semibold text-orange-700 uppercase tracking-wide">{supplier.categoryName}</span>
                </div>

                {/* Logo */}
                <div className="flex justify-center mb-2">
                  {supplier.profileImage ? (
                    <img
                      src={getImageUrl('wholesale-suppliers', supplier.profileImage)}
                      alt={supplier.supplierName}
                      className="w-16 h-16 object-contain rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={supplier.profileImage ? 'w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded flex items-center justify-center hidden' : 'w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded flex items-center justify-center'}>
                    <Store className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-xs font-semibold text-gray-900 text-center line-clamp-2 mb-1 min-h-[2rem] leading-tight group-hover:text-orange-600 transition-colors">
                  {supplier.supplierName}
                </h3>

                {/* Specialties Count */}
                {supplier.specialties && supplier.specialties.length > 0 && (
                  <div className="flex justify-center">
                    <span className="text-[9px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {supplier.specialties.length} {supplier.specialties.length === 1 ? 'Product' : 'Products'}
                    </span>
                  </div>
                )}

                {/* Product Images Count */}
                {supplier.productImages && supplier.productImages.length > 0 && (
                  <div className="mt-1 text-center">
                    <span className="text-[9px] text-orange-600 font-medium">
                      {supplier.productImages.length} {supplier.productImages.length === 1 ? 'Image' : 'Images'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers found</h3>
            <p className="text-gray-600 text-sm">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No wholesale suppliers are currently available.'}
            </p>
          </div>
        )}

        {/* Call-to-Action */}
        <div className="mt-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Become a Wholesale Supplier?</h2>
          <p className="text-orange-100 text-sm mb-4">
            Join our network of verified suppliers and reach thousands of customers.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-5 py-2 bg-white text-orange-600 text-sm font-semibold rounded-lg hover:bg-orange-50 transition-colors"
          >
            Contact Us to Register
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactWholeseller;
