import { simulateNetwork } from './api';
import { NotificationItem, notifications } from '../mock/notifications';
export const notificationService = {
  fetchNotifications: async (): Promise<NotificationItem[]> => {
    return simulateNetwork(notifications, 300);
  },
};
