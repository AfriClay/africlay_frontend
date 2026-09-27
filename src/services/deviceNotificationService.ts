import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { NotificationItem } from '../types/notification';

export type DeviceNotificationPermission = {
  supported: boolean;
  granted: boolean;
  canAskAgain: boolean;
};

const unsupported: DeviceNotificationPermission = { supported: false, granted: false, canAskAgain: false };
let configured = false;
let nativeSupport: boolean | undefined;

const hasNativeNotificationSupport = (): boolean => {
  if (nativeSupport !== undefined) return nativeSupport;
  nativeSupport = [
    'ExpoPushTokenManager',
    'ExpoNotificationPermissionsModule',
    'ExpoNotificationScheduler',
    'ExpoNotificationsHandlerModule',
  ].every(moduleName => Boolean(requireOptionalNativeModule(moduleName)));
  return nativeSupport;
};

const loadNotifications = async () => {
  if (Platform.OS === 'web' || !hasNativeNotificationSupport()) return undefined;
  try {
    return await import('expo-notifications');
  } catch {
    return undefined;
  }
};

const normalizePermission = (permission: { granted: boolean; canAskAgain: boolean }): DeviceNotificationPermission => ({
  supported: true,
  granted: permission.granted,
  canAskAgain: permission.canAskAgain,
});

export const initializeDeviceNotifications = async (): Promise<void> => {
  const Notifications = await loadNotifications();
  if (!Notifications || configured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('africlay-updates', {
      name: 'AfriClay updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#207F20',
    });
  }
  configured = true;
};

export const getDeviceNotificationPermission = async (): Promise<DeviceNotificationPermission> => {
  const Notifications = await loadNotifications();
  if (!Notifications) return unsupported;
  await initializeDeviceNotifications();
  return normalizePermission(await Notifications.getPermissionsAsync());
};

export const requestDeviceNotificationPermission = async (): Promise<DeviceNotificationPermission> => {
  const Notifications = await loadNotifications();
  if (!Notifications) return unsupported;
  await initializeDeviceNotifications();
  return normalizePermission(await Notifications.requestPermissionsAsync());
};

export const presentDeviceNotification = async (item: NotificationItem): Promise<void> => {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await initializeDeviceNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: item.message,
      data: {
        notificationId: item.id,
        action: item.action,
        targetId: item.targetId ?? '',
        targetSlug: item.targetSlug ?? '',
      },
    },
    trigger: null,
  });
};
