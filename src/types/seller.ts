export interface Seller {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  location: string;
  bio: string;
  bannerUrl?: string;
}
