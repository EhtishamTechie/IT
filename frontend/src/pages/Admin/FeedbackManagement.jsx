import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  MessageCircle,
  Plus,
  RefreshCw,
  Download,
  X
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const FeedbackManagement = () => {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    dateFrom: '',
    dateTo: ''
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [currentPage]); // Only depend on currentPage

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const { adminAPI } = useAdminAuth();
  
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...filters,
        status: filters.status === 'all' ? undefined : filters.status,
        priority: filters.priority === 'all' ? undefined : filters.priority
      };
      
      console.log('🔍 Fetching feedback with params:', params);
      const response = await adminAPI.getFeedback(params);
      
      if (!response.data) {
        throw new Error('Invalid response format');
      }
      
      console.log('📨 Feedback response:', response.data);
      
      // Handle nested data structure
      const feedbackData = response.data.success ? response.data.data.contacts || [] : [];
      const paginationData = response.data.success ? response.data.data.pagination || {} : {};
      
      setContacts(Array.isArray(feedbackData) ? feedbackData : []);
      setTotalPages(paginationData.totalPages || 1);
      setTotalContacts(paginationData.totalContacts || 0);
      setCurrentPage(paginationData.currentPage || 1);
      
      setError('');
    } catch (error) {
      console.error('Error fetching feedback:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        setError(error.response.data.message || 'Failed to load feedback messages');
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('Network error - please check your connection');
      } else {
        console.error('Error details:', error.message);
        setError('An error occurred while loading feedback');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📊 [FRONTEND] Fetching feedback stats from /admin/contacts/stats endpoint...');
      const response = await adminAPI.getFeedbackStats();
      
      // Debug logs
      // Debug logging
      console.log('📊 [FRONTEND] Stats raw response:', response);
      console.log('📊 [FRONTEND] Stats data:', response.data);
      console.log('📊 [FRONTEND] Stats overview:', response.data?.data?.overview);
      console.log('📊 [FRONTEND] Stats priorities:', response.data?.data?.priorities);
      
      // Handle nested data structure
      const statsData = response.data.success ? {
        total: response.data.data.overview.total || 0,
        unread: response.data.data.overview.new || 0,
        resolved: response.data.data.overview.resolved || 0,
        pending: response.data.data.overview.inProgress || 0,
        highPriority: (response.data.data.priorities || []).find(p => p._id === 'high')?.count || 0
      } : {
        total: 0,
        unread: 0,
        resolved: 0,
        pending: 0,
        highPriority: 0
      };
      
      console.log('📊 [FRONTEND] Processed stats:', statsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error details:', error.message);
      }
      // Set default stats on error
      setStats({
        total: 0,
        unread: 0,
        resolved: 0,
        pending: 0,
        highPriority: 0
      });
    }
  };

  const handleStatusUpdate = async (contactId, newStatus, response = null) => {
    try {
      if (response) {
        await adminAPI.respondToFeedback(contactId, { response, status: newStatus });
      } else {
        await adminAPI.markFeedbackAsResolved(contactId);
      }
      fetchContacts();
      fetchStats();
      setShowModal(false);
      setSelectedContact(null);
      setResponseText('');
    } catch (error) {
      console.error('Error updating contact status:', error);
      setError('Failed to update status');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this feedback message?')) {
      return;
    }

    try {
      await adminAPI.deleteFeedback(contactId);
      fetchContacts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting contact:', error);
      setError('Failed to delete feedback message');
    }
  };

  const openResponseModal = (contact) => {
    setSelectedContact(contact);
    setResponseText(contact.adminResponse || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedContact(null);
    setResponseText('');
  };

  const openViewModal = (contact) => {
    setSelectedContact(contact);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedContact(null);
  };

  const submitResponse = () => {
    if (!responseText.trim()) {
      alert('Please enter a response');
      return;
    }
    
    // Show confirmation about email being sent
    if (confirm(`Are you sure you want to send this response? An email will be sent to ${selectedContact.email}`)) {
      handleStatusUpdate(selectedContact._id, 'resolved', responseText);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !filters.search || 
      contact.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.message.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, text: 'New' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, text: 'Closed' }
    };
    
    const config = statusConfig[status] || statusConfig.new;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800', text: 'Low' },
      medium: { color: 'bg-blue-100 text-blue-800', text: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', text: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', text: 'Urgent' }
    };
    
    const config = priorityConfig[priority] || priorityConfig.medium;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-7 h-7 mr-2 text-blue-600" />
            Feedback Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage customer feedback and contact messages
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchContacts}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.new || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          {/* Status Filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />

          {/* Date To */}
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        </div>
      )}

      {/* Messages Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading feedback messages...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No feedback messages found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {contact.email}
                          </div>
                          {contact.phone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium mb-1">{contact.subject}</div>
                        <div className="text-gray-500 line-clamp-2">
                          {contact.message.length > 100 
                            ? `${contact.message.substring(0, 100)}...` 
                            : contact.message}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(contact.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(contact.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openResponseModal(contact)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Respond"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openViewModal(contact)}
                          className="text-green-600 hover:text-green-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalContacts)}</span> of{' '}
                      <span className="font-medium">{totalContacts}</span> feedback messages
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = index + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + index;
                        } else {
                          pageNumber = currentPage - 2 + index;
                        }
                        
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNumber === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {showModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Respond to Feedback
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              {/* Contact Info */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <User className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="font-medium">{selectedContact.name}</span>
                  <span className="ml-2 text-gray-500">({selectedContact.email})</span>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="font-medium mb-1">{selectedContact.subject}</div>
                  <div>{selectedContact.message}</div>
                </div>
              </div>

              {/* Response Textarea */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Response
                  <span className="text-blue-600 text-xs ml-2">(Will be sent via email)</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  placeholder="Enter your response to the customer... This response will be sent to their email address."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                />
                <div className="mt-2 flex items-center text-sm text-blue-600">
                  <Mail className="w-4 h-4 mr-1" />
                  <span>Response will be emailed to: {selectedContact.email}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitResponse}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Feedback Details
                </h3>
                <button
                  onClick={closeViewModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              {/* Contact Information */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm text-gray-500">Name</div>
                        <div className="font-medium">{selectedContact.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="font-medium">{selectedContact.email}</div>
                      </div>
                    </div>
                    {selectedContact.phone && (
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                          <div className="text-sm text-gray-500">Phone</div>
                          <div className="font-medium">{selectedContact.phone}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm text-gray-500">Date Submitted</div>
                        <div className="font-medium">{new Date(selectedContact.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">Priority:</span>
                      {getPriorityBadge(selectedContact.priority)}
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">Status:</span>
                      {getStatusBadge(selectedContact.status)}
                    </div>
                    {selectedContact.inquiryType && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">Type:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {selectedContact.inquiryType.charAt(0).toUpperCase() + selectedContact.inquiryType.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Message</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="text-sm text-gray-500">Subject</div>
                    <div className="font-medium text-lg">{selectedContact.subject}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Message</div>
                    <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {selectedContact.message}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {selectedContact.adminNotes && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Admin Notes</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-gray-900 whitespace-pre-wrap">
                      {selectedContact.adminNotes}
                    </div>
                  </div>
                </div>
              )}

              {/* Resolution Information */}
              {selectedContact.resolvedAt && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Resolution Information</h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span className="text-green-800 font-medium">Resolved</span>
                      </div>
                      <div className="text-sm text-green-600">
                        {new Date(selectedContact.resolvedAt).toLocaleString()}
                      </div>
                    </div>
                    {selectedContact.resolvedBy && (
                      <div className="mt-2 text-sm text-green-700">
                        Resolved by: {selectedContact.resolvedBy.name || selectedContact.resolvedBy.email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    closeViewModal();
                    openResponseModal(selectedContact);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Response
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedContact._id, selectedContact.status === 'new' ? 'in_progress' : 'resolved')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Status
                </button>
              </div>
              <button
                onClick={closeViewModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
