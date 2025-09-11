
import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { addVendor } from '../api'; // adjust path if necessary

interface AddVendorProps {
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  users: any[];
}

interface AddVendorForm {
  vendorName: string;
  email: string;
  mobile: string;
  gstin: string;
  state: string;
  city: string;
  address: string;
}

export const Addvendor: React.FC<AddVendorProps> = ({ users, setUsers }) => {
  const [formData, setFormData] = useState<AddVendorForm>({
    vendorName: '',
    email: '',
    mobile: '',
    gstin: '',
    state: '',
    city: '',
    address: ''
  });

  const indianStates: string[] = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal'
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      vendor_name: formData.vendorName,
      email: formData.email,
      mobile: formData.mobile,
      gstin: formData.gstin,
      state: formData.state,
      city: formData.city,
      address: formData.address,
    };

    try {
      const response = await addVendor(payload);
      console.log('Vendor added:', response.data);
      setUsers([...users, response.data]);
    } catch (error) {
      console.error('Error adding vendor:', error);
    }

    setFormData({
      vendorName: '',
      email: '',
      mobile: '',
      gstin: '',
      state: '',
      city: '',
      address: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="bg-cover bg-center h-48"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80")'
        }}
      >
        <div className="w-full h-full bg-black bg-opacity-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center h-full">
            <div className="flex items-center space-x-4">
              <Store className="h-12 w-12 text-white" />
              <h1 className="text-4xl font-bold text-white">VendorHub</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {[
                { label: 'Vendor Name', name: 'vendorName' },
                { label: 'Email ID', name: 'email', type: 'email' },
                { label: 'Mobile Number', name: 'mobile', type: 'tel', pattern: '[0-9]{10}' },
                { label: 'GSTIN Number', name: 'gstin' }
              ].map(({ label, name, type = 'text', pattern }) => (
                <div key={name}>
                  <label htmlFor={name} className="block text-base font-medium text-gray-700 mb-2">
                    {label}
                  </label>
                  <input
                    type={type}
                    name={name}
                    id={name}
                    required
                    pattern={pattern}
                    value={formData[name as keyof AddVendorForm]}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              ))}

              <div>
                <label htmlFor="state" className="block text-base font-medium text-gray-700 mb-2">State</label>
                <select
                  name="state"
                  id="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Select State</option>
                  {indianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="city" className="block text-base font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  id="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-base font-medium text-gray-700 mb-2">Address</label>
              <textarea
                name="address"
                id="address"
                rows={4}
                required
                value={formData.address}
                onChange={handleChange}
                className="block w-full px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 text-base font-medium text-white bg-green-500 border border-transparent rounded-lg shadow-sm hover:bg-green-600"
              >
                Add Vendor
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
