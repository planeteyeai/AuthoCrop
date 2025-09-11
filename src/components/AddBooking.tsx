import React, { useState } from 'react';
import { CalendarCheck2 } from 'lucide-react';

interface AddBookingProps {
  bookings: any[];
  setBookings: React.Dispatch<React.SetStateAction<any[]>>;
}

const AddBooking: React.FC<AddBookingProps> = ({ bookings, setBookings }) => {
  const [formData, setFormData] = useState({
    itemName: '',
    userRole: '',
    startDate: '',
    endDate: '',
    status: 'Available',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/bookinglist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setBookings([...bookings, { ...formData, id: data.id || Date.now() }]);
      alert('Booking added successfully!');
      setFormData({
        itemName: '',
        userRole: '',
        startDate: '',
        endDate: '',
        status: 'Available',
      });
    } catch (error) {
      console.error('Error posting booking:', error);
      alert('Failed to add booking.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="bg-cover bg-center h-48"
        style={{
          backgroundImage:
            'url("https://www.istockphoto.com/photo/teenager-studying-at-desk-and-doing-homeworks-and-using-laptop-gm1085592002-291286387")'
        }}
      >
        <div className="w-full h-full bg-black bg-opacity-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center h-full">
            <div className="flex items-center space-x-4">
              <CalendarCheck2 className="h-12 w-12 text-white" />
              <h1 className="text-4xl font-bold text-white">Add Booking</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <label htmlFor="itemName" className="block text-base font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  id="itemName"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="userRole" className="block text-base font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <select
                  id="userRole"
                  name="userRole"
                  value={formData.userRole}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Select Role</option>
                  <option value="Owner">Owner</option>
                  <option value="Manager">Manager</option>
                  <option value="Field Officer">Field Officer</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Farmer">Farmer</option>
                </select>
              </div>

              <div>
                <label htmlFor="startDate" className="block text-base font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-base font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-base font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="Available">Available</option>
                  <option value="Book">Book</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 text-base font-medium text-white bg-green-500 border border-transparent rounded-lg shadow-sm hover:bg-green-600"
              >
                Add Booking
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddBooking;
