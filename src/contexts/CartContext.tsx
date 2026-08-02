import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { OrderItem } from '../types/order';

export type CartItem = OrderItem;

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  sellerSubtotals: Record<string, number>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems(current => {
      const existing = current.find(row => row.productId === item.productId);
      if (existing) {
        return current.map(row =>
          row.productId === item.productId ? { ...row, quantity: row.quantity + item.quantity } : row,
        );
      }
      return [...current, item];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(current => current.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setItems(current => current.map(item => (item.id === itemId ? { ...item, quantity } : item)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const sellerSubtotals = useMemo(() => items.reduce<Record<string, number>>((subtotals, item) => {
    subtotals[item.sellerId] = (subtotals[item.sellerId] ?? 0) + item.price * item.quantity;
    return subtotals;
  }, {}), [items]);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, sellerSubtotals }),
    [items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, sellerSubtotals],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
