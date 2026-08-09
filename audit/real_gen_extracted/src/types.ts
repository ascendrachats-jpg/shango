export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'hot' | 'cold' | 'bakery' | 'signature';
  image: string;
  tags: string[];
  calories: number;
  customizable: boolean;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedSize: 'Small' | 'Medium' | 'Large';
  selectedMilk: 'Whole' | 'Oat' | 'Almond' | 'None';
  sweetnessLevel: 'None' | 'Less' | 'Regular' | 'Extra';
  customPrice: number;
}

export interface BrewingMethod {
  id: string;
  name: string;
  description: string;
  temp: string;
  time: string;
  ratio: string;
  iconName: string;
  image: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  comment: string;
  rating: number;
  avatar: string;
}