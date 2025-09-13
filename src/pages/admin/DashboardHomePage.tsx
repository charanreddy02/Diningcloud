import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  TrendingUp,
  Clock,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { DatePickerWithRange } from '../../components/admin/DatePickerWithRange';
import { Skeleton } from '../../components/ui/skeleton';

const DashboardHomePage: React.FC = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    avgOrderValue: 0
  });
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { restaurantSlug } = useParams();
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  useEffect(() => {
    fetchDashboardData();
  }, [restaurantSlug]);

  useEffect(() => {
    filterDataByDate();
  }, [date, allOrders]);

  const fetchDashboardData = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', restaurantSlug)
        .single();

      if (!restaurant) {
        toast({ type: 'error', title: 'Error', description: 'Restaurant not found.' });
        return;
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .eq('restaurant_id', restaurant.id);

      if (error) throw error;
      
      setAllOrders(orders || []);

    } catch (error: any) {
      console.error('Dashboard data fetch error:', error);
      toast({ type: 'error', title: 'Fetch Error', description: 'Could not load dashboard data.' });
    } finally {
      setLoading(false);
    }
  };

  const filterDataByDate = () => {
    if (allOrders.length === 0 && !loading) {
        processOrders([]);
        return;
    }

    if (!date?.from) {
      processOrders(allOrders);
      return;
    }
    
    // Set 'to' date to end of day for accurate filtering
    const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : new Date(date.from.setHours(23, 59, 59, 999));
    const fromDate = date.from;

    const filtered = allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= fromDate && orderDate <= toDate;
    });
    
    processOrders(filtered);
  };

  const processOrders = (orders: any[]) => {
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const activeOrders = orders.filter(order => 
        ['pending', 'in_preparation', 'ready'].includes(order.status)
      ).length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalOrders,
        totalRevenue,
        activeOrders,
        avgOrderValue
      });
  };

  const StatCardSkeleton = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="ml-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
            </div>
        </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-[300px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: ShoppingBag, title: 'Total Orders', value: stats.totalOrders, color: 'blue' },
          { icon: DollarSign, title: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, color: 'green' },
          { icon: Clock, title: 'Active Orders', value: stats.activeOrders, color: 'yellow' },
          { icon: TrendingUp, title: 'Avg Order Value', value: `₹${stats.avgOrderValue.toFixed(2)}`, color: 'purple' },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center">
              <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHomePage;
