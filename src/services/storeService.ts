import type * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { ApiError, apiClient } from './api';
import { productService } from './productService';

const storeSchema = z.object({ id: z.string().uuid(), owner: z.string().uuid(), name: z.string(), slug: z.string(), status: z.string() });
const kycSchema = z.object({ id: z.string().uuid(), store: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected']), document_type: z.string(), document: z.string().nullish(),
  rejection_reason: z.string().nullish(), submitted_at: z.string().nullish() });
export type StoreKYC = z.infer<typeof kycSchema>;
const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error('The store response was incomplete. Please retry.');
  return result.data;
};
const imagePart = (asset: ImagePicker.ImagePickerAsset): Blob =>
  (asset.file ?? { uri: asset.uri, name: asset.fileName || 'document.jpg', type: asset.mimeType || 'image/jpeg' }) as Blob;

export const storeService = {
  ownStore: (ownerId: string) => productService.fetchOwnStore(ownerId),
  create: async (name: string, logo?: ImagePicker.ImagePickerAsset) => {
    const slug = name.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) throw new Error('Enter a store name containing letters or numbers.');
    if (logo?.fileSize && logo.fileSize > 5 * 1024 * 1024) throw new Error('Store logo must be 5 MB or smaller.');
    const form = new FormData();
    form.append('name', name.trim());
    form.append('slug', slug);
    if (logo) form.append('logo', imagePart(logo));
    const created = parse(storeSchema, await apiClient('/stores/', { method: 'POST', body: form }));
    return created;
  },
  kyc: async (slug: string): Promise<StoreKYC | null> => {
    try { return parse(kycSchema, await apiClient(`/stores/${encodeURIComponent(slug)}/kyc/`)); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  submitKyc: async (slug: string, input: { businessName: string; registrationNumber: string; taxNumber: string; documentType: string; document: ImagePicker.ImagePickerAsset }): Promise<StoreKYC> => {
    const file = input.document;
    if (file.fileSize && file.fileSize > 10 * 1024 * 1024) throw new Error('Document must be 10 MB or smaller.');
    if (file.mimeType && !['image/jpeg', 'image/png'].includes(file.mimeType)) throw new Error('Use a JPG or PNG document image.');
    const form = new FormData();
    form.append('business_name', input.businessName.trim());
    form.append('business_registration_number', input.registrationNumber.trim());
    form.append('tax_identification_number', input.taxNumber.trim());
    form.append('document_type', input.documentType);
    form.append('document', imagePart(file));
    return parse(kycSchema, await apiClient(`/stores/${encodeURIComponent(slug)}/kyc/submit/`, { method: 'POST', body: form }));
  },
};
