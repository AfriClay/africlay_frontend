import { z } from 'zod';
import { CartItem, CartSnapshot } from '../types/cart';
import { apiClient } from './api';
import { parseAmount, parseCommerce } from './commerceContract';

const cartItemSchema = z.object({
  id: z.string().uuid(), product: z.string().uuid(),
  product_name: z.string(), product_slug: z.string().nullish(),
  product_price: z.union([z.string(), z.number()]),
  quantity: z.number().int().positive(),
});
const cartSchema = z.object({ id: z.string().uuid(), buyer: z.string().uuid(), items: z.array(cartItemSchema) });

const toItem = (item: z.infer<typeof cartItemSchema>): CartItem => ({
  id: item.id, productId: item.product, productSlug: item.product_slug ?? undefined,
  name: item.product_name, price: parseAmount(item.product_price), quantity: item.quantity,
});

export const cartService = {
  fetchCart: async (): Promise<CartSnapshot> => {
    const raw = await apiClient('/cart/');
    const cart = parseCommerce(cartSchema, raw);
    return { id: cart.id, buyerId: cart.buyer, items: cart.items.map(toItem) };
  },
  addItem: async (productId: string, quantity = 1): Promise<CartItem> =>
    toItem(parseCommerce(cartItemSchema, await apiClient('/cart/items/', {
      method: 'POST', body: { product: productId, quantity },
    }))),
  updateQuantity: async (itemId: string, quantity: number): Promise<CartItem> =>
    toItem(parseCommerce(cartItemSchema, await apiClient(`/cart/items/${encodeURIComponent(itemId)}/`, {
      method: 'PATCH', body: { quantity },
    }))),
  removeItem: async (itemId: string): Promise<void> => {
    await apiClient(`/cart/items/${encodeURIComponent(itemId)}/`, { method: 'DELETE' });
  },
};
