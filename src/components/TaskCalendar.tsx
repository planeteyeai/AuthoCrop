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
import { getContactDetails } from '../api';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const USERS = [
  { label: 'Manager', value: 'manger@124', role: 'manager' },
  { label: 'Field Officer', value: 'filed@crops', role: 'fieldofficer' },
  { label: 'Farmer', value: 'AjayDhale', role: 'farmer' },
];

// Add this constant for available farmers
interface Farmer {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
}

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
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTask, setNewTask] = useState<Omit<Task, 'status' | 'id'> & { assignedTime: string }>({
    selectedDate: '',
    itemName: '',
    description: '',
    assignedTime: '',
    fieldOfficer: '',
    farmerName: '', // Will be set when farmers are loaded
    assignedBy: '',
  });

  // Notification state for new tasks
  const [showNewTaskAlert, setShowNewTaskAlert] = useState(false);
  const [prevTaskIds, setPrevTaskIds] = useState<string[]>([]);

  // Fetch farmers for field officer
  useEffect(() => {
    const fetchFarmers = async () => {
      if (currentUser.role === 'fieldofficer') {
        try {
          setLoadingFarmers(true);
          console.log('🌾 Fetching farmers for field officer:', currentUser.value);
          
          const response = await getContactDetails();
          console.log('📋 Contact details response:', response.data);
          
          // Extract farmers from the response
          let farmersData: Farmer[] = [];
          
          if (response.data && response.data.contacts) {
            const contacts = response.data.contacts;
            
            // Get farmers from the contacts
            if (contacts.farmers && Array.isArray(contacts.farmers)) {
              farmersData = contacts.farmers.map((farmer: any) => ({
                id: farmer.id,
                name: farmer.name || `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || farmer.username || 'Unknown',
                username: farmer.username || 'unknown',
                email: farmer.email || 'N/A',
                phone: farmer.phone || farmer.phone_number || 'N/A'
              }));
            }
          }
          
          console.log('🌾 Farmers found:', farmersData);
          setFarmers(farmersData);
          
          // Set default farmer if available
          if (farmersData.length > 0 && !newTask.farmerName) {
            setNewTask(prev => ({
              ...prev,
              farmerName: farmersData[0].username
            }));
          }
          
        } catch (error) {
          console.error('❌ Error fetching farmers:', error);
          // Set some sample farmers for demonstration
          const sampleFarmers: Farmer[] = [
            {
              id: 1,
              name: 'Ajay Dhale',
              username: 'AjayDhale',
              email: 'ajay@example.com',
              phone: '9876543210'
            },
            {
              id: 2,
              name: 'Rajesh Patil',
              username: 'rajesh_patil',
              email: 'rajesh@example.com',
              phone: '9876543211'
            }
          ];
          setFarmers(sampleFarmers);
          setNewTask(prev => ({
            ...prev,
            farmerName: sampleFarmers[0].username
          }));
        } finally {
          setLoadingFarmers(false);
        }
      } else {
        // Clear farmers for non-field officer roles
        setFarmers([]);
      }
    };

    fetchFarmers();
  }, [currentUser]);

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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
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

  // Modal for assigning a task - Responsive
  const AssignTaskModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Assign Task</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newTask.itemName}
              onChange={e => setNewTask({ ...newTask, itemName: e.target.value })}
              placeholder="Enter task name"
            />
          </div>
          
          {currentUser.role === 'fieldofficer' && (
            <div>
              <label className="block text-sm font-medium mb-1">Farmer</label>
              {loadingFarmers ? (
                <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500">
                  Loading farmers...
                </div>
              ) : farmers.length > 0 ? (
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newTask.farmerName}
                  onChange={e => setNewTask({ ...newTask, farmerName: e.target.value })}
                >
                  <option value="">Select a farmer</option>
                  {farmers.map(farmer => (
                    <option key={farmer.id} value={farmer.username}>
                      {farmer.name} ({farmer.username})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full border border-red-300 rounded-lg px-3 py-2 bg-red-50 text-red-600">
                  No farmers found under this field officer
                </div>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Enter task description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newTask.selectedDate}
              onChange={e => setNewTask({ ...newTask, selectedDate: e.target.value })}
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors font-medium"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            onClick={handleAssignTask}
          >
            Assign Task
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-6 bg-gray-100 min-h-screen">
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {USERS.map(u => (
              <option key={u.value} value={u.value}>{u.label} ({u.value})</option>
            ))}
          </select>
        </div>
      )}

      <div className="w-full p-4 sm:p-6 bg-white rounded-lg shadow-md">
        {showModal && <AssignTaskModal />}
        {showNewTaskAlert && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg shadow text-center font-semibold">
            New task assigned to you!
          </div>
        )}
        
        {/* Header Section - Responsive */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {currentUser.role === 'farmer' ? `${currentUser.value} Calendar` : `${currentUser.label} Calendar`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Today: {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          {/* Controls Section - Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-base sm:text-lg font-medium text-gray-700 min-w-[120px] text-center">
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
            
            {/* Assign Task Button */}
            {(currentUser.role === 'manager' || currentUser.role === 'fieldofficer') && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Assign Task
              </button>
            )}
          </div>
        </div>

        {/* Calendar Grid - Clean Design */}
        <div className="grid grid-cols-7 gap-0 mb-4">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-medium text-gray-600 py-3 text-sm border-b border-gray-200">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
          {days.map((day, index) => {
            // Handle empty boxes (null values)
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="h-16 sm:h-20 lg:h-24 border-r border-b border-gray-200 bg-gray-50 last:border-r-0"
                >
                  {/* Empty box - no content */}
                </div>
              );
            }
            
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={`h-16 sm:h-20 lg:h-24 border-r border-b border-gray-200 last:border-r-0 flex items-center justify-center transition-colors cursor-pointer
                ${isTodayDate ? 'bg-blue-100 text-blue-600 font-semibold' : 
                  selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') ? 'bg-green-100 text-green-600 font-semibold' :
                  'hover:bg-gray-50 bg-white text-gray-700'}`}
              >
                <span className={`text-sm sm:text-base
                  ${isTodayDate ? 'font-bold' : 
                    selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') ? 'font-bold' :
                    'font-medium'}`}>
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks Section - Shows tasks for selected date or today */}
      <div className="mt-6 sm:mt-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {selectedDate ? `${format(selectedDate, 'MMMM d, yyyy')} Tasks` : "Today's Tasks"}
            </h2>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Show Today's Tasks
              </button>
            )}
          </div>
          {(() => {
            const targetDate = selectedDate || new Date();
            const dateTasks = getTasksForDate(targetDate);
            
            if (dateTasks.length === 0) {
              return (
                <p className="text-gray-500 text-sm">
                  {selectedDate ? `No tasks scheduled for ${format(selectedDate, 'MMMM d, yyyy')}` : 'No tasks scheduled for today'}
                </p>
              );
            }
            
            return (
              <div className="space-y-3">
                {dateTasks.map((task: Task, idx: number) => (
                  <div key={idx} className={`p-3 rounded-lg border-l-4
                    ${task.status === 'Completed' ? 'bg-green-50 border-green-400' : 
                      task.status === 'InProcess' ? 'bg-yellow-50 border-yellow-400' : 
                      'bg-gray-50 border-gray-400'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">{task.itemName}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                        {task.assignedTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned: {new Date(task.assignedTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${task.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          task.status === 'InProcess' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {task.status === 'InProcess' ? 'In Progress' : (task.status || 'Pending')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Show ViewList for farmer (AjayDhale) below the calendar */}
      {currentUser.role === 'farmer' && (
        <div className="mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">{currentUser.value} Task List</h2>
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <ViewList />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;