import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { wishlistService } from '../services/wishlistService';
import { WishlistItem } from '../types/wishlist';

type WishlistContextValue = {
  items: WishlistItem[];
  isLoading: boolean;
  isFetching: boolean;
  error?: Error;
  pendingProductId?: string;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
const wishlistKey = (userId: string) => ['wishlist', userId] as const;

export const WishlistProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';
  const query = useQuery({
    queryKey: wishlistKey(userId),
    queryFn: wishlistService.listItems,
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: async (productId: string) => {
      const existing = query.data?.find(item => item.productId === productId);
      if (existing) await wishlistService.remove(existing.id);
      else await wishlistService.add(productId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKey(userId) }),
  });

  const value = useMemo<WishlistContextValue>(() => ({
    items: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error : undefined,
    pendingProductId: mutation.isPending ? mutation.variables : undefined,
    isSaved: productId => Boolean(query.data?.some(item => item.productId === productId)),
    toggle: async productId => { await mutation.mutateAsync(productId); },
    refresh: async () => { await query.refetch(); },
  }), [mutation.isPending, mutation.variables, query.data, query.error, query.isFetching, query.isLoading, query.refetch]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
