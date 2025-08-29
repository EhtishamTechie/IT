import React, { useState, useEffect, useCallback } from 'react';
import StandardOrderDetailsModal from './StandardOrderDetailsModal';
import API from '../../api';

/**
 * Enhanced wrapper for StandardOrderDetailsModal that provides unified view for mixed orders
 * while preserving all existing functionality for regular orders.
 * 
 * This component detects if an order is a split part of a mixed order and automatically
 * shows the unified main order view while highlighting the relevant context for the user.
 */
const UnifiedOrderDetailsModal = ({ 
  orderId, 
  onClose, 
  onOrderUpdate,
  userRole = 'customer',
  allowCancellation = true,
  forceUnifiedView = false // New prop to force unified view
}) => {
  const [actualOrderId, setActualOrderId] = useState(orderId);
  const [contextFilter, setContextFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSplitOrder, setIsSplitOrder] = useState(false);

  // Check if this order is part of a mixed order split
  const checkOrderContext = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 UnifiedOrderDetailsModal: Checking order context for:', orderId, 'userRole:', userRole);

      // Only check for split context if user is admin or vendor
      if (userRole === 'admin' || userRole === 'vendor') {
        try {
          // Try to get split details to check if this is a mixed order
          const splitResponse = await API.get(`/orders/${orderId}/split-details`);
          
          if (splitResponse.data.success) {
            const splitData = splitResponse.data.data;
            console.log('🔍 Split details response:', splitData);

            // Check if this order has parts (indicating it's a main order with splits)
            const hasParts = splitData.parts && splitData.parts.length > 0;
            const isMainOrder = splitData.mainOrder && !splitData.mainOrder.parentOrderId;
            
            if (hasParts && isMainOrder) {
              // This is a main mixed order - show unified view
              console.log('✅ Main mixed order detected - showing unified view');
              setActualOrderId(orderId);
              setIsSplitOrder(true);
              setContextFilter(userRole);
            } else {
              // Check if any of the parts match our orderId (sub-order case)
              const matchingPart = splitData.parts?.find(part => 
                part._id === orderId || part.id === orderId
              );

              if (matchingPart && splitData.mainOrder) {
                // This is a sub-order part - show the main order with context
                console.log('✅ Sub-order part detected - redirecting to main order:', splitData.mainOrder._id);
                setActualOrderId(splitData.mainOrder._id);
                setIsSplitOrder(true);
                setContextFilter(userRole);
              } else {
                // Regular order - use as-is
                console.log('ℹ️ Regular order - using standard view');
                setActualOrderId(orderId);
                setIsSplitOrder(false);
                setContextFilter(null);
              }
            }
          } else {
            // Split-details failed - treat as regular order
            console.log('ℹ️ Split-details not available - treating as regular order');
            setActualOrderId(orderId);
            setIsSplitOrder(false);
            setContextFilter(null);
          }
        } catch (splitError) {
          console.log('ℹ️ Split-details check failed - treating as regular order:', splitError.message);
          // Fallback to regular order view
          setActualOrderId(orderId);
          setIsSplitOrder(false);
          setContextFilter(null);
        }
      } else {
        // Customer view - always use direct order ID
        console.log('ℹ️ Customer view - using direct order ID');
        setActualOrderId(orderId);
        setIsSplitOrder(false);
        setContextFilter(null);
      }
    } catch (error) {
      console.error('❌ Error checking order context:', error);
      // Fallback to original orderId to maintain functionality
      setActualOrderId(orderId);
      setIsSplitOrder(false);
      setContextFilter(null);
      setError('Failed to load order context');
    } finally {
      setLoading(false);
    }
  }, [orderId, userRole]);

  useEffect(() => {
    checkOrderContext();
  }, [checkOrderContext]);

  // Enhanced close handler that preserves parent functionality
  const handleClose = () => {
    console.log('🔄 UnifiedOrderDetailsModal: Closing modal');
    if (onClose) {
      onClose();
    }
  };

  // Enhanced update handler that preserves parent functionality
  const handleOrderUpdate = (orderData) => {
    console.log('🔄 UnifiedOrderDetailsModal: Order updated:', orderData);
    if (onOrderUpdate) {
      onOrderUpdate(orderData);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">Loading order details...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with fallback to original behavior
  if (error && !actualOrderId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={handleClose}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Render the enhanced StandardOrderDetailsModal
  return (
    <StandardOrderDetailsModal
      orderId={actualOrderId}
      onClose={handleClose}
      onOrderUpdate={handleOrderUpdate}
      userRole={userRole}
      allowCancellation={allowCancellation}
      // Pass additional context props (these will be ignored by current modal if not supported)
      contextFilter={contextFilter}
      isSplitOrder={isSplitOrder}
      showUnifiedView={isSplitOrder || forceUnifiedView}
      originalOrderId={orderId !== actualOrderId ? orderId : undefined}
    />
  );
};

export default UnifiedOrderDetailsModal;
