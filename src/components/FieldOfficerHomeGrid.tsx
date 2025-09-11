// src/FieldOfficerHomeGrid.tsx
import React from 'react';
import {Calendar,Book,Users, LandPlot } from 'lucide-react'
import { useNavigate } from 'react-router-dom';

interface FieldOfficerHomeGridProps {
  onMenuClick: (menuTitle: string) => void;
}

const FieldOfficerHomeGrid: React.FC<FieldOfficerHomeGridProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();

  const items = [
    {
      title: 'MyTask',
      icon: <Calendar size={32} className="text-blue-600" />,
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100'
    },
    {
      title: 'Plan & Book',
      icon: <Book size={32} className="text-yellow-600" />,
      bgColor: 'bg-yellow-50',
      hoverColor: 'hover:bg-yellow-100'
    },
    {
      title: 'User Desk',
      icon: <Users size={32} className="text-purple-600" />,
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100'
    },
    {
      title: 'View Farmer Plot',
      icon: <LandPlot size={32} className="text-green-600" />,
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100'
    }
  ];
  
  return (
    <div className="flex flex-col gap-4 sm:gap-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {items.map((item) => (
          <button
            key={item.title}
            onClick={() => onMenuClick(item.title)}
            className={`${item.bgColor} ${item.hoverColor} p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm transition-all duration-300 transform hover:scale-105 min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]`}
          >
            <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-4 h-full">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex items-center justify-center">
                  {React.cloneElement(item.icon, { 
                    size: undefined,
                    className: item.icon.props.className + " w-full h-full" 
                  })}
                </div>
              </div>
              <span className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 text-center leading-tight break-words px-1">
                {item.title}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FieldOfficerHomeGrid;
