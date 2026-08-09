import React, { useState } from 'react';
import { Coffee, Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer id="contact" className="bg-stone-950 border-t border-stone-900 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-stone-900">
          
          {/* Brand & Newsletter Column */}
          <div className="md:col-span-5 space-y-6 text-left">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                <Coffee className="w-5.5 h-5.5 text-stone-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="block text-lg font-bold text-stone-100 tracking-tight leading-none">
                  Bean & Brew
                </span>
                <span className="text-[10px] text-amber-500 tracking-widest uppercase font-semibold">
                  Artisanal Roasters
                </span>
              </div>
            </div>
            <p className="text-stone-400 text-sm max-w-sm leading-relaxed">
              Join our community of coffee lovers. Subscribe to our newsletter for exclusive brewing guides, new single-origin arrivals, and special promotions.
            </p>
            
            {/* Newsletter Form */}
            <form onSubmit={handleSubscribe} className="max-w-sm">
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-500" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold transition-colors flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {subscribed && (
                <p className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Thank you for subscribing!
                </p>
              )}
            </form>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-3 text-left space-y-4">
            <h4 className="text-xs font-bold text-stone-200 uppercase tracking-widest">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              {['Our Menu', 'Brewing Guide', 'About Our Beans', 'Sustainability', 'Careers'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-stone-400 hover:text-amber-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info Column */}
          <div className="md:col-span-4 text-left space-y-4">
            <h4 className="text-xs font-bold text-stone-200 uppercase tracking-widest">Contact & Location</h4>
            <div className="space-y-3.5 text-sm text-stone-400">
              <p className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  452 Brewmaster Way, <br />
                  Seattle, WA 98101
                </span>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-amber-500 shrink-0" />
                <span>(206) 555-0192</span>
              </p>
              <p className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Monday - Friday: 6:30 AM - 8:00 PM <br />
                  Saturday - Sunday: 7:00 AM - 8:00 PM
                </span>
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Bean & Brew Coffee Roasters. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-stone-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-stone-300 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-stone-300 transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
