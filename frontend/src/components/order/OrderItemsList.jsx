import React, { useState } from 'react';
import { ShoppingBag, Store, XCircle, Clock, CheckCircle, Truck, Package, Ban } from 'lucide-react';

const OrderItemsList = ({ 
  group, 
  userRole = 'customer', 
  allowCancellation = true, 
  onCancelPart, 
  onCancelItems, // New: Function to cancel individual items
  isOrderForwarded = false, // New: Whether order is forwarded to vendors
  isCancelling = false 
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showItemCancelModal, setShowItemCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase() || 'placed';
    
    const colors = {
      'placed': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'rejected': 'bg-red-100 text-red-800'
    };

    return colors[normalizedStatus] || 'bg-gray-100 text-gray-800';
  };

  const getGroupColor = (type) => {
    return type === 'admin' 
      ? 'border-blue-200 bg-blue-50' 
      : 'border-green-200 bg-green-50';
  };

  const getGroupIcon = () => {
    const IconComponent = group.icon || ShoppingBag;
    return <IconComponent className="w-5 h-5" />;
  };

  const canCancelGroup = () => {
    // Define cancellable statuses (should match OrderService.canCancelOrder)
    const cancellableStatuses = ['placed', 'pending', 'processing', 'confirmed'];
    
    return allowCancellation && 
           group.canCancel && 
           userRole === 'customer' && 
           cancellableStatuses.includes(group.status?.toLowerCase());
  };

  const canCancelIndividualItems = () => {
    // Define cancellable statuses (should match OrderService.canCancelOrder)
    const cancellableStatuses = ['placed', 'pending', 'processing', 'confirmed'];
    
    return allowCancellation && 
           userRole === 'customer' && 
           !isOrderForwarded && // Only allow for non-forwarded orders
           cancellableStatuses.includes(group.status?.toLowerCase());
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleItemCancelClick = () => {
    setShowItemCancelModal(true);
  };

  const handleItemSelect = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleItemCancelConfirm = () => {
    if (onCancelItems && selectedItems.size > 0) {
      onCancelItems(Array.from(selectedItems), cancelReason);
    }
    setShowItemCancelModal(false);
    setSelectedItems(new Set());
    setCancelReason('');
  };

  const handleItemCancelClose = () => {
    setShowItemCancelModal(false);
    setSelectedItems(new Set());
    setCancelReason('');
  };

  const handleCancelConfirm = () => {
    if (onCancelPart) {
      onCancelPart(group, cancelReason);
    }
    setShowCancelModal(false);
    setCancelReason('');
  };

  const handleCancelClose = () => {
    setShowCancelModal(false);
    setCancelReason('');
  };

  if (!group.items || group.items.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`border rounded-lg ${getGroupColor(group.type)}`}>
        {/* Group Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${group.type === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                {getGroupIcon()}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{group.name}</h4>
                <p className="text-xs text-gray-600">
                  {group.items.length} item{group.items.length !== 1 ? 's' : ''} • ${group.subtotal?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(group.status)}`}>
                {group.status?.charAt(0).toUpperCase() + group.status?.slice(1) || 'Placed'}
              </span>
              
              {/* Individual Item Cancel Button (for non-forwarded orders) */}
              {canCancelIndividualItems() && (
                <button
                  onClick={handleItemCancelClick}
                  className="px-2 py-1 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded transition-colors"
                  title="Cancel individual items"
                >
                  Cancel Items
                </button>
              )}
            </div>
          </div>
          
          {/* Vendor Contact Info */}
          {group.type === 'vendor' && group.contact && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                Contact: {group.contact.email || group.contact.phone || 'N/A'}
              </p>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="p-4 space-y-3">
          {group.items.map((item, index) => (
            <div key={index} className="flex items-center space-x-4 py-2 bg-white rounded-lg border border-gray-100">
              {/* Checkbox for individual item selection (only show in item cancel modal) */}
              {showItemCancelModal && (
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item._id)}
                    onChange={() => handleItemSelect(item._id)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </div>
              )}
              
              {/* Product Image */}
              <div className="flex-shrink-0">
                <img
                  src={item.image || '/placeholder-product.jpg'}
                  alt={item.productName || item.title}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              </div>
              
              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-gray-900 truncate">
                  {item.productName || item.title || 'Product'}
                </h5>
                <p className="text-xs text-gray-600">
                  Qty: {item.quantity} × ${item.price?.toFixed(2) || '0.00'}
                </p>
                {item.status === 'cancelled' && (
                  <p className="text-xs text-red-600 font-medium">CANCELLED</p>
                )}
              </div>
              
              {/* Item Status and Total */}
              <div className="text-right space-y-1">
                {/* Individual Item Status Badge */}
                {item.status && item.status !== 'cancelled' && (
                  <div className="flex justify-end">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                      {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                    </span>
                  </div>
                )}
                <p className={`text-sm font-semibold ${item.status === 'cancelled' ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                  ${item.subtotal?.toFixed(2) || (item.price * item.quantity)?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Cancel {group.type === 'admin' ? 'Admin' : 'Vendor'} Part
                  </h3>
                  <p className="text-sm text-gray-600">
                    This will cancel the {group.name} part of your order.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Part
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Item Cancel Modal */}
      {showItemCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Cancel Individual Items
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select items to cancel from {group.name}. Selected items will be removed from your order.
                  </p>
                </div>
              </div>

              {/* Items Selection */}
              <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <div className="p-3 space-y-2">
                  {group.items.map((item, index) => (
                    <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg border ${
                      selectedItems.has(item._id) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    } ${item.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item._id)}
                        onChange={() => handleItemSelect(item._id)}
                        disabled={item.status === 'cancelled'}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <img
                        src={item.image || '/placeholder-product.jpg'}
                        alt={item.productName || item.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.productName || item.title || 'Product'}
                        </p>
                        <p className="text-xs text-gray-600">
                          Qty: {item.quantity} × ${item.price?.toFixed(2) || '0.00'}
                        </p>
                        {item.status === 'cancelled' && (
                          <p className="text-xs text-red-600 font-medium">ALREADY CANCELLED</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${item.subtotal?.toFixed(2) || (item.price * item.quantity)?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedItems.size > 0 && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected for cancellation
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleItemCancelClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleItemCancelConfirm}
                  disabled={selectedItems.size === 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderItemsList;
