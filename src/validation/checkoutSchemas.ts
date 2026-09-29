import { z } from 'zod';

export const checkoutAddressSchema = z.object({
  shipping_address: z.string().trim().min(5, 'Enter a shipping address'),
  shipping_city: z.string().trim().min(2, 'Enter a shipping city'),
  shipping_postal_code: z.string().trim().min(2, 'Enter a postal code'),
  shipping_country: z.string().trim().min(2, 'Enter a country'),
});

export type CheckoutAddressForm = z.infer<typeof checkoutAddressSchema>;
