import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { DashboardGrid } from "./components/DashboardGrid";
import { jwtDecode } from "jwt-decode";

import OwnerFarmDash from "./components/OwnerFarmDash"; // Import for Owner
import OwnerHarvestDash from "./components/OwnerHarvestDash"; // Import for Owner
import ManagerHomeGrid from "./components/ManagerHomeGrid";
import OwnerHomeGrid from "./components/OwnerHomeGrid";
import { Addusers } from "./components/Addusers";
import { UserList } from "./components/userList";
import Contactuser from "./components/Contactuser";
import { Addvendor } from "./components/AddVendor";
import { VendorList } from "./components/Vendorlist";
import { Addorder } from "./components/Addorder";
import { OrderList } from "./components/orderlist";
import { AddStock } from "./components/AddStock";
import { StockList } from "./components/stocklist";
import { BookingList } from "./components/Bookinglist";
import AddBooking from "./components/AddBooking";
import { FarmList } from "./components/FarmList";
import CalendarView from "./components/CalendarView";
import MyList from "./components/MyList";
import TeamList from "./components/TeamList";
import FieldOfficerHomeGrid from "./components/FieldOfficerHomeGrid";
import FarmerHomeGrid from "./components/FarmerHomeGrid";
import Calendar from "./components/Calendar";
import AddFarm from "./components/Add Farm";
import TaskCalendar from "./components/TaskCalendar";
import ViewList from "./components/ViewList";
import { Tasklist } from "./components/Tasklist";
import { PestDisease } from "./components/pestt/Pest & Disease";
import Fertilizer from "./components/Fertilizer";
import Irrigation from "./components/Irrigation/Irrigation";
import BlogCard from "./components/BlogCard";
import AgricultureData from "./components/AgricultureData";
import Map from "./components/Map";
import FarmerDashboard from "./components/FarmerDashboard";
import OfficerDashboard from "./components/FarmCropStatus";
import AgroDashboard from "./components/AgroDash/AgroDashboard";
import ManagerFarmDash from "./components/ManagerFarmDash";
import HarvestDashboard from "./components/HarvestDashboard";

enum View {
  Home = "home",
  ManagerHomeGrid = "ManagerHomeGrid",
  HarvestDashboard = "HarvestDashboard",
  Dashboard = "dashboard",
  AgroDashboard = "AgroDashboard",
  ManagerFarmDash = "ManagerFarmDash",
  OwnerFarmDash = "OwnerFarmDash",
  OwnerHarvestDash = "OwnerHarvestDash",
  AddUsers = "addusers",
  userList = "userlist",
  Contactuser = "Contactuser",
  Addvendor = "AddVendor",
  VendorList = "Vendorlist",
  Addorder = "Addorder",
  orderlist = "orderlist",
  Addstock = "Addstock",
  stocklist = "stocklist",
  AddBooking = "AddBooking",
  Bookinglist = "Bookinglist",
  FarmList = "farmlist",
  CalendarView = "CalendarView",
  MyList = "MyList",
  TeamList = "TeamList",
  Calendar = "Calendar",
  AddFarm = "AddFarm",
  TaskCalendar = "TaskCalendar",
  ViewList = "ViewList",
  Tasklist = "Tasklist",
  Fertilizer = "Fertilizer",
  Irrigation = "Irrigation",
  BlogCard = "BlogCard",
  PestDisease = "Pest & Disease",
  AgricultureData = "AgricultureData",
  Map = "Map",
  FarmerDashboard = "FarmerDashboard",
  FarmCropStatus = "FarmCropStatus",
}

interface AppProps {
  userRole: "manager" | "admin" | "fieldofficer" | "farmer" | "owner";
  onLogout: () => void;
}

const App: React.FC<AppProps> = ({ userRole, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [expandedSidebarMenu, setExpandedSidebarMenu] = useState<string | null>(
    null
  );
  const [users, setUsers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedPlotName, setSelectedPlotName] = useState<string | null>(null);
  const [soilData, setSoilData] = useState({
    phValue: null as number | null,
    nitrogenValue: null as number | null,
    fertilityStatus: "Moderate",
  });

  // NEW: Add currentUser state
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    role: string;
    name: string;
  } | null>(null);

  // NEW: Get user from JWT token
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        console.log("Decoded token:", decoded);

        setCurrentUser({
          id: decoded.user_id || decoded.id,
          role: decoded.role || userRole,
          name: decoded.username || decoded.first_name || "User",
        });
      } catch (error) {
        console.error("Error decoding token:", error);
        // Fallback for development/testing
        setCurrentUser({
          id: 3, // Default field officer ID for testing
          role: userRole,
          name: "Test User",
        });
      }
    } else {
      // No token - set default for testing
      console.warn("No token found, using default user");
      setCurrentUser({
        id: 3,
        role: userRole,
        name: "Test User",
      });
    }
  }, [userRole]);

  const handleMenuSelect = (menu: string) => {
    setActiveSubmenu(null);

    let nextView = View.Home;

    switch (menu) {
      case "Farm Crop Status":
        // Use ManagerFarmDash for manager/owner, FarmCropStatus for field officer
        if (userRole === "owner") {
          nextView = View.OwnerFarmDash;
        } else if (userRole === "manager") {
          nextView = View.ManagerFarmDash;
        } else {
          nextView = View.FarmCropStatus;
        }
        break;
      case "Harvesting Planning":
        if (userRole === "owner") {
          nextView = View.OwnerHarvestDash;
        } else {
          nextView = View.HarvestDashboard;
        }
        break;
      case "ViewFarmerPlot":
        nextView = View.FarmCropStatus;
        break;
      case "Agroclimatic":
        nextView = View.AgroDashboard;
        break;
      case "Plot View":
        nextView = View.Dashboard;
        setActiveSubmenu(menu);
        break;
      case "Add User":
        nextView = View.AddUsers;
        break;
      case "User List":
        nextView = View.userList;
        break;
      case "Contactuser":
        nextView = View.Contactuser;
        break;
      case "Add Vendor":
        nextView = View.Addvendor;
        break;
      case "Vendor list":
        nextView = View.VendorList;
        fetch("http://localhost:5000/vendorlist")
          .then((response) => response.json())
          .then((data) => setUsers(data))
          .catch((error) => setUsers([]));
        break;
      case "Add order":
        nextView = View.Addorder;
        break;
      case "order list":
        nextView = View.orderlist;
        fetch("http://localhost:5000/orderlist")
          .then((response) => response.json())
          .then((data) => setItems(data))
          .catch((error) => setItems([]));
        break;
      case "Add Stock":
        nextView = View.Addstock;
        break;
      case "stock list":
        nextView = View.stocklist;
        fetch("http://localhost:5000/stocklist")
          .then((response) => response.json())
          .then((data) => setStocks(data))
          .catch((error) => setStocks([]));
        break;
      case "Add Booking":
        nextView = View.AddBooking;
        break;
      case "Booking List":
        nextView = View.Bookinglist;
        break;
      case "Farmlist":
        nextView = View.FarmList;
        break;
      case "CalendarView":
        nextView = View.CalendarView;
        break;
      case "MyList":
        nextView = View.MyList;
        break;
      case "Team List":
        nextView = View.TeamList;
        break;
      case "Calendar":
        nextView = View.Calendar;
        break;
      case "AddFarm":
        nextView = View.AddFarm;
        break;
      case "TaskCalendar":
        nextView = View.TaskCalendar;
        break;
      case "ViewList":
        nextView = View.ViewList;
        break;
      case "Tasklist":
        nextView = View.Tasklist;
        break;
      case "Pest & Disease":
        nextView = View.PestDisease;
        break;
      case "Fertilizer":
        nextView = View.Fertilizer;
        break;
      case "Irrigation":
        nextView = View.Irrigation;
        break;
      case "BlogCard":
        nextView = View.BlogCard;
        break;
      case "AgricultureData":
        nextView = View.AgricultureData;
        break;
      case "Map":
        nextView = View.Map;
        break;
      case "FarmerDashboard":
        nextView = View.FarmerDashboard;
        break;
      default:
        nextView = View.Home;
        break;
    }

    setCurrentView(nextView);
    setIsSidebarOpen(false);
  };

  const handleHomeClick = () => {
    setCurrentView(View.Home);
    setIsSidebarOpen(false);
    setActiveSubmenu(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const openSidebarWithMenu = (menuTitle: string) => {
    console.log("🔧 openSidebarWithMenu called with:", menuTitle);
    setIsSidebarOpen(true);
    setExpandedSidebarMenu(menuTitle);
    // Clear the expanded menu after a longer delay to allow the sidebar to open and expand
    setTimeout(() => {
      console.log("🔧 Clearing expanded menu after timeout");
      setExpandedSidebarMenu(null);
    }, 1000);
  };

  const handleSoilDataChange = (data: {
    plotName: string;
    phValue: number | null;
    nitrogenValue?: number | null;
    phStatistics?: { phh2o_0_5cm_mean_mean: number };
  }) => {
    console.log("App.tsx: handleSoilDataChange called with:", data);
    setSoilData((prev) => ({
      ...prev,
      phValue: data.phValue,
      nitrogenValue:
        data.nitrogenValue !== undefined ? data.nitrogenValue : null,
    }));
    setSelectedPlotName(data.plotName || null);
  };

  const renderHomeGrid = () => {
    console.log("Rendering home grid for role:", userRole);
    switch (userRole) {
      case "manager":
        console.log("Rendering ManagerHomeGrid");
        return (
          <ManagerHomeGrid
            onMenuClick={handleMenuSelect}
            onOpenSidebarWithMenu={openSidebarWithMenu}
          />
        );
      case "owner":
        console.log("Rendering OwnerHomeGrid");
        return <OwnerHomeGrid onMenuClick={handleMenuSelect} />;
      case "fieldofficer":
        console.log("Rendering FieldOfficerHomeGrid");
        return (
          <FieldOfficerHomeGrid
            onMenuClick={handleMenuSelect}
            onOpenSidebarWithMenu={openSidebarWithMenu}
          />
        );
      case "farmer":
        console.log("Rendering FarmerHomeGrid");
        return <FarmerHomeGrid onMenuClick={handleMenuSelect} />;
      default:
        console.log("Invalid user role:", userRole);
        return <div>Invalid user role: {userRole}</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

      <div className="flex flex-1">
        <div
          className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-64" : "w-0"
          } overflow-hidden`}
        >
          <Sidebar
            isOpen={isSidebarOpen}
            onMenuSelect={handleMenuSelect}
            onHomeClick={handleHomeClick}
            onLogout={onLogout}
            userRole={userRole}
            expandedMenu={expandedSidebarMenu}
          />
        </div>

        <main
          className={`flex-1 transition-all duration-300 ease-in-out ml-0 ${
            isSidebarOpen ? "ml-64" : "ml-0"
          } overflow-auto`}
        >
          <div className="w-full h-full">
            {/* {console.log("Current view:", currentView, "View.Home:", View.Home)} */}
            {currentView === View.Home && renderHomeGrid()}

            {currentView === View.Dashboard && activeSubmenu && (
              <DashboardGrid
                submenu={activeSubmenu}
                userRole={userRole}
                onClose={() => setActiveSubmenu(null)}
              />
            )}

            {currentView === View.AddUsers && (
              <Addusers setUsers={setUsers} users={users} />
            )}

            {currentView === View.userList && (
              // <UserList users={users} setUsers={setUsers} />
              <UserList
                users={users}
                setUsers={setUsers}
                currentUserId={currentUser.id}
                currentUserRole={
                  currentUser.role as
                    | "owner"
                    | "manager"
                    | "fieldofficer"
                    | "farmer"
                }
              />
            )}

            {currentView === View.Contactuser && (
              <Contactuser users={users} setUsers={setUsers} />
            )}

            {currentView === View.Addvendor && (
              <Addvendor setUsers={setUsers} users={users} />
            )}

            {currentView === View.VendorList && (
              <VendorList users={users} setUsers={setUsers} />
            )}

            {currentView === View.Addorder && (
              <Addorder setItems={setItems} items={items} />
            )}

            {currentView === View.orderlist && (
              <OrderList items={items} setItems={setItems} />
            )}

            {currentView === View.Addstock && (
              <AddStock setStocks={setStocks} />
            )}

            {currentView === View.stocklist && (
              <StockList stocks={stocks} setStocks={setStocks} />
            )}

            {currentView === View.AddBooking && (
              <AddBooking bookings={bookings} setBookings={setBookings} />
            )}

            {currentView === View.Bookinglist && (
              <BookingList bookings={bookings} setBookings={setBookings} />
            )}

            {currentView === View.FarmList && (
              <FarmList users={users} setUsers={setUsers} />
            )}

            {currentView === View.CalendarView && <CalendarView />}

            {currentView === View.MyList && <MyList />}

            {currentView === View.TeamList && (
              <TeamList setUsers={setUsers} users={users} />
            )}

            {/* {currentView === View.Calendar && <Calendar />} */}

            {currentView === View.Calendar && (
              <Calendar
                currentUserId={currentUser.id}
                currentUserRole={
                  currentUser.role as "manager" | "fieldofficer" | "farmer"
                }
              />
            )}

            {currentView === View.AddFarm && <AddFarm />}

            {/* {currentView === View.TaskCalendar && <TaskCalendar currentUserId={3} currentUserRole="fieldofficer" />} */}

            {currentView === View.TaskCalendar && currentUser && (
              <TaskCalendar
                currentUserId={currentUser.id}
                currentUserRole={
                  currentUser.role as "manager" | "fieldofficer" | "farmer"
                }
              />
            )}

            {/* {currentView === View.ViewList && <ViewList />}
            
            {currentView === View.Tasklist && <Tasklist  />} */}

            {currentView === View.ViewList && (
              <ViewList
                currentUserId={currentUser.id}
                currentUserRole={
                  currentUser.role as "manager" | "fieldofficer" | "farmer"
                }
                currentUserName={currentUser.name}
              />
            )}

            {/* UPDATED: Tasklist with currentUser */}
            {currentView === View.Tasklist && currentUser && (
              <Tasklist
                currentUserId={currentUser.id}
                currentUserRole={
                  currentUser.role as "manager" | "fieldofficer" | "farmer"
                }
                currentUserName={currentUser.name}
              />
            )}
            {currentView === View.PestDisease && <PestDisease />}

            {currentView === View.Fertilizer && <Fertilizer />}

            {currentView === View.Irrigation && (
              <Irrigation selectedPlotName={selectedPlotName} />
            )}

            {currentView === View.BlogCard && <BlogCard />}

            {currentView === View.AgricultureData && <AgricultureData />}

            {currentView === View.Map && (
              <Map onSoilDataChange={handleSoilDataChange} />
            )}

            {currentView === View.FarmerDashboard && <FarmerDashboard />}

            {currentView === View.FarmCropStatus && <OfficerDashboard />}

            {currentView === View.ManagerFarmDash && <ManagerFarmDash />}

            {currentView === View.AgroDashboard && <AgroDashboard />}
            {currentView === View.HarvestDashboard && <HarvestDashboard />}

            {currentView === View.OwnerFarmDash && <OwnerFarmDash />}

            {currentView === View.OwnerHarvestDash && <OwnerHarvestDash />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
