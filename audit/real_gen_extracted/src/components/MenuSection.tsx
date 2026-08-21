import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Flame, Snowflake, Croissant, Sparkles } from 'lucide-react';
import { MenuItem } from '../types';
import { MENU_ITEMS } from '../data';

interface MenuSectionProps {
  onSelectItem: (item: MenuItem) => void;
}

type CategoryFilter = 'all' | 'hot' | 'cold' | 'bakery' | 'signature';

export default function MenuSection({ onSelectItem }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { value: CategoryFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Items', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'hot', label: 'Hot Coffee', icon: <Flame className="w-4 h-4" /> },
    { value: 'cold', label: 'Cold Brews', icon: <Snowflake className="w-4 h-4" /> },
    { value: 'bakery', label: 'Bakery & Eats', icon: <Croissant className="w-4 h-4" /> },
    { value: 'signature', label: 'Signatures', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <section id="menu" className="py-20 bg-stone-900 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Curated Selection</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 tracking-tight">
            Explore Our Artisanal Menu
          </h2>
          <p className="text-stone-400">
            Every beverage is crafted with freshly roasted beans, precise water temperatures, and organic ingredients. Select an item to customize your perfect cup.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-10 pb-6 border-b border-stone-800">
          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat.value
                    ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/10 font-bold'
                    : 'bg-stone-800/60 text-stone-300 hover:bg-stone-800 hover:text-stone-100 border border-stone-700/40'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-800/60 border border-stone-700/50 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Menu Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group bg-stone-950 rounded-2xl overflow-hidden border border-stone-800/80 hover:border-amber-500/30 transition-all duration-300 flex flex-col h-full shadow-md hover:shadow-xl hover:shadow-amber-950/5"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-stone-900/90 backdrop-blur-md text-[10px] font-bold text-amber-400 border border-amber-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-grow justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-stone-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                      <span className="font-mono font-bold text-amber-400 shrink-0">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-4 mt-4 border-t border-stone-900 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500 font-medium">
                      {item.calories} kcal
                    </span>
                    <button
                      onClick={() => onSelectItem(item)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-amber-500 text-stone-300 hover:text-stone-950 border border-stone-800 hover:border-amber-500 text-xs font-bold transition-all duration-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {item.customizable ? 'Customize' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-stone-950 rounded-2xl border border-stone-800">
            <p className="text-stone-400 text-lg">No menu items found matching your criteria.</p>
            <button
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              className="mt-4 px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 text-sm font-semibold border border-stone-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
