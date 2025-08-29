import React from 'react';
import { User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';

const OrderCustomerInfo = ({ mainOrder, userRole = 'customer' }) => {
  if (!mainOrder) return null;

  // Only show customer info to admin/vendor, not to the customer themselves
  if (userRole === 'customer') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Delivery Address</p>
              <p className="text-sm text-gray-600">
                {mainOrder.address || 'N/A'}, {mainOrder.city || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Payment Method</p>
              <p className="text-sm text-gray-600">{mainOrder.paymentMethod || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Details */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Customer Name</p>
              <p className="text-sm text-gray-600">{mainOrder.customerName || mainOrder.name || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-600">{mainOrder.email || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Phone</p>
              <p className="text-sm text-gray-600">{mainOrder.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Delivery & Payment */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Delivery Address</p>
              <p className="text-sm text-gray-600">
                {mainOrder.address || 'N/A'}
                {mainOrder.city && (
                  <>
                    <br />
                    {mainOrder.city}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Payment Method</p>
              <p className="text-sm text-gray-600">{mainOrder.paymentMethod || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCustomerInfo;
