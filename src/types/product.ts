export type ProductCategory =
  | 'Agriculture'
  | 'Fashion'
  | 'Electronics'
  | 'Services'
  | 'Handmade'
  | 'Home & Living'
  | 'Beauty'
  | 'More';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'KSh';
  rating: number;
  reviewCount: number;
  category: ProductCategory;
  sellerId: string;
  images: string[];
  deliveryEstimate: string;
  availableQuantity: number;
  tags?: string[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  category: string;
  providerId: string;
  images: string[];
}
