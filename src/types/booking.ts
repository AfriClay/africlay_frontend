export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  serviceId: string;
  customerId: string;
  serviceName: string;
  scheduledAt: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}
