import React, { useState } from 'react';
import { RefreshCw, Ban, Truck, Eye, Download, XCircle } from 'lucide-react';

const OrderActions = ({ 
  orderDetails, 
  userRole = 'customer', 
  allowCancellation = true, 
  onCancelOrder, 
  onRefresh 
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  if (!orderDetails) return null;

  const canCancelEntireOrder = () => {
    console.log('🔍 canCancelEntireOrder check:', {
      allowCancellation,
      userRole,
      orderDetails: orderDetails ? {
        isSplit: orderDetails.isSplit,
        mainOrderStatus: orderDetails.mainOrder?.status,
        parts: orderDetails.parts?.map(p => ({ status: p.status }))
      } : null
    });
    
    if (!allowCancellation || userRole !== 'customer') {
      console.log('❌ canCancelEntireOrder: blocked by allowCancellation or userRole');
      return false;
    }
    
    // Define cancellable statuses (should match OrderService.canCancelOrder)
    const cancellableStatuses = ['placed', 'pending', 'processing', 'confirmed'];
    
    // For split orders, check if any part can be cancelled
    if (orderDetails.isSplit && orderDetails.parts) {
      const canCancel = orderDetails.parts.some(part => 
        cancellableStatuses.includes(part.status?.toLowerCase())
      );
      console.log('✅ canCancelEntireOrder (split order):', canCancel);
      return canCancel;
    }
    
    // For non-split orders, check main order status
    const mainStatus = orderDetails.mainOrder?.status?.toLowerCase();
    const canCancel = cancellableStatuses.includes(mainStatus);
    console.log('✅ canCancelEntireOrder (non-split order):', canCancel, 'mainStatus:', mainStatus);
    return canCancel;
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    console.log('🔄 OrderActions handleCancelConfirm called with reason:', cancelReason);
    console.log('🔄 onCancelOrder function:', onCancelOrder);
    
    if (onCancelOrder) {
      setIsCancelling(true);
      try {
        console.log('📞 Calling onCancelOrder...');
        await onCancelOrder(cancelReason);
        console.log('✅ onCancelOrder completed successfully');
      } catch (error) {
        console.error('❌ Error in onCancelOrder:', error);
      } finally {
        setIsCancelling(false);
      }
    } else {
      console.error('❌ onCancelOrder function not provided!');
    }
    setShowCancelModal(false);
    setCancelReason('');
  };

  const handleCancelClose = () => {
    setShowCancelModal(false);
    setCancelReason('');
  };

  const handleTrackOrder = () => {
    // Open tracking in new tab
    const orderNumber = orderDetails.mainOrder?.orderNumber;
    if (orderNumber) {
      window.open(`/track-order/${orderNumber}`, '_blank');
    }
  };

  const handlePrintOrder = () => {
    window.print();
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="space-y-3">
          
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </button>

          {/* Track Order Button */}
          <button
            onClick={handleTrackOrder}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Truck className="w-4 h-4 mr-2" />
            Track Order
          </button>

          {/* Print Order Button */}
          <button
            onClick={handlePrintOrder}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Print Order
          </button>

          {/* Cancel Order Button - Only for customers */}
          {canCancelEntireOrder() && (
            <button
              onClick={handleCancelClick}
              className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancel Order
            </button>
          )}

          {/* Admin/Vendor specific actions */}
          {(userRole === 'admin' || userRole === 'vendor') && (
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={() => window.open(`/admin/orders/${orderDetails.mainOrder?._id}`, '_blank')}
                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Open in {userRole === 'admin' ? 'Admin' : 'Vendor'} Panel
              </button>
            </div>
          )}
        </div>

        {/* Order Status Info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Orders can be cancelled before shipping</p>
            <p>• Contact support for assistance</p>
            <p>• Track your order for real-time updates</p>
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
                  <p className="text-sm text-gray-600">
                    {orderDetails.isSplit 
                      ? 'This will cancel all cancellable parts of your order.'
                      : 'This will cancel your entire order.'
                    }
                  </p>
                </div>
              </div>

              {/* Warning for split orders */}
              {orderDetails.isSplit && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Only parts that haven't been shipped can be cancelled. 
                    Shipped parts will continue to be delivered.
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelClose}
                  disabled={isCancelling}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isCancelling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderActions;
