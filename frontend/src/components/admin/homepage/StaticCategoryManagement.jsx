import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Eye, X, ImageIcon } from 'lucide-react';
import API from '../../../api';
import { getApiUrl, config, getImageUrl } from '../../../config';
import LoadingState from '../LoadingState';
import ErrorState from '../ErrorState';

const StaticCategoryManagement = () => {
  const [staticCategories, setStaticCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get product image URL
  const getProductImageUrl = (product) => {
    if (!product?.image) return '/placeholder-product.jpg';
    return getImageUrl('products', product.image);
  };
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [staticResponse, allResponse] = await Promise.all([
        API.get(getApiUrl('homepage/static-categories')),
        API.get(getApiUrl('categories'))  // Same as CategorySelector - gets ALL categories
      ]);

      // Backend now automatically filters out null categories
      setStaticCategories(staticResponse.data.categories);
      setAllCategories(allResponse.data);  // Direct response data like CategorySelector
      
      console.log('Static categories fetched:', staticResponse.data.categories);
      console.log('All categories fetched (same as banner management):', allResponse.data);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryProducts = async (categoryId) => {
    try {
      setLoading(true);
      console.log('Fetching products for category:', categoryId);
      
      // Get the category name for server-side filtering
      const categoryName = selectedCategory?.category?.name;
      if (!categoryName) {
        throw new Error('No category name found');
      }

      const response = await API.get(getApiUrl('products'), {
        params: {
          category: categoryName,
          isActive: true,
          limit: 20,
          populate: ['category', 'mainCategory', 'subCategory', 'vendor']
        }
      });
      
      console.log('API Response:', response.data);
      const products = response.data?.products || [];
      console.log('Fetched products:', products);
      
      // Debug image URLs
      products.forEach(product => {
        console.log(`Product ${product.title || product.name || 'Unknown'} image:`, {
          imageField: product.image,
          fullUrl: getImageUrl('products', product.image)
        });
      });

      // Ensure we have the latest selected products
      const currentSelectedProducts = selectedProducts;
      console.log('Current selected products:', currentSelectedProducts);

      // Filter out already selected products
      const availableProducts = products.filter(product => 
        !currentSelectedProducts.some(selected => selected._id === product._id)
      );
      
      console.log('Available products after filtering:', availableProducts);
      setCategoryProducts(availableProducts);
    } catch (err) {
      console.error('Error fetching category products:', err);
      toast.error('Failed to load products');
      setCategoryProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategory?.category?._id) {
      console.log('Selected category:', selectedCategory.category);
      console.log('Selected products when effect runs:', selectedProducts);
      // Small delay to ensure selectedProducts is set first
      setTimeout(() => {
        fetchCategoryProducts(selectedCategory.category._id);
      }, 100);
    }
  }, [selectedCategory, selectedProducts.length]); // Added selectedProducts.length as dependency

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // Add or update a static category
  const handleCategorySelect = async (category) => {
    try {
      // Add null check like the working CategorySelector does
      if (!category || !category._id) {
        console.error('Invalid category provided:', category);
        toast.error('Invalid category selected');
        return;
      }

      const existingCategory = staticCategories.find(sc => sc.category && sc.category._id === category._id);
      
      if (existingCategory) {
        // First set the selected products to prevent them from being filtered out
        setSelectedProducts(existingCategory.selectedProducts || []);
        // Then set the selected category which will trigger fetchCategoryProducts
        setSelectedCategory(existingCategory);
      } else {
        // Backend now handles all validation (duplicates, max count, null checks)
        const response = await API.post(getApiUrl('homepage/static-categories'), {
          categoryId: category._id,
          displayOrder: staticCategories.length + 1
        });
        
        if (response.data.success) {
          await fetchCategories();
          toast.success('Category added successfully');
        }
      }
    } catch (err) {
      console.error('Error managing category:', err);
      if (err.response?.status === 400) {
        toast.error(err.response.data?.message || 'Invalid request - check if category limit reached');
      } else {
        toast.error('Failed to manage category');
      }
    }
  };

  // Remove a static category
  const handleRemoveCategory = async (categoryId) => {
    try {
      await API.delete(getApiUrl(`homepage/static-categories/${categoryId}`));
      await fetchCategories();
      toast.success('Category removed successfully');
    } catch (err) {
      console.error('Error removing category:', err);
      toast.error('Failed to remove category');
    }
  };

  // Update selected products for a category
  const handleUpdateProducts = async (staticCategoryId) => {
    try {
      console.log('Updating products:', {
        staticCategoryId,
        selectedProducts: selectedProducts.map(p => p._id)
      });
      
      await API.put(getApiUrl(`homepage/static-categories/${staticCategoryId}`), {
        selectedProducts: selectedProducts.map(p => p._id)
      });
      
      await fetchCategories();
      toast.success('Products updated successfully');
      // Reset states in correct order
      setSelectedProducts([]);
      setCategoryProducts([]);
      setSelectedCategory(null);
    } catch (err) {
      console.error('Error updating products:', err);
      toast.error('Failed to update products');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Homepage Static Categories</h2>
        <p className="text-sm text-gray-600 mb-6">
          Select up to 4 existing categories to display on the homepage. Each category can showcase up to 8 products.
        </p>

        {/* Display Static Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, index) => {
            const staticCategory = staticCategories[index];
            
            return (
              <div key={index} className="border rounded-lg p-4">
                {staticCategory && staticCategory.category && staticCategory.category._id ? (
                  <>
                    <h3 className="font-medium">{staticCategory.category.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {staticCategory.selectedProducts?.length || 0} of 8 products selected
                    </p>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => {
                          console.log('Opening category:', staticCategory);
                          // Reset states first
                          setSelectedProducts([]);
                          setCategoryProducts([]);
                          // Set the selected products from the static category
                          setSelectedProducts(staticCategory.selectedProducts || []);
                          // Finally set the selected category
                          setSelectedCategory(staticCategory);
                        }}
                        className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Manage Products
                      </button>
                      <button
                        onClick={() => handleRemoveCategory(staticCategory._id)}
                        className="w-full px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-gray-500 text-center mb-4">Empty Slot</p>
                    <select
                      onChange={(e) => {
                        const category = allCategories.find(c => c._id === e.target.value);
                        if (category) handleCategorySelect(category);
                      }}
                      className="w-full px-4 py-2 border rounded"
                      value=""
                    >
                      <option value="">Select a category</option>
                      {allCategories
                        .filter(category => !staticCategories.some(sc => sc.category?._id === category._id))
                        .map(category => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Selection Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium">
                  Select Products for {selectedCategory.category.name}
                </h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 flex justify-between items-center">
                <h4 className="font-medium">Products in {selectedCategory.category.name}</h4>
                <button
                  onClick={togglePreview}
                  className="flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {isPreviewMode ? 'Exit Preview' : 'Preview Layout'}
                </button>
              </div>

              {/* Selected Products */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center justify-between">
                  <span>Selected Products ({selectedProducts.length}/8)</span>
                  {selectedProducts.length > 0 && (
                    <button
                      onClick={() => setSelectedProducts([])}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                  )}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedProducts.map(product => (
                    <div key={product._id} className="border rounded p-2">
                      <img
                        src={getProductImageUrl(product)}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          // Prevent infinite retry by checking if already using fallback
                          if (e.target.src !== '/placeholder-product.jpg') {
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = '/placeholder-product.jpg';
                          }
                        }}
                      />
                      <div className="mt-2">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <button
                          onClick={() => setSelectedProducts(prev => prev.filter(p => p._id !== product._id))}
                          className="mt-2 w-full px-2 py-1 bg-red-100 text-red-700 rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Products Grid */}
              {isPreviewMode ? (
                <div>
                  <h4 className="font-medium mb-3">Preview Layout</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedProducts.map((product, index) => (
                      <div key={product._id} className="relative group">
                        <div className="aspect-square w-full overflow-hidden rounded-lg">
                          <img
                            src={getProductImageUrl(product)}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder-product.jpg';
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
                          <span className="text-white text-lg font-semibold">{index + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {loading ? (
                    <div className="col-span-4 text-center py-8">Loading products...</div>
                  ) : categoryProducts.length > 0 ? (
                    categoryProducts.map(product => (
                      <div 
                        key={product._id} 
                        className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                      >
                        <div className="relative pb-[100%]">
                          <img
                            src={getProductImageUrl(product)}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder-product.jpg';
                            }}
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</p>
                          <p className="text-sm text-gray-500 mb-2">${product.price}</p>
                          <button
                            onClick={() => {
                              if (selectedProducts.length < 8) {
                                setSelectedProducts(prev => [...prev, product]);
                                setCategoryProducts(prev => prev.filter(p => p._id !== product._id));
                              } else {
                                toast.warning('Maximum 8 products allowed');
                              }
                            }}
                            disabled={selectedProducts.length >= 8}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                          >
                            {selectedProducts.length >= 8 ? 'Max Products Selected' : 'Add to Selection'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-8 text-gray-500">
                      No more products available in this category
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateProducts(selectedCategory._id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaticCategoryManagement;
