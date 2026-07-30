import { simulateNetwork } from './api';
import { notifications } from '../mock/notifications';
export const notificationService = {
  fetchNotifications: async (): Promise<any[]> => {
    return simulateNetwork(notifications, 300);
  },
};