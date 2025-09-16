import React, { useEffect, useState } from 'react';
import { Download, Edit, Search, Trash2, Users, List, Clock, Calendar, User } from 'lucide-react';

const USERS = [
  { label: 'Manager', value: 'manger@124', role: 'manager' },
  { label: 'Field Officer', value: 'filed@crops', role: 'fieldofficer' },
  { label: 'Farmer', value: 'AjayDhale', role: 'farmer' },
];

const ITEMS_PER_PAGE = 5;

interface ListTask {
  id: number;
  taskName?: string;
  itemName?: string;
  assigned: string;
  date?: string;
  selectedDate?: string;
  farmerName?: string;
  status?: 'Pending' | 'Completed' | 'InProcess';
  assignedTime?: string;
  fieldOfficer?: string;
  assignedBy?: string;
  submittedBy?: string;
  submittedAt?: string;
}

export const Tasklist: React.FC = () => {
  // Default to field officer if only that role should see this page
  const [currentUser, setCurrentUser] = useState(USERS[1]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState<ListTask[]>([]);

  // Fetch tasks for TaskList
  useEffect(() => {
    let endpoint = '';
    if (currentUser.role === 'manager') {
      endpoint = `http://localhost:5000/fieldofficertasks?assignedBy=${currentUser.value}`;
    } else if (currentUser.role === 'fieldofficer') {
      endpoint = `http://localhost:5000/fieldofficertasks?fieldOfficer=${currentUser.value}`;
    } else if (currentUser.role === 'farmer') {
      endpoint = `http://localhost:5000/farmartasks?farmerName=${currentUser.value}`;
    }
    if (endpoint) {
      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => setTasks(data))
        .catch(() => setTasks([]));
    } else {
      setTasks([]);
    }
  }, [currentUser]);

  const handleEdit = (_id: number) => {
    // Optional: edit logic
  };

  const handleDelete = (id: number) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleStatusChange = (taskId: number, newStatus: 'Pending' | 'Completed' | 'InProcess') => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus }
          : task
      )
    );
    let endpoint = '';
    if (currentUser.role === 'manager' || currentUser.role === 'fieldofficer') {
      endpoint = `http://localhost:5000/fieldofficertasks/${taskId}`;
    } else if (currentUser.role === 'farmer') {
      endpoint = `http://localhost:5000/farmartasks/${taskId}`;
    }
    if (endpoint) {
      fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => {});
    }
  };

  const handleDownload = () => {
    const csv = [
      ['Task Name', 'Assigned To', 'Farmer', 'Date', 'Status', 'Time'],
      ...tasks.map(({ taskName, assigned, farmerName, date, status, assignedTime }) => [
        taskName || '',
        assigned,
        farmerName || 'N/A',
        date || '',
        status || 'Pending',
        assignedTime || 'N/A',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentUser.value}-task-list.csv`;
    a.click();
  };

  const filtered = tasks.filter(
    (task) =>
      (task.taskName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.assigned?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.farmerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.date || '').includes(searchTerm)
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusColor = (status?: 'Pending' | 'Completed' | 'InProcess') => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'InProcess':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-gray-100 min-h-screen">
      {/* Only show user selector for manager and farmer roles */}
      {(currentUser.role === 'manager' || currentUser.role === 'farmer') && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Current User:</span>
          </div>
          <select
            value={currentUser.value}
            onChange={e => {
              const user = USERS.find(u => u.value === e.target.value)!;
              setCurrentUser(user);
            }}
            className="px-3 py-2 border border-gray-300 rounded text-sm w-full sm:w-auto"
          >
            {USERS.map(u => (
              <option key={u.value} value={u.value}>{u.label} ({u.value})</option>
            ))}
          </select>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header Section - Responsive */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-700">
            {currentUser.label} Task Management
          </h2>
          
          {/* Actions Section - Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Search Bar */}
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Download Button */}
            <button 
              onClick={handleDownload} 
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Task Name</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Farmer</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center">
                      <List className="w-12 h-12 text-gray-300 mb-2" />
                      <p>No tasks found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{task.taskName || task.itemName}</td>
                    <td className="px-4 py-3">{task.assigned || task.fieldOfficer || task.assignedBy || '-'}</td>
                    <td className="px-4 py-3">{task.farmerName || 'N/A'}</td>
                    <td className="px-4 py-3">{task.date || task.selectedDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {formatTime(task.assignedTime)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <select
                          value={task.status || 'Pending'}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as 'Pending' | 'Completed' | 'InProcess')}
                          className="text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Pending">Pending</option>
                          <option value="InProcess">In Process</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <button
                          onClick={() => handleEdit(task.id)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Edit task"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {paginatedData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="flex flex-col items-center">
                <List className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            </div>
          ) : (
            paginatedData.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                {/* Task Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight">
                    {task.taskName || task.itemName}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status || 'Pending'}
                  </span>
                </div>

                {/* Task Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">Assigned To:</span>
                    <span className="ml-1">{task.assigned || task.fieldOfficer || task.assignedBy || '-'}</span>
                  </div>
                  
                  {task.farmerName && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Farmer:</span>
                      <span className="ml-1">{task.farmerName}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">Date:</span>
                    <span className="ml-1">{task.date || task.selectedDate}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">Time:</span>
                    <span className="ml-1">{formatTime(task.assignedTime)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={task.status || 'Pending'}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as 'Pending' | 'Completed' | 'InProcess')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Pending">Pending</option>
                    <option value="InProcess">In Process</option>
                    <option value="Completed">Completed</option>
                  </select>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(task.id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Edit task"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Pagination - Responsive */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <p className="text-sm text-gray-600 order-2 sm:order-1">
            Showing {paginatedData.length} of {filtered.length} entries
          </p>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-2 order-1 sm:order-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
