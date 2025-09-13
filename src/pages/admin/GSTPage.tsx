import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';

const GSTPage: React.FC = () => {
  const [settings, setSettings] = useState({
    gstin: '',
    cgst_rate: 0,
    sgst_rate: 0
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
        .select('gstin, cgst_rate, sgst_rate')
        .eq('slug', restaurantSlug)
        .single();

      if (error) throw error;

      setSettings({
        gstin: data.gstin || '',
        cgst_rate: data.cgst_rate || 0,
        sgst_rate: data.sgst_rate || 0
      });
    } catch (error: any) {
      console.error('Failed to fetch GST settings:', error);
      let description = error.message || 'An unknown error occurred.';
      if (error.code === '42501') { // PostgreSQL permission denied
        description = "You don't have permission to view these settings. Please check the table's Row Level Security (RLS) policies in your Supabase dashboard.";
      }
      toast({ type: 'error', title: 'Error', description });
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
          gstin: settings.gstin,
          cgst_rate: settings.cgst_rate,
          sgst_rate: settings.sgst_rate
        })
        .eq('slug', restaurantSlug);

      if (error) throw error;

      toast({ type: 'success', title: 'Success', description: 'GST settings saved successfully.' });
    } catch (error: any) {
      console.error('Failed to save GST settings:', error);
      let description = error.message || 'An unknown error occurred.';
      if (error.code === '42501') { // PostgreSQL permission denied
        description = "You don't have permission to save these settings. Please check the table's Row Level Security (RLS) policies for UPDATE operations in your Supabase dashboard.";
      }
      toast({ type: 'error', title: 'Error', description });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings.gstin) {
    return <div>Loading GST settings...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">GST Settings</h2>
      
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
          <input
            id="gstin"
            type="text"
            value={settings.gstin}
            onChange={(e) => setSettings(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 36ABCDE1234F1Z5"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="cgst_rate" className="block text-sm font-medium text-gray-700 mb-1">CGST Rate (%)</label>
              <input
                id="cgst_rate"
                type="number"
                step="0.01"
                value={settings.cgst_rate}
                onChange={(e) => setSettings(prev => ({ ...prev, cgst_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2.5"
              />
            </div>

            <div>
              <label htmlFor="sgst_rate" className="block text-sm font-medium text-gray-700 mb-1">SGST Rate (%)</label>
              <input
                id="sgst_rate"
                type="number"
                step="0.01"
                value={settings.sgst_rate}
                onChange={(e) => setSettings(prev => ({ ...prev, sgst_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2.5"
              />
            </div>
        </div>
        
        <p className="text-xs text-gray-500">These tax rates will be applied to all bills generated for customers.</p>

        <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save GST Settings'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default GSTPage;
