import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Tag, ChevronRight, ChevronDown, Search, Filter } from 'lucide-react';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { vendorService } from '../../services/vendorService';

const VendorCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, main, sub
  const [expandedCategories, setExpandedCategories] = useState(new Set()); // Track which categories are expanded

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentCategory: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getCategories();
      if (response.success) {
        console.log('🏪 Received categories from backend:', response.data);
        console.log('🔗 Categories with parent info:', response.data.map(cat => ({
          name: cat.name,
          hasParent: !!cat.parentCategory,
          parentName: cat.parentCategory?.name || 'None',
          parentId: cat.parentCategory?._id || null
        })));
        setCategories(response.data);
      } else {
        setError('Failed to load categories');
      }
    } catch (error) {
      console.error('Categories fetch error:', error);
      setError('Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Form submitted!');
    console.log('📝 Form data:', formData);
    console.log('✏️ Editing category:', editingCategory);
    
    try {
      if (editingCategory) {
        console.log('🔄 Updating category...');
        await vendorService.updateCategory(editingCategory._id, formData);
      } else {
        console.log('➕ Creating new category...');
        const result = await vendorService.createCategory(formData);
        console.log('✅ Category created:', result);
      }
      await fetchCategories();
      closeModal();
    } catch (error) {
      console.error('❌ Category save error:', error);
      console.error('📍 Error details:', error.response?.data || error.message);
      setError(`Error saving category: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await vendorService.deleteCategory(categoryId);
        await fetchCategories();
      } catch (error) {
        console.error('Category delete error:', error);
        setError('Error deleting category');
      }
    }
  };

  const openModal = (category = null) => {
    setEditingCategory(category);
    setFormData({
      name: category?.name || '',
      description: category?.description || '',
      parentCategory: category?.parentCategory?._id || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', parentCategory: '' });
    setError('');
  };

  // Get main categories (no parent)
  const mainCategories = categories.filter(cat => !cat.parentCategory);

  // Get subcategories for a main category
  const getSubcategories = (parentId) => {
    const subcats = categories.filter(cat => {
      // Handle both cases: string ID or populated object
      const categoryParentId = typeof cat.parentCategory === 'string' 
        ? cat.parentCategory 
        : cat.parentCategory?._id;
        
      return categoryParentId === parentId;
    });
    return subcats;
  };

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Check if category has subcategories
  const hasSubcategories = (categoryId) => {
    return getSubcategories(categoryId).length > 0;
  };

  // Filter categories based on search and type
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'main' && !category.parentCategory) ||
                         (filterType === 'sub' && category.parentCategory);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
              <p className="text-gray-600 mt-1">Organize your products with custom categories and subcategories</p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="main">Main Categories</option>
                <option value="sub">Subcategories</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Categories Display */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by creating your first category to organize your products'}
              </p>
              {!searchTerm && filterType === 'all' && (
                <button
                  onClick={() => openModal()}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
                >
                  Create First Category
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Hierarchical view when not filtering */}
              {filterType === 'all' && !searchTerm ? (
                mainCategories.map((category) => (
                  <div key={category._id} className="p-6">
                    {/* Main Category */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => hasSubcategories(category._id) && toggleCategory(category._id)}>
                        {hasSubcategories(category._id) && (
                          expandedCategories.has(category._id) ? 
                            <ChevronDown className="w-5 h-5 text-gray-600" /> :
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                        <Tag className="w-5 h-5 text-orange-600" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                          <p className="text-gray-600 text-sm">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(category);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(category._id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories - Only show when category is expanded */}
                    {hasSubcategories(category._id) && expandedCategories.has(category._id) && (
                      <div className="mt-4 ml-8 space-y-2">
                        {getSubcategories(category._id).map((subcat) => (
                          <div key={subcat._id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                              <div>
                                <h4 className="font-medium text-gray-900">{subcat.name}</h4>
                                <p className="text-gray-600 text-xs">{subcat.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openModal(subcat)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(subcat._id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Flat list view when filtering */
                filteredCategories.map((category) => (
                  <div key={category._id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Tag className="w-5 h-5 text-orange-600" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {category.parentCategory && (
                            <span className="text-gray-500 text-sm">
                              {category.parentCategory.name} → 
                            </span>
                          )}
                          {category.name}
                        </h3>
                        <p className="text-gray-600 text-sm">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(category)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal for Add/Edit Category */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category (Optional)
                  </label>
                  <select
                    value={formData.parentCategory}
                    onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select parent category...</option>
                    {mainCategories
                      .filter(cat => cat._id !== editingCategory?._id) // Don't allow self-reference
                      .map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to create a main category
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorCategoriesPage;
