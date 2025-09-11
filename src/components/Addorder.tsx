import React, { useState } from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';

interface Item {
  id: string;
  itemName: string;
  yearOfMake: string;
  estimateCost: string;
  remark: string;
}

interface AddOrderProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

export const Addorder: React.FC<AddOrderProps> = ({ items, setItems }) => {
  const [selectedVendor, setSelectedVendor] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState('');
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [selectedState, setSelectedState] = React.useState('');

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const addNewRow = () => {
    setItems([...items, {
      id: String(Date.now()),
      itemName: '',
      yearOfMake: '',
      estimateCost: '',
      remark: ''
    }]);
  };

  const deleteRow = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof Item, value: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Flatten each item into the correct structure for OrderList
    const orders = items.map((item) => ({
      id: Number(item.id),
      vendorName: selectedVendor,
      invoiceDate,
      invoiceNumber,
      state: selectedState,
      itemName: item.itemName,
      yearMake: item.yearOfMake,
      estimateCost: item.estimateCost,
      remark: item.remark,
    }));

    try {
      // Post each order item separately
      for (const order of orders) {
        await fetch('http://localhost:5000/orderlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order),
        });
      }
      alert('Order(s) Submitted!');
      // Reset form fields and items
      setSelectedVendor('');
      setInvoiceDate('');
      setInvoiceNumber('');
      setSelectedState('');
      setItems([
        {
          id: String(Date.now()),
          itemName: '',
          yearOfMake: '',
          estimateCost: '',
          remark: ''
        }
      ]);
    } catch (error) {
      console.error('Error posting order:', error);
      alert('Failed to submit order.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="h-48 bg-[url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2000')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-black/50">
          <div className="max-w-6xl mx-auto px-4 h-full flex items-center">
            <ClipboardList className="h-10 w-10 text-white mr-3" />
            <h1 className="text-4xl font-bold text-white">Accounting</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Inputs */}
            <div>
              <label className="text-sm font-medium">Vendor Name *</label>
              <select className="w-full rounded-md border p-2" value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)} required>
                <option value="">Select Vendor</option>
                <option value="Snigdha">Snigdha</option>
                <option value="Sid">Sid</option>
                <option value="Kalyani">Kalyani</option>
                <option value="Tukaram">Tukaram</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Invoice Date *</label>
              <input type="date" className="w-full rounded-md border p-2" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Invoice Number *</label>
              <input type="text" className="w-full rounded-md border p-2" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">State *</label>
              <select className="w-full rounded-md border p-2" value={selectedState} onChange={(e) => setSelectedState(e.target.value)} required>
                <option value="">Select State</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Table */}
          <h2 className="text-lg font-semibold mb-4">Manage Items</h2>
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item Name</th>
                <th className="p-2 text-left">YearOfMake</th>
                <th className="p-2 text-left">EstimateCost</th>
                <th className="p-2 text-left">Remark</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">
                    <input type="text" className="w-full border rounded p-1" value={item.itemName} onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)} required />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full border rounded p-1" value={item.yearOfMake} onChange={(e) => handleItemChange(item.id, 'yearOfMake', e.target.value)} required />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full border rounded p-1" value={item.estimateCost} onChange={(e) => handleItemChange(item.id, 'estimateCost', e.target.value)} required />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full border rounded p-1" value={item.remark} onChange={(e) => handleItemChange(item.id, 'remark', e.target.value)} />
                  </td>
                  <td className="p-2 text-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => deleteRow(item.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addNewRow} className="mt-3 text-blue-600 hover:text-blue-800">+ Add Row</button>

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Add Order</button>
          </div>
        </form>
      </div>
    </div>
  );
};
