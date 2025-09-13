import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ShoppingCart, X, Clock, Info, CreditCard, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toaster';
import VariantSelectionModal from '../components/menu/VariantSelectionModal';

// Interfaces
interface MenuItem { id: string; name: string; description: string; price: number; category: string; variants?: { name: string; price: number }[]; add_ons?: { name: string; price: number }[]; available: boolean; image_url?: string; }
interface CartItem { id: string; menuItemId: string; name: string; price: number; quantity: number; variant?: { name: string; price: number }; addOns: { name: string; price: number }[]; total: number; }
interface Restaurant { id: string; name: string; description?: string; phone?: string; address?: string; payment_enabled?: boolean; upi_qr_code?: string; cgst_rate?: number; sgst_rate?: number; }

const QRMenuPage: React.FC = () => {
  const { slug, table } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<MenuItem | null>(null);
  const [paymentStep, setPaymentStep] = useState<'cart' | 'payment_choice' | 'pay_online'>('cart');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [utrNumber, setUtrNumber] = useState('');

  useEffect(() => {
    if (slug) fetchRestaurantAndMenu();
  }, [slug]);

  const fetchRestaurantAndMenu = async () => {
    try {
      const { data: restaurantData, error: restaurantError } = await supabase.from('restaurants').select('*').eq('slug', slug).single();
      if (restaurantError || !restaurantData) throw new Error('Restaurant not found');
      setRestaurant(restaurantData);

      const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantData.id).eq('available', true).order('category');
      if (menuError) throw menuError;
      setMenuItems(menuData || []);
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem, variant?: { name: string; price: number }, addOns: { name: string; price: number }[] = []) => {
    if (item.variants && item.variants.length > 0 && !variant) {
      setSelectedItemForVariants(item);
      return;
    }
    const basePrice = variant ? variant.price : item.price;
    const addOnsTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
    const totalPrice = basePrice + addOnsTotal;

    setCart(prev => [...prev, { id: `${item.id}-${Date.now()}`, menuItemId: item.id, name: item.name, price: basePrice, quantity: 1, variant, addOns, total: totalPrice }]);
    toast({ type: 'success', title: 'Added to Cart' });
    setSelectedItemForVariants(null);
  };

  const updateCartItemQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== cartItemId));
    } else {
      setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: newQuantity } : item));
    }
  };

  const getCartSubtotal = () => cart.reduce((sum, item) => sum + item.total * item.quantity, 0);
  const getCartItemsCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  const proceedToPayment = () => {
    if (!customerName.trim()) {
      toast({ type: 'error', title: 'Customer Name Required', description: 'Please enter your name.' });
      return;
    }
    if (restaurant?.payment_enabled) {
      setPaymentStep('payment_choice');
    } else {
      placeOrder('pay_at_counter');
    }
  };

  const placeOrder = async (paymentMethod: 'pay_online' | 'pay_at_counter') => {
    if (cart.length === 0) return;
    setOrderLoading(true);

    try {
      if (paymentMethod === 'pay_online' && !utrNumber.trim()) {
        throw new Error('Please enter the UTR/Transaction ID after payment.');
      }
      
      const { data: restaurantData } = await supabase.from('restaurants').select('id, cgst_rate, sgst_rate').eq('slug', slug).single();
      if (!restaurantData) throw new Error("Restaurant not found.");
      
      const { data: branchData } = await supabase.from('branches').select('id').eq('restaurant_id', restaurantData.id).limit(1).single();
      if (!branchData) throw new Error("Branch not found.");

      const { data: tableData } = await supabase.from('tables').select('id').eq('branch_id', branchData.id).eq('table_number', parseInt(table || '1')).single();

      const subtotal = getCartSubtotal();
      const cgstRate = restaurantData.cgst_rate || 0;
      const sgstRate = restaurantData.sgst_rate || 0;
      const cgstAmount = (subtotal * cgstRate) / 100;
      const sgstAmount = (subtotal * sgstRate) / 100;
      const grandTotal = subtotal + cgstAmount + sgstAmount;

      const { data: order, error: orderError } = await supabase.from('orders').insert([{
        restaurant_id: restaurantData.id,
        branch_id: branchData.id,
        table_id: tableData?.id,
        items: cart.map(({ id, ...rest }) => rest), // Remove client-side id
        total: subtotal, // Store subtotal in the orders table
        status: 'pending',
        source: 'online',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        special_instructions: specialInstructions.trim() || null
      }]).select().single();

      if (orderError) throw orderError;
      
      if (paymentMethod === 'pay_online') {
        await supabase.from('payments').insert([{
          order_id: order.id,
          restaurant_id: restaurantData.id,
          table_id: tableData?.id,
          customer_name: customerName.trim(),
          utr_number: utrNumber.trim(),
          amount: grandTotal,
          status: 'pending'
        }]);
      }

      toast({ type: 'success', title: 'Order Placed!', description: `Your order ID is ${order.id.slice(0, 8)}` });
      setTimeout(() => navigate(`/restaurant/${slug}/bill/${order.id}`), 1500);

    } catch (error: any) {
      toast({ type: 'error', title: 'Order Failed', description: error.message });
    } finally {
      setOrderLoading(false);
    }
  };

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];
  const filteredItems = selectedCategory === 'All' ? menuItems : menuItems.filter(item => item.category === selectedCategory);

  if (loading) return <div>Loading...</div>;
  if (!restaurant) return <div>Restaurant not found.</div>;

  const CartView = () => {
    const subtotal = getCartSubtotal();
    const cgstRate = restaurant?.cgst_rate || 0;
    const sgstRate = restaurant?.sgst_rate || 0;
    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const grandTotal = subtotal + cgstAmount + sgstAmount;

    return (
      <>
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="text-center py-8"><ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" /><p>Your cart is empty</p></div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    {item.variant && <p className="text-sm text-gray-600">Variant: {item.variant.name}</p>}
                    <p className="text-sm font-medium text-blue-600">₹{item.total.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-medium">Your Information</h3>
                <input type="text" placeholder="Your Name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
                <input type="tel" placeholder="Phone Number (Optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                <textarea placeholder="Special Instructions (Optional)" value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                {cgstAmount > 0 && <div className="flex justify-between text-gray-600"><span>CGST @ {cgstRate}%</span><span>₹{cgstAmount.toFixed(2)}</span></div>}
                {sgstAmount > 0 && <div className="flex justify-between text-gray-600"><span>SGST @ {sgstRate}%</span><span>₹{sgstAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-6 border-t"><button onClick={proceedToPayment} disabled={orderLoading || !customerName.trim()} className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">Proceed to Payment</button></div>
        )}
      </>
    );
  }

  const PaymentChoiceView = () => {
    const subtotal = getCartSubtotal();
    const cgstRate = restaurant?.cgst_rate || 0;
    const sgstRate = restaurant?.sgst_rate || 0;
    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const grandTotal = subtotal + cgstAmount + sgstAmount;

    return (
      <>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-lg font-semibold text-center">Choose Payment Method</h3>
          <p className="text-center text-gray-600">Your total is ₹{grandTotal.toFixed(2)}</p>
          <button onClick={() => setPaymentStep('pay_online')} className="w-full flex items-center justify-center gap-3 p-4 border rounded-lg hover:bg-gray-50">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <div><p className="font-semibold">Pay Online</p><p className="text-sm text-gray-500">Use UPI to pay now</p></div>
          </button>
          <button onClick={() => placeOrder('pay_at_counter')} className="w-full flex items-center justify-center gap-3 p-4 border rounded-lg hover:bg-gray-50">
            <Shield className="h-6 w-6 text-green-600" />
            <div><p className="font-semibold">Pay at Counter</p><p className="text-sm text-gray-500">Pay after your meal</p></div>
          </button>
        </div>
        <div className="p-6 border-t"><button onClick={() => setPaymentStep('cart')} className="w-full text-gray-600 py-2">Back to Cart</button></div>
      </>
    );
  }

  const PayOnlineView = () => {
    const subtotal = getCartSubtotal();
    const cgstRate = restaurant?.cgst_rate || 0;
    const sgstRate = restaurant?.sgst_rate || 0;
    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const grandTotal = subtotal + cgstAmount + sgstAmount;

    return (
      <>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-center">
          <h3 className="text-lg font-semibold">Pay Online via UPI</h3>
          {restaurant.upi_qr_code ? <img src={restaurant.upi_qr_code} alt="UPI QR Code" className="mx-auto my-4 border rounded-lg max-w-xs" /> : <p>QR Code not available.</p>}
          <p className="font-bold text-xl">Amount: ₹{grandTotal.toFixed(2)}</p>
          <p className="text-sm text-gray-600">After payment, enter the UTR/Transaction ID below to confirm.</p>
          <input type="text" placeholder="Enter UTR/Transaction ID *" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-center" required />
        </div>
        <div className="p-6 border-t">
          <button onClick={() => placeOrder('pay_online')} disabled={orderLoading || !utrNumber.trim()} className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">{orderLoading ? 'Placing Order...' : 'Confirm & Place Order'}</button>
          <button onClick={() => setPaymentStep('payment_choice')} className="w-full text-gray-600 py-2 mt-2">Back</button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div><h1 className="text-2xl font-bold">{restaurant.name}</h1><p className="text-sm text-gray-600">Table {table}</p></div>
            <button onClick={() => { setShowCart(true); setPaymentStep('cart'); }} className="relative bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" /><span>Cart</span>
              {getCartItemsCount() > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">{getCartItemsCount()}</span>}
            </button>
          </div>
        </div>
      </header>
      
      <div className="bg-white border-b sticky top-[81px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex space-x-1 py-4 overflow-x-auto">{categories.map((c) => <button key={c} onClick={() => setSelectedCategory(c)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${selectedCategory === c ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{c}</button>)}</div></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
              {item.image_url && <div className="aspect-w-4 aspect-h-3"><img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /></div>}
              <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2"><h3 className="text-lg font-semibold">{item.name}</h3><span className="text-lg font-bold text-blue-600">₹{item.price}</span></div>
                {item.description && <p className="text-gray-600 text-sm mb-3 flex-grow">{item.description}</p>}
                <button onClick={() => handleAddToCart(item)} className="w-full mt-auto bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center space-x-2"><Plus className="h-4 w-4" /><span>Add to Cart</span></button>
              </div>
            </motion.div>
          ))}
        </div>
        {filteredItems.length === 0 && <div className="text-center py-12"><Info className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3>No items found</h3></div>}
      </div>

      <AnimatePresence>{selectedItemForVariants && <VariantSelectionModal item={selectedItemForVariants} onClose={() => setSelectedItemForVariants(null)} onAddToCart={handleAddToCart} />}</AnimatePresence>

      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center" onClick={() => setShowCart(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-white w-full max-w-2xl max-h-[90vh] rounded-t-2xl md:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">Your Order</h2><button onClick={() => setShowCart(false)}><X className="h-6 w-6" /></button></div></div>
              {paymentStep === 'cart' && <CartView />}
              {paymentStep === 'payment_choice' && <PaymentChoiceView />}
              {paymentStep === 'pay_online' && <PayOnlineView />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QRMenuPage;
