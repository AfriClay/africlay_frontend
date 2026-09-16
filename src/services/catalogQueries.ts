import type { QueryClient } from '@tanstack/react-query';

export const catalogKeys = {
  products: ['products'] as const,
  product: (id: string) => ['product', id] as const,
  seller: (id: string) => ['seller', id] as const,
  storeProducts: (id: string) => ['sellerProducts', id] as const,
  ownedProducts: (id: string) => ['seller-products', id] as const,
  storeServices: (id: string) => ['sellerServices', id] as const,
};

// Public store products include seed data; owned products do not. Keep their caches distinct.
export const invalidateCatalog = (client: QueryClient, sellerId: string, productId?: string) => Promise.all([
  client.invalidateQueries({ queryKey: catalogKeys.products }),
  client.invalidateQueries({ queryKey: catalogKeys.storeProducts(sellerId) }),
  client.invalidateQueries({ queryKey: catalogKeys.ownedProducts(sellerId) }),
  ...(productId ? [client.invalidateQueries({ queryKey: catalogKeys.product(productId) })] : []),
]);
