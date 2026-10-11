import { z } from 'zod';
import { apiClient } from './api';

const supportedTownsSchema = z.object({
  towns: z.array(z.string().trim().min(1)),
});

export const shippingService = {
  supportedTowns: async (): Promise<string[]> => {
    const parsed = supportedTownsSchema.safeParse(await apiClient('/cart/shipping-towns/', { auth: false }));
    if (!parsed.success) throw new Error('The delivery town list could not be loaded.');
    return parsed.data.towns;
  },
};
