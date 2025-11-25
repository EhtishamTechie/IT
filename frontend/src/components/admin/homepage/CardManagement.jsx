import React, { useState, useEffect } from 'react';
// Helper function to build category map (main category name -> subcategory array)
// Improved mapping logic: main category ID -> array of subcategory objects
function buildCategoryMap(categories) {
  const map = {};
  // First, initialize all main categories
  categories.forEach(cat => {
    if (!cat.parentCategory) {
      map[cat._id] = [];
    }
  });
  // Then, map subcategories to their parent
  categories.forEach(cat => {
    if (cat.parentCategory) {
      let parentId;
      if (typeof cat.parentCategory === 'object' && cat.parentCategory !== null) {
        parentId = cat.parentCategory._id || cat.parentCategory.id || cat.parentCategory;
      } else {
        parentId = cat.parentCategory;
      }
      if (map[parentId]) {
        map[parentId].push(cat);
      }
    }
  });
  return map;
}
import { toast } from 'react-toastify';
import { PlusIcon, TrashIcon, PencilIcon, PhotoIcon, EyeIcon } from '@heroicons/react/24/outline';
import API from '../../../api';
import { getApiUrl, getImageUrl } from '../../../config';
import LoadingState from '../LoadingState';
import ErrorState from '../ErrorState';

const CardManagement = () => {
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'subcategories',
    order: 1,
    mainCategory: '',
    linkText: 'Shop now',
    subcategoryItems: [
      { name: '', categoryId: '' },
      { name: '', categoryId: '' },
      { name: '', categoryId: '' },
      { name: '', categoryId: '' }
    ]
  });
  const [images, setImages] = useState({
    mainImage: null,
    subcategoryImage1: null,
    subcategoryImage2: null,
    subcategoryImage3: null,
    subcategoryImage4: null
  });
  const [subcategories, setSubcategories] = useState({});
  const [categoryMap, setCategoryMap] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both admin and vendor categories to show all in dropdowns
      const [cardsResponse, adminCategoriesResponse, vendorCategoriesResponse] = await Promise.all([
        API.get('/homepage/cards/admin'), // Use admin endpoint to get all cards including inactive
        API.get('/admin/categories'), // Admin categories
        API.get('/categories') // All categories (includes vendor)
      ]);

      setCards(cardsResponse.data.cards || []);
      
      // Debug: Log all card IDs
      const cardIds = (cardsResponse.data.cards || []).map(c => ({ id: c._id, order: c.order, title: c.title }));
      console.log('[CardManagement] Loaded cards:', cardIds);
      
      // Combine admin and vendor categories
      const adminCategories = adminCategoriesResponse.data.data || adminCategoriesResponse.data || [];
      const allCategories = vendorCategoriesResponse.data || [];
      
      // Filter out duplicates and combine
      const adminIds = new Set(adminCategories.map(cat => cat._id));
      const vendorOnlyCategories = allCategories.filter(cat => !adminIds.has(cat._id));
      const combinedCategories = [...adminCategories, ...vendorOnlyCategories];
      
      console.log('[CardManagement] Admin categories:', adminCategories.length);
      console.log('[CardManagement] Vendor categories:', vendorOnlyCategories.length);
      console.log('[CardManagement] Combined categories:', combinedCategories);
      
      setCategories(combinedCategories);
      const map = buildCategoryMap(combinedCategories);
      console.log('[CardManagement] Built categoryMap:', map);
      setCategoryMap(map);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check your connection and try again.');
      toast.error('Failed to load data');
      // Set empty arrays as fallback
      setCards([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (mainCategoryId) => {
    try {
      const response = await API.get(`/categories/${mainCategoryId}/subcategories`);
      const allSubcategories = response.data || [];
      
      // Use categoryMap for subcategories (by main category ID)
      console.log('[CardManagement] Fetching subcategories for mainCategoryId:', mainCategoryId);
      console.log('[CardManagement] Current categoryMap:', categoryMap);
      const subs = categoryMap[mainCategoryId] || [];
      console.log('[CardManagement] Subcategories found:', subs);
      setSubcategories(prev => ({
        ...prev,
        [mainCategoryId]: subs
      }));
    } catch (err) {
      console.error('Error fetching subcategories:', err);
      toast.error('Failed to load subcategories');
    }
  };

  const handleMainCategoryChange = (categoryId) => {
    setFormData(prev => ({ ...prev, mainCategory: categoryId }));
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const handleSubcategoryItemChange = (index, field, value) => {
    const newItems = [...formData.subcategoryItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, subcategoryItems: newItems }));
  };

  const handleImageChange = (imageType, file) => {
    setImages(prev => ({ ...prev, [imageType]: file }));
  };

  const getNextAvailableOrder = () => {
    if (!cards.length) return 1;
    const existingOrders = cards.map(c => c.order).sort((a, b) => a - b);
    
    // Find the first gap in the sequence, or return the next number after the highest
    for (let i = 1; i <= existingOrders.length + 1; i++) {
      if (!existingOrders.includes(i)) {
        return i;
      }
    }
    return existingOrders.length + 1;
  };

  const getUsedOrders = () => {
    return cards.map(c => c.order).sort((a, b) => a - b);
  };

  const openModal = (card = null) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        title: card.title,
        type: 'subcategories',
        order: card.order,
        mainCategory: '',
        linkText: card.linkText || 'Shop now',
        subcategoryItems: card.subcategoryItems?.map(item => ({
          name: item.name,
          categoryId: item.category?._id || item.categoryId
        })) || [
          { name: '', categoryId: '' },
          { name: '', categoryId: '' },
          { name: '', categoryId: '' },
          { name: '', categoryId: '' }
        ]
      });
    } else {
      setEditingCard(null);
      setFormData({
        title: '',
        type: 'subcategories',
        order: getNextAvailableOrder(),
        mainCategory: '',
        linkText: 'Shop now',
        subcategoryItems: [
          { name: '', categoryId: '' },
          { name: '', categoryId: '' },
          { name: '', categoryId: '' },
          { name: '', categoryId: '' }
        ]
      });
    }
    setImages({
      mainImage: null,
      subcategoryImage1: null,
      subcategoryImage2: null,
      subcategoryImage3: null,
      subcategoryImage4: null
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCard(null);
    setImages({
      mainImage: null,
      subcategoryImage1: null,
      subcategoryImage2: null,
      subcategoryImage3: null,
      subcategoryImage4: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('CardManagement: handleSubmit called');
    console.log('CardManagement: editingCard state:', editingCard);
    console.log('CardManagement: formData:', formData);
    
    setLoading(true);
    
    try {
      // Validation for subcategories type
      if (formData.type === 'subcategories') {
        console.log('Validating subcategory items...');
        // Check all subcategory items have name and categoryId
        for (let i = 0; i < 4; i++) {
          const item = formData.subcategoryItems[i];
          console.log(`Checking item ${i + 1}:`, item);
          console.log(`Image for item ${i + 1}:`, images[`subcategoryImage${i + 1}`]);
          console.log(`Existing image for item ${i + 1}:`, editingCard?.subcategoryItems?.[i]?.image);
          
          if (!item.name || !item.categoryId) {
            toast.error(`Category item ${i + 1} must have both name and category selected`);
            setLoading(false);
            return;
          }
          
          // Check corresponding image exists (new image or existing image for updates)
          if (!images[`subcategoryImage${i + 1}`] && (!editingCard || !editingCard.subcategoryItems?.[i]?.image)) {
            toast.error(`Image for category item ${i + 1} is required`);
            setLoading(false);
            return;
          }
        }
        console.log('All subcategory items validated successfully');
      }

      // Validation for main-category type (check for new image or existing image for updates)
      if (formData.type === 'main-category' && !images.mainImage && (!editingCard || !editingCard.mainImage)) {
        toast.error('Main image is required for main category cards');
        setLoading(false);
        return;
      }

      console.log('Submitting card data:', {
        formData,
        images: Object.keys(images).filter(key => images[key])
      });

      const formDataToSend = new FormData();
      
      // Add basic fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('order', formData.order);
      formDataToSend.append('mainCategory', formData.mainCategory);
      formDataToSend.append('linkText', formData.linkText);

      // Add images
      if (images.mainImage) {
        formDataToSend.append('mainImage', images.mainImage);
      }

      // Add subcategory data and images for subcategories type
      if (formData.type === 'subcategories') {
        console.log('Subcategory items being sent:', formData.subcategoryItems);
        formDataToSend.append('subcategoryData', JSON.stringify(formData.subcategoryItems));
        
        for (let i = 1; i <= 4; i++) {
          if (images[`subcategoryImage${i}`]) {
            formDataToSend.append(`subcategoryImage${i}`, images[`subcategoryImage${i}`]);
            console.log(`Added subcategoryImage${i}:`, images[`subcategoryImage${i}`].name);
          }
        }
      }

      if (editingCard) {
        console.log('CardManagement: Updating existing card with ID:', editingCard._id);
        console.log('CardManagement: Update URL:', `/homepage/cards/${editingCard._id}`);
        await API.put(`/homepage/cards/${editingCard._id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('CardManagement: Card updated successfully');
        toast.success('Card updated successfully');
      } else {
        console.log('CardManagement: Creating new card');
        await API.post('/homepage/cards', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Card created successfully');
      }

      fetchData();
      closeModal();

    } catch (err) {
      console.error('Error saving card:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to save card');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return;

    console.log('[CardManagement] Deleting card with ID:', cardId);

    try {
      // Use relative path since API instance already has baseURL configured
      const response = await API.delete(`/homepage/cards/${cardId}`);
      console.log('[CardManagement] Delete response:', response);
      toast.success('Card deleted successfully');
      fetchData();
    } catch (err) {
      console.error('Error deleting card:', err);
      console.error('Error response:', err.response);
      toast.error(err.response?.data?.message || 'Failed to delete card');
    }
  };

  const getCardImageUrl = (card) => {
    if (card.type === 'main-category' && card.mainImage) {
      return getImageUrl('homepage-cards', card.mainImage);
    }
    return null;
  };

  const getSubcategoryImageUrl = (subcategoryItem) => {
    if (subcategoryItem?.image) {
      return getImageUrl('homepage-cards', subcategoryItem.image);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Homepage Cards Management</h2>
            <p className="text-gray-600 mt-1">Manage the 4 category cards displayed below the banner</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading homepage cards...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Homepage Cards Management</h2>
          <p className="text-gray-600 mt-1">Manage the 4 category cards displayed below the banner</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Card</span>
        </button>
      </div>

      {/* Show error banner if there's an error but don't hide the interface */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={fetchData}
                className="text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(orderNum => {
          const card = cards.find(c => c.order === orderNum);
          
          return (
            <div
              key={orderNum}
              className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[300px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Card {orderNum}</h3>
                {card && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openModal(card)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(card._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {card ? (
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-2 line-clamp-2">{card.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Type: {card.type === 'main-category' ? 'Single Category' : 'Subcategories'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    Category: {card.mainCategory?.name}
                  </p>

                  {card.type === 'main-category' && card.mainImage && (
                    <div className="mb-3">
                      <img
                        src={getCardImageUrl(card)}
                        alt={card.title}
                        className="w-full h-24 object-cover rounded"
                      />
                    </div>
                  )}

                  {card.type === 'subcategories' && card.subcategoryItems && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {card.subcategoryItems.map((item, idx) => (
                        <div key={idx} className="text-center">
                          <img
                            src={getSubcategoryImageUrl(item)}
                            alt={item.name}
                            className="w-full h-12 object-cover rounded mb-1"
                          />
                          <p className="text-xs text-gray-700 truncate">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-blue-600">{card.linkText}</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <PhotoIcon className="w-12 h-12 mb-2" />
                  <p className="text-sm">No card configured</p>
                  <button
                    onClick={() => openModal()}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Add Card
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingCard ? 'Edit Homepage Card' : 'Add Homepage Card'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Position *
                  </label>
                  <select
                    value={formData.order}
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4].map(num => {
                      const isUsed = getUsedOrders().includes(num) && (!editingCard || editingCard.order !== num);
                      return (
                        <option key={num} value={num} disabled={isUsed}>
                          Card {num}{isUsed ? ' (Taken)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {getUsedOrders().length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Taken positions: {getUsedOrders().join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Text
                  </label>
                  <input
                    type="text"
                    value={formData.linkText}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkText: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Category Items */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Category Items (4 images)</h4>
                  <div className="space-y-4">
                    {formData.subcategoryItems.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-800 mb-3">Item {index + 1}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Display Name *
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleSubcategoryItemChange(index, 'name', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category *
                            </label>
                            <select
                              value={item.categoryId}
                              onChange={(e) => handleSubcategoryItemChange(index, 'categoryId', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="">Select category</option>
                              {categories.map(category => (
                                <option key={category._id} value={category._id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Image *
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(`subcategoryImage${index + 1}`, e.target.files[0])}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required={!editingCard}
                            />
                            {editingCard?.subcategoryItems?.[index]?.image && (
                              <div className="mt-2">
                                <img
                                  src={getSubcategoryImageUrl(editingCard.subcategoryItems[index])}
                                  alt={`Current image ${index + 1}`}
                                  className="w-24 h-16 object-cover rounded"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => console.log('CardManagement: Update button clicked!')}
                  className={`px-4 py-2 text-white rounded-md transition-colors ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Processing...' : (editingCard ? 'Update Card' : 'Create Card')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardManagement;
