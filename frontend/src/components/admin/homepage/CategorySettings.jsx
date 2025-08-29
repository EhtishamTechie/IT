import React, { useState, useEffect, Component } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'react-toastify';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Category Settings Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-4">
          <h2 className="text-lg font-semibold text-red-600">Something went wrong</h2>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
import { PlusIcon, MinusIcon, ArrowUpIcon, ArrowDownIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import API from '../../../api';
import LoadingState from '../LoadingState';
import ErrorState from '../ErrorState';
import { config, getApiUrl, getImageUrl } from '../../../config';

function CategorySettings() {
  const [allCategories, setAllCategories] = useState([]);
  const [homepageCategories, setHomepageCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    displayOrder: 0
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
      setTimeout(() => setError(null), 3000);
    }
  }, [error]);

  useEffect(() => {
    fetchCategories().catch(err => {
      console.error('Initial fetch failed:', err);
      toast.error('Failed to load categories. Please refresh the page.');
    });
  }, []);

  // Fetch all categories and homepage categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [allCatsResponse, homepageCatsResponse] = await Promise.all([
        API.get(getApiUrl('categories')),
        API.get(getApiUrl('homepage/categories'))
      ]);
      
      setAllCategories(allCatsResponse.data);
      setHomepageCategories(homepageCatsResponse.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Show error notification instead of full error state
      toast.error('Failed to load categories. Please try again.');
      // Keep existing data if available
      if (!allCategories.length) {
        setError('Failed to load categories');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle category submission
  const handleSubmit = async () => {    
    try {
      const formData = new FormData();
      if (selectedCategory) {
        formData.append('categoryId', selectedCategory._id);
        formData.append('name', selectedCategory.name);
        if (imageFile) {
          formData.append('image', imageFile);
        }
        
        await API.post(getApiUrl('homepage/categories'), formData);
        await fetchCategories(); // Refresh the categories after submission
        setSelectedCategory(null);
        setImageFile(null);
        setImagePreview(null);
      }
    } catch (err) {
      setError('Failed to add category to homepage');
      console.error('Error with category operation:', err);
    }
  };

  const handleReorder = async (categoryId, direction) => {
    try {
      await API.put(getApiUrl(`homepage/categories/reorder/${categoryId}`), {
        direction
      });
      await fetchCategories();
    } catch (err) {
      setError('Failed to reorder categories');
      console.error('Error reordering categories:', err);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to remove this category from homepage?')) return;
    
    try {
      const response = await API.delete(getApiUrl(`homepage/categories/${categoryId}`));
      if (response.data.success) {
        toast.success('Category removed from homepage successfully');
        await fetchCategories(); // Refresh both category lists
      }
    } catch (err) {
      console.error('Error removing category:', err);
      toast.error('Failed to remove category. Please try again.');
      // Keep the UI functional
      await fetchCategories();
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      isActive: true,
      displayOrder: 0
    });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) return <LoadingState />;

  // Filter out categories that are already in the homepage
  const availableCategories = allCategories.filter(
    cat => !homepageCategories.some(hCat => hCat._id === cat._id)
  );

  return (
    <div className="space-y-6">
      {/* Categories Selection Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Add Category to Homepage
        </h3>
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allCategories
            .filter(category => 
              category.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((category) => {
              const homepageCategory = homepageCategories.find(hCat => hCat._id === category._id);
              const isOnHomepage = Boolean(homepageCategory);
              console.log('Category:', category.name, 'isOnHomepage:', isOnHomepage); // Debug log
            return (
              <div key={category._id} className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                {isOnHomepage ? (
                  <button
                    onClick={() => handleDelete(homepageCategory._id)}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <MinusIcon className="h-4 w-4 mr-1" />
                    Remove from Homepage
                  </button>
                ) : selectedCategory?._id === category._id ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreview ? (
                      <div className="relative group">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-h-32 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity rounded"
                        >
                          <TrashIcon className="h-6 w-6 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-2 flex text-sm text-gray-600">
                          <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload an image</span>
                            <input 
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleImageSelect}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!imageFile}
                      className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add to Homepage
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className="mt-2 ml-2 inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm font-medium rounded text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add to Homepage
                </button>
              )}
            </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Category List
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {homepageCategories.map((category) => (
                  <tr key={category._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={`${config.UPLOADS_URL}${category.imageUrl}`}
                        alt={category.name}
                        className="h-10 w-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/40?text=No+Image';
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove from Homepage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap the component with ErrorBoundary
function CategorySettingsWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <CategorySettings />
    </ErrorBoundary>
  );
}

export default CategorySettingsWithErrorBoundary;
