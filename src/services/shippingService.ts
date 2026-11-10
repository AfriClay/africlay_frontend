import { z } from 'zod';
import { apiClient } from './api';

const supportedTownsSchema = z.object({
  towns: z.array(z.string().trim().min(1)),
});

const pickupPointSchema = z.object({
  id: z.string().uuid(), name: z.string(), city: z.string(),
  address: z.string(), postal_code: z.string(), doorstep_available: z.boolean().optional(),
});
const homeLocationsSchema = z.object({
  locations: z.array(z.object({ label: z.string(), token: z.string() })),
});

export type PickupPoint = z.infer<typeof pickupPointSchema>;
export type HomeLocation = z.infer<typeof homeLocationsSchema>['locations'][number];

export const shippingService = {
  pickupPoints: async (): Promise<PickupPoint[]> =>
    z.array(pickupPointSchema).parse(await apiClient('/cart/pickup-points/', { auth: false })),
  homeLocations: async (pickupPointId: string, query: string): Promise<HomeLocation[]> => {
    return homeLocationsSchema.parse(await apiClient('/cart/doorstep/locations/', {
      method: 'POST', body: { pickup_point_id: pickupPointId, query },
    })).locations;
  },
  supportedTowns: async (): Promise<string[]> => {
    const parsed = supportedTownsSchema.safeParse(await apiClient('/cart/shipping-towns/', { auth: false }));
    if (!parsed.success) throw new Error('The delivery town list could not be loaded.');
    return parsed.data.towns;
  },
};
