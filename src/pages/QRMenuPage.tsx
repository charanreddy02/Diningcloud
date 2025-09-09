import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ShoppingCart, X, Clock, Star, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toaster';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  variants?: { name: string; price: number }[];
  add_ons?: { name: string; price: number }[];
  available: boolean;
  image_url?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: { name: string; price: number };
  addOns: { name: string; price: number }[];
  total: number;
}

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  address?: string;
}

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

  // Customer information for order
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    if (slug) {
      fetchRestaurantAndMenu();
    }
  }, [slug]);

  const fetchRestaurantAndMenu = async () => {
    try {
      // Fetch restaurant info
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (restaurantError) {
        console.error('Restaurant fetch error:', restaurantError);
        toast({
          type: 'error',
          title: 'Restaurant Not Found',
          description: 'The restaurant you\'re looking for doesn\'t exist.'
        });
        return;
      }

      setRestaurant(restaurantData);

      // Fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .eq('available', true)
        .order('category');

      if (menuError) {
        console.error('Menu fetch error:', menuError);
      } else {
        setMenuItems(menuData || []);
      }

    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load restaurant menu'
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (item: MenuItem, variant?: { name: string; price: number }, addOns: { name: string; price: number }[] = []) => {
    const basePrice = variant ? variant.price : item.price;
    const addOnsTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
    const totalPrice = basePrice + addOnsTotal;

    const cartItem: CartItem = {
      id: `${item.id}-${Date.now()}-${Math.random()}`,
      name: item.name,
      price: basePrice,
      quantity: 1,
      variant,
      addOns,
      total: totalPrice
    };

    setCart(prev => [...prev, cartItem]);
    toast({
      type: 'success',
      title: 'Added to Cart',
      description: `${item.name} has been added to your cart`
    });
  };

  const updateCartItemQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(prev => prev.filter(item => item.id !== cartItemId));
    } else {
      setCart(prev => prev.map(item => 
        item.id === cartItemId 
          ? { ...item, quantity: newQuantity, total: (item.price + item.addOns.reduce((sum, addon) => sum + addon.price, 0)) * newQuantity }
          : item
      ));
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast({
        type: 'error',
        title: 'Empty Cart',
        description: 'Please add items to your cart before placing an order'
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        type: 'error',
        title: 'Customer Name Required',
        description: 'Please enter your name to place the order'
      });
      return;
    }

    setOrderLoading(true);

    try {
      // Get restaurant and branch info
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .single();

      const { data: branchData } = await supabase
        .from('branches')
        .select('id')
        .eq('restaurant_id', restaurantData?.id)
        .limit(1)
        .single();

      const { data: tableData } = await supabase
        .from('tables')
        .select('id')
        .eq('branch_id', branchData?.id)
        .eq('table_number', parseInt(table || '1'))
        .single();

      // Create order
      const orderData = {
        restaurant_id: restaurantData?.id,
        branch_id: branchData?.id,
        table_id: tableData?.id,
        items: cart,
        total: getCartTotal(),
        status: 'pending',
        source: 'qr_menu',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        special_instructions: specialInstructions.trim() || null
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        toast({
          type: 'error',
          title: 'Order Failed',
          description: 'Failed to place your order. Please try again.'
        });
        return;
      }

      // Create bill
      const { error: billError } = await supabase
        .from('bills')
        .insert([{
          order_id: order.id,
          total: getCartTotal(),
          status: 'pending'
        }]);

      if (billError) {
        console.error('Bill creation error:', billError);
      }

      toast({
        type: 'success',
        title: 'Order Placed!',
        description: `Your order has been placed successfully. Order ID: ${order.id.slice(0, 8)}`
      });

      // Redirect to bill page
      setTimeout(() => {
        navigate(`/restaurant/${slug}/bill/${order.id}`);
      }, 1500);

    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        type: 'error',
        title: 'Order Failed',
        description: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="text-sm text-gray-600">Table {table}</p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Cart</span>
              {getCartItemsCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {getCartItemsCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Restaurant Info */}
      {restaurant.description && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-gray-600">{restaurant.description}</p>
            {restaurant.phone && (
              <p className="text-sm text-gray-500 mt-2">📞 {restaurant.phone}</p>
            )}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-4 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <span className="text-lg font-bold text-blue-600">₹{item.price}</span>
                </div>
                
                {item.description && (
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                )}

                {/* Variants */}
                {item.variants && item.variants.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Variants:</h4>
                    <div className="space-y-1">
                      {item.variants.map((variant, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{variant.name}</span>
                          <span className="text-blue-600">+₹{variant.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add-ons */}
                {item.add_ons && item.add_ons.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Add-ons:</h4>
                    <div className="space-y-1">
                      {item.add_ons.map((addon, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{addon.name}</span>
                          <span className="text-blue-600">+₹{addon.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => addToCart(item)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">No menu items available in this category.</p>
          </div>
        )}
      </div>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-t-2xl md:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Your Order</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          {item.variant && (
                            <p className="text-sm text-gray-600">Variant: {item.variant.name}</p>
                          )}
                          {item.addOns.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Add-ons: {item.addOns.map(addon => addon.name).join(', ')}
                            </p>
                          )}
                          <p className="text-sm font-medium text-blue-600">₹{item.total}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Customer Information */}
                    <div className="border-t pt-4 space-y-3">
                      <h3 className="font-medium text-gray-900">Your Information</h3>
                      <input
                        type="text"
                        placeholder="Your Name *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number (Optional)"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        placeholder="Special Instructions (Optional)"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Order Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total: ₹{getCartTotal()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t">
                  <button
                    onClick={placeOrder}
                    disabled={orderLoading || !customerName.trim()}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {orderLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Placing Order...</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-5 w-5" />
                        <span>Place Order</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QRMenuPage;
