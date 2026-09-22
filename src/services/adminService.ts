import { z } from 'zod';
import { ApiError, apiClient } from './api';

const count = z.number().int().nonnegative().optional().default(0);
const storeSchema = z.object({
  id: z.string().uuid(), owner: z.string().uuid(), name: z.string(), slug: z.string(),
  description: z.string().nullish(), city: z.string().nullish(), country: z.string().nullish(),
  status: z.enum(['active', 'suspended']), average_rating: z.union([z.string(), z.number()]).optional(),
  total_reviews: count, total_orders: count, total_products: count,
});
const kycSchema = z.object({
  id: z.number().int().positive(), store: z.string().uuid(), business_name: z.string(),
  business_registration_number: z.string(), tax_identification_number: z.string(),
  document_type: z.string(), document: z.string().nullish(),
  status: z.enum(['pending', 'approved', 'rejected']), submitted_at: z.string().nullish(),
  reviewed_at: z.string().nullish(), reviewed_by: z.string().uuid().nullish(),
  rejection_reason: z.string().nullish(),
});
const taxonomySchema = z.object({
  id: z.string().uuid(), name: z.string(), slug: z.string(), description: z.string().optional().default(''),
  parent: z.string().uuid().nullish(), display_order: z.number().int().optional().default(0),
});
const tagSchema = z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() });

export type AdminStore = {
  id: string; ownerId: string; name: string; slug: string; description: string; location: string;
  status: 'active' | 'suspended'; rating: number; reviews: number; orders: number; products: number;
};
export type AdminKyc = z.infer<typeof kycSchema> & { storeName: string; storeSlug: string; ownerId: string; documentUrl: string | undefined };
export type TaxonomyKind = 'product-categories' | 'product-tags' | 'service-categories';
export type TaxonomyRecord = { id: string; name: string; slug: string; description: string; parent?: string; displayOrder: number };
export type TaxonomyDraft = { name: string; slug: string; description?: string; parent?: string; displayOrder?: number };

const parse = <T>(schema: z.ZodType<T>, raw: unknown, label: string): T => {
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error(`${label} response was incomplete. Please retry.`);
  return result.data;
};
const list = <T>(schema: z.ZodType<T>, raw: unknown, label: string): T[] => {
  const value = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && 'results' in raw ? (raw as { results: unknown }).results : raw;
  return parse(z.array(schema), value, label);
};
const mediaUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const host = (process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  return `${host}/${value.replace(/^\/+/, '')}`;
};
const taxonomyPath = (kind: TaxonomyKind): string => kind === 'product-categories'
  ? '/products/categories/' : kind === 'product-tags' ? '/products/tags/' : '/services/categories/';
const toStore = (raw: z.infer<typeof storeSchema>): AdminStore => ({
  id: raw.id, ownerId: raw.owner, name: raw.name, slug: raw.slug, description: raw.description ?? '',
  location: [raw.city, raw.country].filter(Boolean).join(', ') || 'Location not provided', status: raw.status,
  rating: Number(raw.average_rating ?? 0), reviews: raw.total_reviews, orders: raw.total_orders, products: raw.total_products,
});
const toTaxonomy = (raw: z.infer<typeof taxonomySchema>): TaxonomyRecord => ({
  id: raw.id, name: raw.name, slug: raw.slug, description: raw.description,
  parent: raw.parent ?? undefined, displayOrder: raw.display_order,
});
const taxonomyPayload = (kind: TaxonomyKind, draft: TaxonomyDraft) => kind === 'product-tags'
  ? { name: draft.name.trim(), slug: draft.slug.trim() }
  : { name: draft.name.trim(), slug: draft.slug.trim(), description: draft.description?.trim() ?? '',
      parent: draft.parent || null, display_order: draft.displayOrder ?? 0 };

export const adminKeys = {
  stores: ['admin', 'stores'] as const,
  kyc: ['admin', 'kyc'] as const,
  taxonomy: (kind: TaxonomyKind) => ['admin', 'taxonomy', kind] as const,
  catalogue: ['admin', 'catalogue-counts'] as const,
};

export const adminService = {
  listStores: async (): Promise<AdminStore[]> => list(storeSchema, await apiClient('/stores/', { auth: false }), 'Store').map(toStore),
  listKyc: async (): Promise<AdminKyc[]> => {
    const stores = await adminService.listStores();
    const records = await Promise.all(stores.map(async store => {
      try {
        const raw = parse(kycSchema, await apiClient(`/stores/${encodeURIComponent(store.slug)}/kyc/`), 'KYC');
        return { ...raw, storeName: store.name, storeSlug: store.slug, ownerId: store.ownerId, documentUrl: mediaUrl(raw.document) };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    }));
    return records.filter((record): record is AdminKyc => Boolean(record));
  },
  reviewKyc: async (slug: string, decision: 'approved' | 'rejected', rejectionReason = ''): Promise<AdminKyc> => {
    const raw = parse(kycSchema, await apiClient(`/stores/${encodeURIComponent(slug)}/kyc/review/`, {
      method: 'POST', body: { decision, ...(decision === 'rejected' ? { rejection_reason: rejectionReason.trim() } : {}) },
    }), 'KYC review');
    const store = (await adminService.listStores()).find(item => item.slug === slug);
    return { ...raw, storeName: store?.name ?? slug, storeSlug: slug, ownerId: store?.ownerId ?? '', documentUrl: mediaUrl(raw.document) };
  },
  listTaxonomy: async (kind: TaxonomyKind): Promise<TaxonomyRecord[]> => {
    const raw = await apiClient(taxonomyPath(kind), { auth: false });
    if (kind === 'product-tags') return list(tagSchema, raw, 'Tag').map(item => ({ ...item, description: '', displayOrder: 0 }));
    return list(taxonomySchema, raw, 'Category').map(toTaxonomy);
  },
  createTaxonomy: async (kind: TaxonomyKind, draft: TaxonomyDraft): Promise<TaxonomyRecord> => {
    const raw = await apiClient(taxonomyPath(kind), { method: 'POST', body: taxonomyPayload(kind, draft) });
    if (kind === 'product-tags') {
      const tag = parse(tagSchema, raw, 'Tag');
      return { ...tag, description: '', displayOrder: 0 };
    }
    return toTaxonomy(parse(taxonomySchema, raw, 'Category'));
  },
  updateTaxonomy: async (kind: TaxonomyKind, id: string, draft: TaxonomyDraft): Promise<TaxonomyRecord> => {
    const raw = await apiClient(`${taxonomyPath(kind)}${encodeURIComponent(id)}/`, { method: 'PATCH', body: taxonomyPayload(kind, draft) });
    if (kind === 'product-tags') {
      const tag = parse(tagSchema, raw, 'Tag');
      return { ...tag, description: '', displayOrder: 0 };
    }
    return toTaxonomy(parse(taxonomySchema, raw, 'Category'));
  },
  catalogueCounts: async (): Promise<{ products: number; services: number }> => {
    const [products, services] = await Promise.all([
      apiClient('/products/', { auth: false }), apiClient('/services/', { auth: false }),
    ]);
    return { products: list(z.unknown(), products, 'Product').length, services: list(z.unknown(), services, 'Service').length };
  },
};
