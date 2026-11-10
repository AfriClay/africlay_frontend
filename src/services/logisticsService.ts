import { z } from 'zod';
import { apiClient } from './api';

const eventSchema = z.object({ id: z.string().uuid(), stage: z.string(), source: z.string(), note: z.string(), created_at: z.string() });
const pointSchema = z.object({ id: z.string().uuid(), name: z.string(), city: z.string(), address: z.string(), postal_code: z.string() });
const shipmentSchema = z.object({
  id: z.string().uuid(), order_id: z.string().uuid(), status: z.string(), origin_city: z.string(),
  pickup_point: pointSchema, pickup_address: z.string(), pickup_city: z.string(), courier_name: z.string(), tracking_number: z.string(),
  seller_store_name: z.string(), seller_store_address: z.string(), seller_store_phone: z.string(),
  events: z.array(eventSchema), assigned_logistics_id: z.string().uuid().nullable(), created_at: z.string(),
});
const pageSchema = z.object({ count: z.number(), next: z.string().nullable(), previous: z.string().nullable(), results: z.array(shipmentSchema) });

export type LogisticsShipment = z.infer<typeof shipmentSchema>;
export type LogisticsStage = 'collected_from_seller' | 'in_transit' | 'arrived_at_pickup';

export const logisticsService = {
  list: async (offset = 0) => pageSchema.parse(await apiClient(`/cart/logistics/fulfillments/?limit=30&offset=${offset}`)),
  record: async (id: string, stage: LogisticsStage) => apiClient(`/cart/logistics/fulfillments/${encodeURIComponent(id)}/events/`, {
    method: 'POST', body: JSON.stringify({ stage }),
  }),
  assign: async (id: string, email: string, reason: string) => apiClient(`/cart/logistics/fulfillments/${encodeURIComponent(id)}/assign/`, {
    method: 'POST', body: JSON.stringify({ email, reason }),
  }),
};
