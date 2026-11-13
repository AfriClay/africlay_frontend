export type ProductCategory = string;

export type ProductImageRecord = { id?: string; url: string; isPrimary: boolean };
export type ProductPriceOption = { id: string; label: string; price: number; stockQuantity: number; weightKg: number; active: boolean };

export interface Product {
  id: string;
  slug?: string;
  sku?: string;
  status?: 'draft' | 'published' | 'archived';
  name: string;
  description: string;
  price: number;
  priceUnit?: string;
  priceOptions?: ProductPriceOption[];
  currency: string;
  rating: number;
  reviewCount: number;
  category: ProductCategory;
  categoryId?: string;
  sellerId: string;
  images: string[];
  imageRecords?: ProductImageRecord[];
  deliveryEstimate: string;
  availableQuantity: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
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
  bookingBufferMinutes?: number;
  rating: number;
  reviewCount: number;
  category: string;
  categoryId?: string;
  tagIds?: string[];
  providerId: string;
  images: string[];
  imageRecords?: ProductImageRecord[];
}
