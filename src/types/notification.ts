export type NotificationType = 'order' | 'booking' | 'system' | 'promotion';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
