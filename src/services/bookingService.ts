import { z } from 'zod';
import { Booking, BookingStatus } from '../types/booking';
import { apiClient } from './api';
import { parseCommerce, parseCommerceList } from './commerceContract';

const bookingSchema = z.object({
  id: z.string().uuid(),
  service: z.string().uuid(),
  customer_id: z.string().uuid(),
  service_name: z.string(),
  scheduled_at: z.string(),
  notes: z.string(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  created_at: z.string(),
  updated_at: z.string(),
});

const toBooking = (value: z.infer<typeof bookingSchema>): Booking => ({
  id: value.id,
  serviceId: value.service,
  customerId: value.customer_id,
  serviceName: value.service_name,
  scheduledAt: value.scheduled_at,
  notes: value.notes,
  status: value.status,
  createdAt: value.created_at,
  updatedAt: value.updated_at,
});

export const bookingKeys = {
  customer: (userId: string) => ['bookings', 'customer', userId] as const,
  seller: (userId: string) => ['bookings', 'seller', userId] as const,
};

export const bookingService = {
  list: async (): Promise<Booking[]> => parseCommerceList(bookingSchema, await apiClient('/services/bookings/')).map(toBooking),
  create: async (serviceId: string, scheduledAt: string, notes: string): Promise<Booking> =>
    toBooking(parseCommerce(bookingSchema, await apiClient('/services/bookings/', {
      method: 'POST', body: { service: serviceId, scheduled_at: scheduledAt, notes },
    }))),
  cancel: async (id: string): Promise<void> => {
    await apiClient(`/services/bookings/${encodeURIComponent(id)}/`, { method: 'DELETE' });
  },
  listForSeller: async (): Promise<Booking[]> =>
    parseCommerceList(bookingSchema, await apiClient('/services/seller/bookings/')).map(toBooking),
  updateStatus: async (id: string, status: BookingStatus): Promise<Booking> =>
    toBooking(parseCommerce(bookingSchema, await apiClient(`/services/seller/bookings/${encodeURIComponent(id)}/`, {
      method: 'PATCH', body: { status },
    }))),
};
