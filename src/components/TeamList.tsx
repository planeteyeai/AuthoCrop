import React, { useState } from 'react';
import { Download, Edit, Search, Trash2, Eye, EyeOff, Users, Menu } from 'lucide-react';
import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts';

const TeamList = () => {
  // Sample data for demonstration
  const [users, setUsers] = useState([
    {
      id: 1,
      username: "john_doe",
      phoneNumber: "+1234567890",
      email: "john@example.com",
      role: "Field Officer",
      password: "password123"
    },
    {
      id: 2,
      username: "jane_smith",
      phoneNumber: "+1234567891",
      email: "jane@example.com",
      role: "Owner",
      password: "secure456"
    },
    {
      id: 3,
      username: "bob_farmer",
      phoneNumber: "+1234567892",
      email: "bob@example.com",
      role: "Farmer",
      password: "farm789"
    },
    {
      id: 4,
      username: "alice_field",
      phoneNumber: "+1234567893",
      email: "alice@example.com",
      role: "Field Officer",
      password: "field321"
    },
    {
      id: 5,
      username: "charlie_owner",
      phoneNumber: "+1234567894",
      email: "charlie@example.com",
      role: "Owner",
      password: "owner654"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('Field Officer');
  const [showPassword, setShowPassword] = useState({});

  const roles = ['Field Officer', 'Owner', 'Farmer'];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleEdit = (id) => {
    console.log('Edit member:', id);
  };

  const handleDownload = (id) => {
    console.log('Download member data:', id);
  };

  const handleDelete = (id) => {
    setUsers(users.filter(member => member.id !== id));
  };

  const togglePassword = (id) => {
    setShowPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const roleStats = roles.map((role) => {
    const count = users.filter(member => member.role === role).length;
    return { name: role, value: count };
  });

  const filteredData = users.filter(
    member => member.role === selectedRole &&
    (member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
    

      <div className="p-4 space-y-6">
        {/* Statistics */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="text-blue-600 h-5 w-5" />
              <h2 className="text-lg font-semibold text-gray-800">Team Statistics</h2>
            </div>
            <p className="text-sm text-gray-600">
              Total Members: <span className="font-semibold">{users.length}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius="80%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="space-y-3">
              {roleStats.map((role, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <span
                      className="inline-block w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700">{role.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{role.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Connect */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-800 mb-4">Team Connect</h1>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search members..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            
            {/* Role Filters */}
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedRole === role
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile-first Card Layout */}
          <div className="p-4">
            <div className="block lg:hidden space-y-4">
              {filteredData.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{member.username}</h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {member.role}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(member.id)} className="text-blue-600">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDownload(member.id)} className="text-green-600">
                          <Download className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(member.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><span className="font-medium">Phone:</span> {member.phoneNumber}</div>
                      <div><span className="font-medium">Email:</span> {member.email}</div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Password:</span>
                        <span>{showPassword[member.id] ? member.password : '••••••••'}</span>
                        <button onClick={() => togglePassword(member.id)} className="text-gray-500">
                          {showPassword[member.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Username', 'Phone Number', 'Email', 'Role', 'Password', 'Actions'].map((header, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{member.username}</td>
                        <td className="px-6 py-4 text-sm">{member.phoneNumber}</td>
                        <td className="px-6 py-4 text-sm">{member.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{showPassword[member.id] ? member.password : '••••••••'}</span>
                            <button onClick={() => togglePassword(member.id)} className="text-gray-500">
                              {showPassword[member.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex space-x-3">
                            <button onClick={() => handleEdit(member.id)} className="text-blue-600">
                              <Edit className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleDownload(member.id)} className="text-green-600">
                              <Download className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleDelete(member.id)} className="text-red-600">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No members found for the selected role and search criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamList;


