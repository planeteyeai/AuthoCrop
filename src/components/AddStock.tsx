import React, { useState } from 'react';
import { Boxes } from 'lucide-react';

interface InventoryItem {
  id?: number;
  itemName: string;
  Make: string;
  itemType: 'Logistic' | 'Transport' | 'Equipment' | 'Office Purpose' | 'Storage' | 'Processing';
  yearMake: string;
  estimateCost: string;
  status: 'Not working' | 'Working' | 'underRepair';
  remark: string;
}

interface AddStockProps {
  setStocks: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
}

export const AddStock: React.FC<AddStockProps> = ({ setStocks }) => {
  const [formData, setFormData] = useState<InventoryItem>({
    itemName: '',
    Make: '',
    itemType: 'Logistic',
    yearMake: '',
    estimateCost: '',
    status: 'Working',
    remark: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const response = await fetch('http://localhost:5000/stocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now(),
          itemName: formData.itemName,
          itemType: formData.itemType,
          make: formData.Make,
          yearOfMake: formData.yearMake,
          estimateCost: formData.estimateCost,
          status: formData.status,
          remark: formData.remark
        }),
      });

      if (!response.ok) throw new Error('Failed to add stock');
      await response.json();
      // Fetch the latest stock data after adding
      const updatedStocks = await fetch('http://localhost:5000/stocklist').then(res => res.json());
      setStocks(updatedStocks);

      // Reset form
      setFormData({
        itemName: '',
        Make: '',
        itemType: 'Logistic',
        yearMake: '',
        estimateCost: '',
        status: 'Working',
        remark: ''
      });
      setSuccess('Stock added successfully!');
    } catch (error) {
      setError('Error adding stock. Please try again.');
      console.error('Error adding stock:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="w-full h-48 bg-cover bg-center relative"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80")'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50">
          <div className="container mx-auto px-4 h-full flex items-center">
            <div className="flex items-center text-white">
              <Boxes className="w-8 h-8 mr-3" />
              <h1 className="text-3xl font-bold">Add New Stock</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-4 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
              <select
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value as InventoryItem['itemType'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500"
                required
              >
                <option value="Logistic">Logistic</option>
                <option value="Transport">Transport</option>
                <option value="Equipment">Equipment</option>
                <option value="Office Purpose">Office Purpose</option>
                <option value="Storage">Storage</option>
                <option value="Processing">Processing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
              <input
                type="text"
                value={formData.Make}
                onChange={(e) => setFormData({ ...formData, Make: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Make</label>
              <input
                type="text"
                value={formData.yearMake}
                onChange={(e) => setFormData({ ...formData, yearMake: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Cost</label>
              <input
                type="text"
                value={formData.estimateCost}
                onChange={(e) => setFormData({ ...formData, estimateCost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as InventoryItem['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500"
                required
              >
                <option value="Working">Working</option>
                <option value="Not working">Not working</option>
                <option value="underRepair">Under Repair</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
            <textarea
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 h-24"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
          {success && <div className="text-green-600 mt-2">{success}</div>}
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </form>
      </div>
    </div>
  );
};
