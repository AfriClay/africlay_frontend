import { z } from 'zod';
import { Order, OrderFulfillment, OrderItem, OrderPaymentOption } from '../types/order';
import { apiClient, ApiError } from './api';
import { parseAmount, parseCommerce, parseCommerceList } from './commerceContract';

const orderItemSchema = z.object({
  id: z.string().uuid(), product_id: z.string().uuid().nullish(),
  product_name: z.string().nullish(), product_slug: z.string().nullish(),
  seller_id: z.string().uuid().nullish(), quantity: z.number().int().positive(),
  price_at_purchase: z.union([z.string(), z.number()]),
  commission_amount: z.union([z.string(), z.number()]).optional(),
  seller_proceeds: z.union([z.string(), z.number()]).optional(),
});
const fulfillmentSchema = z.object({
  id: z.string().uuid(), seller_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  shipping_cost: z.union([z.string(), z.number()]),
  chargeable_weight_kg: z.union([z.string(), z.number()]),
  settlement_status: z.enum(['pending', 'held', 'released', 'reversed']),
}).passthrough();
const orderSchema = z.object({
  id: z.string().uuid(), buyer_id: z.string().uuid(),
  item_subtotal: z.union([z.string(), z.number()]),
  total_amount: z.union([z.string(), z.number()]), currency: z.string().length(3),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  payment_method: z.enum(['', 'wallet', 'mpesa', 'card']),
  payment_status: z.enum(['pending', 'partial', 'paid', 'failed', 'refunded']),
  payment_option: z.enum(['pay_now', 'pay_on_delivery']),
  amount_paid: z.union([z.string(), z.number()]),
  amount_due: z.union([z.string(), z.number()]),
  delivery_fee_paid: z.boolean(),
  shipping_address: z.string(), shipping_city: z.string(),
  shipping_postal_code: z.string(), shipping_country: z.string(),
  courier_name: z.string(), tracking_number: z.string(),
  shipping_cost: z.union([z.string(), z.number()]), shipped_at: z.string().nullable(),
  items: z.array(orderItemSchema), fulfillments: z.array(fulfillmentSchema), created_at: z.string(),
  commission_amount: z.union([z.string(), z.number()]).optional(),
  seller_proceeds: z.union([z.string(), z.number()]).optional(),
  settlement_status: z.enum(['pending', 'held', 'released', 'reversed']).optional(),
});

const toOrder = (raw: z.infer<typeof orderSchema>): Order => ({
  id: raw.id, buyerId: raw.buyer_id, date: raw.created_at,
  status: raw.status, total: parseAmount(raw.total_amount), itemSubtotal: parseAmount(raw.item_subtotal), currency: raw.currency,
  deliveryAddress: [raw.shipping_address, raw.shipping_city, raw.shipping_postal_code, raw.shipping_country].filter(Boolean).join(', '),
  paymentMethod: raw.payment_method,
  paymentStatus: raw.payment_status,
  paymentOption: raw.payment_option,
  amountPaid: parseAmount(raw.amount_paid),
  amountDue: parseAmount(raw.amount_due),
  deliveryFeePaid: raw.delivery_fee_paid,
  courierName: raw.courier_name,
  trackingNumber: raw.tracking_number,
  shippingCost: parseAmount(raw.shipping_cost),
  shippedAt: raw.shipped_at ?? undefined,
  items: raw.items.map((item): OrderItem => ({
    id: item.id, productId: item.product_id ?? undefined, productSlug: item.product_slug ?? undefined,
    name: item.product_name ?? 'Unavailable product', quantity: item.quantity,
    price: parseAmount(item.price_at_purchase), sellerId: item.seller_id ?? undefined,
    commissionAmount: item.commission_amount == null ? undefined : parseAmount(item.commission_amount),
    sellerProceeds: item.seller_proceeds == null ? undefined : parseAmount(item.seller_proceeds),
  })),
  fulfillments: raw.fulfillments.map((item): OrderFulfillment => ({
    id: item.id, sellerId: item.seller_id, status: item.status,
    shippingCost: parseAmount(item.shipping_cost),
    chargeableWeightKg: parseAmount(item.chargeable_weight_kg),
    settlementStatus: item.settlement_status,
  })),
  commissionAmount: raw.commission_amount == null ? undefined : parseAmount(raw.commission_amount),
  sellerProceeds: raw.seller_proceeds == null ? undefined : parseAmount(raw.seller_proceeds),
  settlementStatus: raw.settlement_status,
});

export type CheckoutPayload = {
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  payment_method?: 'mpesa' | 'wallet';
  payment_option?: OrderPaymentOption;
  buy_now_product_id?: string;
  buy_now_quantity?: number;
};

const shippingQuoteSchema = z.object({
  item_subtotal: z.union([z.string(), z.number()]),
  shipping_cost: z.union([z.string(), z.number()]),
  total_amount: z.union([z.string(), z.number()]),
  currency: z.string().length(3),
  shipments: z.array(z.object({
    seller_id: z.string().uuid(), origin_city: z.string(), destination_city: z.string(),
    chargeable_weight_kg: z.union([z.string(), z.number()]),
    shipping_cost: z.union([z.string(), z.number()]), is_remote: z.boolean(),
  }).passthrough()),
});

export type ShippingQuote = {
  itemSubtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  shipmentCount: number;
};

export type SellerOrderUpdate =
  | { status: 'cancelled' }
  | { status: 'shipped'; courier_name: string; tracking_number: string };

export const orderKeys = {
  buyer: (userId: string) => ['buyer-orders', userId] as const,
  detail: (userId: string, orderId: string) => ['buyer-order', userId, orderId] as const,
  seller: (userId: string) => ['seller-orders', userId] as const,
  shippingQuote: (userId: string, city: string, cartSignature: string) => ['shipping-quote', userId, city, cartSignature] as const,
};

let checkoutPending = false;

export const orderService = {
  shippingQuote: async (payload: CheckoutPayload): Promise<ShippingQuote> => {
    const raw = parseCommerce(shippingQuoteSchema, await apiClient('/cart/shipping-quote/', {
      method: 'POST', body: payload,
    }));
    return {
      itemSubtotal: parseAmount(raw.item_subtotal), shippingCost: parseAmount(raw.shipping_cost),
      total: parseAmount(raw.total_amount), currency: raw.currency, shipmentCount: raw.shipments.length,
    };
  },
  checkout: async (payload: CheckoutPayload): Promise<Order> => {
    if (checkoutPending) throw new Error('Checkout is already in progress.');
    checkoutPending = true;
    try {
      return toOrder(parseCommerce(orderSchema, await apiClient('/cart/checkout/', {
        method: 'POST', body: payload, timeoutMs: 45_000,
      })));
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
  fetchSellerOrders: async (): Promise<Order[]> =>
    parseCommerceList(orderSchema, await apiClient('/cart/seller/orders/')).map(toOrder),
  updateSellerOrderStatus: async (id: string, update: SellerOrderUpdate): Promise<Order> =>
    toOrder(parseCommerce(orderSchema, await apiClient(`/cart/seller/orders/${encodeURIComponent(id)}/`, {
      method: 'PATCH', body: update,
    }))),
  confirmDelivery: async (id: string): Promise<Order> =>
    toOrder(parseCommerce(orderSchema, await apiClient(`/cart/orders/${encodeURIComponent(id)}/confirm-delivery/`, {
      method: 'POST',
    }))),
};
