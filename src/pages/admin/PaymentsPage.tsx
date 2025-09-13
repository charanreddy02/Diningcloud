import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { Upload, Trash2, Image } from 'lucide-react';

const PaymentsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    payment_enabled: false,
    upi_qr_code: '',
    bank_details: ''
  });
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
        .select('payment_enabled, upi_qr_code, bank_details')
        .eq('slug', restaurantSlug)
        .single();

      if (error) throw error;

      setSettings({
        payment_enabled: data.payment_enabled || false,
        upi_qr_code: data.upi_qr_code || '',
        bank_details: data.bank_details || ''
      });
    } catch (error: any) {
      console.error('Failed to fetch payment settings:', error);
      let description = error.message || 'An unknown error occurred.';
      if (error.code === '42501') {
        description = "You don't have permission to view these settings. Please check RLS policies.";
      }
      toast({ type: 'error', title: 'Error', description });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQrCodeFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found for saving settings.");

      let qrCodeUrl = settings.upi_qr_code;

      if (qrCodeFile) {
        setIsUploading(true);
        const filePath = `${restaurant.id}/upi_qr_code`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('restaurant-assets')
          .upload(filePath, qrCodeFile, {
            cacheControl: '3600',
            upsert: true,
          });
        
        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error("Storage bucket 'restaurant-assets' not found. Please create it in your Supabase dashboard and make it public.");
          }
          throw uploadError;
        }

        const { data: urlData } = supabase.storage.from('restaurant-assets').getPublicUrl(uploadData.path);
        qrCodeUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`; // bust cache
        setQrCodeFile(null);
        setIsUploading(false);
      }

      const { error } = await supabase
        .from('restaurants')
        .update({
          payment_enabled: settings.payment_enabled,
          upi_qr_code: qrCodeUrl,
          bank_details: settings.bank_details
        })
        .eq('id', restaurant.id);

      if (error) throw error;
      
      setSettings(prev => ({...prev, upi_qr_code: qrCodeUrl}));
      toast({ type: 'success', title: 'Success', description: 'Payment settings saved successfully.' });
    } catch (error: any) {
      console.error('Failed to save payment settings:', error);
      let description = error.message || 'An unknown error occurred.';
      if (error.code === '42501') {
        description = "You don't have permission to save these settings. Check RLS policies.";
      }
      toast({ type: 'error', title: 'Error', description });
    } finally {
      setSaving(false);
      setIsUploading(false);
    }
  };

  const handleDeleteQRCode = async () => {
    if (!settings.upi_qr_code || !window.confirm("Are you sure you want to delete the current QR code?")) return;

    setSaving(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      const filePath = `${restaurant.id}/upi_qr_code`;
      await supabase.storage.from('restaurant-assets').remove([filePath]);
      const { error: updateError } = await supabase.from('restaurants').update({ upi_qr_code: null }).eq('id', restaurant.id);
      if (updateError) throw updateError;
      
      setSettings(prev => ({ ...prev, upi_qr_code: '' }));
      toast({ type: 'success', title: 'QR Code Deleted' });
    } catch (error: any) {
      toast({ type: 'error', title: 'Deletion Failed', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading payment settings...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Settings</h2>
      
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.payment_enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, payment_enabled: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Online Payments for Customers</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-8">If enabled, customers can choose to pay online via UPI from the QR menu.</p>
        </div>

        {settings.payment_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">UPI QR Code</label>
                <div className="p-4 border-2 border-dashed rounded-lg space-y-4">
                  {settings.upi_qr_code ? (
                    <div className="text-center">
                      <img src={settings.upi_qr_code} alt="UPI QR Code" className="max-w-xs mx-auto rounded-md mb-4" />
                      <button type="button" onClick={handleDeleteQRCode} className="text-red-600 text-sm font-medium flex items-center gap-1 mx-auto hover:text-red-800">
                        <Trash2 size={14} /> Delete QR Code
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Image className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">No QR code uploaded.</p>
                    </div>
                  )}
                  <div className="relative">
                    <label className="cursor-pointer w-full flex justify-center items-center gap-2 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50">
                      <Upload size={16} />
                      <span>{settings.upi_qr_code ? 'Upload New QR Code' : 'Upload QR Code'}</span>
                      <input type="file" onChange={handleFileChange} className="sr-only" accept="image/png, image/jpeg, image/webp" />
                    </label>
                    {qrCodeFile && <p className="text-sm text-center mt-2 text-gray-600">New file selected: {qrCodeFile.name}</p>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Please ensure you have a Supabase Storage bucket named `restaurant-assets` with public access enabled.</p>
              </div>

              <div>
                <label htmlFor="bank_details" className="block text-sm font-medium text-gray-700 mb-1">Bank Account Details (Optional)</label>
                <textarea
                  id="bank_details"
                  value={settings.bank_details}
                  onChange={(e) => setSettings(prev => ({ ...prev, bank_details: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Account Holder Name&#10;Bank Name&#10;Account Number&#10;IFSC Code"
                />
              </div>
            </>
        )}

        <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || isUploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Payment Settings'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentsPage;
