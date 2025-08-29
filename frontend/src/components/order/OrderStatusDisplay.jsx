import React from 'react';
import { Clock, CheckCircle, Truck, Package, XCircle, AlertCircle } from 'lucide-react';
import unifiedOrderStatusService from '../../services/unifiedOrderStatusService';

const OrderStatusDisplay = ({ status, order = null, isSplit = false, parts = [] }) => {
  // Use unified status service for consistent status display
  const getStatusIcon = (statusValue) => {
    const normalizedStatus = unifiedOrderStatusService.normalizeStatus(statusValue);
    
    const iconMap = {
      'placed': Clock,
      'processing': Package,
      'shipped': Truck,
      'delivered': CheckCircle,
      'cancelled': XCircle,
      'accepted': CheckCircle,
      'rejected': XCircle
    };
    
    return iconMap[normalizedStatus] || Clock;
  };

  // For split orders, show a unified status with parts breakdown
  if (isSplit && parts && parts.length > 0) {
    const unifiedStatus = unifiedOrderStatusService.calculateUnifiedStatus(parts);
    const unifiedStatusInfo = unifiedOrderStatusService.getStatusInfo(unifiedStatus);
    const UnifiedIcon = getStatusIcon(unifiedStatus);

    return (
      <div className="space-y-3">
        {/* Main unified status */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${unifiedStatusInfo.color}`}>
          <UnifiedIcon className="w-4 h-4 mr-2" />
          {unifiedStatusInfo.label}
        </div>
        
        {/* Parts breakdown */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">Order Parts:</p>
          {parts.map((part, index) => {
            const partStatusInfo = unifiedOrderStatusService.getStatusInfo(part.status);
            const PartIcon = getStatusIcon(part.status);
            
            return (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {part.type === 'admin' ? 'Direct Items' : `Vendor: ${part.vendor?.businessName || 'Unknown'}`}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({part.items?.length || 0} items)
                  </span>
                </div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${partStatusInfo.color}`}>
                  <PartIcon className="w-3 h-3 mr-1" />
                  {partStatusInfo.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Single status display
  const statusInfo = unifiedOrderStatusService.getStatusInfo(status);
  const StatusIcon = getStatusIcon(status);

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
        <StatusIcon className="w-4 h-4 mr-2" />
        {statusInfo.label}
      </div>
      
      {statusInfo.description && (
        <p className="text-sm text-gray-600">
          {statusInfo.description}
        </p>
      )}
    </div>
  );
};

export default OrderStatusDisplay;
