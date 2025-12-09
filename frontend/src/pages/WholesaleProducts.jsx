import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, Filter, Package, Phone, Mail } from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getImageUrl } from '../config';

const WholesaleProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchWholesaleProducts();
    fetchCategories();
  }, []);

  const fetchWholesaleProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/products/wholesale`);
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching wholesale products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/products/categories`);
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || 
      product.category?._id === selectedCategory ||
      product.mainCategory?._id === selectedCategory;
    const matchesSearch = 
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.wholesaleContact?.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = (product) => {
    navigate(`/product/${product.slug || product._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wholesale products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Store className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wholesale Products</h1>
          <p className="text-gray-600">Discover bulk purchase opportunities from verified suppliers</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products or suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.displayName || category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product._id}
                onClick={() => handleProductClick(product)}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden"
              >
                {/* Product Image */}
                <div className="aspect-square relative overflow-hidden bg-gray-100">
                  <img
                    src={getImageUrl('products', product.image)}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {product.discount > 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      -{product.discount}%
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3">
                  {/* Category Badge */}
                  {product.category && (
                    <div className="mb-2">
                      <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-medium rounded">
                        {product.category.displayName || product.category.name}
                      </span>
                    </div>
                  )}

                  {/* Product Title */}
                  <h3 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {product.title}
                  </h3>

                  {/* Supplier Info */}
                  {product.wholesaleContact?.supplierName && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                      <Store className="w-3 h-3" />
                      <span className="truncate">{product.wholesaleContact.supplierName}</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="mb-2">
                    {product.wholesalePricing && product.wholesalePricing.length > 0 ? (
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold text-sm text-orange-600">
                          Starting from ₨{product.wholesalePricing[0].pricePerUnit.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Min: {product.wholesalePricing[0].minQuantity} units
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-orange-600">
                        ₨{product.price.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Quick Contact */}
                  {product.wholesaleContact?.whatsappNumber && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://wa.me/${product.wholesaleContact.whatsappNumber}`, '_blank');
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      WhatsApp
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WholesaleProducts;
