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

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface StorefrontProfile {
  name: string;
  logoUrl?: string;
}
