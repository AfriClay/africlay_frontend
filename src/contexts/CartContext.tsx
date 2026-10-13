import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { cartService } from '../services/cartService';
import { getApiErrorMessage } from '../services/api';
import {
  addGuestCartItem,
  guestCartStorage,
  type GuestCartProduct,
  removeGuestCartItem,
  updateGuestCartQuantity,
} from '../services/guestCartStorage';
import { CartItem } from '../types/cart';
import { canAccessBuyerTools } from '../utils/roles';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  loading: boolean;
  refreshing: boolean;
  mutating: boolean;
  available: boolean;
  isGuestCart: boolean;
  savedGuestItemCount: number;
  transferMessage?: string;
  error?: string;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number, guestProduct?: GuestCartProduct) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  retryGuestTransfer: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const cartKey = (userId: string) => ['cart', userId] as const;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const accountAvailable = Boolean(userId && canAccessBuyerTools(user?.role));
  const isGuestCart = !user;
  const available = isGuestCart || accountAvailable;
  const queryClient = useQueryClient();
  const previousUserId = useRef('');
  const transferAttemptedForUser = useRef('');
  const busy = useRef(false);
  const [guestItems, setGuestItems] = useState<CartItem[]>([]);
  const [guestLoaded, setGuestLoaded] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string>();
  const [transferMessage, setTransferMessage] = useState<string>();
  const cartQuery = useQuery({
    queryKey: cartKey(userId), queryFn: cartService.fetchCart,
    enabled: accountAvailable, refetchOnMount: 'always',
  });

  useEffect(() => {
    let active = true;
    void guestCartStorage.load().then(items => {
      if (!active) return;
      setGuestItems(items);
      setGuestLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (previousUserId.current && previousUserId.current !== userId) {
      queryClient.removeQueries({ queryKey: cartKey(previousUserId.current), exact: true });
    }
    if (previousUserId.current !== userId) {
      setMutationError(undefined);
      setTransferMessage(undefined);
    }
    if (!userId) transferAttemptedForUser.current = '';
    previousUserId.current = userId;
  }, [queryClient, userId]);

  const saveGuestItems = useCallback(async (items: CartItem[]) => {
    await guestCartStorage.save(items);
    setGuestItems(items);
  }, []);

  const runExclusive = useCallback(async (operation: () => Promise<void>) => {
    if (busy.current) throw new Error('Please wait for the current cart update.');
    busy.current = true;
    setMutating(true);
    setMutationError(undefined);
    try { await operation(); }
    catch (error) {
      setMutationError(getApiErrorMessage(error, 'Unable to update your cart.'));
      throw error;
    } finally {
      busy.current = false;
      setMutating(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (isGuestCart) {
      setGuestLoaded(false);
      setGuestItems(await guestCartStorage.load());
      setGuestLoaded(true);
      setMutationError(undefined);
      return;
    }
    if (!accountAvailable) return;
    const result = await cartQuery.refetch();
    if (result.error) throw result.error;
    setMutationError(undefined);
  }, [accountAvailable, cartQuery.refetch, isGuestCart]);

  const addItem = useCallback((productId: string, quantity = 1, guestProduct?: GuestCartProduct) => {
    if (!productId || !Number.isInteger(quantity) || quantity < 1) return Promise.reject(new Error('Choose a valid quantity.'));
    if (isGuestCart) {
      if (!guestProduct || guestProduct.productId !== productId) return Promise.reject(new Error('Product details are required for a guest cart.'));
      return runExclusive(() => saveGuestItems(addGuestCartItem(guestItems, guestProduct, quantity)));
    }
    if (!accountAvailable) return Promise.reject(new Error('Shopping is not available for this account.'));
    return runExclusive(async () => { await cartService.addItem(productId, quantity); await cartQuery.refetch(); });
  }, [accountAvailable, cartQuery.refetch, guestItems, isGuestCart, runExclusive, saveGuestItems]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return Promise.reject(new Error('Choose a valid quantity.'));
    if (isGuestCart) return runExclusive(() => saveGuestItems(updateGuestCartQuantity(guestItems, itemId, quantity)));
    if (!accountAvailable) return Promise.reject(new Error('Shopping is not available for this account.'));
    return runExclusive(async () => { await cartService.updateQuantity(itemId, quantity); await cartQuery.refetch(); });
  }, [accountAvailable, cartQuery.refetch, guestItems, isGuestCart, runExclusive, saveGuestItems]);

  const removeItem = useCallback((itemId: string) => {
    if (isGuestCart) return runExclusive(() => saveGuestItems(removeGuestCartItem(guestItems, itemId)));
    if (!accountAvailable) return Promise.reject(new Error('Shopping is not available for this account.'));
    return runExclusive(async () => { await cartService.removeItem(itemId); await cartQuery.refetch(); });
  }, [accountAvailable, cartQuery.refetch, guestItems, isGuestCart, runExclusive, saveGuestItems]);

  const transferGuestItems = useCallback(async () => {
    if (!accountAvailable || !userId || !guestLoaded || !guestItems.length) return;
    await runExclusive(async () => {
      let remaining = [...guestItems];
      let transferred = 0;
      for (const item of guestItems) {
        try {
          await cartService.addItem(item.productId, item.quantity);
          remaining = remaining.filter(candidate => candidate.id !== item.id);
          await guestCartStorage.save(remaining);
          setGuestItems(remaining);
          transferred += 1;
        } catch (error) {
          const prefix = transferred ? `${transferred} saved item${transferred === 1 ? '' : 's'} moved. ` : '';
          setTransferMessage(`${prefix}${getApiErrorMessage(error, 'Some guest-cart items could not be moved to this account.')}`);
          break;
        }
      }
      await cartQuery.refetch();
      if (!remaining.length) setTransferMessage('Your saved guest cart was added to this account.');
    });
  }, [accountAvailable, cartQuery.refetch, guestItems, guestLoaded, runExclusive, userId]);

  useEffect(() => {
    if (!accountAvailable || !userId || !guestLoaded || !guestItems.length || transferAttemptedForUser.current === userId) return;
    transferAttemptedForUser.current = userId;
    void transferGuestItems().catch(() => undefined);
  }, [accountAvailable, guestItems.length, guestLoaded, transferGuestItems, userId]);

  const items = isGuestCart ? guestItems : accountAvailable ? cartQuery.data?.items ?? [] : [];
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const savedGuestItemCount = useMemo(() => guestItems.reduce((sum, item) => sum + item.quantity, 0), [guestItems]);
  const value = useMemo<CartContextValue>(() => ({
    items, itemCount, subtotal, available, isGuestCart, savedGuestItemCount, transferMessage,
    loading: isGuestCart ? !guestLoaded : accountAvailable && cartQuery.isLoading,
    refreshing: isGuestCart ? false : accountAvailable && cartQuery.isFetching,
    mutating,
    error: mutationError ?? (!isGuestCart && accountAvailable && cartQuery.error ? getApiErrorMessage(cartQuery.error, 'Unable to load your cart.') : undefined),
    refresh, addItem, updateQuantity, removeItem, retryGuestTransfer: transferGuestItems,
  }), [items, itemCount, subtotal, available, isGuestCart, savedGuestItemCount, transferMessage, guestLoaded, accountAvailable, cartQuery.isLoading, cartQuery.isFetching, cartQuery.error, mutating, mutationError, refresh, addItem, updateQuantity, removeItem, transferGuestItems]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
