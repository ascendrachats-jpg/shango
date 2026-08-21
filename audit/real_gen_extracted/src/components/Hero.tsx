import React from 'react';
import { ArrowRight, Star, ShieldCheck, Award, Coffee } from 'lucide-react';

interface HeroProps {
  onExploreMenu: () => void;
}

export default function Hero({ onExploreMenu }: HeroProps) {
  return (
    <section id="hero" className="relative bg-stone-950 overflow-hidden pt-8 pb-20 lg:pt-16 lg:pb-28">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-amber-900/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Text Content */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide uppercase">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              Seattle's Top-Rated Specialty Roastery
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-100 tracking-tight leading-tight">
              Crafting Moments, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">
                One Perfect Cup
              </span>{' '}
              at a Time
            </h1>

            <p className="text-stone-400 text-base sm:text-lg max-w-xl leading-relaxed">
              Welcome to Bean & Brew, where passion meets precision. We source single-origin, organic beans directly from sustainable micro-lots and roast them in-house daily for an unparalleled flavor experience.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={onExploreMenu}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all duration-200 group transform hover:-translate-y-0.5"
              >
                Explore Our Menu
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#brewing"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 hover:border-stone-700 font-semibold transition-all duration-200"
              >
                Our Brewing Philosophy
              </a>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-stone-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-stone-900 text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-stone-400 leading-none">100% Organic</p>
                  <p className="text-sm font-bold text-stone-200 mt-1">Direct Trade</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-stone-900 text-amber-500">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-stone-400 leading-none">Award Winning</p>
                  <p className="text-sm font-bold text-stone-200 mt-1">Master Roasters</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-stone-900 text-amber-500">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-stone-400 leading-none">Freshly Roasted</p>
                  <p className="text-sm font-bold text-stone-200 mt-1">Daily Batches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Image & Interactive Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Image Frame */}
              <div className="aspect-square rounded-3xl overflow-hidden border-4 border-stone-900 shadow-2xl relative group">
                <img
                  src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
                  alt="Barista pouring latte art"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-60" />
              </div>

              {/* Floating Promo Card */}
              <div className="absolute -bottom-6 -left-6 bg-stone-900/95 backdrop-blur-md border border-stone-800 p-5 rounded-2xl shadow-xl max-w-xs flex items-start gap-4 animate-bounce-slow">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Coffee className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Today's Special</span>
                  <h4 className="text-sm font-bold text-stone-100 mt-0.5">Honey Lavender Latte</h4>
                  <p className="text-xs text-stone-400 mt-1">Get 15% off your first order with code <span className="text-amber-400 font-mono font-bold">BREW15</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
