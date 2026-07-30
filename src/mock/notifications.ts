export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  category: 'order' | 'promo';
  orderId?: string;
}

export const notifications: NotificationItem[] = [
  {
    id: 'note-1',
    title: 'Order Update',
    body: 'Your Maasai Beaded Necklace is now processing.',
    time: 'Today',
    category: 'order',
    orderId: 'AFR12345',
  },
  {
    id: 'note-2',
    title: 'New seller badge unlocked',
    body: 'You’re now eligible for exclusive marketplace offers.',
    time: 'Today',
    category: 'promo',
  },
  {
    id: 'note-3',
    title: 'Shipped',
    body: 'Your Organic Avocados order is on its way.',
    time: 'Earlier',
    category: 'order',
    orderId: 'AFR12344',
  },
];
