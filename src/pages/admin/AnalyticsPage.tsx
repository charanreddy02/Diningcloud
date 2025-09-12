import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { DatePickerWithRange } from '../../components/admin/DatePickerWithRange';

type Order = any;

const AnalyticsPage: React.FC = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { restaurantSlug } = useParams();
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    fetchOrders();
  }, [restaurantSlug]);

  useEffect(() => {
    if (!date?.from || !date?.to) {
      setFilteredOrders(allOrders);
      return;
    }
    const filtered = allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= date.from! && orderDate <= date.to!;
    });
    setFilteredOrders(filtered);
  }, [date, allOrders]);

  const fetchOrders = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      const { data, error } = await supabase.from('orders').select('*').eq('restaurant_id', restaurant.id);
      if (error) throw error;
      setAllOrders(data || []);
      setFilteredOrders(data || []);
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch analytics data.' });
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const salesData = filteredOrders.reduce((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + order.total;
    return acc;
  }, {} as { [key: string]: number });

  const chartSalesData = Object.entries(salesData).map(([name, sales]) => ({ name, sales }));

  const topItemsData = filteredOrders.flatMap(o => o.items).reduce((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + item.quantity;
    return acc;
  }, {} as { [key: string]: number });

  const chartTopItemsData = Object.entries(topItemsData).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  const sourceData = filteredOrders.reduce((acc, order) => {
    const sourceName = order.source || 'Unknown';
    acc[sourceName] = (acc[sourceName] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  
  const chartSourceData = Object.entries(sourceData).map(([name, value]) => ({ name, value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Analytics & Reports</h2>
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>
      {loading ? (
        <div>Loading analytics...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-4">Daily Sales (₹)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-4">Top 5 Selling Items</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartTopItemsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order Source */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-4">Order Source</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={chartSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {chartSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
