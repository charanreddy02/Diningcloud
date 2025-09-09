import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';

type Bill = any;

const BillsPage: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
  }, [restaurantSlug]);

  const fetchBills = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          orders (
            id,
            customer_name
          )
        `)
        // A bit tricky to filter by restaurant_id through a join with RLS.
        // This relies on RLS on the `bills` and `orders` tables.
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch bills.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (billId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('bills').update({ status: newStatus }).eq('id', billId);
      if (error) throw error;
      toast({ type: 'success', title: 'Success', description: 'Bill status updated.' });
      fetchBills();
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to update bill status.' });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Bills & Payments</h2>
      {loading ? (
        <div>Loading bills...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map(bill => (
                <tr key={bill.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{bill.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Order #{bill.orders.id.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500">{bill.orders.customer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(bill.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{bill.total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={bill.status}
                      onChange={(e) => handleStatusChange(bill.id, e.target.value)}
                      className={`text-sm font-semibold rounded-md p-2 border capitalize ${getStatusColor(bill.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bills.length === 0 && <div className="text-center py-10 text-gray-500">No bills found.</div>}
        </div>
      )}
    </div>
  );
};

export default BillsPage;
