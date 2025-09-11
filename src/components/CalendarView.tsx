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
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Task {
  id: string;
  itemName: string;
  description: string;
  fieldOfficer: string;
  team: string;
  selectedDate: string;
  message: string;
  assignedTime?: string;
}

const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [task, setTask] = useState<Omit<Task, 'id'>>({
    itemName: '',
    description: '',
    fieldOfficer: '',
    team: '',
    selectedDate: '',
    message: '',
  });

  useEffect(() => {
    // Fetch tasks from backend API
    fetch('http://localhost:5000/fieldofficertasks')
      .then((res) => res.json())
      .then((data) => {
        // Only show tasks not assigned by the manager (or filter as needed)
        setTasks(data.filter((t: any) => t.assignedBy !== 'manger@124'));
      })
      .catch(() => setTasks([]));
  }, []);

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setTask((prev) => ({ ...prev, selectedDate: date.toDateString() }));
    setShowForm(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setTask({ ...task, [e.target.name]: e.target.value });
  };

  const handleAssignTask = () => {
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const newTask: Task = {
      id: Date.now().toString(),
      ...task,
      assignedTime: (task as any).assignedTime || now,
    };
    fetch('http://localhost:5000/fieldofficertasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
      .then((res) => res.json())
      .then((createdTask) => {
        setTasks((prev) => [...prev, createdTask]);
        alert('Task Assigned!');
        setShowForm(false);
        setSelectedDate(null);
        setTask({
          itemName: '',
          description: '',
          fieldOfficer: '',
          team: '',
          selectedDate: '',
          message: '',
        });
      })
      .catch(() => {
        alert('Error assigning task!');
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedDate(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-gray-100 min-h-screen">
      {/* Calendar View */}
      <div className="w-full lg:w-2/3 p-4 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <button
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={`h-24 p-2 border rounded-lg transition-colors text-left
                ${isToday(day) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}
                ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}
              `}
            >
              <div className="text-right">{format(day, 'd')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <div className="w-full lg:w-1/3 p-4 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Add Task</h2>

          <label className="block mb-2 font-medium">Item Name</label>
          <select
            name="itemName"
            value={task.itemName}
            onChange={handleChange}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
          >
            <option value="">Select Item</option>
            <option value="irrigation">Irrigation</option>
            <option value="weather">Weather</option>
            <option value="pest">Pest</option>
            <option value="alert">Alert</option>
          </select>

          <label className="block mb-2 font-medium">Task Description</label>
          <textarea
            name="description"
            value={task.description}
            onChange={handleChange}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
            rows={3}
          />

          <label className="block mb-2 font-medium">Select Field Officer</label>
          <select
            name="fieldOfficer"
            value={task.fieldOfficer}
            onChange={handleChange}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
          >
            <option value="">Select Officer</option>
            <option value="filed@crops">filed@crops</option>
          </select>

          <label className="block mb-2 font-medium">Select Team</label>
          <select
            name="team"
            value={task.team}
            onChange={handleChange}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
          >
            <option value="">Select Team</option>
            <option value="irrigation">Irrigation</option>
            <option value="weather">Weather</option>
            <option value="growth">Growth</option>
            <option value="pest">Pest</option>
          </select>

          <label className="block mb-2 font-medium">Selected Date</label>
          <input
            type="text"
            value={selectedDate ? selectedDate.toDateString() : ''}
            disabled
            className="w-full mb-4 p-2 border border-gray-300 rounded bg-gray-100"
          />

          <label className="block mb-2 font-medium">Message</label>
          <textarea
            name="message"
            value={task.message}
            onChange={handleChange}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
            rows={2}
          />

          <div className="flex justify-between gap-4">
            <button
              onClick={handleAssignTask}
              disabled={isSubmitting}
              className={`w-1/2 ${
                isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              } text-white font-semibold py-2 px-4 rounded`}
            >
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;

