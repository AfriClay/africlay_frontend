import { z } from 'zod';
import type { Product, Service } from '../types/product';
import type { Seller } from '../types/seller';

const text = z.preprocess(value => typeof value === 'string' ? value : '', z.string());
const identifier = z.string().trim().min(1);
const images = z.preprocess(value => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim())
  : [], z.array(z.string()));
const rating = z.preprocess(value => value == null ? 0 : value, z.number().finite().min(0).max(5));
const count = z.preprocess(value => value == null ? 0 : value, z.number().int().nonnegative());

const productSchema = z.object({
  id: identifier, name: identifier, price: z.number().finite().nonnegative(), currency: z.literal('KSh'),
  category: identifier, sellerId: text, images, description: text, deliveryEstimate: text,
  rating, reviewCount: count, availableQuantity: count,
  weight: z.string().optional(), dimensions: z.string().optional(), tags: z.array(z.string()).optional(),
});
const sellerSchema = z.object({
  id: identifier, name: identifier, location: text, bio: text, rating, reviewCount: count,
  verified: z.preprocess(value => value === true, z.boolean()),
  bannerUrl: z.preprocess(value => typeof value === 'string' ? value : undefined, z.string().optional()),
});
const serviceSchema = z.object({
  id: identifier, title: identifier, priceFrom: z.number().finite().nonnegative(),
  description: text, category: text, providerId: text, images, rating, reviewCount: count,
});

export class CatalogDataError extends Error {
  constructor() { super('Catalog data could not be read. Please retry.'); this.name = 'CatalogDataError'; }
}

const parse = <T>(schema: z.ZodType, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new CatalogDataError();
  return result.data as T;
};

export const readProducts = (value: unknown): Product[] => parse(productSchema.array(), value);
export const readSellers = (value: unknown): Seller[] => parse(sellerSchema.array(), value);
export const readServices = (value: unknown): Service[] => parse(serviceSchema.array(), value);
export const recordId = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
