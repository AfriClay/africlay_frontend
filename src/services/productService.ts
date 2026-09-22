import type * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import type { Product, Service } from '../types/product';
import type { Seller } from '../types/seller';
import { ApiError, apiClient } from './api';
import { CatalogDataError, recordId } from './catalogContract';
import { serviceService } from './serviceService';

const optionalText = z.string().nullish();
const quantity = z.number().int().nonnegative();
const imageSchema = z.object({ image: optionalText, is_primary: z.boolean().optional(), display_order: z.number().optional() });
const productSchema = z.object({
  id: z.string().min(1), store: z.string().min(1), category: optionalText,
  tags: z.array(z.string()).default([]), images: z.array(imageSchema).default([]),
  name: z.string().min(1), slug: z.string().min(1), description: z.string().nullish(),
  sku: z.string().min(1), price: z.union([z.string(), z.number()]),
  currency: z.string().length(3), stock_quantity: quantity,
  status: z.enum(['draft', 'published', 'archived']),
});
const categorySchema = z.object({ id: z.string().min(1), name: z.string().min(1), slug: z.string().min(1), parent: optionalText });
const tagSchema = z.object({ id: z.string().min(1), name: z.string().min(1), slug: z.string().min(1) });
const storeSchema = z.object({
  id: z.string().min(1), owner: z.string().min(1), slug: z.string().min(1), name: z.string().min(1),
  description: z.string().nullish(), city: z.string().nullish(), country: z.string().nullish(),
  logo: optionalText, banner: optionalText, average_rating: z.union([z.string(), z.number()]).optional(),
  total_reviews: quantity.optional(), total_products: quantity.optional(), status: z.string().optional(),
});

type BackendProduct = z.infer<typeof productSchema>;
type BackendStore = z.infer<typeof storeSchema>;
export type CatalogCategory = { id: string; slug: string; label: string; icon: string; parent?: string };
export type CatalogTag = { id: string; slug: string; label: string };
export type SellerProductDraft = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId?: string;
  tagIds: string[];
  price: number;
  availableQuantity: number;
  status: 'draft' | 'published' | 'archived';
};

const imageUrl = (value?: string | null): string | undefined => {
  if (!value?.trim()) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const root = (process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  return `${root}/${value.replace(/^\/+/, '')}`;
};

const list = <T>(schema: z.ZodType<T>, value: unknown): T[] => {
  const results = Array.isArray(value) ? value :
    value && typeof value === 'object' && 'results' in value ? (value as { results: unknown }).results : undefined;
  const parsed = z.array(schema).safeParse(results);
  if (!parsed.success) throw new CatalogDataError();
  return parsed.data;
};

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new CatalogDataError();
  return parsed.data;
};

const asPrice = (value: string | number): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new CatalogDataError();
  return amount;
};

const toProduct = (raw: BackendProduct, categories: CatalogCategory[]): Product => {
  const category = categories.find(item => item.id === raw.category);
  const orderedImages = [...raw.images].sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || (a.display_order ?? 0) - (b.display_order ?? 0));
  return {
    id: raw.id, slug: raw.slug, sku: raw.sku, status: raw.status,
    name: raw.name, description: raw.description ?? '', price: asPrice(raw.price),
    currency: raw.currency, category: category?.label ?? 'Uncategorized', categoryId: raw.category ?? undefined,
    tagIds: raw.tags, sellerId: raw.store, images: orderedImages.map(item => imageUrl(item.image)).filter((url): url is string => Boolean(url)),
    availableQuantity: raw.stock_quantity, rating: 0, reviewCount: 0, deliveryEstimate: '',
  };
};

const toSeller = (raw: BackendStore): Seller => ({
  id: raw.id, ownerId: raw.owner, slug: raw.slug, name: raw.name, bio: raw.description ?? '',
  location: [raw.city, raw.country].filter(Boolean).join(', '),
  verified: false, rating: raw.average_rating == null ? 0 : asPrice(raw.average_rating),
  reviewCount: raw.total_reviews ?? 0, totalProducts: raw.total_products ?? 0,
  logoUrl: imageUrl(raw.logo), bannerUrl: imageUrl(raw.banner),
});

const productPayload = (draft: SellerProductDraft) => ({
  name: draft.name, slug: draft.slug, sku: draft.sku, description: draft.description,
  category: draft.categoryId ?? null, tags: draft.tagIds, price: draft.price.toFixed(2),
  currency: 'KES', stock_quantity: draft.availableQuantity, status: draft.status,
});

let categoriesInFlight: Promise<CatalogCategory[]> | undefined;
let storesInFlight: Promise<Seller[]> | undefined;

export const productService = {
  fetchCategories: (): Promise<CatalogCategory[]> => {
    categoriesInFlight ??= apiClient('/products/categories/', { auth: false })
      .then(raw => list(categorySchema, raw).map(item => ({ id: item.id, slug: item.slug, label: item.name, icon: 'Tag', parent: item.parent ?? undefined })))
      .finally(() => { categoriesInFlight = undefined; });
    return categoriesInFlight;
  },
  fetchTags: async (): Promise<CatalogTag[]> => list(tagSchema, await apiClient('/products/tags/', { auth: false }))
    .map(item => ({ id: item.id, slug: item.slug, label: item.name })),
  fetchProducts: async (filters: { category?: string; tag?: string } = {}): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.tag) params.set('tag', filters.tag);
    const query = params.toString();
    const path = `/products/${query ? `?${query}` : ''}`;
    const [raw, categories] = await Promise.all([apiClient(path, { auth: false }), productService.fetchCategories()]);
    return list(productSchema, raw).map(item => toProduct(item, categories));
  },
  fetchProductById: async (slug: string): Promise<Product | null> => {
    if (!recordId(slug)) return null;
    try {
      const [raw, categories] = await Promise.all([
        apiClient(`/products/${encodeURIComponent(slug)}/`, { auth: false }), productService.fetchCategories(),
      ]);
      return toProduct(parse(productSchema, raw), categories);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  fetchSellerProducts: async (): Promise<Product[]> => {
    const [raw, categories] = await Promise.all([apiClient('/products/manage/'), productService.fetchCategories()]);
    return list(productSchema, raw).map(item => toProduct(item, categories));
  },
  fetchOwnedProductById: async (id: string): Promise<Product | null> => {
    if (!recordId(id)) return null;
    try {
      const [raw, categories] = await Promise.all([
        apiClient(`/products/manage/${encodeURIComponent(id)}/`), productService.fetchCategories(),
      ]);
      return toProduct(parse(productSchema, raw), categories);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  addSellerProduct: async (_sellerId: string, draft: SellerProductDraft): Promise<Product> => {
    const raw = await apiClient('/products/manage/', { method: 'POST', body: productPayload(draft) });
    return toProduct(parse(productSchema, raw), await productService.fetchCategories());
  },
  updateSellerProduct: async (_sellerId: string, id: string, draft: SellerProductDraft): Promise<Product> => {
    const raw = await apiClient(`/products/manage/${encodeURIComponent(id)}/`, { method: 'PATCH', body: productPayload(draft) });
    return toProduct(parse(productSchema, raw), await productService.fetchCategories());
  },
  uploadProductImages: async (id: string, assets: ImagePicker.ImagePickerAsset[]): Promise<void> => {
    for (const asset of assets) {
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
      if (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) throw new Error('Use a JPG, PNG, or WebP image.');
      const form = new FormData();
      const upload = asset.file ?? { uri: asset.uri, name: asset.fileName || 'product.jpg', type: asset.mimeType || 'image/jpeg' };
      form.append('image', upload as Blob);
      await apiClient(`/products/manage/${encodeURIComponent(id)}/images/`, { method: 'POST', body: form });
    }
  },
  fetchSellers: (): Promise<Seller[]> => {
    storesInFlight ??= apiClient('/stores/', { auth: false })
      .then(raw => list(storeSchema, raw).map(toSeller))
      .finally(() => { storesInFlight = undefined; });
    return storesInFlight;
  },
  getStore: async (slug: string): Promise<Seller | null> => {
    if (!recordId(slug)) return null;
    try { return toSeller(parse(storeSchema, await apiClient(`/stores/${encodeURIComponent(slug)}/`, { auth: false }))); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  fetchSeller: async (idOrSlug: string): Promise<Seller | null> => {
    if (!recordId(idOrSlug)) return null;
    const seller = (await productService.fetchSellers()).find(item => item.id === idOrSlug || item.slug === idOrSlug);
    return seller?.slug ? productService.getStore(seller.slug) : null;
  },
  fetchOwnStore: async (ownerId: string): Promise<Seller | null> => (await productService.fetchSellers()).find(item => item.ownerId === ownerId) ?? null,
  hasApprovedSellerAccess: async (ownerId: string): Promise<boolean> => {
    const store = await productService.fetchOwnStore(ownerId);
    if (!store?.slug) return false;
    try {
      const kyc = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected']) }),
        await apiClient(`/stores/${encodeURIComponent(store.slug)}/kyc/`));
      return kyc.status === 'approved';
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    }
  },
  updateStore: async (slug: string, changes: { name?: string; description?: string; city?: string }): Promise<Seller> =>
    toSeller(parse(storeSchema, await apiClient(`/stores/${encodeURIComponent(slug)}/`, { method: 'PATCH', body: changes }))),
  fetchProductsBySeller: async (sellerId: string): Promise<Product[]> => (await productService.fetchProducts()).filter(item => item.sellerId === sellerId),
  fetchServices: (): Promise<Service[]> => serviceService.list(),
  fetchServicesBySeller: async (sellerId: string): Promise<Service[]> => (await serviceService.managed()).filter(item => item.providerId === sellerId),
  fetchServiceById: (slug: string): Promise<Service | null> => serviceService.detail(slug),
};
