import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';

const SettingsPage: React.FC = () => {
  const [restaurant, setRestaurant] = useState({
    name: '',
    description: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    fetchRestaurantData();
  }, [restaurantSlug]);

  const fetchRestaurantData = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('name, description, phone, address')
        .eq('slug', restaurantSlug)
        .single();

      if (error) throw error;

      setRestaurant({
        name: data.name || '',
        description: data.description || '',
        phone: data.phone || '',
        address: data.address || ''
      });
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: restaurant.name,
          description: restaurant.description,
          phone: restaurant.phone,
          address: restaurant.address
        })
        .eq('slug', restaurantSlug);

      if (error) throw error;

      toast({ type: 'success', title: 'Success', description: 'Settings saved successfully.' });
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Restaurant Settings</h2>
      
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
          <input
            type="text"
            value={restaurant.name}
            onChange={(e) => setRestaurant(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={restaurant.description}
            onChange={(e) => setRestaurant(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={restaurant.phone}
            onChange={(e) => setRestaurant(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            value={restaurant.address}
            onChange={(e) => setRestaurant(prev => ({ ...prev, address: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
