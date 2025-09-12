import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/Toaster';
import { X, Plus, Trash2, Upload } from 'lucide-react';

interface MenuItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  item: any | null;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({ isOpen, onClose, onSave, item }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
    variants: [] as { name: string; price: number }[],
    add_ons: [] as { name: string; price: number }[],
    image_url: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const { restaurantSlug } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, restaurantSlug]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price || 0,
        category: item.category || '',
        available: item.available !== false,
        variants: (item.variants as any[]) || [],
        add_ons: (item.add_ons as any[]) || [],
        image_url: item.image_url || ''
      });
    } else {
      resetForm();
    }
    setImageFile(null);
    setShowNewCategoryInput(false);
    setNewCategory('');
  }, [item, isOpen]);

  const resetForm = () => {
    setFormData({
      name: '', description: '', price: 0, category: '', available: true,
      variants: [], add_ons: [], image_url: ''
    });
  };

  const fetchCategories = async () => {
    if (!restaurantSlug) return;
    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) return;

      const { data, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('restaurant_id', restaurant.id);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(i => i.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category' && value === 'add_new') {
      setShowNewCategoryInput(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setShowNewCategoryInput(false);
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubItemChange = (type: 'variants' | 'add_ons', index: number, field: 'name' | 'price', value: string) => {
    const updated = [...formData[type]];
    updated[index] = { ...updated[index], [field]: field === 'price' ? parseFloat(value) || 0 : value };
    setFormData(prev => ({ ...prev, [type]: updated }));
  };

  const addSubItem = (type: 'variants' | 'add_ons') => {
    setFormData(prev => ({ ...prev, [type]: [...prev[type], { name: '', price: 0 }] }));
  };

  const removeSubItem = (type: 'variants' | 'add_ons', index: number) => {
    setFormData(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantSlug) return;
    setLoading(true);

    try {
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single();
      if (!restaurant) throw new Error("Restaurant not found");

      let finalCategory = formData.category;
      if (showNewCategoryInput && newCategory.trim()) {
        finalCategory = newCategory.trim();
      }

      if (!finalCategory) {
        toast({ type: 'error', title: 'Validation Error', description: 'Category is required.' });
        setLoading(false);
        return;
      }

      let imageUrl = formData.image_url;
      if (imageFile) {
        setIsUploading(true);
        const fileName = `${restaurant.id}/${Date.now()}_${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(fileName, imageFile);
        
        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error("Storage bucket 'menu-images' not found. Please create it in your Supabase dashboard.");
          }
          throw uploadError;
        }

        const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
        setIsUploading(false);
      }

      const dataToSave = {
        ...formData,
        category: finalCategory,
        price: parseFloat(formData.price as any),
        restaurant_id: restaurant.id,
        image_url: imageUrl
      };

      let error;
      if (item) {
        ({ error } = await supabase.from('menu_items').update(dataToSave).eq('id', item.id));
      } else {
        ({ error } = await supabase.from('menu_items').insert([dataToSave]));
      }

      if (error) throw error;
      
      toast({ type: 'success', title: 'Success', description: `Menu item ${item ? 'updated' : 'created'}.` });
      onSave();
    } catch (error: any) {
      toast({ type: 'error', title: 'Save Error', description: error.message });
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{item ? 'Edit' : 'Add'} Menu Item</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <input name="name" value={formData.name} onChange={handleChange} placeholder="Item Name" required className="w-full p-2 border rounded" />
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="w-full p-2 border rounded" />
          <div className="grid grid-cols-2 gap-4">
            <input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="Price" required className="w-full p-2 border rounded" />
            
            {!showNewCategoryInput ? (
              <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded bg-white" required={!showNewCategoryInput}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                <option value="add_new">-- Add New Category --</option>
              </select>
            ) : (
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="New Category Name"
                className="w-full p-2 border rounded"
                required
              />
            )}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="available" checked={formData.available} onChange={e => setFormData(p => ({ ...p, available: e.target.checked }))} />
            Available for order
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <div className="mt-1 flex items-center gap-4">
                {formData.image_url && !imageFile && <img src={formData.image_url} className="w-20 h-20 rounded object-cover" />}
                {imageFile && <img src={URL.createObjectURL(imageFile)} className="w-20 h-20 rounded object-cover" />}
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50">
                    <Upload size={16} className="inline mr-2"/>
                    <span>{imageFile ? 'Change' : 'Upload'} file</span>
                    <input type="file" name="image" onChange={handleImageChange} className="sr-only" accept="image/*"/>
                </label>
                {isUploading && <p>Uploading...</p>}
            </div>
          </div>

          {['variants', 'add_ons'].map(type => (
            <div key={type}>
              <h4 className="font-semibold capitalize">{type.replace('_', ' ')}</h4>
              {formData[type as 'variants' | 'add_ons'].map((subItem, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <input value={subItem.name} onChange={e => handleSubItemChange(type as 'variants' | 'add_ons', index, 'name', e.target.value)} placeholder="Name" className="w-full p-2 border rounded" />
                  <input type="number" step="0.01" value={subItem.price} onChange={e => handleSubItemChange(type as 'variants' | 'add_ons', index, 'price', e.target.value)} placeholder="Price" className="w-full p-2 border rounded" />
                  <button type="button" onClick={() => removeSubItem(type as 'variants' | 'add_ons', index)} className="p-2 text-red-500"><Trash2 /></button>
                </div>
              ))}
              <button type="button" onClick={() => addSubItem(type as 'variants' | 'add_ons')} className="text-blue-600 mt-2 flex items-center gap-1 text-sm"><Plus size={16}/> Add {type === 'variants' ? 'Variant' : 'Add-on'}</button>
            </div>
          ))}
          
          <div className="p-4 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemForm;
