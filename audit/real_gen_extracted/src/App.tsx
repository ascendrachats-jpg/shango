import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MenuSection from './components/MenuSection';
import ItemModal from './components/ItemModal';
import CartDrawer from './components/CartDrawer';
import BrewingShowcase from './components/BrewingShowcase';
import Footer from './components/Footer';
import { MenuItem, CartItem } from './types';
import { CheckCircle2, X, Star } from 'lucide-react';
import { TESTIMONIALS } from './data';

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

  const handleAddToCart = (cartItem: CartItem) => {
    setCart((prevCart) => {
      // Check if exact same item with same customizations already exists
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.menuItem.id === cartItem.menuItem.id &&
          item.selectedSize === cartItem.selectedSize &&
          item.selectedMilk === cartItem.selectedMilk &&
          item.sweetnessLevel === cartItem.sweetnessLevel
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += cartItem.quantity;
        return updated;
      }
      return [...prevCart, cartItem];
    });

    // Trigger notification
    setShowNotification(`Added ${cartItem.quantity}x ${cartItem.menuItem.name} to your order!`);
    setTimeout(() => setShowNotification(null), 4000);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setShowCheckoutSuccess(true);
    setCart([]);
  };

  const handleNavigate = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Sticky Navigation */}
      <Navbar
        cart={cart}
        onCartOpen={() => setIsCartOpen(true)}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <Hero onExploreMenu={() => handleNavigate('menu')} />

        {/* Interactive Menu Section */}
        <MenuSection onSelectItem={(item) => setSelectedItem(item)} />

        {/* Brewing Showcase Section */}
        <BrewingShowcase />

        {/* About / Testimonials Section */}
        <section id="about" className="py-20 bg-stone-900 border-t border-stone-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Left: Story */}
              <div className="lg:col-span-5 text-left space-y-6">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Our Story</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 tracking-tight">
                  Sourced with Care, Roasted with Passion
                </h2>
                <p className="text-stone-400 leading-relaxed">
                  Founded in 2018, Bean & Brew began with a simple mission: to make exceptional specialty coffee approachable. We travel to origin countries annually, building direct-trade relationships with farmers who prioritize organic farming and fair wages.
                </p>
                <p className="text-stone-400 leading-relaxed">
                  Our state-of-the-art Loring roaster allows us to roast with incredible precision, highlighting the unique terroir of every single bean.
                </p>
              </div>

              {/* Right: Testimonials */}
              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block text-left lg:text-right">
                  What Our Community Says
                </span>
                <div className="grid gap-6">
                  {TESTIMONIALS.map((t) => (
                    <div
                      key={t.id}
                      className="p-6 rounded-2xl bg-stone-950 border border-stone-800/80 text-left flex gap-4 items-start"
                    >
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="w-12 h-12 rounded-full object-cover border border-stone-800 shrink-0"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          {[...Array(t.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-stone-300 text-sm italic leading-relaxed">"{t.comment}"</p>
                        <div>
                          <h4 className="text-xs font-bold text-stone-200">{t.name}</h4>
                          <p className="text-[10px] text-stone-500">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer with Contact Info */}
      <Footer />

      {/* Item Customization Modal */}
      <ItemModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 border border-amber-500/30 text-stone-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm animate-slide-in">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-grow text-left">
            <p className="text-xs font-bold text-stone-200">Added to Order</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{showNotification}</p>
          </div>
          <button
            onClick={() => setShowNotification(null)}
            className="text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Checkout Success Modal */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-stone-100">Order Placed!</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                Your order has been sent to the baristas. We'll have it ready for pickup at our Seattle location in 10 minutes.
              </p>
            </div>
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-xs text-stone-400 space-y-1.5 text-left">
              <p className="flex justify-between">
                <span>Pickup Location:</span>
                <span className="font-bold text-stone-200">452 Brewmaster Way</span>
              </p>
              <p className="flex justify-between">
                <span>Estimated Time:</span>
                <span className="font-bold text-amber-400">10 mins</span>
              </p>
              <p className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono text-stone-300">#BB-{Math.floor(1000 + Math.random() * 9000)}</span>
              </p>
            </div>
            <button
              onClick={() => setShowCheckoutSuccess(false)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold transition-colors"
            >
              Awesome, Thanks!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
