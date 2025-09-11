import React, { useState } from 'react';
import { Download, Edit, Search, Trash2, Save, X, Phone, Mail, MapPin, Building } from 'lucide-react';

const ITEMS_PER_PAGE = 5;

interface User {
  id: number;
  vendorName: string;
  email: string;
  mobile: string;
  gstin: string;
  state: string;
  city: string;
  address: string;
}

interface VendorListProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export const VendorList: React.FC<VendorListProps> = ({ users, setUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});

  const handleEdit = (id: number) => {
    const user = users.find((u) => u.id === id);
    setEditingId(id);
    setEditedUser(user || {});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedUser({});
  };

  const handleSave = (id: number) => {
    setUsers(users.map((user) => (user.id === id ? { ...user, ...editedUser } : user)));
    setEditingId(null);
    setEditedUser({});
  };

  const handleDelete = (id: number) => {
    setUsers(users.filter((user) => user.id !== id));
  };

  const handleDownload = () => {
    const csv = [
      ['Vendor Name', 'Mobile Number', 'Email', 'GSTIN Number', 'State', 'City', 'Address'],
      ...users.map(({ vendorName, mobile, email, gstin, state, city, address }) => [
        vendorName, mobile, email, gstin, state, city, address,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vendor-list.csv';
    a.click();
  };

  const filtered = users.filter(
    (user) =>
      user.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mobile.includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const EditableField = ({ value, field, placeholder }: { value: string; field: keyof User; placeholder: string }) => (
    <input
      className="border rounded px-2 py-1 w-full text-sm"
      value={editedUser[field] || ''}
      onChange={(e) => setEditedUser({ ...editedUser, [field]: e.target.value })}
      placeholder={placeholder}
    />
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded shadow-md p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className="text-xl font-bold text-gray-700">Vendor List</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleDownload}
              className="text-green-600 hover:text-green-800 flex items-center justify-center py-2 px-4 border border-green-600 rounded hover:bg-green-50"
            >
              <Download className="w-5 h-5 mr-1" />
              Download
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          </div>
        </div>

        {/* Mobile & Desktop layouts remain unchanged ... */}
        {/* (Keep your card layout + table layout + pagination code here as is) */}
      </div>
    </div>
  );
};

export default VendorList;
