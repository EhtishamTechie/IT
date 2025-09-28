import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  Folder,
  FolderPlus,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../../config';
import FooterCategoryManager from '../../components/admin/FooterCategoryManager';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentCategory: '',
    isActive: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('Making request to admin categories API...');
      const response = await axios.get(`${getApiUrl()}/admin/categories/`, { headers });
      console.log('Admin categories response:', response.data);
      const rawCategories = Array.isArray(response.data.data) ? response.data.data : 
                           Array.isArray(response.data) ? response.data : [];
      
      console.log('Raw categories:', rawCategories);
      
      // Build actual hierarchy based on database relationships
      const mainCategories = rawCategories.filter(cat => !cat.parentCategory);
      const subcategories = rawCategories.filter(cat => cat.parentCategory);
      
      // Build the organized structure
      const organizedCategories = mainCategories.map(mainCat => {
        const children = subcategories.filter(subCat => {
          const parentId = subCat.parentCategory?._id || subCat.parentCategory;
          return parentId === mainCat._id;
        });
        
        return {
          ...mainCat,
          children: children
        };
      });
      
      console.log('Organized categories with real hierarchy:', organizedCategories);
      setCategories(organizedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const categoryData = {
        ...formData,
        parentCategory: formData.parentCategory || null
      };
      
      if (editingCategory) {
        // Update existing category
        await axios.put(
          `${getApiUrl()}/admin/categories/${editingCategory._id}`, 
          categoryData,
          { headers }
        );
        alert('Category updated successfully');
      } else {
        // Create new category
        await axios.post(`${getApiUrl()}/admin/categories/`, categoryData, { headers });
        alert('Category created successfully');
      }
      
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      parentCategory: category.parentCategory?._id || '',
      isActive: category.isActive !== false
    });
    setShowEditModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete all subcategories.')) return;
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.delete(`${getApiUrl()}/admin/categories/${categoryId}`, { headers });
      alert('Category deleted successfully');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentCategory: '',
      isActive: true
    });
    setEditingCategory(null);
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Categories are already organized in loadCategories, so just return them
  const organizeCategories = (categories) => {
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderCategoryTree = (category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category._id);
    const indent = level * 20;

    return (
      <div key={category._id}>
        <div 
          className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50"
          style={{ paddingLeft: `${16 + indent}px` }}
        >
          <div className="flex items-center space-x-3">
            {hasChildren ? (
              <button
                onClick={() => toggleCategory(category._id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            <div className="flex items-center space-x-2">
              {level === 0 ? (
                <Folder className="w-5 h-5 text-blue-600" />
              ) : (
                <Tag className="w-4 h-4 text-green-600" />
              )}
              <div>
                <p className="font-medium text-gray-900">{category.name}</p>
                {category.description && (
                  <p className="text-sm text-gray-500">{category.description}</p>
                )}
              </div>
            </div>
            
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              category.isActive !== false 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {category.isActive !== false ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEdit(category)}
              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category._id)}
              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children.map(child => renderCategoryTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredCategories = organizeCategories(categories).filter(category => {
    const searchInCategory = (cat) => {
      const matchesName = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDescription = cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase());
      const hasMatchingChild = cat.children && cat.children.some(searchInCategory);
      
      return matchesName || matchesDescription || hasMatchingChild;
    };
    
    return searchTerm === '' || searchInCategory(category);
  });

  const rootCategories = categories.filter(cat => !cat.parentCategory); // Only main categories for parent dropdown

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Category</span>
        </button>
      </div>

      {/* Footer Categories Manager */}
      <FooterCategoryManager />

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Categories Tree */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No categories found</p>
          </div>
        ) : (
          <div>
            {filteredCategories.map(category => renderCategoryTree(category))}
          </div>
        )}
      </div>

      {/* Create/Edit Category Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    value={formData.parentCategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentCategory: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Parent (Root Category)</option>
                    {rootCategories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
