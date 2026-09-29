export interface Seller {
  id: string;
  ownerId?: string;
  slug?: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  location: string;
  bio: string;
  bannerUrl?: string;
  logoUrl?: string;
  totalProducts?: number;
}

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface StorefrontProfile {
  name: string;
  logoUrl?: string;
}
