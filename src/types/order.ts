export type OrderStatus = 'New' | 'Accepted' | 'Packed' | 'Processing' | 'Shipped' | 'Completed' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  sellerId: string;
  thumbnailUrl?: string;
}

export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  sellerId: string;
  deliveryAddress: string;
  deliveryFee: number;
  customerName?: string;
  acceptanceDeadline?: string;
}
