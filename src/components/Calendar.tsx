import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekDaysMobile = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface Task {
  id?: string;
  date: string;
  itemName: string;
  description: string;
}

const TaskCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{date: Date, day: number} | null>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    // Mock data for demonstration
    const mockTasks: Task[] = [
      { id: '1', date: '2025-08-05', itemName: 'Irrigation', description: 'Water crops' },
      { id: '2', date: '2025-08-12', itemName: 'Fertilizing', description: 'Apply fertilizer' },
      { id: '3', date: '2025-08-19', itemName: 'Harvest', description: 'Collect tomatoes' },
      { id: '4', date: '2025-08-25', itemName: 'Planting', description: 'Plant seeds' },
      { id: '5', date: '2025-08-20', itemName: 'Irrigation', description: 'Evening watering' },
    ];
    setTasks(mockTasks);
  }, []);

  // Helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (date: Date, day: number) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           day === today.getDate();
  };

  const formatDate = (date: Date, day: number) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getTasksForDate = (date: Date, day: number): Task[] => {
    const dateString = formatDate(date, day);
    return tasks.filter((task) => task.date === dateString);
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className={`${isMobile ? 'h-12 sm:h-16' : 'h-24 sm:h-32'} border border-gray-100 rounded-lg bg-gray-50`}
        />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const tasksForDay = getTasksForDate(currentDate, day);
      const todayFlag = isToday(currentDate, day);

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate({date: currentDate, day})}
          className={`
            ${isMobile ? 'h-12 sm:h-16' : 'h-24 sm:h-32'} 
            p-1 sm:p-2 border rounded-lg transition-colors relative cursor-pointer
            ${todayFlag 
              ? 'bg-blue-50 border-blue-300 shadow-sm' 
              : 'hover:bg-gray-50 border-gray-200'
            }
            ${selectedDate && selectedDate.day === day && 
              selectedDate.date.getMonth() === currentDate.getMonth() && 
              selectedDate.date.getFullYear() === currentDate.getFullYear()
              ? 'ring-2 ring-blue-400 bg-blue-25' 
              : ''
            }
          `}
        >
          {/* Day Number */}
          <div className={`
            ${isMobile ? 'text-xs' : 'text-sm'} 
            font-semibold mb-1
            ${todayFlag ? 'text-blue-600' : 'text-gray-700'}
          `}>
            {day}
          </div>

          {/* Tasks */}
          <div className="overflow-hidden">
            {renderTaskIndicator(tasksForDay)}
          </div>

          {/* Task count indicator for mobile */}
          {isMobile && tasksForDay.length > 0 && (
            <div className="absolute top-0 right-0 -mt-1 -mr-1">
              <div className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                {tasksForDay.length > 9 ? '9+' : tasksForDay.length}
              </div>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const renderTaskIndicator = (tasksForDay: Task[]) => {
    if (tasksForDay.length === 0) return null;
    
    if (isMobile) {
      return (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {tasksForDay.slice(0, 3).map((task, index) => (
            <div
              key={index}
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
            />
          ))}
          {tasksForDay.length > 3 && (
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          )}
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          {tasksForDay.slice(0, 3).map((task, index) => (
            <div
              key={index}
              className="text-xs font-medium truncate text-gray-600"
            >
              <span className="truncate">{task.itemName}</span>
            </div>
          ))}
          {tasksForDay.length > 3 && (
            <div className="text-xs text-gray-400 truncate">
              +{tasksForDay.length - 3} more
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={handlePrevMonth} 
              className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button 
              onClick={handleNextMonth} 
              className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Container */}
        <div className="p-2 sm:p-4 md:p-6">
          {/* Weekdays Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
            {(isMobile ? weekDaysMobile : weekDays).map((day) => (
              <div 
                key={day} 
                className="text-center font-medium text-gray-600 py-1 sm:py-2 text-xs sm:text-sm"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Legend for mobile - removed since we removed color coding */}
        
        {/* Selected Date Tasks */}
        {selectedDate && (
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="text-sm font-medium text-gray-800 mb-2">
              Tasks for {selectedDate.date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric',
                year: 'numeric' 
              })}
            </div>
            {(() => {
              const selectedTasks = getTasksForDate(selectedDate.date, selectedDate.day);
              
              if (selectedTasks.length === 0) {
                return <div className="text-xs text-gray-500">No tasks scheduled for this date</div>;
              }
              
              return (
                <div className="space-y-1">
                  {selectedTasks.map((task, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-400">
                      <div className="font-medium text-gray-800">{task.itemName}</div>
                      <div className="text-gray-600">{task.description}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Task Summary for Today (Mobile) */}
        {isMobile && !selectedDate && (
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="text-sm font-medium text-gray-800 mb-2">Today's Tasks</div>
            {(() => {
              const today = new Date();
              const todayTasks = getTasksForDate(today, today.getDate());
              
              if (todayTasks.length === 0) {
                return <div className="text-xs text-gray-500">No tasks scheduled for today</div>;
              }
              
              return (
                <div className="space-y-1">
                  {todayTasks.map((task, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-400">
                      <div className="font-medium text-gray-800">{task.itemName}</div>
                      <div className="text-gray-600">{task.description}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCalendar;