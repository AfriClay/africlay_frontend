import { z } from 'zod';
import { apiClient } from './api';

const homeLegSchema = z.object({
  order_id: z.string().uuid(), status: z.string(),
  pickup_point: z.object({ id: z.string().uuid(), name: z.string(), city: z.string(), address: z.string(), postal_code: z.string() }),
  pickup_address_snapshot: z.string(), destination_address: z.string(), destination_city: z.string(), delivery_instructions: z.string(),
  distance_meters: z.union([z.string(), z.number()]), fee: z.union([z.string(), z.number()]),
  assigned_rider_id: z.string().uuid().nullable(), created_at: z.string(),
  buyer_phone: z.string().nullish(),
  events: z.array(z.object({ id: z.string().uuid(), stage: z.string(), note: z.string(), created_at: z.string() })),
});
const pageSchema = z.object({ count: z.number(), next: z.string().nullable(), previous: z.string().nullable(), results: z.array(homeLegSchema) });

export type HomeDeliveryJob = z.infer<typeof homeLegSchema>;
export type HomeDeliveryRiderStage = 'rider_accepted' | 'collected_from_pickup' | 'rider_delivered';

export const homeDeliveryService = {
  list: async (offset = 0) => pageSchema.parse(await apiClient(`/cart/logistics/home-deliveries/?limit=30&offset=${offset}`)),
  assign: async (orderId: string, email: string, reason: string) => apiClient(`/cart/logistics/home-deliveries/${encodeURIComponent(orderId)}/assign/`, {
    method: 'POST', body: { email, reason },
  }),
  record: async (orderId: string, stage: HomeDeliveryRiderStage) => apiClient(`/cart/logistics/home-deliveries/${encodeURIComponent(orderId)}/events/`, {
    method: 'POST', body: { stage },
  }),
};
