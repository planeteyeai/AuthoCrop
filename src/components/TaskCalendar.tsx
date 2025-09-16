import React, { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
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
  date?: string;
  assigned_date?: string;
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
      // Manager should see tasks they assigned
      endpoint = `http://localhost:8000/api/tasks/manager?assignedBy=${currentUser.value}`;
    } else if (currentUser.role === 'fieldofficer') {
      endpoint = `http://localhost:8000/api/tasks/fieldofficer?fieldOfficer=${currentUser.value}`;
    } else if (currentUser.role === 'farmer') {
      endpoint = `http://localhost:8000/api/tasks/farmer?farmerName=${currentUser.value}`;
    }
    
    let interval: NodeJS.Timeout;
    const fetchTasks = () => {
      console.log('🔄 Fetching tasks from:', endpoint);
      fetch(endpoint)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("📅 Tasks received:", data);
          // Ensure data is an array and has proper date format
          const tasksWithFormattedDates = Array.isArray(data) ? data.map((task: any) => ({
            ...task,
            selectedDate: task.selectedDate || task.date || task.assigned_date || new Date().toISOString().split('T')[0]
          })) : [];
          
          setTasks(tasksWithFormattedDates);
          
          if (currentUser.role === 'fieldofficer') {
            const newIds = tasksWithFormattedDates.map((t: any) => String(t.id));
            // Show alert if there are new tasks
            if (prevTaskIds.length > 0 && newIds.some(id => !prevTaskIds.includes(id))) {
              setShowNewTaskAlert(true);
              setTimeout(() => setShowNewTaskAlert(false), 4000);
            }
            setPrevTaskIds(newIds);
          }
        })
        .catch((err) => {
          console.error('❌ Error fetching tasks:', err);
          // Set some sample tasks for demonstration if API fails
          const sampleTasks: Task[] = [
            {
              id: '1',
              itemName: 'Sample Task 1',
              selectedDate: new Date().toISOString().split('T')[0],
              description: 'This is a sample task',
              status: 'Pending' as const,
              assignedTime: new Date().toISOString()
            },
            {
              id: '2',
              itemName: 'Sample Task 2',
              selectedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
              description: 'Another sample task',
              status: 'InProcess' as const,
              assignedTime: new Date().toISOString()
            }
          ];
          setTasks(sampleTasks);
        });
    };
    
    fetchTasks();
    if (currentUser.role === 'fieldofficer') {
      interval = setInterval(fetchTasks, 10000); // Poll every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUser]);

  // Calculate calendar grid with only current month dates
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  
  // Generate only the days of the current month
  const monthDays = eachDayOfInterval({ start, end });
  
  // Create a dynamic grid that fits the month perfectly
  const days: (Date | null)[] = [];
  
  // Add empty boxes for days before the first day of the month
  const firstDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the current month
  monthDays.forEach(day => days.push(day));
  
  // Calculate how many empty boxes we need after the month to complete the last week
  const totalDaysInGrid = days.length;
  const remainingDaysInLastWeek = 7 - (totalDaysInGrid % 7);
  
  // Only add empty boxes if we need to complete the last week (not a full week)
  if (remainingDaysInLastWeek < 7) {
    for (let i = 0; i < remainingDaysInLastWeek; i++) {
      days.push(null);
    }
  }
  
  // Debug logging for calendar dates
  console.log('📅 Calendar Debug Info:');
  console.log('  Current Date:', currentDate);
  console.log('  Month Start:', start);
  console.log('  Month End:', end);
  console.log('  First Day of Week:', firstDayOfWeek);
  console.log('  Days in Current Month:', monthDays.length);
  console.log('  Total Grid Slots:', days.length);
  console.log('  Empty Boxes Before Month:', firstDayOfWeek);
  console.log('  Empty Boxes After Month:', remainingDaysInLastWeek < 7 ? remainingDaysInLastWeek : 0);
  console.log('  Total Rows:', Math.ceil(days.length / 7));

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
      endpoint = 'http://localhost:8000/api/tasks/fieldofficer';
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
      endpoint = 'http://localhost:8000/api/tasks/farmer';
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
      .catch((error) => {
        console.error('Error assigning task:', error);
        alert('Error assigning task');
      });
  };

  const getTasksForDate = (date: Date): Task[] => {
    const formatted = format(date, 'yyyy-MM-dd');
    console.log(`🔍 Looking for tasks on ${formatted}`);
    const dayTasks = tasks.filter((task) => {
      // Handle different date formats from API
      const taskDate = task.selectedDate || task.date || task.assigned_date;
      if (!taskDate) return false;
      
      // Convert to YYYY-MM-DD format for comparison
      let normalizedTaskDate = '';
      if (typeof taskDate === 'string') {
        // If it's already in YYYY-MM-DD format
        if (taskDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          normalizedTaskDate = taskDate;
        } else {
          // Try to parse and format
          try {
            const parsedDate = new Date(taskDate);
            normalizedTaskDate = format(parsedDate, 'yyyy-MM-dd');
          } catch (e) {
            console.warn('Could not parse task date:', taskDate);
            return false;
          }
        }
      } else if (taskDate && typeof taskDate === 'object' && 'getTime' in taskDate) {
        normalizedTaskDate = format(taskDate as Date, 'yyyy-MM-dd');
      }
      
      const matches = normalizedTaskDate === formatted;
      if (matches) {
        console.log(`✅ Found task: ${task.itemName} on ${formatted}`);
      }
      return matches;
    });
    
    console.log(`📅 Found ${dayTasks.length} tasks for ${formatted}`);
    return dayTasks;
  };

  // TODO: Implement status change functionality when needed
  // const handleStatusChange = (taskId: string | undefined, status: 'InProcess' | 'Completed' | 'Pending') => {
  //   if (!taskId) return;
  //   let endpoint = '';
  //   if (currentUser.role === 'fieldofficer') {
  //     endpoint = `http://localhost:8000/api/tasks/fieldofficer/${taskId}`;
  //   } else if (currentUser.role === 'farmer') {
  //     endpoint = `http://localhost:8000/api/tasks/farmer/${taskId}`;
  //   } else {
  //     return;
  //   }
  //   fetch(endpoint, {
  //     method: 'PATCH',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ status }),
  //   })
  //     .then((res) => res.json())
  //     .then((updatedTask) => {
  //       setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  //     });
  // };

  // TODO: Implement time formatting when needed
  // const formatTime = (timeString: string) => {
  //   try {
  //     return format(parseISO(timeString), 'HH:mm');
  //   } catch {
  //     return 'N/A';
  //   }
  // };

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
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {currentUser.role === 'farmer' ? `${currentUser.value} Calendar` : `${currentUser.label} Calendar`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Today: {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
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
          {days.map((day, index) => {
            // Handle empty boxes (null values)
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="h-40 p-2 border border-gray-200 rounded-lg bg-gray-50"
                >
                  {/* Empty box - no content */}
                </div>
              );
            }
            
            const dayTasks = getTasksForDate(day);
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day.toString()}
                className={`h-40 p-2 border rounded-lg overflow-y-auto transition-colors
                ${isTodayDate ? 'bg-blue-50 border-blue-300 shadow-md' : 'hover:bg-gray-50 bg-white'}`}
              >
                <div className={`text-right font-semibold mb-2
                  ${isTodayDate ? 'text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center ml-auto' : 'text-gray-700'}
                `}>
                  {isTodayDate ? (
                    <span className="text-sm font-bold">{format(day, 'd')}</span>
                  ) : (
                    format(day, 'd')
                  )}
                </div>
                
                {dayTasks.length === 0 ? (
                  <div className="mt-2 text-xs text-gray-400 text-center">
                    {/* No tasks */}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayTasks.map((task: Task, idx: number) => (
                      <div key={idx} className={`p-1 text-xs rounded cursor-pointer transition-colors
                        ${task.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          task.status === 'InProcess' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}
                        title={`${task.itemName} - ${task.status || 'Pending'}`}
                      >
                        <div className="font-medium truncate">{task.itemName}</div>
                        {task.status && (
                          <div className="text-xs opacity-75">
                            {task.status === 'InProcess' ? 'In Progress' : task.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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