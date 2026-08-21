import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, Tag, CheckCircle2 } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.customPrice * item.quantity, 0);
  const discountAmount = subtotal * appliedDiscount;
  const tax = (subtotal - discountAmount) * 0.101; // Seattle tax rate
  const total = subtotal - discountAmount + tax;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.toUpperCase() === 'BREW15') {
      setAppliedDiscount(0.15);
      setPromoSuccess('15% discount applied successfully!');
      setPromoError('');
    } else {
      setPromoError('Invalid promo code. Try BREW15');
      setPromoSuccess('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-stone-900 border-l border-stone-800 h-full flex flex-col shadow-2xl animate-slide-in">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-stone-100">Your Order</h3>
            <span className="px-2 py-0.5 rounded-full bg-stone-800 text-xs text-stone-400 font-semibold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors border border-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 rounded-xl bg-stone-950 border border-stone-800/80 hover:border-stone-800 transition-all"
              >
                <img
                  src={item.menuItem.image}
                  alt={item.menuItem.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0 bg-stone-900"
                />
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-stone-200 text-sm truncate">{item.menuItem.name}</h4>
                    <span className="font-mono font-bold text-amber-400 text-sm shrink-0">
                      ${(item.customPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Customization Badges */}
                  {item.menuItem.customizable && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[9px] bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-800">
                        {item.selectedSize}
                      </span>
                      {item.menuItem.category !== 'bakery' && (
                        <>
                          <span className="text-[9px] bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-800">
                            {item.selectedMilk} Milk
                          </span>
                          <span className="text-[9px] bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-800">
                            {item.sweetnessLevel} Sweet
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Quantity Controls & Delete */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-900">
                    <div className="flex items-center bg-stone-900 rounded-lg p-0.5 border border-stone-800">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-stone-200">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center text-stone-600 mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="text-stone-300 font-bold">Your cart is empty</p>
                <p className="text-stone-500 text-xs mt-1">Add some delicious brews to get started!</p>
              </div>
            </div>
          )}
        </div>

        {/* Promo Code & Summary */}
        {cart.length > 0 && (
          <div className="p-6 bg-stone-950 border-t border-stone-800 space-y-4 shrink-0">
            {/* Promo Form */}
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-grow">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  placeholder="Promo Code (BREW15)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-xs uppercase font-semibold"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold border border-stone-700 transition-colors"
              >
                Apply
              </button>
            </form>
            {promoError && <p className="text-[11px] text-red-400 font-medium">{promoError}</p>}
            {promoSuccess && (
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {promoSuccess}
              </p>
            )}

            {/* Price Breakdown */}
            <div className="space-y-2 pt-2 border-t border-stone-900 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount (15%)</span>
                  <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-400">
                <span>Tax (10.1%)</span>
                <span className="font-mono">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-100 font-bold text-sm pt-2 border-t border-stone-900">
                <span>Total</span>
                <span className="font-mono text-amber-400">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold shadow-lg shadow-amber-500/10 transition-all duration-200 mt-2"
            >
              Place Order • ${total.toFixed(2)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
