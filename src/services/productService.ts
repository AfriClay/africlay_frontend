import { products } from '../mock/products';
import { services } from '../mock/services';
import { sellers } from '../mock/sellers';
import { Product, Service } from '../types/product';
import { Seller } from '../types/seller';
import { simulateNetwork } from './api';

export const productService = {
  fetchProducts: async (): Promise<Product[]> => {
    return simulateNetwork(products);
  },
  fetchProductById: async (id: string): Promise<Product | undefined> => {
    const item = products.find(product => product.id === id);
    return simulateNetwork(item);
  },
  fetchProductsBySeller: async (sellerId: string): Promise<Product[]> => {
    const items = products.filter(product => product.sellerId === sellerId);
    return simulateNetwork(items);
  },
  fetchServices: async (): Promise<Service[]> => {
    return simulateNetwork(services);
  },
  fetchServicesBySeller: async (sellerId: string): Promise<Service[]> => {
    return simulateNetwork(services.filter(service => service.providerId === sellerId));
  },
  fetchServiceById: async (id: string): Promise<Service | undefined> => {
    const item = services.find(service => service.id === id);
    return simulateNetwork(item);
  },
  fetchCategories: async (): Promise<{ id: string; label: string; icon: string }[]> => {
    return simulateNetwork(await import('../mock/categories').then(module => module.categories));
  },
  fetchSeller: async (id: string): Promise<Seller | undefined> => {
    const seller = sellers.find(item => item.id === id);
    return simulateNetwork(seller);
  },
  fetchSellers: async (): Promise<Seller[]> => {
    return simulateNetwork(sellers);
  },
};
