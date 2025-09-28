import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import API from '../../../api';
import LoadingState from '../../../components/admin/LoadingState';
import ErrorState from '../../../components/admin/ErrorState';

const FeaturedProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await API.get('/featured-products');
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load featured products');
      console.error('Error loading featured products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value) => {
    setSearchTerm(value);
    if (value.trim() === '') {
      setSearchResults([]);
      return;
    }

    try {
      const response = await API.get(`/products/search?query=${encodeURIComponent(value)}`);
      setSearchResults(response.data.filter(product => 
        !products.some(fp => fp._id === product._id)
      ));
    } catch (err) {
      console.error('Error searching products:', err);
    }
  };

  const addProduct = async (product) => {
    try {
      await API.post('/featured-products', { productId: product._id });
      setSearchTerm('');
      setSearchResults([]);
      await loadFeaturedProducts();
    } catch (err) {
      setError('Failed to add featured product');
      console.error('Error adding featured product:', err);
    }
  };

  const removeProduct = async (productId) => {
    try {
      await API.delete(`/featured-products/${productId}`);
      await loadFeaturedProducts();
    } catch (err) {
      setError('Failed to remove featured product');
      console.error('Error removing featured product:', err);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Featured Products</h2>
        
        {/* Search Input */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search Products
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="search"
              id="search"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Search for products to feature..."
            />
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md shadow-sm">
              {searchResults.map(product => (
                <div 
                  key={product._id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="flex items-center">
                    <img 
                      src={product.image || product.images[0]} 
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-md"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">${product.price}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addProduct(product)}
                    className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Featured Products List */}
        <div className="space-y-4">
          {products.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No featured products yet</p>
          ) : (
            products.map(product => (
              <div 
                key={product._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <img 
                    src={product.image || product.images[0]} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">${product.price}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeProduct(product._id)}
                  className="inline-flex items-center p-1.5 border border-transparent rounded-full text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedProductsManagement;
