import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toaster';
import { Plus, Edit, Trash2, UtensilsCrossed } from 'lucide-react';
import MenuItemForm from '../../components/admin/MenuItemForm';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import { Skeleton } from '../../components/ui/skeleton';

type MenuItem = any; // Replace with proper type

const MenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    fetchMenuItems();
  }, [restaurantSlug]);

  const fetchMenuItems = async () => {
    if (!restaurantSlug) return;
    setLoading(true);
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('category').order('name');
      
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      toast({ type: 'error', title: 'Error', description: 'Failed to fetch menu items.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    fetchMenuItems(); // Refetch after save
  };

  const openAddModal = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const openDeleteDialog = (item: MenuItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      // First, safely attempt to delete image from storage if it exists
      if (itemToDelete.image_url) {
        try {
          const url = new URL(itemToDelete.image_url);
          const pathParts = url.pathname.split('/');
          const bucketName = 'menu-images';
          const bucketIndex = pathParts.indexOf(bucketName);

          if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            if (filePath) {
              await supabase.storage.from(bucketName).remove([filePath]);
            }
          }
        } catch (e) {
          console.error("Could not parse or delete image from storage, proceeding with DB deletion.", e);
        }
      }

      // Then, delete the item from the database
      const { error } = await supabase.from('menu_items').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      
      toast({ type: 'success', title: 'Deleted', description: `${itemToDelete.name} has been deleted.` });
      fetchMenuItems();
    } catch (error: any) {
      toast({ type: 'error', title: 'Error', description: error.message || 'Failed to delete item.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const groupedMenu = menuItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  const MenuSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <Skeleton className="h-7 w-1/3 mb-4" />
            <div className="divide-y divide-gray-200">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-16 h-16 rounded-md" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Menu Management</h2>
        <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {loading ? (
        <MenuSkeleton />
      ) : Object.keys(groupedMenu).length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border">
            <p className="text-gray-500">Your menu is empty. Click "Add Item" to get started.</p>
        </div>
      ) : (
        Object.entries(groupedMenu).map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">{category}</h3>
            <div className="divide-y divide-gray-200">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                        <UtensilsCrossed />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">₹{item.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(item)} className="p-2 text-gray-500 hover:text-blue-600">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => openDeleteDialog(item)} className="p-2 text-gray-500 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {isModalOpen && (
        <MenuItemForm
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
          onSave={handleSave}
          item={selectedItem}
        />
      )}
      
      {isDeleteDialogOpen && (
        <ConfirmDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          itemName={itemToDelete?.name || 'this item'}
        />
      )}
    </div>
  );
};

export default MenuPage;
