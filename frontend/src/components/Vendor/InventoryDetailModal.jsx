import React, { useState, useEffect } from 'react';
import { FiX, FiPackage, FiEdit, FiPlus, FiMinus, FiSave, FiAlert } from 'react-icons/fi';
import inventoryService from '../../services/inventoryService';

const InventoryDetailModal = ({ inventoryId, isOpen, onClose, onUpdate }) => {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [adjustmentData, setAdjustmentData] = useState({
    adjustment: '',
    reason: '',
    type: 'adjustment'
  });

  useEffect(() => {
    if (isOpen && inventoryId) {
      fetchInventoryDetails();
    }
  }, [isOpen, inventoryId]);

  const fetchInventoryDetails = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventoryItem(inventoryId);
      setInventory(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching inventory details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await inventoryService.updateInventoryItem(inventoryId, formData);
      await fetchInventoryDetails();
      setEditMode(false);
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error updating inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async () => {
    try {
      setLoading(true);
      await inventoryService.adjustStock(inventoryId, adjustmentData);
      await fetchInventoryDetails();
      setAdjustmentMode(false);
      setAdjustmentData({ adjustment: '', reason: '', type: 'adjustment' });
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'in_stock': return 'text-green-600 bg-green-100';
      case 'low_stock': return 'text-yellow-600 bg-yellow-100';
      case 'out_of_stock': return 'text-red-600 bg-red-100';
      case 'discontinued': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FiPackage className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {inventory?.product?.name || 'Inventory Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {loading && !inventory ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : inventory ? (
          <div className="p-6 space-y-6">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                <img
                  src={inventory.product.images?.[0] || '/api/placeholder/100/100'}
                  alt={inventory.product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{inventory.product.name}</h3>
                  <p className="text-sm text-gray-600">SKU: {inventory.product.sku}</p>
                  <p className="text-sm text-gray-600">Price: ${inventory.product.price}</p>
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(inventory.stockStatus)}`}>
                      {inventory.stockStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Stock</h4>
                <div className="text-2xl font-bold text-gray-900">
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.currentStock || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                      className="w-full text-2xl font-bold border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    inventory.currentStock
                  )}
                </div>
                <p className="text-sm text-gray-600">Available: {inventory.availableStock}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Reserved Stock</h4>
                <div className="text-2xl font-bold text-orange-600">{inventory.reservedStock}</div>
                <p className="text-sm text-gray-600">For pending orders</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Stock Value</h4>
                <div className="text-2xl font-bold text-green-600">
                  ${((inventory.currentStock * (inventory.averageCostPrice || inventory.costPrice || 0)).toFixed(2))}
                </div>
                <p className="text-sm text-gray-600">
                  Cost: ${inventory.averageCostPrice || inventory.costPrice || 0}
                </p>
              </div>
            </div>

            {/* Thresholds */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Stock Thresholds</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.lowStockThreshold || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">{inventory.lowStockThreshold}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.reorderPoint || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">{inventory.reorderPoint}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.reorderQuantity || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorderQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">{inventory.reorderQuantity}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Movements */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Stock Movements</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {inventory.stockMovements?.slice(-5).reverse().map((movement, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {movement.type.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-gray-600">{movement.reason}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                      <p className="text-xs text-gray-500">{formatDate(movement.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {!inventory.stockMovements?.length && (
                  <p className="text-gray-500 text-center py-4">No stock movements recorded</p>
                )}
              </div>
            </div>

            {/* Stock Adjustment Panel */}
            {adjustmentMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FiAlert className="w-5 h-5 mr-2 text-yellow-600" />
                  Stock Adjustment
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Amount</label>
                      <input
                        type="number"
                        value={adjustmentData.adjustment}
                        onChange={(e) => setAdjustmentData(prev => ({ ...prev, adjustment: e.target.value }))}
                        placeholder="Enter positive or negative amount"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {inventory.currentStock} → New: {inventory.currentStock + parseInt(adjustmentData.adjustment || 0)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={adjustmentData.type}
                        onChange={(e) => setAdjustmentData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="adjustment">Manual Adjustment</option>
                        <option value="purchase">Purchase</option>
                        <option value="return">Return</option>
                        <option value="damage">Damage/Loss</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      value={adjustmentData.reason}
                      onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Explain the reason for this adjustment..."
                      rows={2}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setFormData(inventory);
                    }}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : adjustmentMode ? (
                <>
                  <button
                    onClick={handleAdjustment}
                    disabled={loading || !adjustmentData.adjustment || !adjustmentData.reason}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Apply Adjustment
                  </button>
                  <button
                    onClick={() => {
                      setAdjustmentMode(false);
                      setAdjustmentData({ adjustment: '', reason: '', type: 'adjustment' });
                    }}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FiEdit className="w-4 h-4 mr-2" />
                    Edit Settings
                  </button>
                  <button
                    onClick={() => setAdjustmentMode(true)}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Adjust Stock
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InventoryDetailModal;
