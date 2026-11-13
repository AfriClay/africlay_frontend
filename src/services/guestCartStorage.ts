import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem } from '../types/cart';

export const GUEST_CART_STORAGE_KEY = 'africlay-guest-cart-v1';

export type GuestCartProduct = {
  productId: string;
  productSlug?: string;
  name: string;
  price: number;
  priceUnit?: string;
  optionId?: string;
  optionLabel?: string;
};

const validItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return typeof item.id === 'string'
    && typeof item.productId === 'string'
    && (item.productSlug === undefined || typeof item.productSlug === 'string')
    && typeof item.name === 'string'
    && typeof item.price === 'number'
    && (item.priceUnit === undefined || typeof item.priceUnit === 'string')
    && (item.optionId === undefined || typeof item.optionId === 'string')
    && (item.optionLabel === undefined || typeof item.optionLabel === 'string')
    && Number.isFinite(item.price)
    && item.price >= 0
    && typeof item.quantity === 'number'
    && Number.isInteger(item.quantity)
    && item.quantity > 0;
};

export const normalizeGuestCart = (value: unknown): CartItem[] => Array.isArray(value)
  ? value.filter(validItem).map(item => ({ ...item }))
  : [];

export const addGuestCartItem = (items: CartItem[], product: GuestCartProduct, quantity: number): CartItem[] => {
  const sameOption = (item: CartItem) => item.productId === product.productId && item.optionId === product.optionId;
  const existing = items.find(sameOption);
  if (existing) return items.map(item => sameOption(item) ? { ...item, quantity: item.quantity + quantity } : item);
  return [...items, { id: product.optionId ? `guest:${product.productId}:${product.optionId}` : `guest:${product.productId}`, ...product, quantity }];
};

export const updateGuestCartQuantity = (items: CartItem[], itemId: string, quantity: number): CartItem[] =>
  items.map(item => item.id === itemId ? { ...item, quantity } : item);

export const removeGuestCartItem = (items: CartItem[], itemId: string): CartItem[] =>
  items.filter(item => item.id !== itemId);

export const guestCartStorage = {
  load: async (): Promise<CartItem[]> => {
    try {
      const stored = await AsyncStorage.getItem(GUEST_CART_STORAGE_KEY);
      return stored ? normalizeGuestCart(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  },
  save: async (items: CartItem[]): Promise<void> => {
    await AsyncStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(normalizeGuestCart(items)));
  },
};
