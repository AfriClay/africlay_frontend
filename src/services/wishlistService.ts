import { z } from 'zod';
import { Wishlist, WishlistItem } from '../types/wishlist';
import { apiClient } from './api';
import { parseAmount, parseCommerce, parseCommerceList } from './commerceContract';

const itemSchema = z.object({
  id: z.string().uuid(),
  product: z.string().uuid(),
  product_name: z.string(),
  product_slug: z.string(),
  product_price: z.union([z.string(), z.number()]),
  created_at: z.string(),
});

const wishlistSchema = z.object({
  id: z.string().uuid(),
  items: z.array(itemSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

const toItem = (item: z.infer<typeof itemSchema>): WishlistItem => ({
  id: item.id,
  productId: item.product,
  productName: item.product_name,
  productSlug: item.product_slug,
  productPrice: parseAmount(item.product_price),
  createdAt: item.created_at,
});

const toWishlist = (value: z.infer<typeof wishlistSchema>): Wishlist => ({
  id: value.id,
  items: value.items.map(toItem),
  createdAt: value.created_at,
  updatedAt: value.updated_at,
});

export const wishlistService = {
  get: async (): Promise<Wishlist> => toWishlist(parseCommerce(wishlistSchema, await apiClient('/cart/wishlist/'))),
  listItems: async (): Promise<WishlistItem[]> =>
    parseCommerceList(itemSchema, await apiClient('/cart/wishlist/items/')).map(toItem),
  add: async (productId: string): Promise<WishlistItem> =>
    toItem(parseCommerce(itemSchema, await apiClient('/cart/wishlist/items/', { method: 'POST', body: { product: productId } }))),
  remove: async (itemId: string): Promise<void> => {
    await apiClient(`/cart/wishlist/items/${encodeURIComponent(itemId)}/`, { method: 'DELETE' });
  },
};
