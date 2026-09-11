import AsyncStorage from '@react-native-async-storage/async-storage';
import { products } from '../mock/products';
import { services } from '../mock/services';
import { sellers } from '../mock/sellers';
import { Product, ProductCategory, Service } from '../types/product';
import { Seller } from '../types/seller';
import { simulateNetwork } from './api';

const SELLER_CATALOG_KEY = 'africlay-seller-catalog-v1';

interface SellerCatalogState {
  initializedSellerIds: string[];
  products: Product[];
}

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

const emptyCatalog: SellerCatalogState = { initializedSellerIds: [], products: [] };

const readCatalog = async (): Promise<SellerCatalogState> => {
  const stored = await AsyncStorage.getItem(SELLER_CATALOG_KEY);
  if (!stored) return emptyCatalog;
  try {
    const parsed = JSON.parse(stored) as SellerCatalogState;
    return {
      initializedSellerIds: Array.isArray(parsed.initializedSellerIds) ? parsed.initializedSellerIds : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
    };
  } catch {
    return emptyCatalog;
  }
};

const writeCatalog = async (catalog: SellerCatalogState): Promise<void> => {
  await AsyncStorage.setItem(SELLER_CATALOG_KEY, JSON.stringify(catalog));
};

const seedProducts = (sellerId: string): Product[] => [
  {
    id: `${sellerId}-kitenge-bundle`,
    name: 'Kitenge Fabric Bundle',
    description: 'A vibrant bundle of quality Kitenge fabric for clothing, accessories, and décor.',
    price: 1800,
    currency: 'KSh',
    rating: 0,
    reviewCount: 0,
    category: 'Fashion',
    sellerId,
    images: ['https://images.unsplash.com/photo-1604514628550-37477afdf4e3?auto=format&fit=crop&w=900&q=80'],
    deliveryEstimate: '2–4 days',
    availableQuantity: 12,
  },
  {
    id: `${sellerId}-sisal-rug`,
    name: 'Handmade Sisal Rug',
    description: 'A durable handwoven sisal rug made by Kenyan artisans for warm, natural interiors.',
    price: 3200,
    currency: 'KSh',
    rating: 0,
    reviewCount: 0,
    category: 'Home & Living',
    sellerId,
    images: ['https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=900&q=80'],
    deliveryEstimate: '3–5 days',
    availableQuantity: 5,
  },
];

const toProduct = (sellerId: string, draft: SellerProductDraft, id = `${sellerId}-${Date.now()}`): Product => ({
  id,
  ...draft,
  currency: 'KSh',
  rating: 0,
  reviewCount: 0,
  sellerId,
  deliveryEstimate: '2–5 days',
});

export const productService = {
  initializeSellerCatalog: async (sellerId: string): Promise<Product[]> => {
    const catalog = await readCatalog();
    if (!catalog.initializedSellerIds.includes(sellerId)) {
      catalog.initializedSellerIds.push(sellerId);
      catalog.products.push(...seedProducts(sellerId));
      await writeCatalog(catalog);
    }
    return simulateNetwork(catalog.products.filter(product => product.sellerId === sellerId));
  },

  fetchSellerProducts: async (sellerId: string): Promise<Product[]> => {
    const catalog = await readCatalog();
    return simulateNetwork(catalog.products.filter(product => product.sellerId === sellerId));
  },

  addSellerProduct: async (sellerId: string, draft: SellerProductDraft): Promise<Product> => {
    const catalog = await readCatalog();
    const product = toProduct(sellerId, draft);
    catalog.products.unshift(product);
    if (!catalog.initializedSellerIds.includes(sellerId)) catalog.initializedSellerIds.push(sellerId);
    await writeCatalog(catalog);
    return simulateNetwork(product);
  },

  updateSellerProduct: async (sellerId: string, productId: string, draft: SellerProductDraft): Promise<Product> => {
    const catalog = await readCatalog();
    const index = catalog.products.findIndex(product => product.id === productId && product.sellerId === sellerId);
    if (index < 0) throw new Error('Product not found.');
    const updated = { ...catalog.products[index], ...draft } as Product;
    catalog.products[index] = updated;
    await writeCatalog(catalog);
    return simulateNetwork(updated);
  },

  deleteSellerProduct: async (sellerId: string, productId: string): Promise<void> => {
    const catalog = await readCatalog();
    catalog.products = catalog.products.filter(product => !(product.id === productId && product.sellerId === sellerId));
    await writeCatalog(catalog);
    await simulateNetwork(undefined);
  },

  fetchProducts: async (): Promise<Product[]> => {
    const catalog = await readCatalog();
    return simulateNetwork([...catalog.products, ...products]);
  },
  fetchProductById: async (id: string): Promise<Product | undefined> => {
    const catalog = await readCatalog();
    const item = catalog.products.find(product => product.id === id) ?? products.find(product => product.id === id);
    return simulateNetwork(item);
  },
  fetchProductsBySeller: async (sellerId: string): Promise<Product[]> => {
    const catalog = await readCatalog();
    const items = [
      ...catalog.products.filter(product => product.sellerId === sellerId),
      ...products.filter(product => product.sellerId === sellerId),
    ];
    return simulateNetwork(items);
  },
  fetchServices: async (): Promise<Service[]> => simulateNetwork(services),
  fetchServicesBySeller: async (sellerId: string): Promise<Service[]> => simulateNetwork(services.filter(service => service.providerId === sellerId)),
  fetchServiceById: async (id: string): Promise<Service | undefined> => simulateNetwork(services.find(service => service.id === id)),
  fetchCategories: async (): Promise<{ id: string; label: string; icon: string }[]> => simulateNetwork(await import('../mock/categories').then(module => module.categories)),
  fetchSeller: async (id: string): Promise<Seller | undefined> => simulateNetwork(sellers.find(item => item.id === id)),
  fetchSellers: async (): Promise<Seller[]> => simulateNetwork(sellers),
};
