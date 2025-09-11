import React, { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import ViewList from './ViewList';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const USERS = [
  { label: 'Manager', value: 'manger@124', role: 'manager' },
  { label: 'Field Officer', value: 'filed@crops', role: 'fieldofficer' },
  { label: 'Farmer', value: 'AjayDhale', role: 'farmer' },
];

// Add this constant for available farmers
const FARMERS = [
  { label: 'AjayDhale', value: 'AjayDhale' },
  // Add more farmers here if needed
];

interface Task {
  id?: string;
  assignedBy?: string;
  fieldOfficer?: string;
  farmerName?: string;
  itemName: string;
  selectedDate: string;
  description: string;
  status: 'InProcess' | 'Completed' | 'Pending' | null;
  assignedTime?: string;
}

// Utility to ensure date is always in YYYY-MM-DD format
function toYMD(date: string | Date): string {
  if (typeof date === 'string') {
    // Try to parse string
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return date; // fallback
  }
  return date.toISOString().split('T')[0];
}

const TaskCalendar: React.FC = () => {
  // User context
  const [currentUser, setCurrentUser] = useState(USERS[1]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newTask, setNewTask] = useState<Omit<Task, 'status' | 'id'> & { assignedTime: string }>({
    selectedDate: '',
    itemName: '',
    description: '',
    assignedTime: '',
    fieldOfficer: '',
    farmerName: FARMERS[0].value, // Default to AjayDhale
    assignedBy: '',
  });

  // Notification state for new tasks
  const [showNewTaskAlert, setShowNewTaskAlert] = useState(false);
  const [prevTaskIds, setPrevTaskIds] = useState<string[]>([]);

  // Fetch tasks for the current user (with polling for field officer)
  useEffect(() => {
    let endpoint = '';
    if (currentUser.role === 'manager') {
      setTasks([]);
      return;
    } else if (currentUser.role === 'fieldofficer') {
      endpoint = `http://localhost:5000/fieldofficertasks?fieldOfficer=${currentUser.value}`;
    } else if (currentUser.role === 'farmer') {
      endpoint = `http://localhost:5000/farmartasks?farmerName=${currentUser.value}`;
    }
    let interval: NodeJS.Timeout;
    const fetchTasks = () => {
      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => {
          setTasks(data);
          console.log("All tasks for field officer:", data); // Debug log
          if (currentUser.role === 'fieldofficer') {
            const newIds = data.map((t: any) => String(t.id));
            // Show alert if there are new tasks
            if (prevTaskIds.length > 0 && newIds.some(id => !prevTaskIds.includes(id))) {
              setShowNewTaskAlert(true);
              setTimeout(() => setShowNewTaskAlert(false), 4000);
            }
            setPrevTaskIds(newIds);
          }
        })
        .catch((err) => setTasks([]));
    };
    fetchTasks();
    if (currentUser.role === 'fieldofficer') {
      interval = setInterval(fetchTasks, 10000); // Poll every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUser]);

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  // Assignment logic
  // Ensure the assign task modal for field officers includes a farmer dropdown (default AjayDhale)
  const handleAssignTask = () => {
    const currentTime = new Date().toISOString();
    let endpoint = '';
    let taskToAdd: any = {};
    if (currentUser.role === 'manager') {
      endpoint = 'http://localhost:5000/fieldofficertasks';
      taskToAdd = {
        assignedBy: currentUser.value,
        fieldOfficer: 'filed@crops',
        itemName: newTask.itemName,
        selectedDate: toYMD(newTask.selectedDate),
        description: newTask.description,
        status: 'Pending',
        assignedTime: newTask.assignedTime || currentTime,
      };
    } else if (currentUser.role === 'fieldofficer') {
      endpoint = 'http://localhost:5000/farmartasks';
      taskToAdd = {
        assignedByFieldOfficer: currentUser.value,
        farmerName: newTask.farmerName, // Use selected farmer
        itemName: newTask.itemName,
        selectedDate: toYMD(newTask.selectedDate),
        description: newTask.description,
        status: 'Pending',
        assignedTime: newTask.assignedTime || currentTime,
      };
    } else {
      // Farmer cannot assign
      return;
    }
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskToAdd),
    })
      .then((res) => res.json())
      .then((createdTask) => {
        alert('Task assigned!');
        setShowModal(false);
        setNewTask({ selectedDate: '', itemName: '', description: '', assignedTime: '', fieldOfficer: '', farmerName: '', assignedBy: '' });
        // If manager assigned, update field officer's calendar state
        if (currentUser.role === 'manager') {
          // Simulate switching to field officer and updating their calendar
          // (in real app, this would be handled by the field officer's login/session)
          // Here, just do nothing since manager calendar should not show the task
        } else if (currentUser.role === 'fieldofficer') {
          setTasks(prev => [...prev, createdTask]);
        }
      })
      .catch((err) => {
        alert('Error assigning task');
      });
  };

  const getTasksForDate = (date: Date): Task[] => {
    const formatted = format(date, 'yyyy-MM-dd');
    return tasks.filter((task) => task.selectedDate === formatted);
  };

  const handleStatusChange = (taskId: string | undefined, status: 'InProcess' | 'Completed' | 'Pending') => {
    if (!taskId) return;
    let endpoint = '';
    if (currentUser.role === 'fieldofficer') {
      endpoint = `http://localhost:5000/fieldofficertasks/${taskId}`;
    } else if (currentUser.role === 'farmer') {
      endpoint = `http://localhost:5000/farmartasks/${taskId}`;
    } else {
      return;
    }
    fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then((updatedTask) => {
        setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      });
  };

  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(timeString), 'HH:mm');
    } catch {
      return 'N/A';
    }
  };

  // Modal for assigning a task
  const AssignTaskModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Assign Task</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Task Name</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={newTask.itemName}
            onChange={e => setNewTask({ ...newTask, itemName: e.target.value })}
            placeholder="Enter task name"
          />
        </div>
        {currentUser.role === 'fieldofficer' && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Farmer</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={newTask.farmerName}
              onChange={e => setNewTask({ ...newTask, farmerName: e.target.value })}
            >
              {FARMERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Enter task description"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={newTask.selectedDate}
            onChange={e => setNewTask({ ...newTask, selectedDate: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={() => setShowModal(false)}
          >Cancel</button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleAssignTask}
          >Assign</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
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

      <div className="w-full p-4 bg-white rounded-lg shadow-md">
        {showModal && <AssignTaskModal />}
        {showNewTaskAlert && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded shadow text-center font-semibold">
            New task assigned to you!
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {currentUser.role === 'farmer' ? `${currentUser.value} Calendar` : `${currentUser.label} Calendar`}
          </h2>
          <div className="flex items-center space-x-4">
            {/* Month Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium text-gray-700 min-w-[120px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {/* Only show assign button for manager and field officer */}
            {(currentUser.role === 'manager' || currentUser.role === 'fieldofficer') && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Assign Task
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayTasks = getTasksForDate(day);
            return (
              <div
                key={day.toString()}
                className={`h-40 p-2 border rounded-lg overflow-y-auto transition-colors
                ${isToday(day) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}
                ${!isSameMonth(day, new Date()) ? 'text-gray-400' : 'text-gray-700'}`}
              >
                <div className="text-right font-semibold">{format(day, 'd')}</div>
                {dayTasks.length === 0 ? (
                  <div className="mt-4 text-xs text-gray-400 text-center">No tasks</div>
                ) : (
                  dayTasks.map((task: Task, idx: number) => (
                    <div key={idx} className="mt-2 p-1 text-xs bg-gray-100 rounded">
                      <div><strong>{task.itemName}</strong></div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Show ViewList for farmer (AjayDhale) below the calendar */}
      {currentUser.role === 'farmer' && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{currentUser.value} Task List</h2>
          <ViewList />
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;