import type { QueryClient } from '@tanstack/react-query';

export const catalogKeys = {
  products: ['products'] as const,
  productsFiltered: (category?: string, tag?: string) => ['products', { category: category ?? '', tag: tag ?? '' }] as const,
  categories: ['categories'] as const,
  tags: ['tags'] as const,
  sellers: ['sellers'] as const,
  product: (id: string) => ['product', id] as const,
  ownedProduct: (id: string) => ['owned-product', id] as const,
  seller: (id: string) => ['seller', id] as const,
  storeProducts: (id: string) => ['sellerProducts', id] as const,
  ownedProducts: (id: string) => ['seller-products', id] as const,
  sellerAccess: (ownerId: string) => ['seller-access', ownerId] as const,
  storeServices: (id: string) => ['sellerServices', id] as const,
};

// Public and owned product queries have different permissions and result sets.
export const invalidateCatalog = (client: QueryClient, ownerId: string, storeId: string, productSlug?: string, ownedProductId?: string) => Promise.all([
  client.invalidateQueries({ queryKey: catalogKeys.products }),
  client.invalidateQueries({ queryKey: catalogKeys.storeProducts(storeId) }),
  client.invalidateQueries({ queryKey: catalogKeys.ownedProducts(ownerId) }),
  ...(productSlug ? [client.invalidateQueries({ queryKey: catalogKeys.product(productSlug) })] : []),
  ...(ownedProductId ? [client.invalidateQueries({ queryKey: catalogKeys.ownedProduct(ownedProductId) })] : []),
]);
