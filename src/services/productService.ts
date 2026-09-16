import { apiClient } from './api';
import { Product, ProductCategory, Service } from '../types/product';
import { Seller } from '../types/seller';

type BackendProduct = {
  id: string;
  store: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  currency: string;
  stock_quantity: number;
  status: string;
};

type BackendStore = {
  id: string;
  owner: string;
  name: string;
  slug: string;
  description: string;
  status: string;
};

export interface SellerProductDraft {
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  availableQuantity: number;
  images: string[];
  weight?: string;
  dimensions?: string;
}

const asProduct = (item: BackendProduct): Product => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price: Number(item.price),
  currency: 'KSh',
  rating: 0,
  reviewCount: 0,
  category: 'More',
  sellerId: item.store,
  images: [],
  deliveryEstimate: 'Availability confirmed by seller',
  availableQuantity: item.stock_quantity,
});

const asSeller = (item: BackendStore): Seller => ({
  id: item.owner,
  name: item.name,
  location: 'Kenya',
  bio: item.description,
  rating: 0,
  reviewCount: 0,
  verified: item.status === 'active',
});

const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `product-${Date.now()}`;

const toBackendDraft = (draft: SellerProductDraft) => ({
  name: draft.name,
  slug: `${slugify(draft.name)}-${Date.now()}`,
  description: draft.description,
  sku: `${slugify(draft.name).slice(0, 60)}-${Date.now()}`,
  price: draft.price,
  currency: 'KES',
  stock_quantity: draft.availableQuantity,
  status: 'published',
});

export const productService = {
  fetchProducts: async (): Promise<Product[]> => {
    const response = await apiClient<BackendProduct[]>('/products/', { auth: false });
    return response.map(asProduct);
  },

  fetchProductById: async (id: string): Promise<Product | null> => {
    const products = await productService.fetchProducts();
    return products.find(product => product.id === id) ?? null;
  },

  fetchProductsBySeller: async (sellerId: string): Promise<Product[]> => {
    const [products, stores] = await Promise.all([
      apiClient<BackendProduct[]>('/products/', { auth: false }),
      apiClient<BackendStore[]>('/stores/', { auth: false }),
    ]);
    const storeIds = new Set(
      stores.filter(store => store.owner === sellerId || store.id === sellerId).map(store => store.id),
    );
    return products.filter(product => storeIds.has(product.store)).map(asProduct);
  },

  initializeSellerCatalog: async (sellerId: string): Promise<Product[]> =>
    productService.fetchSellerProducts(sellerId),

  fetchSellerProducts: async (_sellerId: string): Promise<Product[]> =>
    apiClient<BackendProduct[]>('/products/manage/').then(products => products.map(asProduct)),

  addSellerProduct: async (sellerId: string, draft: SellerProductDraft): Promise<Product> => {
    const product = await apiClient<BackendProduct>('/products/manage/', {
      method: 'POST',
      body: toBackendDraft(draft),
    });
    return asProduct(product);
  },

  updateSellerProduct: async (_sellerId: string, productId: string, draft: SellerProductDraft): Promise<Product> => {
    const product = await apiClient<BackendProduct>(`/products/manage/${productId}/`, {
      method: 'PATCH',
      body: {
        name: draft.name,
        description: draft.description,
        price: draft.price,
        stock_quantity: draft.availableQuantity,
      },
    });
    return asProduct(product);
  },

  deleteSellerProduct: async (_sellerId: string, _productId: string): Promise<void> => {
    throw new Error('The backend does not expose a product deletion endpoint.');
  },

  fetchCategories: async (): Promise<{ id: string; label: string; icon: string }[]> => [],
  fetchServices: async (): Promise<Service[]> => [],
  fetchServicesBySeller: async (_sellerId: string): Promise<Service[]> => [],
  fetchServiceById: async (_id: string): Promise<Service | null> => null,

  fetchSeller: async (id: string): Promise<Seller | null> => {
    const stores = await apiClient<BackendStore[]>('/stores/', { auth: false });
    const store = stores.find(item => item.owner === id || item.id === id);
    return store ? asSeller(store) : null;
  },

  fetchSellers: async (): Promise<Seller[]> => {
    const stores = await apiClient<BackendStore[]>('/stores/', { auth: false });
    return stores.map(asSeller);
  },
};
