import React, { useState, useEffect } from 'react';
import { Download, Edit, Search, Trash2 } from 'lucide-react';

const ITEMS_PER_PAGE = 5;

interface Stock {
  id: number;
  itemName: string;
  itemType: string;
  make: string;
  yearOfMake: string;
  estimateCost: string;
  status: string;
  remark: string;
}

interface StockListProps {
  stocks: Stock[];
  setStocks: React.Dispatch<React.SetStateAction<Stock[]>>;
}

export const StockList: React.FC<StockListProps> = ({ stocks, setStocks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleEdit = (id: number) => {
    console.log('Edit stock:', id);
  };

  const handleDelete = (id: number) => {
    setStocks(stocks.filter((stock) => stock.id !== id));
  };

  const handleDownload = () => {
    const csv = [
      ['Item Name', 'Item Type', 'Make', 'Year Of Make', 'Estimated Cost', 'Status', 'Remark'],
      ...stocks.map(({ itemName, itemType, make, yearOfMake, estimateCost, status, remark }) => [
        itemName, itemType, make, yearOfMake, estimateCost, status, remark
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stock-list.csv';
    a.click();
  };

  const filtered = stocks.filter(
    (stock) =>
      stock.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.itemType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded shadow-md p-4 max-w-7xl mx-auto mt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className="text-xl font-bold text-gray-700">Stock List</h2>
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
                placeholder="Search stock items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-2">Item Name</th>
                <th className="px-4 py-2">Item Type</th>
                <th className="px-4 py-2">Make</th>
                <th className="px-4 py-2">Year Of Make</th>
                <th className="px-4 py-2">Estimated Cost</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Remark</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">No stock items found</td>
                </tr>
              ) : (
                paginatedData.map((stock) => (
                  <tr key={stock.id} className="border-b">
                    <td className="px-4 py-2">{stock.itemName}</td>
                    <td className="px-4 py-2">{stock.itemType}</td>
                    <td className="px-4 py-2">{stock.make}</td>
                    <td className="px-4 py-2">{stock.yearOfMake}</td>
                    <td className="px-4 py-2">{stock.estimateCost}</td>
                    <td className="px-4 py-2">{stock.status}</td>
                    <td className="px-4 py-2">{stock.remark}</td>
                    <td className="px-4 py-2 space-x-3">
                      <button onClick={() => handleEdit(stock.id)} className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(stock.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible only on mobile */}
        <div className="md:hidden space-y-4">
          {paginatedData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No stock items found</div>
          ) : (
            paginatedData.map((stock) => (
              <div key={stock.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-gray-900 text-sm flex-1 pr-2">{stock.itemName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    stock.status === 'Available' ? 'bg-green-100 text-green-800' :
                    stock.status === 'In Use' ? 'bg-blue-100 text-blue-800' :
                    stock.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {stock.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="font-medium w-20">Type:</span>
                    <span>{stock.itemType}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">Make:</span>
                    <span>{stock.make}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">Year:</span>
                    <span>{stock.yearOfMake}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">Cost:</span>
                    <span>{stock.estimateCost}</span>
                  </div>
                  {stock.remark && (
                    <div className="flex items-start">
                      <span className="font-medium w-20">Remark:</span>
                      <span className="flex-1">{stock.remark}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => handleEdit(stock.id)} className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(stock.id)} className="text-red-600 hover:text-red-800 px-3 py-1 rounded border">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 space-y-3 sm:space-y-0">
          <p className="order-2 sm:order-1">
            Showing {paginatedData.length} of {filtered.length} entries
          </p>
          <div className="flex space-x-2 order-1 sm:order-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-2 bg-gray-100 rounded text-sm">
              {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
