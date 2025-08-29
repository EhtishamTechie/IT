import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Search, 
  Store, 
  Phone,
  MessageCircle,
  Mail,
  Save,
  X
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../../config';

const WholesaleManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const suppliersPerPage = 10;
  
  const [formData, setFormData] = useState({
    categoryName: '',
    categoryDescription: '',
    supplierName: '',
    contactNumber: '',
    whatsappNumber: '',
    email: '',
    address: '',
    specialties: [],
    minimumOrderQuantity: '',
    deliveryAreas: [],
    businessHours: '',
    displayOrder: 0
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  // Effect to reload data when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when search changes
      fetchSuppliers(1); // Load first page with new search
    }, 300); // Debounce for search
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchSuppliers = async (page = currentPage) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const params = {
        page,
        limit: suppliersPerPage,
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await axios.get(`${getApiUrl()}/wholesale/admin/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      if (response.data.success) {
        // Handle both paginated and non-paginated responses
        if (response.data.pagination) {
          setSuppliers(response.data.data || response.data.suppliers || []);
          setTotalSuppliers(response.data.pagination.total || 0);
          setTotalPages(response.data.pagination.pages || 1);
          setCurrentPage(response.data.pagination.page || 1);
        } else {
          // Legacy response format - apply client-side pagination
          const allSuppliers = response.data.data || response.data.suppliers || [];
          const filteredSuppliers = searchTerm 
            ? allSuppliers.filter(s => 
                s.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : allSuppliers;
            
          const startIndex = (page - 1) * suppliersPerPage;
          const endIndex = startIndex + suppliersPerPage;
          const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);
          
          setSuppliers(paginatedSuppliers);
          setTotalSuppliers(filteredSuppliers.length);
          setTotalPages(Math.ceil(filteredSuppliers.length / suppliersPerPage));
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      alert('Error fetching suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayInputChange = (field, value) => {
    // Store the raw input value and let users type freely
    setFormData(prev => ({
      ...prev,
      [field]: value // Store as string to preserve user input
    }));
  };

  const getArrayDisplayValue = (value) => {
    // If it's already a string (user is typing), return as is
    if (typeof value === 'string') return value;
    // If it's an array (from database), join with commas
    return Array.isArray(value) ? value.join(', ') : '';
  };

  const processArrayForSubmission = (value) => {
    // Convert string input to array for submission
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    return Array.isArray(value) ? value : [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingSupplier 
        ? `${getApiUrl()}/wholesale/admin/suppliers/${editingSupplier._id}`
        : `${getApiUrl()}/wholesale/admin/suppliers`;
      
      const method = editingSupplier ? 'put' : 'post';
      
      // Process the form data to convert string arrays to proper arrays
      const processedFormData = {
        ...formData,
        specialties: processArrayForSubmission(formData.specialties),
        deliveryAreas: processArrayForSubmission(formData.deliveryAreas)
      };
      
      const response = await axios[method](url, processedFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert(editingSupplier ? 'Supplier updated successfully!' : 'Supplier added successfully!');
        setShowAddModal(false);
        setEditingSupplier(null);
        resetForm();
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error saving supplier');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      categoryName: supplier.categoryName,
      categoryDescription: supplier.categoryDescription || '',
      supplierName: supplier.supplierName,
      contactNumber: supplier.contactNumber,
      whatsappNumber: supplier.whatsappNumber,
      email: supplier.email || '',
      address: supplier.address || '',
      specialties: supplier.specialties || [],
      minimumOrderQuantity: supplier.minimumOrderQuantity || '',
      deliveryAreas: supplier.deliveryAreas || [],
      businessHours: supplier.businessHours || '',
      displayOrder: supplier.displayOrder || 0
    });
    setShowAddModal(true);
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.delete(`${getApiUrl()}/wholesale/admin/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Supplier deleted successfully!');
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error deleting supplier');
    }
  };

  const handleToggleStatus = async (supplierId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.patch(`${getApiUrl()}/wholesale/admin/suppliers/${supplierId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      alert('Error updating supplier status');
    }
  };

  const resetForm = () => {
    setFormData({
      categoryName: '',
      categoryDescription: '',
      supplierName: '',
      contactNumber: '',
      whatsappNumber: '',
      email: '',
      address: '',
      specialties: [],
      minimumOrderQuantity: '',
      deliveryAreas: [],
      businessHours: '',
      displayOrder: 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wholesale Suppliers Management</h1>
          <p className="text-gray-600">Manage wholesale suppliers and their contact information</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{supplier.supplierName}</div>
                      {supplier.address && (
                        <div className="text-sm text-gray-500">{supplier.address}</div>
                      )}
                      {supplier.specialties && supplier.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {supplier.specialties.slice(0, 2).map((specialty, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                              {specialty}
                            </span>
                          ))}
                          {supplier.specialties.length > 2 && (
                            <span className="text-xs text-gray-500">+{supplier.specialties.length - 2} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{supplier.categoryName}</div>
                    {supplier.categoryDescription && (
                      <div className="text-sm text-gray-500">{supplier.categoryDescription}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="w-4 h-4 mr-2" />
                        {supplier.contactNumber}
                      </div>
                      <div className="flex items-center text-sm text-gray-900">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {supplier.whatsappNumber}
                      </div>
                      {supplier.email && (
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="w-4 h-4 mr-2" />
                          {supplier.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(supplier._id)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                        supplier.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } transition-colors`}
                    >
                      {supplier.isActive ? (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier._id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {suppliers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers found</h3>
            <p className="text-gray-600">{searchTerm ? 'Try adjusting your search terms.' : 'Add your first wholesale supplier to get started.'}</p>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * suppliersPerPage) + 1}-{Math.min(currentPage * suppliersPerPage, totalSuppliers)} of {totalSuppliers} suppliers
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchSuppliers(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNumber = currentPage <= 3 
                    ? index + 1 
                    : currentPage >= totalPages - 2 
                      ? totalPages - 4 + index
                      : currentPage - 2 + index;
                  
                  if (pageNumber < 1 || pageNumber > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => fetchSuppliers(pageNumber)}
                      className={`px-3 py-2 border rounded-lg text-sm ${
                        currentPage === pageNumber
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => fetchSuppliers(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSupplier(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="categoryName"
                    value={formData.categoryName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    name="supplierName"
                    value={formData.supplierName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Description
                </label>
                <textarea
                  name="categoryDescription"
                  value={formData.categoryDescription}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. +92-321-1234567 or 03211234567"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: +92-XXX-XXXXXXX or 03XXXXXXXXX</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="displayOrder"
                    value={formData.displayOrder}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialties (comma-separated)
                </label>
                <input
                  type="text"
                  value={getArrayDisplayValue(formData.specialties)}
                  onChange={(e) => handleArrayInputChange('specialties', e.target.value)}
                  placeholder="Electronics, Mobile Accessories, Gadgets"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Order Quantity
                  </label>
                  <input
                    type="text"
                    name="minimumOrderQuantity"
                    value={formData.minimumOrderQuantity}
                    onChange={handleInputChange}
                    placeholder="e.g., 100 pieces, 1 carton"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    name="businessHours"
                    value={formData.businessHours}
                    onChange={handleInputChange}
                    placeholder="e.g., 9 AM - 6 PM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Areas (comma-separated)
                </label>
                <input
                  type="text"
                  value={getArrayDisplayValue(formData.deliveryAreas)}
                  onChange={(e) => handleArrayInputChange('deliveryAreas', e.target.value)}
                  placeholder="Karachi, Lahore, Islamabad"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingSupplier ? 'Update' : 'Add'} Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesaleManagement;
