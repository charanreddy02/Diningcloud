import React, { useState, useEffect } from 'react';
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
  LogOut,
  Contact,
  Landmark,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import BiteDeskLogo from '../components/ui/BiteDeskLogo';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toaster';

// Import page components
import DashboardHomePage from './admin/DashboardHomePage';
import OrdersPage from './admin/OrdersPage';
import MenuPage from './admin/MenuPage';
import TablesPage from './admin/TablesPage';
import BillsPage from './admin/BillsPage';
import StaffPage from './admin/StaffPage';
import AnalyticsPage from './admin/AnalyticsPage';
import SettingsPage from './admin/SettingsPage';
import CustomersPage from './admin/CustomersPage';
import GSTPage from './admin/GSTPage';
import PaymentsPage from './admin/PaymentsPage';
import PaymentVerificationsPage from './admin/PaymentVerificationsPage';

const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const location = useLocation();
  const { signOut } = useAuth();
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialActiveOrders = async () => {
      if (!restaurantSlug) return;
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (restaurant) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .in('status', ['pending', 'in_preparation', 'ready']);
        setActiveOrderCount(count || 0);
      }
    };

    fetchInitialActiveOrders();

    const orderChannel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        fetchInitialActiveOrders();
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new as any;
          toast({
            type: 'info',
            title: 'New Order Received!',
            description: `Order from Table #${newOrder.table_id ? '...' : newOrder.customer_name}. Total: ₹${newOrder.total}`
          });
        }
      })
      .subscribe();
      
    const paymentChannel = supabase
      .channel('public:payments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
        const newPayment = payload.new as any;
        toast({
          type: 'success',
          title: 'New Payment Submitted!',
          description: `${newPayment.customer_name} submitted payment of ₹${newPayment.amount}. Please verify.`
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(paymentChannel);
    };
  }, [restaurantSlug, toast]);

  const handleSignOut = async () => {
    await signOut();
  };

  const navigation = [
    { name: 'Dashboard', href: '', icon: Home },
    { name: 'Orders', href: '/orders', icon: ShoppingBag, badge: activeOrderCount },
    { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
    { name: 'Tables', href: '/tables', icon: TableProperties },
    { name: 'Customers', href: '/customers', icon: Contact },
    { name: 'Bills', href: '/bills', icon: Receipt },
    { name: 'Staff', href: '/staff', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const settingsNavigation = [
    { name: 'GST Settings', href: '/gst', icon: Landmark },
    { name: 'Payment Settings', href: '/payments', icon: CreditCard },
    { name: 'Payment Verifications', href: '/payment-verifications', icon: ShieldCheck },
    { name: 'General Settings', href: '/settings', icon: Settings },
  ];

  const renderLink = (item: any, isSettings: boolean = false) => {
    const fullPath = `/admin/${restaurantSlug}${item.href}`;
    const isCurrent = location.pathname === fullPath || (item.href === '' && location.pathname === `/admin/${restaurantSlug}`);
    return (
      <Link
        key={item.name}
        to={fullPath}
        onClick={() => setSidebarOpen(false)}
        className={`group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isCurrent
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <div className="flex items-center">
          <item.icon className={`mr-3 h-5 w-5 ${isCurrent ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
          {item.name}
        </div>
        {item.badge > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <BiteDeskLogo />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </div>
        
        <nav className="flex flex-col justify-between h-[calc(100%-4rem)] mt-2 px-3 overflow-y-auto">
          <div>
            <div className="space-y-1 py-4">
              {navigation.map(item => renderLink(item))}
            </div>
            <div className="pt-4 border-t">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</h3>
              <div className="space-y-1">
                {settingsNavigation.map(item => renderLink(item, true))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 mb-4 pt-6 border-t">
            <button onClick={handleSignOut} className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Sign Out
            </button>
          </div>
        </nav>
      </div>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col">
        <div className="sticky top-0 z-30 flex h-16 bg-white border-b border-gray-200 items-center">
          <button onClick={() => setSidebarOpen(true)} className="px-4 text-gray-400 focus:outline-none lg:hidden"><Menu className="h-6 w-6" /></button>
          <div className="flex-1 px-4 lg:px-6">
             <h1 className="text-lg font-semibold text-gray-900 capitalize">
                {location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
             </h1>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6">
          <Routes>
            <Route path="/" element={<DashboardHomePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/gst" element={<GSTPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/payment-verifications" element={<PaymentVerificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
