export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  productId?: string;
  productSlug?: string;
  name: string;
  quantity: number;
  price: number;
  sellerId?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  currency: string;
  deliveryAddress: string;
}
