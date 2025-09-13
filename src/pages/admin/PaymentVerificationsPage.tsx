import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { Search } from 'lucide-react';
import { DatePickerWithRange } from '../../components/admin/DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

type Payment = any;

const PaymentVerificationsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { restaurantSlug } = useParams();
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  useEffect(() => {
    fetchPayments();
    const channel = supabase.channel('public:payments').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchPayments()).subscribe();
    return () => { supabase.removeChannel(channel) };
  }, [restaurantSlug]);

  useEffect(() => {
    let filtered = payments;

    if (date?.from && date?.to) {
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= date.from! && paymentDate <= date.to!;
      });
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.customer_name?.toLowerCase().includes(lowercasedFilter) ||
        p.utr_number?.toLowerCase().includes(lowercasedFilter)
      );
    }
    
    setFilteredPayments(filtered);
  }, [searchTerm, date, payments]);

  const fetchPayments = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      const { data, error } = await supabase
        .from('payments')
        .select('*, tables(table_number)')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Failed to fetch payments:', error);
      let description = error.message || 'An unknown error occurred.';
      if (error.code === '42501') {
        description = "You don't have permission to view payments. Please check the 'payments' table's Row Level Security (RLS) policies in your Supabase dashboard.";
      }
      toast({ type: 'error', title: 'Error', description });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('payments').update({ status: newStatus }).eq('id', paymentId);
      if (error) throw error;
      toast({ type: 'success', title: 'Success', description: 'Payment status updated.' });
      // Real-time subscription will trigger a refetch
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to update payment status.' });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        verified: 'bg-green-100 text-green-800 border-green-300',
        failed: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Payment Verifications</h2>
        <div className="flex items-center gap-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or UTR..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>
      {loading ? (
        <div>Loading payments...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTR / Ref No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{p.customer_name}</div>
                    <div className="text-sm text-gray-500">Table: {p.tables?.table_number || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.utr_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{p.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      className={`text-sm font-semibold rounded-md p-2 border capitalize ${getStatusColor(p.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="failed">Failed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 && <div className="text-center py-10 text-gray-500">No payments found for the selected criteria.</div>}
        </div>
      )}
    </div>
  );
};

export default PaymentVerificationsPage;
