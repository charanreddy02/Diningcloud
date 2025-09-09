import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, Clock, CheckCircle, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toaster';
import jsPDF from 'jspdf';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  items: any[];
  special_instructions: string;
  created_at: string;
  updated_at: string;
}

interface Restaurant {
  name: string;
  phone?: string;
  address?: string;
}

interface Table {
  table_number: number;
}

const BillPage: React.FC = () => {
  const { slug, orderId } = useParams();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId && slug) {
      fetchOrderData();
    }
  }, [orderId, slug]);

  const fetchOrderData = async () => {
    try {
      // Fetch restaurant info
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('name, phone, address')
        .eq('slug', slug)
        .single();

      if (restaurantError) {
        console.error('Restaurant fetch error:', restaurantError);
        toast({
          type: 'error',
          title: 'Restaurant Not Found',
          description: 'Unable to find restaurant information'
        });
        return;
      }

      setRestaurant(restaurantData);

      // Fetch order info
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Order fetch error:', orderError);
        toast({
          type: 'error',
          title: 'Order Not Found',
          description: 'Unable to find order information'
        });
        return;
      }

      setOrder(orderData);

      // Fetch table info if table_id exists
      if (orderData.table_id) {
        const { data: tableData } = await supabase
          .from('tables')
          .select('table_number')
          .eq('id', orderData.table_id)
          .single();

        if (tableData) {
          setTable(tableData);
        }
      }

    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load bill information'
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!order || !restaurant) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(restaurant.name, 20, 30);
    
    doc.setFontSize(12);
    if (restaurant.address) {
      doc.text(restaurant.address, 20, 40);
    }
    if (restaurant.phone) {
      doc.text(`Phone: ${restaurant.phone}`, 20, 50);
    }
    
    // Order details
    doc.setFontSize(16);
    doc.text('BILL RECEIPT', 20, 70);
    
    doc.setFontSize(12);
    doc.text(`Order ID: #${order.id.slice(0, 8)}`, 20, 85);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 95);
    doc.text(`Time: ${new Date(order.created_at).toLocaleTimeString()}`, 20, 105);
    
    if (table) {
      doc.text(`Table: ${table.table_number}`, 20, 115);
    }
    
    if (order.customer_name) {
      doc.text(`Customer: ${order.customer_name}`, 20, 125);
    }
    
    // Items
    doc.text('ITEMS:', 20, 145);
    let yPosition = 155;
    
    order.items.forEach((item: any) => {
      doc.text(`${item.name} x${item.quantity}`, 20, yPosition);
      doc.text(`₹${item.total}`, 150, yPosition);
      yPosition += 10;
      
      if (item.variant) {
        doc.setFontSize(10);
        doc.text(`  Variant: ${item.variant.name}`, 25, yPosition);
        yPosition += 8;
      }
      
      if (item.addOns && item.addOns.length > 0) {
        doc.setFontSize(10);
        doc.text(`  Add-ons: ${item.addOns.map((addon: any) => addon.name).join(', ')}`, 25, yPosition);
        yPosition += 8;
      }
      
      doc.setFontSize(12);
      yPosition += 5;
    });
    
    // Total
    doc.setFontSize(14);
    doc.text(`TOTAL: ₹${order.total}`, 20, yPosition + 10);
    
    if (order.special_instructions) {
      doc.setFontSize(10);
      doc.text(`Special Instructions: ${order.special_instructions}`, 20, yPosition + 25);
    }
    
    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for dining with us!', 20, yPosition + 40);
    
    doc.save(`bill-${order.id.slice(0, 8)}.pdf`);
    
    toast({
      type: 'success',
      title: 'PDF Downloaded',
      description: 'Your bill has been downloaded successfully'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'in_preparation': return 'text-blue-600 bg-blue-100';
      case 'ready': return 'text-green-600 bg-green-100';
      case 'served': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bill Not Found</h1>
          <p className="text-gray-600 mb-6">The bill you're looking for doesn't exist.</p>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-500 flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link
              to={`/restaurant/${slug}/menu/${table?.table_number || 1}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Menu
            </Link>
            <div className="flex space-x-3">
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
              <button
                onClick={generatePDF}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Bill Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border overflow-hidden"
        >
          {/* Restaurant Header */}
          <div className="bg-blue-600 text-white px-6 py-8 text-center">
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            {restaurant.address && (
              <p className="mt-2 text-blue-100">{restaurant.address}</p>
            )}
            {restaurant.phone && (
              <p className="text-blue-100">📞 {restaurant.phone}</p>
            )}
          </div>

          {/* Bill Details */}
          <div className="px-6 py-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Bill Receipt</h2>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Order ID:</span> #{order.id.slice(0, 8)}</p>
                  <p><span className="font-medium">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                  <p><span className="font-medium">Time:</span> {new Date(order.created_at).toLocaleTimeString()}</p>
                  {table && (
                    <p><span className="font-medium">Table:</span> {table.table_number}</p>
                  )}
                  {order.customer_name && (
                    <p><span className="font-medium">Customer:</span> {order.customer_name}</p>
                  )}
                </div>
              </div>
              
              <div className={`flex items-center px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-2 capitalize">{order.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-b py-6">
              <h3 className="font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.name} <span className="text-gray-500">× {item.quantity}</span>
                      </h4>
                      {item.variant && (
                        <p className="text-sm text-gray-600">Variant: {item.variant.name}</p>
                      )}
                      {item.addOns && item.addOns.length > 0 && (
                        <p className="text-sm text-gray-600">
                          Add-ons: {item.addOns.map((addon: any) => addon.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{item.total}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="pt-6">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600">₹{order.total}</span>
              </div>
            </div>

            {/* Special Instructions */}
            {order.special_instructions && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Special Instructions:</h4>
                <p className="text-gray-600">{order.special_instructions}</p>
              </div>
            )}

            {/* Payment Status */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">Payment Pending</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Please pay at the restaurant counter before leaving.
              </p>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-gray-500 text-sm">
              <p>Thank you for dining with us!</p>
              <p className="mt-1">We hope you enjoyed your meal.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BillPage;
