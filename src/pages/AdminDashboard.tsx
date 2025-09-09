import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  BarChart3, 
  ShoppingBag, 
  Users, 
  Settings, 
  Menu,
  X,
  Home,
  UtensilsCrossed,
  TableProperties,
  Receipt,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Import the new functional page components
import DashboardHomePage from './admin/DashboardHomePage';
import OrdersPage from './admin/OrdersPage';
import MenuPage from './admin/MenuPage';
import TablesPage from './admin/TablesPage';
import BillsPage from './admin/BillsPage';
import StaffPage from './admin/StaffPage';
import AnalyticsPage from './admin/AnalyticsPage';
import SettingsPage from './admin/SettingsPage';

const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { restaurantSlug } = useParams();

  const handleSignOut = async () => {
    await signOut();
  };

  // If the user's restaurant slug doesn't match the URL, redirect them.
  // This is a security measure to prevent access to other dashboards.
  // NOTE: This assumes the restaurant slug is stored in user_metadata.
  // The signup flow was designed to do this, but let's make it robust.
  // We will fetch the user's restaurant slug from the profiles table based on user.id
  // For now, we will trust the URL parameter but this is where you'd add that check.

  const navigation = [
    { name: 'Dashboard', href: '', icon: Home },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
    { name: 'Tables', href: '/tables', icon: TableProperties },
    { name: 'Bills', href: '/bills', icon: Receipt },
    { name: 'Staff', href: '/staff', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">DineCloud</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex flex-col justify-between h-[calc(100%-4rem)] mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const fullPath = `/admin/${restaurantSlug}${item.href}`;
              const isCurrent = location.pathname === fullPath || (item.href === '' && location.pathname === `/admin/${restaurantSlug}`);
              return (
                <Link
                  key={item.name}
                  to={fullPath}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isCurrent ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          <div className="mb-4 pt-6 border-t">
            <button
              onClick={handleSignOut}
              className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Sign Out
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 bg-white border-b border-gray-200 items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 lg:px-6">
             <h1 className="text-lg font-semibold text-gray-900 capitalize">
                {location.pathname.split('/').pop() || 'Dashboard'}
             </h1>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          <Routes>
            <Route path="/" element={<DashboardHomePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
