import React, { useState } from 'react';
import { BREWING_METHODS } from '../data';
import { Clock, Thermometer, Scale, Coffee } from 'lucide-react';

export default function BrewingShowcase() {
  const [activeMethod, setActiveMethod] = useState(BREWING_METHODS[0]);

  return (
    <section id="brewing" className="py-20 bg-stone-950 border-t border-stone-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">The Craft of Extraction</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 tracking-tight">
            Our Brewing Philosophy
          </h2>
          <p className="text-stone-400">
            Coffee is science, art, and patience. We calibrate our grinders daily and adjust water chemistry to bring out the absolute best flavor profile of each single-origin bean.
          </p>
        </div>

        {/* Interactive Showcase Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Method Selector Tabs */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-3">
            {BREWING_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setActiveMethod(method)}
                className={`p-5 rounded-2xl text-left border transition-all duration-300 flex items-center gap-4 group ${
                  activeMethod.id === method.id
                    ? 'bg-stone-900 border-amber-500/40 shadow-xl shadow-amber-950/10'
                    : 'bg-stone-900/40 border-stone-800/60 hover:bg-stone-900 hover:border-stone-800'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeMethod.id === method.id
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-400 group-hover:text-amber-400'
                }`}
                >
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`font-bold text-sm transition-colors ${
                    activeMethod.id === method.id ? 'text-amber-400' : 'text-stone-200'
                  }`}>
                    {method.name}
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-1">{method.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Right Column: Detailed View Card */}
          <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center">
            {/* Method Image */}
            <div className="w-full md:w-1/2 aspect-square rounded-2xl overflow-hidden border border-stone-800 shrink-0">
              <img
                src={activeMethod.image}
                alt={activeMethod.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Method Details */}
            <div className="flex-grow space-y-6 text-left">
              <div>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Active Method</span>
                <h3 className="text-2xl font-extrabold text-stone-100 mt-1">{activeMethod.name}</h3>
                <p className="text-sm text-stone-400 mt-3 leading-relaxed">{activeMethod.description}</p>
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-stone-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Thermometer className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Temp</span>
                  </div>
                  <p className="text-sm font-bold text-stone-200">{activeMethod.temp}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Time</span>
                  </div>
                  <p className="text-sm font-bold text-stone-200">{activeMethod.time}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Scale className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Ratio</span>
                  </div>
                  <p className="text-sm font-bold text-stone-200">{activeMethod.ratio}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
