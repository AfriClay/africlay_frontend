export type ProductCategory = string;

export interface Product {
  id: string;
  slug?: string;
  sku?: string;
  status?: 'draft' | 'published' | 'archived';
  name: string;
  description: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  category: ProductCategory;
  categoryId?: string;
  sellerId: string;
  images: string[];
  deliveryEstimate: string;
  availableQuantity: number;
  weight?: string;
  dimensions?: string;
  tags?: string[];
  tagIds?: string[];
}

export interface Service {
  id: string;
  slug?: string;
  status?: 'draft' | 'published' | 'archived';
  title: string;
  description: string;
  priceFrom: number;
  currency?: string;
  durationMinutes?: number;
  rating: number;
  reviewCount: number;
  category: string;
  categoryId?: string;
  tagIds?: string[];
  providerId: string;
  images: string[];
}
