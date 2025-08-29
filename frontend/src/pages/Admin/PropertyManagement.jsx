import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X, 
  MoreVertical, 
  Home, 
  MapPin, 
  Calendar,
  DollarSign,
  Building,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { config } from '../../config';
import { propertyService } from '../../services/propertyService';

const PropertyManagement = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [showDropdown, setShowDropdown] = useState({});
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    sold: 0
  });
  const propertiesPerPage = 10;

  useEffect(() => {
    fetchProperties();
  }, []);
  
  // Effect to reload data when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when filters change
      fetchProperties(1); // Load first page with new filters
    }, 300); // Debounce for search
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, typeFilter]);

  const fetchProperties = async (page = currentPage) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      const params = {
        page,
        limit: propertiesPerPage,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { propertyType: typeFilter }),
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await axios.get(`${config.API_BASE_URL}/admin/properties`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      if (response.data.success) {
        setProperties(response.data.properties || []);
        setTotalProperties(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.pages || 1);
        setCurrentPage(response.data.pagination?.page || 1);
        setStatistics(response.data.statistics || statistics);
      } else {
        setProperties([]);
        setTotalProperties(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      setTotalProperties(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyAction = async (propertyId, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [propertyId]: true }));
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      let endpoint = '';
      let method = 'PATCH';
      let data = {};
      switch (action) {
        case 'approve':
          endpoint = `${config.API_BASE_URL}/admin/properties/${propertyId}/approve`;
          data = { notes: 'Approved by admin' };
          break;
        case 'reject':
          endpoint = `${config.API_BASE_URL}/admin/properties/${propertyId}/reject`;
          const rejectionReason = window.prompt('Please provide a reason for rejection:');
          if (!rejectionReason) {
            setActionLoading(prev => ({ ...prev, [propertyId]: false }));
            return;
          }
          data = { adminNotes: rejectionReason };
          break;
        case 'delete':
          endpoint = `${config.API_BASE_URL}/admin/properties/${propertyId}`;
          method = 'DELETE';
          break;
        default:
          return;
      }

      const response = await axios({
        method,
        url: endpoint,
        headers: { Authorization: `Bearer ${token}` },
        data
      });

      if (response.data.success) {
        if (action === 'delete') {
          setProperties(prev => prev.filter(p => p._id !== propertyId));
        } else {
          setProperties(prev => prev.map(p => 
            p._id === propertyId 
              ? { ...p, status: action === 'approve' ? 'approved' : 'rejected' }
              : p
          ));
        }
        setShowDropdown(prev => ({ ...prev, [propertyId]: false }));
      }
    } catch (error) {
      console.error(`Error ${action}ing property:`, error);
      alert(`Failed to ${action} property`);
    } finally {
      setActionLoading(prev => ({ ...prev, [propertyId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      sold: { color: 'bg-blue-100 text-blue-800', text: 'Sold' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatPrice = (price) => {
    if (price >= 10000000) {
      return `${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `${(price / 100000).toFixed(1)} Lac`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toLocaleString();
  };

  const filteredProperties = (properties || []).filter(property => {
    const matchesSearch = property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.propertyId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    const matchesType = typeFilter === 'all' || property.propertyType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const propertyTypes = [...new Set((properties || []).map(p => p.propertyType))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Management</h1>
          <p className="text-gray-600">Manage property listings and approvals</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white p-2 rounded-lg border">
            <div className="text-sm text-gray-600">Total Properties</div>
            <div className="text-2xl font-bold text-gray-900">{(properties || []).length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="sold">Sold</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {propertyTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Properties List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <Home className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No properties match your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Property</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Type</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Location</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Price</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Date</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProperties.map((property) => (
                  <tr key={property._id} className="hover:bg-gray-50">
                    {/* Property Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {(() => {
                            const firstImage = property.images?.[0];
                            
                            if (!firstImage) {
                              return (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="w-6 h-6 text-gray-400" />
                                </div>
                              );
                            }
                            
                            return (
                              <div className="relative w-full h-full">
                                <img
                                  src={propertyService.getImageUrl(firstImage)}
                                  alt={property.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Failed to load property image:', firstImage);
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                                <div 
                                  className="absolute inset-0 flex items-center justify-center bg-gray-200" 
                                  style={{display: 'none'}}
                                >
                                  <Home className="w-6 h-6 text-gray-400" />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 line-clamp-1">{property.title}</div>
                          <div className="text-sm text-gray-600">{property.propertyId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {property.propertyType}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                        {property.city}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(property.price)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      {getStatusBadge(property.status)}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(property.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {/* Quick Actions for Pending */}
                        {property.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handlePropertyAction(property._id, 'approve')}
                              disabled={actionLoading[property._id]}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePropertyAction(property._id, 'reject')}
                              disabled={actionLoading[property._id]}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* View Details */}
                        <Link
                          to={`/admin/properties/${property._id}`}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* More Actions */}
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown(prev => ({ 
                              ...prev, 
                              [property._id]: !prev[property._id] 
                            }))}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {showDropdown[property._id] && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                              <div className="py-1">
                                {property.status !== 'approved' && (
                                  <button
                                    onClick={() => handlePropertyAction(property._id, 'approve')}
                                    className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                  >
                                    <Check className="w-4 h-4 inline mr-2" />
                                    Approve
                                  </button>
                                )}
                                {property.status !== 'rejected' && (
                                  <button
                                    onClick={() => handlePropertyAction(property._id, 'reject')}
                                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4 inline mr-2" />
                                    Reject
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePropertyAction(property._id, 'delete')}
                                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 inline mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * propertiesPerPage) + 1}-{Math.min(currentPage * propertiesPerPage, totalProperties)} of {totalProperties} properties
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchProperties(currentPage - 1)}
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
                      onClick={() => fetchProperties(pageNumber)}
                      className={`px-3 py-2 border rounded-lg text-sm ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => fetchProperties(currentPage + 1)}
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
    </div>
  );
};

export default PropertyManagement;
