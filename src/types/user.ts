export interface Stats {
  orders: number;
  wishlist: number;
  reviews: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  location: string;
  verified: boolean;
  onboardingCompleted: boolean;
  stats: Stats;
  role: 'buyer' | 'seller' | 'both';
  avatarUrl?: string;
}
