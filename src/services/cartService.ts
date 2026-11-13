import { z } from 'zod';
import { CartItem, CartSnapshot } from '../types/cart';
import { apiClient } from './api';
import { parseAmount, parseCommerce } from './commerceContract';

const cartItemSchema = z.object({
  id: z.string().uuid(), product: z.string().uuid(),
  product_name: z.string(), product_slug: z.string().nullish(),
  product_price: z.union([z.string(), z.number()]).nullable(),
  price_unit: z.string().optional().default(''),
  option_id: z.string().uuid().nullable().optional(), option_label: z.string().optional().default(''),
  available_stock: z.number().int().nonnegative().optional(),
  quantity: z.number().int().positive(),
});
const cartSchema = z.object({ id: z.string().uuid(), buyer: z.string().uuid(), items: z.array(cartItemSchema) });

const toItem = (item: z.infer<typeof cartItemSchema>): CartItem => ({
  id: item.id, productId: item.product, productSlug: item.product_slug ?? undefined,
  name: item.product_name, price: item.product_price == null ? 0 : parseAmount(item.product_price), priceUnit: item.price_unit, quantity: item.quantity,
  optionId: item.option_id ?? undefined, optionLabel: item.option_label, optionUnavailable: item.product_price == null,
  availableStock: item.available_stock,
});

export const cartService = {
  fetchCart: async (): Promise<CartSnapshot> => {
    const raw = await apiClient('/cart/');
    const cart = parseCommerce(cartSchema, raw);
    return { id: cart.id, buyerId: cart.buyer, items: cart.items.map(toItem) };
  },
  addItem: async (productId: string, quantity = 1, optionId?: string): Promise<CartItem> =>
    toItem(parseCommerce(cartItemSchema, await apiClient('/cart/items/', {
      method: 'POST', body: { product: productId, quantity, ...(optionId ? { option_id: optionId } : {}) },
    }))),
  updateQuantity: async (itemId: string, quantity: number): Promise<CartItem> =>
    toItem(parseCommerce(cartItemSchema, await apiClient(`/cart/items/${encodeURIComponent(itemId)}/`, {
      method: 'PATCH', body: { quantity },
    }))),
  removeItem: async (itemId: string): Promise<void> => {
    await apiClient(`/cart/items/${encodeURIComponent(itemId)}/`, { method: 'DELETE' });
  },
};
