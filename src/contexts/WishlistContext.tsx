import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const WISHLIST_STORAGE_KEY = 'africlay-wishlist';

interface WishlistContextValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) {
        try {
          setIds(JSON.parse(saved));
        } catch {
          AsyncStorage.removeItem(WISHLIST_STORAGE_KEY);
        }
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);
  const toggle = useCallback((productId: string) => {
    setIds(current => (current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId]));
  }, []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(() => ({ ids, has, toggle, clear }), [ids, has, toggle, clear]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};
