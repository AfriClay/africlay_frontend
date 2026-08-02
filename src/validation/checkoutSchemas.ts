import { z } from 'zod';

export const checkoutAddressSchema = z.object({
  name: z.string().trim().min(2, 'Enter the recipient name'),
  phone: z.string().trim().min(9, 'Enter a valid phone number'),
  addressLine: z.string().trim().min(4, 'Enter a delivery address'),
  city: z.string().trim().min(2, 'Enter a city'),
});

export type CheckoutAddressForm = z.infer<typeof checkoutAddressSchema>;
