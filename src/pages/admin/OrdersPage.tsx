import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

type Order = any; // Replace with a proper type from your database types

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Change received!', payload);
        fetchOrders(); // Refetch on any change
        toast({type: 'info', title: 'New Update', description: 'Order list has been updated.'})
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantSlug]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = orders.filter(item => {
      return (
        item.customer_name?.toLowerCase().includes(lowercasedFilter) ||
        item.id.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredOrders(filteredData);
  }, [searchTerm, orders]);

  const fetchOrders = async () => {
    if (!restaurantSlug) return;
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      const { data, error } = await supabase
        .from('orders')
        .select('*, tables(table_number)')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch orders.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      toast({ type: 'success', title: 'Status Updated', description: `Order status changed to ${newStatus.replace(/_/g, ' ')}.` });
      // The real-time subscription will handle the UI update
    } catch (error: any) {
      toast({ type: 'error', title: 'Update Failed', description: 'Could not update order status.' });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      in_preparation: 'bg-blue-100 text-blue-800 border-blue-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      served: 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-gray-200 text-gray-800 border-gray-400',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const orderStatuses = ['pending', 'in_preparation', 'ready', 'served', 'completed', 'cancelled'];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Real-time Order Management</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>
      {loading ? (
        <div className="text-center py-10">Loading orders...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <motion.tr key={order.id} layout>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</div>
                    <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_phone}</div>
                    <div className="text-sm text-gray-500">
                      Table: {order.tables?.table_number || 'N/A'} | Source: {order.source}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{order.total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`text-sm font-semibold rounded-md p-2 border capitalize ${getStatusColor(order.status)}`}
                    >
                      {orderStatuses.map(status => (
                        <option key={status} value={status} className="capitalize">{status.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-10 text-gray-500">No orders found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
