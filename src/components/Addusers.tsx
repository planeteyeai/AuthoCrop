
import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { addUser } from '../api';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  username: string;
  address: string;
}

interface AddusersProps {
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  users: User[];
}

export const Addusers: React.FC<AddusersProps> = ({ setUsers, users }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'admin',
    phone_number: '',
    address: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.password2) {
      setError('Passwords do not match.');
      return;
    }

    const userData = {
      username: formData.username,
      password: formData.password,
      password2: formData.password2,
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      role_id: formData.role === 'admin' ? 4 : 2,
      phone_number: formData.phone_number,
      address: formData.address,
    };

  

    try {
      const response = await addUser(userData);
      const newUser: User = {
        id: users.length + 1, // Ideally should come from backend response
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        role: formData.role,
        username: formData.username,
        address: formData.address,
      };

      setUsers([...users, newUser]);
      setSuccess('User added successfully!');
      setFormData({
        username: '',
        password: '',
        password2: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'admin',
        phone_number: '',
        address: '',
      });

      // Redirect based on role
      if (formData.role === 'admin') {
        navigate('/OwnerHomeGrid');
      } else if (formData.role === 'fieldofficer') {
        navigate('/FieldOfficerHomeGrid');
      }

    } catch (error: any) {
      if (error.response?.data) {
        const apiErrors = error.response.data;
        const errorMessages = Object.entries(apiErrors)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join('\n');
        setError(errorMessages || 'Failed to add user');
      } else if (error.request) {
        setError('No response from server');
      } else {
        setError(error.message);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <UserPlus className="text-green-500 mr-3" size={28} />
        <h2 className="text-2xl font-semibold text-gray-800">Add New User</h2>
      </div>
    

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            ['username', 'Username'],
            ['password', 'Password'],
            ['password2', 'Confirm Password'],
            ['email', 'Email'],
            ['first_name', 'First Name'],
            ['last_name', 'Last Name'],
            ['phone_number', 'Phone Number'],
            ['address', 'Address'],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <input
                type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                value={(formData as any)[field]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                required
              />
            </div>
          ))}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              required
            >
              <option value="admin">Owner</option>
              <option value="fieldofficer">Field Officer</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="bg-gray-400 text-white py-2 px-4 rounded-md hover:bg-gray-500"
            onClick={() =>
              setFormData({
                username: '',
                password: '',
                password2: '',
                email: '',
                first_name: '',
                last_name: '',
                role: 'admin',
                phone_number: '',
                address: '',
              })
            }
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
          >
            Add User
          </button>
        </div>
      </form>

      {error && <div className="text-red-500 mt-4 whitespace-pre-line">{error}</div>}
      {success && <div className="text-green-500 mt-4">{success}</div>}
    </div>
  );
};
