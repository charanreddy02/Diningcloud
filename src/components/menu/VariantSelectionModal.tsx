import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  variants?: { name: string; price: number }[];
  add_ons?: { name: string; price: number }[];
}

interface VariantSelectionModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, variant: { name: string; price: number }, addOns: { name: string; price: number }[]) => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({ item, onClose, onAddToCart }) => {
  const [selectedVariant, setSelectedVariant] = useState(item.variants?.[0] || null);
  const [selectedAddOns, setSelectedAddOns] = useState<{ name: string; price: number }[]>([]);

  const handleAddOnToggle = (addOn: { name: string; price: number }) => {
    setSelectedAddOns(prev =>
      prev.some(a => a.name === addOn.name)
        ? prev.filter(a => a.name !== addOn.name)
        : [...prev, addOn]
    );
  };

  const calculateTotal = () => {
    const variantPrice = selectedVariant?.price || item.price;
    const addOnsPrice = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
    return variantPrice + addOnsPrice;
  };

  const handleConfirm = () => {
    if (item.variants && item.variants.length > 0 && !selectedVariant) {
      // Could add a toast here
      return;
    }
    onAddToCart(item, selectedVariant, selectedAddOns);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {item.variants && item.variants.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Select a Variant</h4>
              <div className="space-y-2">
                {item.variants.map(variant => (
                  <label key={variant.name} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer">
                    <div>
                      <span className="font-medium">{variant.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">₹{variant.price.toFixed(2)}</span>
                      <input
                        type="radio"
                        name="variant"
                        checked={selectedVariant?.name === variant.name}
                        onChange={() => setSelectedVariant(variant)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {item.add_ons && item.add_ons.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Add-ons</h4>
              <div className="space-y-2">
                {item.add_ons.map(addOn => (
                  <label key={addOn.name} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer">
                    <div>
                      <span className="font-medium">{addOn.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">+ ₹{addOn.price.toFixed(2)}</span>
                      <input
                        type="checkbox"
                        checked={selectedAddOns.some(a => a.name === addOn.name)}
                        onChange={() => handleAddOnToggle(addOn)}
                        className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleConfirm}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex justify-between items-center"
          >
            <span>Add to Cart</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VariantSelectionModal;
