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
  const [farmerTasks, setFarmerTasks] = useState<ListTask[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'farmers'>('tasks');

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

  const handleEdit = (id: number) => {
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
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      {/* Only show user selector for manager and farmer roles */}
      {(currentUser.role === 'manager' || currentUser.role === 'farmer') && (
        <div className="mb-4 flex items-center space-x-4">
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Current User:</span>
          <select
            value={currentUser.value}
            onChange={e => {
              const user = USERS.find(u => u.value === e.target.value)!;
              setCurrentUser(user);
            }}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            {USERS.map(u => (
              <option key={u.value} value={u.value}>{u.label} ({u.value})</option>
            ))}
          </select>
        </div>
      )}
      <div className="bg-white rounded shadow-md p-4 max-w-7xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">
            {currentUser.label} Task Management
          </h2>
          <div className="flex items-center space-x-4">
            <button onClick={handleDownload} className="text-green-600 hover:text-green-800 flex items-center">
              <Download className="w-5 h-5 mr-1" /> Download
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tasks, officers, or farmers..."
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
                <th className="px-4 py-2">Task Name</th>
                <th className="px-4 py-2">Assigned To</th>
                <th className="px-4 py-2">Farmer</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">No tasks found</td>
                </tr>
              ) : (
                paginatedData.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{task.taskName || task.itemName}</td>
                    <td className="px-4 py-2">{task.assigned || task.fieldOfficer || task.assignedBy || '-'}</td>
                    <td className="px-4 py-2">{task.farmerName || 'N/A'}</td>
                    <td className="px-4 py-2">{task.date || task.selectedDate}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {formatTime(task.assignedTime)}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2 space-x-3">
                      <div className="flex items-center space-x-2">
                        <select
                          value={task.status || 'Pending'}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as 'Pending' | 'Completed' | 'InProcess')}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="Pending">Pending</option>
                          <option value="InProcess">In Process</option>
                          <option value="Completed">Completed</option>
                        </select>
                      <button
                        onClick={() => handleEdit(task.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-600 hover:text-red-800"
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
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <p>
            Showing {paginatedData.length} of {filtered.length} entries
          </p>
          <div className="space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
