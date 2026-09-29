export type NotificationType = 'order' | 'booking' | 'product' | 'review' | 'system' | 'promotion';
export type NotificationAction = '' | 'buyer_order' | 'seller_orders' | 'product' | 'seller_product' | 'store' | 'service' | 'buyer_bookings' | 'seller_bookings';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  action: NotificationAction;
  targetId?: string;
  targetSlug?: string;
  createdAt: string;
}
