import React from 'react';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const useWishlist = (): never => {
  throw new Error('Wishlist is unavailable until Django exposes account-backed wishlist endpoints.');
};
