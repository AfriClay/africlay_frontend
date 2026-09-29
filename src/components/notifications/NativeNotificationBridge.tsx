import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { notificationKeys, notificationService } from '../../services/notificationService';
import { getDeviceNotificationPermission, initializeDeviceNotifications, presentDeviceNotification } from '../../services/deviceNotificationService';

const MAX_REMEMBERED_IDS = 250;
const storageKey = (userId: string) => `@africlay:presented-notifications:${userId}`;
const storedIds = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const NativeNotificationBridge = () => {
  const userId = useAuth().user?.id ?? '';
  const queue = useRef(Promise.resolve());
  const query = useQuery({
    queryKey: notificationKeys.all(userId),
    queryFn: () => notificationService.list(),
    enabled: Platform.OS !== 'web' && Boolean(userId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') void initializeDeviceNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!userId || !query.data || Platform.OS === 'web') return;
    const items = query.data;
    queue.current = queue.current.then(async () => {
      const key = storageKey(userId);
      const stored = await AsyncStorage.getItem(key);
      const previousIds = new Set(storedIds(stored));

      if (stored) {
        const permission = await getDeviceNotificationPermission();
        if (permission.granted) {
          const newUnread = items.filter(item => !item.isRead && !previousIds.has(item.id));
          for (const item of newUnread.slice(0, 3)) await presentDeviceNotification(item);
        }
      }

      const nextIds = Array.from(new Set([...items.map(item => item.id), ...previousIds])).slice(0, MAX_REMEMBERED_IDS);
      await AsyncStorage.setItem(key, JSON.stringify(nextIds));
    }).catch(() => {
      // Notification delivery must never interrupt the authenticated app session.
    });
  }, [query.data, userId]);

  return null;
};
