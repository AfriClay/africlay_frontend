import { z } from 'zod';
import { Order, OrderItem } from '../types/order';
import { apiClient, ApiError } from './api';
import { parseAmount, parseCommerce, parseCommerceList } from './commerceContract';

const orderItemSchema = z.object({
  id: z.string().uuid(), product_id: z.string().uuid().nullish(),
  product_name: z.string().nullish(), product_slug: z.string().nullish(),
  seller_id: z.string().uuid().nullish(), quantity: z.number().int().positive(),
  price_at_purchase: z.union([z.string(), z.number()]),
});
const orderSchema = z.object({
  id: z.string().uuid(), buyer_id: z.string().uuid(),
  total_amount: z.union([z.string(), z.number()]), currency: z.string().length(3),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  shipping_address: z.string(), shipping_city: z.string(),
  shipping_postal_code: z.string(), shipping_country: z.string(),
  items: z.array(orderItemSchema), created_at: z.string(),
});

const toOrder = (raw: z.infer<typeof orderSchema>): Order => ({
  id: raw.id, buyerId: raw.buyer_id, date: raw.created_at,
  status: raw.status, total: parseAmount(raw.total_amount), currency: raw.currency,
  deliveryAddress: [raw.shipping_address, raw.shipping_city, raw.shipping_postal_code, raw.shipping_country].filter(Boolean).join(', '),
  items: raw.items.map((item): OrderItem => ({
    id: item.id, productId: item.product_id ?? undefined, productSlug: item.product_slug ?? undefined,
    name: item.product_name ?? 'Unavailable product', quantity: item.quantity,
    price: parseAmount(item.price_at_purchase), sellerId: item.seller_id ?? undefined,
  })),
});

export type CheckoutPayload = {
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
};

let checkoutPending = false;

export const orderService = {
  checkout: async (payload: CheckoutPayload): Promise<Order> => {
    if (checkoutPending) throw new Error('Checkout is already in progress.');
    checkoutPending = true;
    try {
      return toOrder(parseCommerce(orderSchema, await apiClient('/cart/checkout/', { method: 'POST', body: payload })));
    } finally {
      checkoutPending = false;
    }
  },
  fetchOrders: async (): Promise<Order[]> =>
    parseCommerceList(orderSchema, await apiClient('/cart/orders/')).map(toOrder),
  fetchOrderById: async (id: string): Promise<Order | null> => {
    try {
      return toOrder(parseCommerce(orderSchema, await apiClient(`/cart/orders/${encodeURIComponent(id)}/`)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
};
