import React, { useState, useEffect } from 'react';
import { Download, Edit, Save, Search, Trash2 } from 'lucide-react';

const ITEMS_PER_PAGE = 5;

interface Booking {
  id: number;
  itemName: string;
  userRole: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface BookingListProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
}

export const BookingList: React.FC<BookingListProps> = ({ bookings, setBookings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedBooking, setEditedBooking] = useState<Booking | null>(null);

  const handleEdit = (id: number) => {
    const booking = bookings.find((b) => b.id === id);
    if (booking) {
      setEditingId(id);
      setEditedBooking({ ...booking });
    }
  };

  const handleSave = () => {
    if (editedBooking) {
      const updatedBookings = bookings.map((b) =>
        b.id === editedBooking.id ? editedBooking : b
      );
      setBookings(updatedBookings);
      setEditingId(null);
      setEditedBooking(null);
    }
  };

  const handleDelete = (id: number) => {
    setBookings(bookings.filter((booking) => booking.id !== id));
  };

  const handleDownload = () => {
    const csv = [
      ['Item Name', 'User Role', 'Start Date', 'End Date', 'Status'],
      ...bookings.map(({ itemName, userRole, startDate, endDate, status }) => [
        itemName,
        userRole,
        startDate,
        endDate,
        status,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'booking-list.csv';
    a.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Booking) => {
    if (editedBooking) {
      setEditedBooking({ ...editedBooking, [field]: e.target.value });
    }
  };

  const filtered = bookings.filter(
    (b) =>
      b.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.userRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded shadow-md p-4 max-w-7xl mx-auto mt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className="text-xl font-bold text-gray-700">Booking List</h2>
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
                placeholder="Search bookings..."
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
                <th className="px-4 py-2">User Role</th>
                <th className="px-4 py-2">Start Date</th>
                <th className="px-4 py-2">End Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">No bookings found</td>
                </tr>
              ) : (
                paginatedData.map((booking) => (
                  <tr key={booking.id} className="border-b">
                    {editingId === booking.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editedBooking?.itemName}
                            onChange={(e) => handleChange(e, 'itemName')}
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editedBooking?.userRole}
                            onChange={(e) => handleChange(e, 'userRole')}
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={editedBooking?.startDate}
                            onChange={(e) => handleChange(e, 'startDate')}
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={editedBooking?.endDate}
                            onChange={(e) => handleChange(e, 'endDate')}
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editedBooking?.status}
                            onChange={(e) => handleChange(e, 'status')}
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2 space-x-3">
                          <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                            <Save className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2">{booking.itemName}</td>
                        <td className="px-4 py-2">{booking.userRole}</td>
                        <td className="px-4 py-2">{booking.startDate}</td>
                        <td className="px-4 py-2">{booking.endDate}</td>
                        <td className="px-4 py-2">{booking.status}</td>
                        <td className="px-4 py-2 space-x-3">
                          <button onClick={() => handleEdit(booking.id)} className="text-blue-600 hover:text-blue-800">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(booking.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
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
            <div className="text-center py-8 text-gray-500">No bookings found</div>
          ) : (
            paginatedData.map((booking) => (
              <div key={booking.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                {editingId === booking.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={editedBooking?.itemName}
                        onChange={(e) => handleChange(e, 'itemName')}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
                      <input
                        type="text"
                        value={editedBooking?.userRole}
                        onChange={(e) => handleChange(e, 'userRole')}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={editedBooking?.startDate}
                        onChange={(e) => handleChange(e, 'startDate')}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={editedBooking?.endDate}
                        onChange={(e) => handleChange(e, 'endDate')}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <input
                        type="text"
                        value={editedBooking?.status}
                        onChange={(e) => handleChange(e, 'status')}
                        className="border px-3 py-2 rounded w-full text-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button onClick={handleSave} className="text-green-600 hover:text-green-800 px-3 py-1 rounded border">
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-900 text-sm flex-1 pr-2">{booking.itemName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'Active' ? 'bg-green-100 text-green-800' :
                        booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="font-medium w-20">User:</span>
                        <span>{booking.userRole}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">Start:</span>
                        <span>{booking.startDate}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium w-20">End:</span>
                        <span>{booking.endDate}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                      <button onClick={() => handleEdit(booking.id)} className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(booking.id)} className="text-red-600 hover:text-red-800 px-3 py-1 rounded border">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 space-y-3 sm:space-y-0">
          <p className="order-2 sm:order-1">
            Showing {paginatedData.length} of {filtered.length} entries
          </p>
          <div className="flex space-x-2 order-1 sm:order-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-2 bg-gray-100 rounded text-sm">
              {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
