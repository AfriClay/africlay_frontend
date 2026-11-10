import type * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { apiClient } from './api';

const applicationSchema = z.object({
  id: z.number(), applicant_email: z.string(), applicant_phone: z.string(),
  city: z.string(), vehicle_type: z.string(), vehicle_registration: z.string(), licence_number: z.string(),
  has_identity_document: z.boolean(), has_licence_document: z.boolean(),
  identity_document_url: z.string().nullable(), licence_document_url: z.string().nullable(),
  sms_alerts: z.boolean(), status: z.enum(['pending', 'approved', 'rejected']),
  review_reason: z.string(), reviewed_at: z.string().nullable(), created_at: z.string(),
});

export type RiderApplication = z.infer<typeof applicationSchema>;
const applicationPageSchema = z.object({ count: z.number(), next: z.string().nullable(), results: z.array(applicationSchema) });

const uploadPart = (asset: ImagePicker.ImagePickerAsset): Blob =>
  (asset.file ?? { uri: asset.uri, name: asset.fileName || 'document.jpg', type: asset.mimeType || 'image/jpeg' }) as Blob;

export const riderService = {
  mine: async (): Promise<RiderApplication | null> => {
    const data = await apiClient('/auth/rider-application/');
    return data ? applicationSchema.parse(data) : null;
  },
  submit: async (input: {
    city: string; vehicleType: string; vehicleRegistration: string; licenceNumber: string;
    identity: ImagePicker.ImagePickerAsset; licence: ImagePicker.ImagePickerAsset; smsAlerts: boolean;
  }): Promise<RiderApplication> => {
    for (const asset of [input.identity, input.licence]) {
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error('Each document must be 10 MB or smaller.');
    }
    const form = new FormData();
    form.append('city', input.city.trim());
    form.append('vehicle_type', input.vehicleType.trim());
    form.append('vehicle_registration', input.vehicleRegistration.trim());
    form.append('licence_number', input.licenceNumber.trim());
    form.append('identity_document', uploadPart(input.identity));
    form.append('licence_document', uploadPart(input.licence));
    form.append('sms_alerts', String(input.smsAlerts));
    return applicationSchema.parse(await apiClient('/auth/rider-application/', { method: 'POST', body: form }));
  },
  pending: async (offset = 0) => applicationPageSchema.parse(await apiClient(`/auth/admin/rider-applications/?status=pending&limit=30&offset=${offset}`)),
  review: async (id: number, decision: 'approved' | 'rejected', reason: string): Promise<RiderApplication> =>
    applicationSchema.parse(await apiClient(`/auth/admin/rider-applications/${id}/review/`, { method: 'POST', body: { decision, reason } })),
};
