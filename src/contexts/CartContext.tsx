import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { cartService } from '../services/cartService';
import { getApiErrorMessage } from '../services/api';
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
  error?: string;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const cartKey = (userId: string) => ['cart', userId] as const;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const available = Boolean(userId && canAccessBuyerTools(user?.role));
  const queryClient = useQueryClient();
  const previousUserId = useRef('');
  const busy = useRef(false);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string>();
  const cartQuery = useQuery({
    queryKey: cartKey(userId), queryFn: cartService.fetchCart,
    enabled: available, refetchOnMount: 'always',
  });

  useEffect(() => {
    if (previousUserId.current && previousUserId.current !== userId) {
      queryClient.removeQueries({ queryKey: cartKey(previousUserId.current), exact: true });
      setMutationError(undefined);
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  const refresh = useCallback(async () => {
    if (!available) return;
    const result = await cartQuery.refetch();
    if (result.error) throw result.error;
    setMutationError(undefined);
  }, [available, cartQuery.refetch]);

  const mutate = useCallback(async (operation: () => Promise<unknown>) => {
    if (!userId) throw new Error('Log in to use your cart.');
    if (!available) throw new Error('Shopping is available to buyer accounts.');
    if (busy.current) throw new Error('Please wait for the current cart update.');
    busy.current = true;
    setMutating(true);
    setMutationError(undefined);
    try {
      await operation();
      await refresh();
    } catch (error) {
      setMutationError(getApiErrorMessage(error, 'Unable to update your cart.'));
      throw error;
    } finally {
      busy.current = false;
      setMutating(false);
    }
  }, [available, refresh, userId]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    if (!productId || !Number.isInteger(quantity) || quantity < 1) return Promise.reject(new Error('Choose a valid quantity.'));
    return mutate(() => cartService.addItem(productId, quantity));
  }, [mutate]);
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return Promise.reject(new Error('Choose a valid quantity.'));
    return mutate(() => cartService.updateQuantity(itemId, quantity));
  }, [mutate]);
  const removeItem = useCallback((itemId: string) => mutate(() => cartService.removeItem(itemId)), [mutate]);

  const items = available ? cartQuery.data?.items ?? [] : [];
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const value = useMemo(() => ({
    items, itemCount, subtotal, available, loading: available && cartQuery.isLoading,
    refreshing: available && cartQuery.isFetching, mutating,
    error: available ? mutationError ?? (cartQuery.error ? getApiErrorMessage(cartQuery.error, 'Unable to load your cart.') : undefined) : undefined,
    refresh, addItem, updateQuantity, removeItem,
  }), [items, itemCount, subtotal, available, cartQuery.isLoading, cartQuery.isFetching, cartQuery.error, mutating, mutationError, refresh, addItem, updateQuantity, removeItem]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
