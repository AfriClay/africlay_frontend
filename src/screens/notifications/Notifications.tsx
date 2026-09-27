import React, { useEffect, useState } from 'react';
import { AppState, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarClock, ChevronRight, Package, ShoppingBag, Sparkles, Star } from 'lucide-react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { notificationKeys, notificationService } from '../../services/notificationService';
import { theme } from '../../theme';
import { formatDate } from '../../utils/formatDate';
import { NotificationItem } from '../../types/notification';
import { DeviceNotificationPermission, getDeviceNotificationPermission, requestDeviceNotificationPermission } from '../../services/deviceNotificationService';

const icons = { order: Package, booking: CalendarClock, product: ShoppingBag, review: Star, system: Bell, promotion: Sparkles } as const;

const DevicePermissionPrompt = () => {
  const [permission, setPermission] = useState<DeviceNotificationPermission>();
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const refresh = () => { void getDeviceNotificationPermission().then(setPermission).catch(() => undefined); };
    refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, []);

  if (!permission?.supported || permission.granted) return null;
  const blocked = !permission.canAskAgain;
  const enable = async () => {
    if (blocked) {
      await Linking.openSettings();
      return;
    }
    setRequesting(true);
    try { setPermission(await requestDeviceNotificationPermission()); }
    finally { setRequesting(false); }
  };

  return <View style={styles.permissionCard}>
    <View style={styles.permissionIcon}><Bell size={20} color={theme.colors.primary.DEFAULT} /></View>
    <View style={styles.permissionCopy}>
      <Text style={styles.permissionTitle}>{blocked ? 'Device alerts are off' : 'Get order updates on this device'}</Text>
      <Text style={styles.permissionText}>{blocked ? 'Allow notifications in your device settings to receive new AfriClay updates.' : 'AfriClay will ask before showing notification alerts.'}</Text>
    </View>
    <Button size="sm" variant="outline" loading={requesting} onPress={() => void enable()}>{blocked ? 'Settings' : 'Enable'}</Button>
  </View>;
};

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const client = useQueryClient();
  const userId = user?.id ?? '';
  const key = notificationKeys.all(userId);
  const query = useQuery({ queryKey: key, queryFn: () => notificationService.list(), enabled: Boolean(userId), refetchOnMount: 'always', refetchInterval: 30_000 });
  const markRead = useMutation({ mutationFn: notificationService.markRead, onSuccess: () => client.invalidateQueries({ queryKey: ['notifications', userId] }) });
  const markAll = useMutation({ mutationFn: notificationService.markAllRead, onSuccess: () => client.invalidateQueries({ queryKey: ['notifications', userId] }) });
  if (!user) return <EmptyState title="Sign in to view notifications" description="Account notifications are private." />;
  if (query.isError) return <ErrorState message="Unable to load notifications." onRetry={() => void query.refetch()} />;
  const unread = (query.data ?? []).filter(item => !item.isRead).length;
  const openNotification = async (item: NotificationItem) => {
    if (!item.isRead) {
      try { await markRead.mutateAsync(item.id); } catch { /* Keep navigation available if marking read fails. */ }
    }
    const tabs = navigation.getParent<NavigationProp<ParamListBase>>();
    if (item.action === 'buyer_order' && item.targetId) navigation.navigate('OrderDetails', { orderId: item.targetId });
    else if (item.action === 'seller_orders') tabs?.navigate('Sell', { screen: 'SellerOrders' });
    else if (item.action === 'seller_product' && item.targetId) tabs?.navigate('Sell', { screen: 'AddEditProduct', params: { productId: item.targetId } });
    else if (item.action === 'product' && (item.targetSlug || item.targetId)) navigation.navigate('ProductDetails', { productId: item.targetSlug ?? item.targetId });
    else if (item.action === 'store' && item.targetId) navigation.navigate('SellerStore', { sellerId: item.targetId });
    else if (item.action === 'service' && (item.targetSlug || item.targetId)) navigation.navigate('ServiceDetails', { serviceId: item.targetSlug ?? item.targetId });
    else if (item.action === 'buyer_bookings') navigation.navigate('MyBookings');
    else if (item.action === 'seller_bookings') tabs?.navigate('Sell', { screen: 'SellerBookings' });
  };
  return <SafeAreaView style={styles.container} edges={['bottom']}>
    <View style={styles.toolbar}><Text style={styles.summary}>{unread ? `${unread} unread` : 'You are all caught up'}</Text>{unread > 0 && <Button size="sm" variant="ghost" loading={markAll.isPending} onPress={() => void markAll.mutateAsync()}>Mark all read</Button>}</View>
    <DevicePermissionPrompt />
    <FlatList
      data={query.data ?? []}
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
      keyExtractor={item => item.id}
      contentContainerStyle={(query.data?.length ?? 0) ? styles.list : styles.empty}
      ListEmptyComponent={query.isLoading ? <Text style={styles.loading}>Loading notifications...</Text> : <EmptyState title="No notifications" description="Order, booking, and account updates will appear here." />}
      renderItem={({ item }) => {
        const Icon = icons[item.type];
        return <Pressable onPress={() => void openNotification(item)} style={[styles.item, !item.isRead && styles.unread]} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.action ? 'Open update' : item.isRead ? 'Read' : 'Mark as read'}`}>
          <View style={styles.icon}><Icon size={20} color={theme.colors.primary.DEFAULT} /></View>
          <View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{formatDate(item.createdAt)}</Text></View>
          {!item.isRead && <View style={styles.dot} />}
          {item.action ? <ChevronRight size={18} color={theme.colors.muted} /> : null}
        </Pressable>;
      }}
    />
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  toolbar: { minHeight: 58, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  summary: { color: theme.colors.muted, fontWeight: '600' },
  list: { padding: theme.spacing.lg },
  empty: { flexGrow: 1 },
  loading: { padding: theme.spacing.lg, color: theme.colors.muted },
  permissionCard: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  permissionIcon: { width: 38, height: 38, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint },
  permissionCopy: { flex: 1, minWidth: 0 },
  permissionTitle: { color: theme.colors.ink, fontWeight: '800' },
  permissionText: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: 18, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  unread: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  icon: { width: 40, height: 40, borderRadius: theme.radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  copy: { flex: 1, minWidth: 0 },
  title: { color: theme.colors.ink, fontWeight: '800' },
  message: { color: theme.colors.muted, marginTop: theme.spacing.xs, lineHeight: 20 },
  date: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: theme.spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.primary.DEFAULT, marginTop: theme.spacing.xs },
});
