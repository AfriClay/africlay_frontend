import { z } from 'zod';
import { NotificationItem } from '../types/notification';
import { apiClient } from './api';
import { parseCommerce, parseCommerceList } from './commerceContract';

const notificationSchema = z.object({
  id: z.string().uuid(),
  notification_type: z.enum(['order', 'booking', 'system', 'promotion']),
  title: z.string(),
  message: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
});

const toNotification = (value: z.infer<typeof notificationSchema>): NotificationItem => ({
  id: value.id,
  type: value.notification_type,
  title: value.title,
  message: value.message,
  isRead: value.is_read,
  createdAt: value.created_at,
});

export const notificationKeys = {
  all: (userId: string) => ['notifications', userId] as const,
  unread: (userId: string) => ['notifications', userId, 'unread'] as const,
};

export const notificationService = {
  list: async (isRead?: boolean): Promise<NotificationItem[]> => {
    const query = isRead === undefined ? '' : `?is_read=${isRead}`;
    return parseCommerceList(notificationSchema, await apiClient(`/notifications/${query}`)).map(toNotification);
  },
  markRead: async (id: string): Promise<NotificationItem> =>
    toNotification(parseCommerce(notificationSchema, await apiClient(`/notifications/${encodeURIComponent(id)}/`, {
      method: 'PATCH', body: { is_read: true },
    }))),
  markAllRead: async (): Promise<number> => {
    const schema = z.object({ marked_read: z.number().int().nonnegative() });
    return parseCommerce(schema, await apiClient('/notifications/mark-all-read/', { method: 'POST' })).marked_read;
  },
};
