import React from 'react';
import { BarChart3, Users as TeamConnect, Wheat, Cloud, BarChart, User, MapPin } from 'lucide-react';
import { DashboardNo } from './Dashboardno';

interface OwnerHomeGridProps {
  onMenuClick: (menuTitle: string) => void;
}

const items = [
  { title: 'DataVista', icon: <BarChart3 size={32} className="text-blue-600" />, bgColor: 'bg-blue-50', hoverColor: 'hover:bg-blue-100' },
  { title: 'Team Connect', icon: <TeamConnect size={32} className="text-pink-600" />, bgColor: 'bg-pink-50', hoverColor: 'hover:bg-pink-100' },
  
  { title: 'Harvesting Planning', icon: <Wheat size={32} className="text-yellow-600" />, bgColor: 'bg-yellow-50', hoverColor: 'hover:bg-yellow-100' },
  { title: 'Agroclimatic', icon: <Cloud size={32} className="text-cyan-600" />, bgColor: 'bg-cyan-50', hoverColor: 'hover:bg-cyan-100' },
  { title: 'Resources Dashboard', icon: <User size={32} className="text-emerald-600" />, bgColor: 'bg-emerald-50', hoverColor: 'hover:bg-emerald-100' },
  { title: 'Plot Overview', icon: <MapPin size={32} className="text-red-600" />, bgColor: 'bg-red-50', hoverColor: 'hover:bg-red-100' }
];

const OwnerHomeGrid: React.FC<OwnerHomeGridProps> = ({ onMenuClick }) => {
  return (
    <div className="flex flex-col gap-4 sm:gap-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {items.map(item => (
          <button
            key={item.title}
            onClick={() => onMenuClick(item.title)}
            className={`${item.bgColor} ${item.hoverColor} p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm transition-transform transform hover:scale-105 min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]`}
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
      {/* Dashboard stats row */}
      <div className="mt-6 bg-white rounded-xl shadow-md p-4">
        <DashboardNo />
      </div>
    </div>
  );
};

export default OwnerHomeGrid;
