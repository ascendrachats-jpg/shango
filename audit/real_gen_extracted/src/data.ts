import { MenuItem, BrewingMethod, Testimonial } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Honey Lavender Latte',
    description: 'Our signature espresso combined with steamed oat milk, organic wildflower honey, and a hint of culinary lavender.',
    price: 5.75,
    category: 'signature',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    tags: ['Best Seller', 'Floral', 'Oat Milk'],
    calories: 210,
    customizable: true
  },
  {
    id: 'm2',
    name: 'Madagascar Vanilla Flat White',
    description: 'Ristretto shots of our single-origin Ethiopian coffee, micro-foamed milk, and real Madagascar vanilla bean syrup.',
    price: 5.25,
    category: 'hot',
    image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80',
    tags: ['Smooth', 'Vanilla'],
    calories: 180,
    customizable: true
  },
  {
    id: 'm3',
    name: 'Cold Brew Tonic',
    description: 'Slow-steeped cold brew layered over premium tonic water, served with a fresh slice of dehydrated blood orange.',
    price: 6.00,
    category: 'cold',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    tags: ['Refreshing', 'Citrus'],
    calories: 90,
    customizable: false
  },
  {
    id: 'm4',
    name: 'Pistachio Rose Cardamom Iced Latte',
    description: 'House-made pistachio butter paste, organic rose water, and freshly ground cardamom shaken with espresso and milk.',
    price: 6.50,
    category: 'signature',
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
    tags: ['Spiced', 'Nutty', 'Iced'],
    calories: 240,
    customizable: true
  },
  {
    id: 'm5',
    name: 'Cortado',
    description: 'Equal parts double espresso and warm, silky textured milk. Perfectly balanced and robust.',
    price: 4.25,
    category: 'hot',
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
    tags: ['Strong', 'Classic'],
    calories: 80,
    customizable: true
  },
  {
    id: 'm6',
    name: 'Kyoto-Style Cold Drip',
    description: 'Coffee brewed drop-by-drop through iced water over 12 hours, yielding an incredibly clean, tea-like body.',
    price: 6.25,
    category: 'cold',
    image: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?auto=format&fit=crop&w=600&q=80',
    tags: ['Single Origin', 'Clean'],
    calories: 5,
    customizable: false
  },
  {
    id: 'm7',
    name: 'Almond Twice-Baked Croissant',
    description: 'Flaky, buttery house-baked croissant filled with rich almond frangipane and topped with toasted sliced almonds.',
    price: 4.95,
    category: 'bakery',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
    tags: ['Freshly Baked', 'Sweet'],
    calories: 380,
    customizable: false
  },
  {
    id: 'm8',
    name: 'Sourdough Avocado Toast',
    description: 'Artisanal sourdough topped with smashed Hass avocado, heirloom cherry tomatoes, microgreens, and chili flakes.',
    price: 9.50,
    category: 'bakery',
    image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80',
    tags: ['Savory', 'Healthy'],
    calories: 310,
    customizable: false
  }
];

export const BREWING_METHODS: BrewingMethod[] = [
  {
    id: 'b1',
    name: 'Pour Over (V60)',
    description: 'Accentuates bright, floral, and complex fruit notes. We use a precise spiral pour to extract clean, vibrant flavors.',
    temp: '202°F / 94°C',
    time: '3:15 mins',
    ratio: '1:16 (15g coffee / 240g water)',
    iconName: 'Feather',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'b2',
    name: 'Espresso Extraction',
    description: 'High pressure extraction yielding a rich, concentrated shot with a thick, golden crema. The foundation of our milk drinks.',
    temp: '200°F / 93°C',
    time: '28 secs',
    ratio: '1:2 (18g coffee / 36g yield)',
    iconName: 'Zap',
    image: 'https://images.unsplash.com/photo-151097252790b-af4f90267301?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'b3',
    name: 'Kyoto Cold Drip',
    description: 'Slow, gravity-fed iced water extraction. This patient process prevents bitter oils from dissolving, leaving pure sweetness.',
    temp: '34°F / 1°C',
    time: '12 hours',
    ratio: '1:10 (100g coffee / 1000g water)',
    iconName: 'Droplet',
    image: 'https://images.unsplash.com/photo-1519082274514-18af0d7dfd5f?auto=format&fit=crop&w=400&q=80'
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Marcus Vance',
    role: 'Local Architect & Coffee Enthusiast',
    comment: 'The Honey Lavender Latte is an absolute masterpiece. The balance of floral notes and espresso is perfect. Bean & Brew is my daily creative sanctuary.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
  },
  {
    id: 't2',
    name: 'Elena Rostova',
    role: 'Pastry Chef',
    comment: 'Their twice-baked almond croissant is as authentic as it gets. Flaky, rich, and pairs beautifully with their single-origin pour overs.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80'
  },
  {
    id: 't3',
    name: 'Devon Carter',
    role: 'Remote Software Engineer',
    comment: 'Incredible atmosphere, lightning-fast Wi-Fi, and the Kyoto Cold Drip is out of this world. The staff knows coffee inside and out.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80'
  }
];