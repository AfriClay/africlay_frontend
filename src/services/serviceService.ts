import type * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { Service } from '../types/product';
import { ApiError, apiClient } from './api';
import { CatalogDataError, recordId } from './catalogContract';

const categorySchema = z.object({ id: z.string().uuid(), name: z.string(), slug: z.string(), parent: z.string().uuid().nullish() });
const imageSchema = z.object({ image: z.string().nullish(), is_primary: z.boolean(), display_order: z.number() });
const serviceSchema = z.object({
  id: z.string().uuid(), store: z.string().uuid(), category: z.string().uuid().nullish(),
  tags: z.array(z.string().uuid()), images: z.array(imageSchema), name: z.string(), slug: z.string(),
  description: z.string(), price: z.union([z.string(), z.number()]), currency: z.string(),
  duration_minutes: z.number().int().nonnegative(), status: z.enum(['draft', 'published', 'archived']),
});
type BackendService = z.infer<typeof serviceSchema>;
export type ServiceCategory = z.infer<typeof categorySchema>;
export type ServiceDraft = {
  name: string; slug: string; description: string; price: number; currency: string;
  duration_minutes: number; category: string | null; tags: string[];
  status: 'draft' | 'published' | 'archived';
};

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new CatalogDataError();
  return result.data;
};
const parseList = <T>(schema: z.ZodType<T>, value: unknown): T[] => {
  const records = Array.isArray(value) ? value : value && typeof value === 'object' && 'results' in value ? (value as { results: unknown }).results : undefined;
  return parse(z.array(schema), records);
};
const mediaUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const host = (process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  return `${host}/${value.replace(/^\/+/, '')}`;
};
const toService = (raw: BackendService, categories: ServiceCategory[]): Service => {
  const amount = Number(raw.price);
  if (!Number.isFinite(amount) || amount < 0) throw new CatalogDataError();
  return {
    id: raw.id, slug: raw.slug, status: raw.status, title: raw.name, description: raw.description,
    priceFrom: amount, currency: raw.currency, durationMinutes: raw.duration_minutes,
    category: categories.find(item => item.id === raw.category)?.name ?? 'Uncategorized',
    categoryId: raw.category ?? undefined, tagIds: raw.tags, providerId: raw.store,
    images: [...raw.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
      .map(item => mediaUrl(item.image)).filter((url): url is string => Boolean(url)),
    rating: 0, reviewCount: 0,
  };
};
const payload = (draft: ServiceDraft) => ({ ...draft, price: draft.price.toFixed(2) });

export const serviceService = {
  categories: async (): Promise<ServiceCategory[]> => parseList(categorySchema, await apiClient('/services/categories/', { auth: false })),
  list: async (): Promise<Service[]> => {
    const [raw, categories] = await Promise.all([apiClient('/services/', { auth: false }), serviceService.categories()]);
    return parseList(serviceSchema, raw).map(item => toService(item, categories));
  },
  detail: async (slug: string): Promise<Service | null> => {
    if (!recordId(slug)) return null;
    try {
      const [raw, categories] = await Promise.all([apiClient(`/services/${encodeURIComponent(slug)}/`, { auth: false }), serviceService.categories()]);
      return toService(parse(serviceSchema, raw), categories);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  managed: async (): Promise<Service[]> => {
    const [raw, categories] = await Promise.all([apiClient('/services/manage/'), serviceService.categories()]);
    return parseList(serviceSchema, raw).map(item => toService(item, categories));
  },
  managedDetail: async (id: string): Promise<Service | null> => {
    try {
      const [raw, categories] = await Promise.all([apiClient(`/services/manage/${encodeURIComponent(id)}/`), serviceService.categories()]);
      return toService(parse(serviceSchema, raw), categories);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  create: async (draft: ServiceDraft): Promise<Service> => {
    const raw = await apiClient('/services/manage/', { method: 'POST', body: payload(draft) });
    return toService(parse(serviceSchema, raw), await serviceService.categories());
  },
  update: async (id: string, draft: ServiceDraft): Promise<Service> => {
    const raw = await apiClient(`/services/manage/${encodeURIComponent(id)}/`, { method: 'PATCH', body: payload(draft) });
    return toService(parse(serviceSchema, raw), await serviceService.categories());
  },
  remove: async (id: string): Promise<void> => { await apiClient(`/services/manage/${encodeURIComponent(id)}/`, { method: 'DELETE' }); },
  uploadImages: async (id: string, assets: ImagePicker.ImagePickerAsset[]): Promise<void> => {
    for (const asset of assets) {
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
      if (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) throw new Error('Use a JPG, PNG, or WebP image.');
      const form = new FormData();
      form.append('image', (asset.file ?? { uri: asset.uri, name: asset.fileName || 'service.jpg', type: asset.mimeType || 'image/jpeg' }) as Blob);
      await apiClient(`/services/manage/${encodeURIComponent(id)}/images/`, { method: 'POST', body: form });
    }
  },
};
