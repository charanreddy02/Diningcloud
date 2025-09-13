import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { Plus, Trash2 } from 'lucide-react';

type Profile = any;

const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: '', role: 'waiter', full_name: '' });
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, [restaurantSlug]);

  const fetchStaff = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      const { data, error } = await supabase.from('profiles').select('*').eq('restaurant_id', restaurant.id);
      if (error) throw error;
      setStaff(data || []);
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch staff.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.email || !restaurantSlug) return;
    setIsAdding(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      // Find the user's profile by email. The user must exist.
      const { data: userProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, restaurant_id')
        .eq('email', newStaff.email)
        .single();
      
      if (findError || !userProfile) {
        throw new Error(`User with email ${newStaff.email} not found. Please ask them to sign up for a BiteDesk account first.`);
      }

      if (userProfile.restaurant_id) {
        throw new Error(`This user is already assigned to another restaurant.`);
      }

      // Update the existing profile to assign the role and restaurant
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          restaurant_id: restaurant.id,
          role: newStaff.role,
          full_name: newStaff.full_name,
        })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      toast({ type: 'success', title: 'Success', description: `${newStaff.full_name} has been added as a ${newStaff.role}.` });
      setNewStaff({ email: '', role: 'waiter', full_name: '' });
      fetchStaff();
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: error.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveStaff = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to remove this staff member?")) return;
    try {
      // This just dissociates them from the restaurant, doesn't delete their account.
      const { error } = await supabase.from('profiles').update({ restaurant_id: null, role: 'user' }).eq('id', profileId);
      if (error) throw error;
      toast({ type: 'success', title: 'Success', description: 'Staff member removed.' });
      fetchStaff();
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to remove staff.' });
    }
  };
  
  const roles = ['owner', 'manager', 'waiter', 'kitchen', 'cashier'];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Staff Management</h2>
      
      <form onSubmit={handleAddStaff} className="bg-white p-4 rounded-lg border space-y-4">
        <h3 className="font-medium">Add New Staff</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" value={newStaff.full_name} onChange={e => setNewStaff(p => ({ ...p, full_name: e.target.value }))} placeholder="Full Name" className="p-2 border rounded-lg" required />
            <input type="email" value={newStaff.email} onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))} placeholder="Email Address" className="p-2 border rounded-lg" required />
            <select value={newStaff.role} onChange={e => setNewStaff(p => ({ ...p, role: e.target.value }))} className="p-2 border rounded-lg bg-white">
                {roles.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
        </div>
        <button type="submit" disabled={isAdding} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
          <Plus size={18} /> {isAdding ? 'Adding...' : 'Add Staff'}
        </button>
        <p className="text-xs text-gray-500">Note: The user must have a BiteDesk account registered with this email before you can add them as staff.</p>
      </form>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map(member => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.full_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{member.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleRemoveStaff(member.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1">
                      <Trash2 size={16} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && !loading && <div className="text-center py-10 text-gray-500">No staff members found.</div>}
        </div>
      </div>
    </div>
  );
};

export default StaffPage;
