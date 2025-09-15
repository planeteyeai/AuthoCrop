import React, { useState } from 'react';
import {
  Users,
  Calendar,
  BarChart3,
  Home,
  List,
  ShoppingBag,
  Book,
  LogOut,
  Newspaper,
} from 'lucide-react';
import { BiWater } from 'react-icons/bi';
import { GiGrowth, GiPriceTag,GiNewspaper } from 'react-icons/gi';
import { MdPestControl } from 'react-icons/md';
import { size } from 'lodash';
import  Contactuser  from '../components/Contactuser';

interface SidebarProps {
  isOpen: boolean;
  onMenuSelect: (menu: string) => void;
  onHomeClick: () => void;
  onLogout: () => void;
  userRole: 'farmer' | 'admin' | 'fieldofficer' | 'manager';
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onMenuSelect,
  onHomeClick,
  onLogout,
  userRole,
}) => {
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleSubmenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const renderMenu = (title: string, icon: JSX.Element, submenu?: string[]) => {
    const isMenuOpen = openMenus.includes(title);

    return (
      <div key={title}>
        <div
          className="flex items-center justify-between px-4 py-2 hover:bg-gray-200 cursor-pointer"
          onClick={() => (submenu ? toggleSubmenu(title) : onMenuSelect(title))}
        >
          <div className="flex items-center space-x-2">
            {icon}
            <span className="text-gray-700">{title}</span>
          </div>
          {submenu && <span>{isMenuOpen ? '▾' : '▸'}</span>}
        </div>
        {submenu && isMenuOpen && (
          <div className="ml-6">
            {submenu.map((sub) => (
              <div
                key={sub}
                className="py-1 cursor-pointer hover:text-blue-600"
                onClick={() => onMenuSelect(sub)}
              >
                {sub}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getMenuItems = () => {
    switch (userRole) {
      case 'farmer':
        return [
          renderMenu('FarmerDashboard', <BarChart3 size={20} />),
          renderMenu('MyTask', <Calendar size={20} />, ['Calendar', 'ViewList']),
          renderMenu('Irrigation', <BiWater size={20} />),
          renderMenu('Pest & Disease', <MdPestControl size={20} />),
          renderMenu('Fertilizer', <GiGrowth size={20} />),
          renderMenu('BlogCard',<GiPriceTag size={20}/>),
        ];
      case 'admin':
        return [
          renderMenu('DataVista', <BarChart3 size={20} />, [
            'Farm Crop Status',
            'Harvesting Planning',
            'Agroclimatic',
            'Resources',
            'Plot Birde View',
          ]),
          renderMenu('TeamConnect', <List size={20} />, ['Team List']),
          renderMenu('User Desk', <Users size={20} />, ['Contactuser']),
          
        ];
      case 'fieldofficer':
        return [
          renderMenu('DataVista', <BarChart3 size={20} />, ['ViewFarmerPlot']),
          renderMenu('User Desk', <Users size={20} />, ['AddFarm', 'Farmlist','Contactuser']),
          renderMenu('MyTask', <Calendar size={20} />, ['TaskCalendar', 'Tasklist']),
          renderMenu('Plan & Book', <Calendar size={20} />, ['Add Booking', 'Booking List']),
        ];
      case 'manager':
        return [
          renderMenu('DataVista', <BarChart3 size={20} />, [
            'Farm Crop Status',
            'Harvesting Planning',
            'Agroclimatic',
          ]),
          renderMenu('UserDesk', <Users size={20} />, [
            'Add User',
            'User List',
            'Contactuser',
          ]),
          renderMenu('MyTask', <Calendar size={20} />, ['CalendarView', 'MyList']),
          renderMenu('TeamConnect', <List size={20} />, ['Team List']),
          renderMenu('Resoucres Planning', <ShoppingBag size={20} />, [
            'Add Vendor',
            'Vendor list',
            'Add order',
            'order list',
            'Add Stock',
            'stock list',
          ]),
          renderMenu('Plan&Book', <Book size={20} />, ['Add Booking', 'Booking List']),
        ];
      default:
        return [];
    }
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700">CROPEYE</h2>
        <button onClick={onHomeClick} className="text-gray-600 hover:text-gray-900">
          <Home size={20} />
        </button>
      </div>

     
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {getMenuItems()}
      </nav>

      
      <div
        className="p-4 border-t flex items-center space-x-2 hover:bg-gray-100 cursor-pointer"
        onClick={onLogout}
      >
        <LogOut size={20} className="text-gray-600" />
        <span className="text-gray-700 font-medium">Logout</span>
      </div>
    </aside>
  );
};
