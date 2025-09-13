import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, Clock, CheckCircle, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toaster';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { numToWords } from 'num-to-words';

interface Order {
  id: string;
  customer_name: string;
  total: number; // This is the subtotal
  status: string;
  items: any[];
  special_instructions: string;
  created_at: string;
  updated_at: string;
  table_id: string;
}

interface Restaurant {
  name: string;
  phone?: string;
  address?: string;
  gstin?: string;
  cgst_rate?: number;
  sgst_rate?: number;
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
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('name, phone, address, gstin, cgst_rate, sgst_rate')
        .eq('slug', slug)
        .single();
      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (orderError) throw orderError;
      setOrder(orderData);

      if (orderData.table_id) {
        const { data: tableData } = await supabase.from('tables').select('table_number').eq('id', orderData.table_id).single();
        if (tableData) setTable(tableData);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast({ type: 'error', title: 'Error', description: 'Failed to load bill information' });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!order || !restaurant) return;

    const doc = new jsPDF();
    const subtotal = order.total;
    const cgstRate = restaurant.cgst_rate || 0;
    const sgstRate = restaurant.sgst_rate || 0;
    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const grandTotal = subtotal + cgstAmount + sgstAmount;
    const grandTotalInWords = numToWords(Math.round(grandTotal));

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`🍴 ${restaurant.name}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(restaurant.address || '', doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
    if (restaurant.phone) doc.text(`Ph: ${restaurant.phone}`, doc.internal.pageSize.getWidth() / 2, 34, { align: 'center' });
    if (restaurant.gstin) doc.text(`GSTIN: ${restaurant.gstin}`, doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
    
    doc.line(14, 45, 196, 45); // horizontal line

    // Bill Details
    doc.setFontSize(10);
    doc.text(`Bill No: ${order.id.slice(0, 6).toUpperCase()}`, 14, 52);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-GB')}`, 196, 52, { align: 'right' });
    doc.text(`Table: ${table?.table_number || 'N/A'}`, 14, 58);
    doc.text(`Customer: ${order.customer_name || 'Guest'}`, 196, 58, { align: 'right' });

    doc.line(14, 63, 196, 63);

    // Items Table
    const tableData = order.items.map((item: any, index: number) => [
      index + 1,
      item.name + (item.variant ? ` (${item.variant.name})` : ''),
      item.quantity,
      item.price.toFixed(2),
      (item.quantity * item.price).toFixed(2)
    ]);

    (doc as any).autoTable({
      head: [['S.No', 'Item', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      startY: 65,
      theme: 'plain',
      headStyles: { fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left', cellWidth: 80 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY;
    doc.line(14, finalY + 2, 196, finalY + 2);

    // Totals
    let yPos = finalY + 8;
    const rightAlign = 196;
    const leftAlign = 130;
    doc.setFontSize(10);
    doc.text('Subtotal:', leftAlign, yPos, { align: 'right' });
    doc.text(`₹${subtotal.toFixed(2)}`, rightAlign, yPos, { align: 'right' });
    
    if (cgstAmount > 0) {
        yPos += 6;
        doc.text(`CGST @ ${cgstRate}%:`, leftAlign, yPos, { align: 'right' });
        doc.text(`₹${cgstAmount.toFixed(2)}`, rightAlign, yPos, { align: 'right' });
    }
    if (sgstAmount > 0) {
        yPos += 6;
        doc.text(`SGST @ ${sgstRate}%:`, leftAlign, yPos, { align: 'right' });
        doc.text(`₹${sgstAmount.toFixed(2)}`, rightAlign, yPos, { align: 'right' });
    }
    
    doc.line(130, yPos + 3, 196, yPos + 3);
    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', leftAlign, yPos, { align: 'right' });
    doc.text(`₹${grandTotal.toFixed(2)}`, rightAlign, yPos, { align: 'right' });
    
    yPos += 8;
    doc.line(14, yPos, 196, yPos);
    
    // Amount in words
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Amount in Words: ${grandTotalInWords.charAt(0).toUpperCase() + grandTotalInWords.slice(1)} Only`, 14, yPos + 6);
    yPos += 10;
    doc.line(14, yPos, 196, yPos);

    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for dining with us! Visit Again 🙏', doc.internal.pageSize.getWidth() / 2, yPos + 8, { align: 'center' });

    doc.save(`bill-${order.id.slice(0, 8)}.pdf`);
    toast({ type: 'success', title: 'PDF Downloaded' });
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
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
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
          <Link to="/" className="text-blue-600 hover:text-blue-500 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = order.total;
  const cgstAmount = (subtotal * (restaurant.cgst_rate || 0)) / 100;
  const sgstAmount = (subtotal * (restaurant.sgst_rate || 0)) / 100;
  const grandTotal = subtotal + cgstAmount + sgstAmount;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to={`/restaurant/${slug}/menu/${table?.table_number || 1}`} className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" /> Back to Menu
            </Link>
            <div className="flex space-x-3">
              <button onClick={() => window.print()} className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Printer className="h-4 w-4 mr-2" /> Print
              </button>
              <button onClick={generatePDF} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-8 text-center">
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            {restaurant.address && <p className="mt-2 text-blue-100">{restaurant.address}</p>}
            {restaurant.phone && <p className="text-blue-100">📞 {restaurant.phone}</p>}
          </div>

          <div className="px-6 py-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Bill Receipt</h2>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Order ID:</span> #{order.id.slice(0, 8)}</p>
                  <p><span className="font-medium">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                  {table && <p><span className="font-medium">Table:</span> {table.table_number}</p>}
                  {order.customer_name && <p><span className="font-medium">Customer:</span> {order.customer_name}</p>}
                </div>
              </div>
              <div className={`flex items-center px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-2 capitalize">{order.status.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="border-t border-b py-6">
              <h3 className="font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name} <span className="text-gray-500">× {item.quantity}</span></h4>
                      {item.variant && <p className="text-sm text-gray-600">Variant: {item.variant.name}</p>}
                    </div>
                    <p className="font-medium text-gray-900">₹{item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              {cgstAmount > 0 && <div className="flex justify-between text-gray-600"><span>CGST @ {restaurant.cgst_rate || 0}%</span><span>₹{cgstAmount.toFixed(2)}</span></div>}
              {sgstAmount > 0 && <div className="flex justify-between text-gray-600"><span>SGST @ {restaurant.sgst_rate || 0}%</span><span>₹{sgstAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                <span>Grand Total:</span>
                <span className="text-blue-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-8 text-center text-gray-500 text-sm">
              <p>Thank you for dining with us!</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default BillPage;
