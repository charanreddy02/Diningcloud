import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Customer {
  name: string;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  last_visit: string;
}

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [restaurantSlug]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = customers.filter(customer => {
      return (
        customer.name.toLowerCase().includes(lowercasedFilter) ||
        customer.phone?.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredCustomers(filteredData);
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      // Aggregate customer data from orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, total, created_at')
        .eq('restaurant_id', restaurant.id)
        .not('customer_name', 'is', null)
        .neq('customer_name', '');

      if (error) throw error;

      const customerData = orders.reduce((acc, order) => {
        const key = `${order.customer_name}-${order.customer_phone || ''}`;
        if (!acc[key]) {
          acc[key] = {
            name: order.customer_name,
            phone: order.customer_phone,
            total_orders: 0,
            total_spent: 0,
            last_visit: order.created_at,
          };
        }
        acc[key].total_orders += 1;
        acc[key].total_spent += order.total;
        if (new Date(order.created_at) > new Date(acc[key].last_visit)) {
          acc[key].last_visit = order.created_at;
        }
        return acc;
      }, {} as { [key: string]: Customer });

      const customerList = Object.values(customerData).sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime());

      setCustomers(customerList);
      setFilteredCustomers(customerList);

    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch customer data.' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredCustomers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "BiteDesk_Customers.xlsx");
    toast({type: 'success', title: 'Download Started', description: 'Customer data is being downloaded.'});
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Customer Data</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <button onClick={handleDownload} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>
      {loading ? (
        <div>Loading customer data...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Visit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.total_orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{customer.total_spent.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(customer.last_visit).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && <div className="text-center py-10 text-gray-500">No customers found.</div>}
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
