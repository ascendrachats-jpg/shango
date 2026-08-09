import React, { useState, useEffect } from 'react';
import { ShoppingBag, Coffee, Menu, X, Phone, Clock, MapPin } from 'lucide-react';
import { CartItem } from '../types';

interface NavbarProps {
  cart: CartItem[];
  onCartOpen: () => void;
  onNavigate: (sectionId: string) => void;
}

export default function Navbar({ cart, onCartOpen, onNavigate }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Utility Bar */}
      <div className="bg-stone-950 text-stone-400 text-xs py-2 px-4 border-b border-stone-800 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Mon - Sun: 7:00 AM - 8:00 PM
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              452 Brewmaster Way, Seattle, WA
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              (206) 555-0192
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-stone-900/95 backdrop-blur-md shadow-lg border-b border-stone-800 py-3'
            : 'bg-stone-900/80 backdrop-blur-sm border-b border-stone-800/50 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => handleNavClick('hero')}
              className="flex items-center space-x-2.5 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-900/20 group-hover:scale-105 transition-transform">
                <Coffee className="w-5.5 h-5.5 text-stone-950 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="block text-lg font-bold text-stone-100 tracking-tight leading-none">
                  Bean & Brew
                </span>
                <span className="text-[10px] text-amber-500 tracking-widest uppercase font-semibold">
                  Artisanal Roasters
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {['menu', 'brewing', 'about', 'contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => handleNavClick(item)}
                  className="text-sm font-medium text-stone-300 hover:text-amber-400 transition-colors capitalize relative py-1 group"
                >
                  {item}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-500 transition-all duration-300 group-hover:w-full" />
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={onCartOpen}
                className="relative p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-200 hover:text-amber-400 border border-stone-700/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                aria-label="Open Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-stone-950 text-xs font-bold w-5.5 h-5.5 rounded-full flex items-center justify-center animate-pulse border-2 border-stone-900">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl bg-stone-800/80 text-stone-200 hover:text-amber-400 border border-stone-700/50 transition-colors focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-stone-900 border-b border-stone-800 shadow-xl px-4 py-6 space-y-4 animate-in slide-in-from-top duration-200">
            <div className="grid grid-cols-2 gap-3">
              {['menu', 'brewing', 'about', 'contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => handleNavClick(item)}
                  className="flex items-center justify-center py-3 px-4 rounded-xl bg-stone-800/50 text-stone-200 hover:bg-stone-800 hover:text-amber-400 transition-all text-sm font-medium capitalize"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-stone-800 text-xs text-stone-400 space-y-2">
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Mon - Sun: 7:00 AM - 8:00 PM
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" /> 452 Brewmaster Way, Seattle, WA
              </p>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
