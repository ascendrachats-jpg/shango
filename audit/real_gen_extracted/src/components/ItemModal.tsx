import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Info } from 'lucide-react';
import { MenuItem, CartItem } from '../types';

interface ItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export default function ItemModal({ item, onClose, onAddToCart }: ItemModalProps) {
  const [size, setSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');
  const [milk, setMilk] = useState<'Whole' | 'Oat' | 'Almond' | 'None'>('Whole');
  const [sweetness, setSweetness] = useState<'None' | 'Less' | 'Regular' | 'Extra'>('Regular');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setSize('Medium');
      setMilk(item.category === 'bakery' ? 'None' : 'Whole');
      setSweetness('Regular');
      setQuantity(1);
    }
  }, [item]);

  if (!item) return null;

  // Calculate custom price based on selections
  const getPriceAdjustment = () => {
    let extra = 0;
    if (size === 'Small') extra -= 0.5;
    if (size === 'Large') extra += 0.75;
    if (milk === 'Oat' || milk === 'Almond') extra += 0.65;
    return extra;
  };

  const unitPrice = Math.max(1.5, item.price + getPriceAdjustment());
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    const cartItem: CartItem = {
      id: `${item.id}-${size}-${milk}-${sweetness}-${Date.now()}`,
      menuItem: item,
      quantity,
      selectedSize: size,
      selectedMilk: milk,
      sweetnessLevel: sweetness,
      customPrice: unitPrice,
    };
    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Image */}
        <div className="relative h-48 sm:h-56 bg-stone-950 shrink-0">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-950/80 hover:bg-stone-950 text-stone-300 hover:text-stone-100 transition-colors border border-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          <div>
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-xl font-bold text-stone-100">{item.name}</h3>
              <span className="text-xl font-mono font-bold text-amber-400">
                ${unitPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-stone-400 mt-2 leading-relaxed">{item.description}</p>
          </div>

          {item.customizable && (
            <div className="space-y-5 pt-4 border-t border-stone-800">
              {/* Size Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Select Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Small', 'Medium', 'Large'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        size === s
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                          : 'bg-stone-800/40 border-stone-800 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      {s}
                      <span className="block text-[10px] text-stone-500 font-normal mt-0.5">
                        {s === 'Small' ? '-$0.50' : s === 'Large' ? '+$0.75' : 'Standard'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Milk Selection */}
              {item.category !== 'bakery' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Milk Option</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Whole', 'Oat', 'Almond', 'None'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMilk(m)}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                          milk === m
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-stone-800/40 border-stone-800 text-stone-300 hover:bg-stone-800'
                        }`}
                      >
                        {m}
                        <span className="block text-[9px] text-stone-500 font-normal mt-0.5">
                          {m === 'Oat' || m === 'Almond' ? '+$0.65' : 'Free'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sweetness Selection */}
              {item.category !== 'bakery' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Sweetness Level</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['None', 'Less', 'Regular', 'Extra'] as const).map((sw) => (
                      <button
                        key={sw}
                        onClick={() => setSweetness(sw)}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                          sweetness === sw
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-stone-800/40 border-stone-800 text-stone-300 hover:bg-stone-800'
                        }`}
                      >
                        {sw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-stone-950 border-t border-stone-800 shrink-0 flex items-center justify-between gap-4">
          {/* Quantity Selector */}
          <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl p-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors font-bold"
            >
              -
            </button>
            <span className="w-10 text-center text-sm font-bold text-stone-200">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors font-bold"
            >
              +
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="flex-grow flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold shadow-lg shadow-amber-500/10 transition-all duration-200"
          >
            <ShoppingBag className="w-4 h-4" />
            Add to Order • ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
