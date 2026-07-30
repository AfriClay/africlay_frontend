export interface Stats {
  orders: number;
  wishlist: number;
  reviews: number;
}

export interface User {
  id: string;
  name: string;
  location: string;
  verified: boolean;
  stats: Stats;
  role: 'buyer' | 'seller' | 'both';
  avatarUrl?: string;
}
