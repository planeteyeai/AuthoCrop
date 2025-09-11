import React, { useState } from 'react';
import { Download, Edit, Search, Trash2 } from 'lucide-react';

const ITEMS_PER_PAGE = 5;

interface Farmer {
  id: number;
  FarmerName: string;
  PhoneNumber: number;
  Area: string;
  PlantationType: string;
  VarietyType: string;
}
interface FarmlistProps {
  users: Farmer[];
  setUsers: React.Dispatch<React.SetStateAction<Farmer[]>>;
}

export const FarmList: React.FC<FarmlistProps> = ({ users, setUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleEdit = (id: number) => {
    console.log('Edit farm:', id);
  };

  const handleDelete = (id: number) => {
    setUsers(users.filter((user) => user.id !== id));
  };

  const handleDownload = () => {
    const csv = [
      ['FarmerName', 'PhoneNumber', 'Area', 'PlantationType', 'VarietyType'],
      ...users.map(({ FarmerName, PhoneNumber, Area, PlantationType, VarietyType }) => [
        FarmerName,
        PhoneNumber,
        Area,
        PlantationType,
        VarietyType
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Farmlist.csv';
    a.click();
  };

  const filtered = users.filter(
    (user) =>
      user.FarmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.PhoneNumber.toString().includes(searchTerm) ||
      user.Area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.PlantationType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.VarietyType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded shadow-md p-4 max-w-7xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">Farmlist</h2>

          <div className="flex items-center space-x-4">
            <button onClick={handleDownload} className="text-green-600 hover:text-green-800 flex items-center">
              <Download className="w-5 h-5 mr-1" /> Download
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-2">FarmerName</th>
                <th className="px-4 py-2">PhoneNumber</th>
                <th className="px-4 py-2">Area</th>
                <th className="px-4 py-2">PlantationType</th>
                <th className="px-4 py-2">VarietyType</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">No records found</td>
                </tr>
              ) : (
                paginatedData.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-2">{user.FarmerName}</td>
                    <td className="px-4 py-2">{user.PhoneNumber}</td>
                    <td className="px-4 py-2">{user.Area}</td>
                    <td className="px-4 py-2">{user.PlantationType}</td>
                    <td className="px-4 py-2">{user.VarietyType}</td>
                    <td className="px-4 py-2 space-x-3">
                      <button onClick={() => handleEdit(user.id)} className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <p>
            Showing {paginatedData.length} of {filtered.length} entries
          </p>
          <div className="space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
