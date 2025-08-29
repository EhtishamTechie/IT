import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { vendorService } from '../../services/vendorService';

const InquiryDetailPage = () => {
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInternalNoteModal, setShowInternalNoteModal] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    loadInquiry();
  }, [inquiryId]);

  useEffect(() => {
    scrollToBottom();
  }, [inquiry?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInquiry = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await vendorService.getInquiry(inquiryId);
      setInquiry(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inquiry');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setMessageLoading(true);
      setError('');
      setSuccess('');

      const messageData = {
        message: messageText,
        isVendorMessage: true,
        attachments: attachments
      };

      const response = await vendorService.replyToInquiry(inquiryId, messageData);
      
      if (response.data.success) {
        setMessageText('');
        setAttachments([]);
        setSuccess('Message sent successfully');
        loadInquiry(); // Reload to get updated messages
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to send message');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setStatusUpdateLoading(true);
      setError('');
      setSuccess('');

      const response = await vendorService.updateInquiryStatus(inquiryId, newStatus);
      
      if (response.data.success) {
        setSuccess('Status updated successfully');
        loadInquiry(); // Reload to get updated status
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to update status');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!internalNoteText.trim()) {
      setError('Please enter a note');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await vendorService.addInternalNote(inquiryId, internalNoteText);
      
      if (response.data.success) {
        setInternalNoteText('');
        setShowInternalNoteModal(false);
        setSuccess('Internal note added successfully');
        loadInquiry(); // Reload to get updated notes
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to add internal note');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add internal note');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      waiting_customer: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      product_inquiry: 'Product Inquiry',
      order_support: 'Order Support',
      shipping: 'Shipping',
      return_refund: 'Return/Refund',
      technical: 'Technical',
      billing: 'Billing',
      general: 'General'
    };
    return labels[category] || category;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (loading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  if (!inquiry) {
    return (
      <VendorLayout>
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">Inquiry not found</div>
          <button
            onClick={() => navigate('/vendor/inquiries')}
            className="text-orange-600 hover:text-orange-800 font-medium"
          >
            Back to Inquiries
          </button>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/vendor/inquiries')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inquiry #{inquiry.inquiryId}</h1>
              <p className="text-gray-600 mt-1">{inquiry.subject}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(inquiry.priority)}`}>
              {inquiry.priority} priority
            </span>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(inquiry.status)}`}>
              {inquiry.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Messages */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {inquiry.messages && inquiry.messages.length > 0 ? (
                    inquiry.messages.map((message, index) => (
                      <div key={message._id || index} className={`flex ${message.isVendorMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isVendorMessage
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment, idx) => (
                                <div key={idx} className="text-xs opacity-75">
                                  📎 {attachment.filename}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className={`text-xs mt-1 ${message.isVendorMessage ? 'text-orange-100' : 'text-gray-500'}`}>
                            {formatDate(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No messages yet. Start the conversation by sending a message.
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="space-y-3">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowInternalNoteModal(true)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Add Internal Note
                      </button>
                    </div>
                    
                    <button
                      onClick={handleSendMessage}
                      disabled={messageLoading || !messageText.trim()}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {messageLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      <span>Send Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            {inquiry.internalNotes && inquiry.internalNotes.length > 0 && (
              <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
                <div className="px-6 py-4 border-b border-yellow-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Internal Notes
                  </h2>
                </div>
                
                <div className="p-6 space-y-3">
                  {inquiry.internalNotes.map((note, index) => (
                    <div key={note._id || index} className="bg-white p-3 rounded border border-yellow-200">
                      <p className="text-sm text-gray-900">{note.note}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        Added by {note.addedBy?.name || 'System'} • {formatDate(note.addedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm text-gray-900">{inquiry.customerName}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{inquiry.customerEmail}</p>
                </div>
                
                {inquiry.customerPhone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{inquiry.customerPhone}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-sm text-gray-900">{getCategoryLabel(inquiry.category)}</p>
                </div>
                
                {inquiry.relatedOrder && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Related Order</label>
                    <p className="text-sm text-orange-600 cursor-pointer hover:text-orange-800">
                      #{inquiry.relatedOrder}
                    </p>
                  </div>
                )}
                
                {inquiry.relatedProduct && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Related Product</label>
                    <p className="text-sm text-orange-600 cursor-pointer hover:text-orange-800">
                      {inquiry.relatedProduct.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Actions</h2>
              
              <div className="space-y-3">
                {inquiry.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusUpdate('in_progress')}
                    disabled={statusUpdateLoading}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    Mark In Progress
                  </button>
                )}
                
                {inquiry.status !== 'waiting_customer' && (
                  <button
                    onClick={() => handleStatusUpdate('waiting_customer')}
                    disabled={statusUpdateLoading}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    Waiting for Customer
                  </button>
                )}
                
                {inquiry.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate('resolved')}
                    disabled={statusUpdateLoading}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                )}
                
                {inquiry.status === 'resolved' && inquiry.status !== 'closed' && (
                  <button
                    onClick={() => handleStatusUpdate('closed')}
                    disabled={statusUpdateLoading}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    Close Inquiry
                  </button>
                )}
              </div>
            </div>

            {/* Inquiry Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Inquiry Details</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-900">{formatDate(inquiry.createdAt)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Activity:</span>
                  <span className="text-gray-900">{formatTimeAgo(inquiry.lastActivityAt)}</span>
                </div>
                
                {inquiry.assignedTo && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned To:</span>
                    <span className="text-gray-900">{inquiry.assignedTo.name}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Messages:</span>
                  <span className="text-gray-900">{inquiry.messageCount || 0}</span>
                </div>
                
                {inquiry.rating && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rating:</span>
                    <div className="flex items-center">
                      <span className="text-gray-900 mr-2">{inquiry.rating}/5</span>
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Internal Note Modal */}
        {showInternalNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Internal Note</h3>
              
              <textarea
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                placeholder="Enter your internal note..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowInternalNoteModal(false);
                    setInternalNoteText('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddInternalNote}
                  disabled={!internalNoteText.trim()}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default InquiryDetailPage;
