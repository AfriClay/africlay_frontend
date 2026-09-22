import { z } from 'zod';
import { apiClient } from './api';
import { parseCommerce, parseCommerceList } from './commerceContract';

const addressSchema = z.object({
  id: z.string().uuid(), address_type: z.enum(['shipping', 'billing', 'both']),
  recipient_name: z.string(), phone_number: z.string(), street_address: z.string(),
  apartment_suite: z.string().nullish(), city: z.string(), state_province: z.string().nullish(),
  postal_code: z.string().nullish(), country: z.string(), country_code: z.string().nullish(),
  is_default: z.boolean(),
});

export type SavedAddress = z.infer<typeof addressSchema>;
export type AddressInput = Pick<SavedAddress, 'street_address' | 'city' | 'country'> &
  Partial<Pick<SavedAddress, 'recipient_name' | 'phone_number' | 'postal_code' | 'apartment_suite' | 'state_province' | 'country_code' | 'is_default' | 'address_type'>>;

export const addressService = {
  list: async (): Promise<SavedAddress[]> => parseCommerceList(addressSchema, await apiClient('/auth/addresses/')),
  create: async (input: AddressInput): Promise<SavedAddress> =>
    parseCommerce(addressSchema, await apiClient('/auth/addresses/', { method: 'POST', body: input })),
  update: async (id: string, input: Partial<AddressInput>): Promise<SavedAddress> =>
    parseCommerce(addressSchema, await apiClient(`/auth/addresses/${encodeURIComponent(id)}/`, { method: 'PATCH', body: input })),
  remove: async (id: string): Promise<void> => {
    await apiClient(`/auth/addresses/${encodeURIComponent(id)}/`, { method: 'DELETE' });
  },
};
