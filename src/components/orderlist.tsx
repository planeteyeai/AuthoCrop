import React, { useState, useEffect } from 'react';
import { Download, Edit, Search, Trash2, Check, X, Satellite } from 'lucide-react';
import { debounce } from 'lodash';

const ITEMS_PER_PAGE = 5;

interface User {
  id: number;
  vendorName: string;
  invoiceDate: string;
  invoiceNumber: string;
  state: string;
  itemName: string;
  yearMake: string;
  estimateCost: string;
  remark: string;
}

interface OrderListProps {
  items: User[];
  setItems: React.Dispatch<React.SetStateAction<User[]>>;
}

export const OrderList: React.FC<OrderListProps> = ({ items, setItems }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editId, setEditId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [loading] = useState(false);

  const handleEditClick = (user: User) => {
    setEditId(user.id);
    setEditFormData({ ...user });
  };

  const handleCancelClick = () => {
    setEditId(null);
    setEditFormData({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveClick = () => {
    if (editId === null) return;

    // Validate if needed here
    if (!editFormData.vendorName || !editFormData.invoiceDate) {
      alert('Vendor Name and Invoice Date are required!');
      return;
    }

    const newItems = items.map((item) =>
      item.id === editId ? { ...item, ...editFormData } : item
    );

    setItems(newItems);
    setEditId(null);
    setEditFormData({});
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleDownload = () => {
    const header = ['vendorName', 'invoiceNumber', 'invoiceDate', 'estimateCost', 'yearMake', 'state', 'itemName', 'remark'];
    const csvRows = [
      header.join(','),
      ...items.map(({ vendorName, invoiceNumber, invoiceDate, estimateCost, yearMake, state, itemName, remark }) =>
        [vendorName, invoiceNumber, invoiceDate, estimateCost, yearMake, state, itemName, remark].map(val =>
          `"${val.replace(/"/g, '""')}"`
        ).join(',')
      ),
    ];
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'order-list.csv';
    a.click();
  };

  // Debounced search
  const debouncedSearch = debounce((term: string) => setSearchTerm(term), 500);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const filtered = items.filter((item) =>
    (item.invoiceDate && item.invoiceDate.includes(searchTerm)) ||
    (item.vendorName && item.vendorName.includes(searchTerm)) ||
    (item.invoiceNumber && item.invoiceNumber.includes(searchTerm))
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded shadow-md p-4 max-w-7xl mx-auto mt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className="text-xl font-bold text-gray-700">Order List</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={handleDownload} 
              className="text-green-600 hover:text-green-800 flex items-center justify-center py-2 px-4 border border-green-600 rounded hover:bg-green-50"
            >
              <Download className="w-5 h-5 mr-1" /> Download
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search orders..."
                onChange={handleSearchChange}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-600 flex items-center justify-center">
            <Satellite className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        )}

        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-2">VendorName</th>
                <th className="px-4 py-2">Itemname</th>
                <th className="px-4 py-2">InvoiceDate</th>
                <th className="px-4 py-2">InvoiceNumber</th>
                <th className="px-4 py-2">Estimatecost</th>
                <th className="px-4 py-2">Yearofmake</th>
                <th className="px-4 py-2">State</th>
                <th className="px-4 py-2">Remark</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4">No order found</td>
                </tr>
              ) : (
                paginatedData.map((user) => (
                  <tr key={user.id} className="border-b">
                    {editId === user.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="vendorName"
                            value={editFormData.vendorName || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="itemName"
                            value={editFormData.itemName || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            name="invoiceDate"
                            value={editFormData.invoiceDate || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="invoiceNumber"
                            value={editFormData.invoiceNumber || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="estimateCost"
                            value={editFormData.estimateCost || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="yearMake"
                            value={editFormData.yearMake || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="state"
                            value={editFormData.state || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="remark"
                            value={editFormData.remark || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="px-4 py-2 space-x-2">
                          <button onClick={handleSaveClick} className="text-green-600 hover:text-green-800" title="Save">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={handleCancelClick} className="text-gray-600 hover:text-gray-800" title="Cancel">
                            <X className="w-5 h-5" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2">{user.vendorName}</td>
                        <td className="px-4 py-2">{user.itemName}</td>
                        <td className="px-4 py-2">{user.invoiceDate}</td>
                        <td className="px-4 py-2">{user.invoiceNumber}</td>
                        <td className="px-4 py-2">{user.estimateCost}</td>
                        <td className="px-4 py-2">{user.yearMake}</td>
                        <td className="px-4 py-2">{user.state}</td>
                        <td className="px-4 py-2">{user.remark}</td>
                        <td className="px-4 py-2 space-x-2">
                          <button onClick={() => handleEditClick(user)} className="text-blue-600 hover:text-blue-800" title="Edit">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800" title="Delete">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible only on mobile */}
        <div className="md:hidden space-y-4">
          {paginatedData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No orders found</div>
          ) : (
            paginatedData.map((user) => (
              <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                {editId === user.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                      <input
                        type="text"
                        name="vendorName"
                        value={editFormData.vendorName || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        name="itemName"
                        value={editFormData.itemName || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        name="invoiceDate"
                        value={editFormData.invoiceDate || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                      <input
                        type="text"
                        name="invoiceNumber"
                        value={editFormData.invoiceNumber || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Cost</label>
                      <input
                        type="text"
                        name="estimateCost"
                        value={editFormData.estimateCost || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year of Make</label>
                      <input
                        type="text"
                        name="yearMake"
                        value={editFormData.yearMake || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={editFormData.state || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                      <input
                        type="text"
                        name="remark"
                        value={editFormData.remark || ''}
                        onChange={handleInputChange}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button onClick={handleSaveClick} className="text-green-600 hover:text-green-800 px-3 py-1 rounded border">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={handleCancelClick} className="text-gray-600 hover:text-gray-800 px-3 py-1 rounded border">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-900 text-sm flex-1 pr-2">{user.vendorName}</h3>
                      <span className="text-xs text-gray-500">{user.invoiceDate}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="font-medium w-20">Item:</span>
                        <span>{user.itemName}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Invoice:</span>
                        <span>{user.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Cost:</span>
                        <span>{user.estimateCost}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Year:</span>
                        <span>{user.yearMake}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">State:</span>
                        <span>{user.state}</span>
                      </div>
                      {user.remark && (
                        <div className="flex items-start">
                          <span className="font-medium w-20">Remark:</span>
                          <span className="flex-1">{user.remark}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                      <button onClick={() => handleEditClick(user)} className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800 px-3 py-1 rounded border">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-3 sm:space-y-0">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm order-1 sm:order-none"
          >
            Previous
          </button>

          <div className="order-2 sm:order-none">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} | Showing {paginatedData.length} of {filtered.length} items
            </span>
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm order-3 sm:order-none"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
