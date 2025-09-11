// DashboardNo.tsx
import React from "react";
import { Users, ShoppingCart } from "lucide-react";

export const DashboardNo: React.FC = () => {
  const stats = [
    { title: "Total Users", value: "1,234", icon: Users,        color: "blue"   },
    { title: "Vendors",     value: "56",    icon: Users,        color: "green"  },
    { title: "Stock Items", value: "35",    icon: ShoppingCart, color: "yellow" },
    { title: "Orders",      value: "89",    icon: ShoppingCart, color: "purple" },
    { title: "Bookings",    value: "12",    icon: ShoppingCart, color: "teal"   },
  ];

  return (
    <div className="flex flex-row gap-4 overflow-x-auto py-2">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="flex-shrink-0 bg-white rounded-lg shadow-md p-4 w-48"
          >
              <div>
                <p className="text-gray-500">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
              <Icon className={`text-${stat.color}-500`} size={28} />
            </div>
        );
      })}
    </div>
  );
};

export default DashboardNo;
