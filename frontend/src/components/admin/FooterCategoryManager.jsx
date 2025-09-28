import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Save, Settings } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../../config';

const FooterCategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [footerCategories, setFooterCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Load all categories
      const categoriesResponse = await axios.get(`${getApiUrl()}/admin/categories/`, { headers });
      const allCategories = Array.isArray(categoriesResponse.data.data) ? categoriesResponse.data.data : 
                           Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
      
      setCategories(allCategories);
      
      // Load current footer categories configuration
      try {
        const footerResponse = await axios.get(`${getApiUrl()}/admin/categories/footer-categories`, { headers });
        setFooterCategories(footerResponse.data.data || []);
      } catch (error) {
        // If endpoint doesn't exist yet, start with default categories
        setFooterCategories([
          'Electronics',
          'Fashion',
          'Home & Garden',
          'Sports & Outdoors',
          'Books & Media',
          'Health & Beauty',
          'Automotive',
          'Business & Industrial'
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryName) => {
    setFooterCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(name => name !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.post(`${getApiUrl()}/admin/categories/footer-categories`, {
        categories: footerCategories
      }, { headers });
      
      alert('Footer categories updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving footer categories:', error);
      alert('Failed to save footer categories. Using default configuration for now.');
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadData(); // Reload original data
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Footer Categories Management</h3>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Select which categories to display in the footer "Shop" section. These will be visible to all users.
        </p>
      </div>

      <div className="p-6">
        {/* Current Footer Categories Preview */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Current Footer Categories</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {footerCategories.map((category, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{category}</span>
                </div>
              ))}
            </div>
            {footerCategories.length === 0 && (
              <p className="text-gray-500 text-sm">No categories selected for footer</p>
            )}
          </div>
        </div>

        {/* Category Selection (only visible when editing) */}
        {isEditing && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Categories</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Database Categories */}
              {categories.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">From Database</h5>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <label key={category._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                        <input
                          type="checkbox"
                          checked={footerCategories.includes(category.name)}
                          onChange={() => handleCategoryToggle(category.name)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Categories */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Default Options</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {[
                    'Electronics',
                    'Fashion',
                    'Home & Garden',
                    'Sports & Outdoors',
                    'Books & Media',
                    'Health & Beauty',
                    'Automotive',
                    'Business & Industrial',
                    'Toys & Games',
                    'Office Supplies',
                    'Pet Supplies',
                    'Music & Instruments'
                  ].map((categoryName) => (
                    <label key={categoryName} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={footerCategories.includes(categoryName)}
                        onChange={() => handleCategoryToggle(categoryName)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{categoryName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FooterCategoryManager;