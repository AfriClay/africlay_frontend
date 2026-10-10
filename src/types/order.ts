export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type OrderPaymentMethod = '' | 'wallet' | 'mpesa' | 'card';
export type OrderPaymentStatus = 'pending' | 'partial' | 'paid' | 'failed' | 'refunded';
export type OrderPaymentOption = 'pay_now' | 'pay_on_delivery';
export type SettlementStatus = 'pending' | 'held' | 'released' | 'reversed';

export interface OrderItem {
  id: string;
  productId?: string;
  productSlug?: string;
  name: string;
  quantity: number;
  price: number;
  sellerId?: string;
  commissionAmount?: number;
  sellerProceeds?: number;
}

export interface OrderFulfillment {
  id: string;
  sellerId: string;
  status: OrderStatus;
  shippingCost: number;
  chargeableWeightKg: number;
  settlementStatus: SettlementStatus;
}

export interface Order {
  id: string;
  buyerId: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  itemSubtotal: number;
  currency: string;
  deliveryAddress: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  paymentOption: OrderPaymentOption;
  amountPaid: number;
  amountDue: number;
  deliveryFeePaid: boolean;
  courierName: string;
  trackingNumber: string;
  shippingCost: number;
  shippedAt?: string;
  fulfillments: OrderFulfillment[];
  commissionAmount?: number;
  sellerProceeds?: number;
  settlementStatus?: SettlementStatus;
}
