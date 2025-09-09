import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { Plus, Trash2, QrCode } from 'lucide-react';
import QRCode from 'qrcode.react';

type Table = any;

const TablesPage: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    fetchTables();
  }, [restaurantSlug]);

  const fetchTables = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");
      
      const { data: branches } = await supabase.from('branches').select('id').eq('restaurant_id', restaurant.id).limit(1).single();
      if (!branches) {
          // If no branch, create one
          const { data: newBranch } = await supabase.from('branches').insert({restaurant_id: restaurant.id, name: 'Main Branch'}).select().single();
          if(!newBranch) throw new Error("Could not create default branch");
          setTables([]); // No tables yet for the new branch
          return;
      }

      const { data, error } = await supabase.from('tables').select('*').eq('branch_id', branches.id).order('table_number');
      if (error) throw error;
      setTables(data || []);
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch tables.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber || !restaurantSlug) return;
    setIsAdding(true);
    try {
        const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
        if (!restaurant) throw new Error("Restaurant not found");
        const { data: branch } = await supabase.from('branches').select('id').eq('restaurant_id', restaurant.id).limit(1).single();
        if (!branch) throw new Error("Branch not found");

        const { error } = await supabase.from('tables').insert({
            branch_id: branch.id,
            table_number: parseInt(newTableNumber)
        });
        if (error) throw error;
        toast({ type: 'success', title: 'Success', description: `Table ${newTableNumber} added.` });
        setNewTableNumber('');
        fetchTables();
    } catch (error: any) {
        toast({ type: 'error', title: 'Error', description: error.message });
    } finally {
        setIsAdding(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!window.confirm("Are you sure you want to delete this table?")) return;
    try {
        const { error } = await supabase.from('tables').delete().eq('id', tableId);
        if (error) throw error;
        toast({ type: 'success', title: 'Success', description: 'Table deleted.' });
        fetchTables();
    } catch (error: any) {
        toast({ type: 'error', title: 'Error', description: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Table & QR Code Management</h2>
      
      <form onSubmit={handleAddTable} className="bg-white p-4 rounded-lg border flex items-center gap-4">
        <input 
          type="number"
          value={newTableNumber}
          onChange={e => setNewTableNumber(e.target.value)}
          placeholder="New Table Number"
          className="p-2 border rounded-lg flex-grow"
          required
        />
        <button type="submit" disabled={isAdding} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
          <Plus size={18} /> {isAdding ? 'Adding...' : 'Add Table'}
        </button>
      </form>

      {loading ? (
        <div>Loading tables...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tables.map(table => (
            <div key={table.id} className="bg-white rounded-lg shadow-sm border p-4 flex flex-col items-center justify-center text-center">
              <div className="mb-4">
                <QRCode value={`${window.location.origin}/restaurant/${restaurantSlug}/menu/${table.table_number}`} size={128} />
              </div>
              <h3 className="text-lg font-bold">Table {table.table_number}</h3>
              <p className="text-xs text-gray-500 mb-2">Scan to view menu & order</p>
              <button onClick={() => handleDeleteTable(table.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {tables.length === 0 && !loading && (
        <div className="text-center py-10 bg-white rounded-lg border">
            <p className="text-gray-500">No tables found. Add a table to generate a QR code.</p>
        </div>
      )}
    </div>
  );
};

export default TablesPage;
