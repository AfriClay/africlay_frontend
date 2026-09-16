import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const WISHLIST_STORAGE_KEY = 'africlay-wishlist';

interface WishlistContextValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
  loading: boolean;
  error?: string;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const currentIds = useRef<string[]>([]);
  const hydrated = useRef(false);
  const busy = useRef(true);

  const readSaved = useCallback(async () => {
    const saved = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed) || !parsed.every(id => typeof id === 'string')) {
      throw new Error('Invalid wishlist data');
    }
    currentIds.current = [...new Set(parsed)];
    setIds(currentIds.current);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await readSaved();
      } catch {
        setError('Unable to load wishlist. Tap the heart to retry.');
      } finally {
        busy.current = false;
        setLoading(false);
      }
    })();
  }, [readSaved]);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);
  const persist = useCallback(async (update: (current: string[]) => string[]) => {
    // Lock synchronously: a second tap can arrive before React renders loading.
    if (busy.current) return false;
    busy.current = true;
    setLoading(true);
    setError(undefined);
    try {
      if (!hydrated.current) await readSaved();
      const next = update(currentIds.current);
      await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      currentIds.current = next;
      setIds(next);
      return true;
    } catch {
      setError('Unable to update wishlist. Tap the heart to retry.');
      return false;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [readSaved]);
  const toggle = useCallback((productId: string) => persist(current =>
    current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId]), [persist]);
  const clear = useCallback(() => persist(() => []), [persist]);

  const value = useMemo(() => ({ ids, has, toggle, clear, loading, error }), [ids, has, toggle, clear, loading, error]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};
