import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderCard } from '../../components/domain/OrderCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { orderService } from '../../services/orderService';
import { Order, OrderStatus } from '../../types/order';
import { theme } from '../../theme';

type SellerOrderTab = 'New' | 'Accepted' | 'Packed' | 'Shipped' | 'Completed';
type SellerOrdersNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'SellerOrders'>;
const tabs: SellerOrderTab[] = ['New', 'Accepted', 'Packed', 'Shipped', 'Completed'];

const countdown = (deadline?: string, now = Date.now()): string => {
  if (!deadline) return '';
  const remaining = Math.max(0, new Date(deadline).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const SellerOrders: React.FC = () => {
  const navigation = useNavigation<SellerOrdersNavigation>();
  const auth = useAuth();
  const sellerId = auth.user?.id ?? '';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SellerOrderTab>('New');
  const [now, setNow] = useState(Date.now());
  const expiring = useRef(false);
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['seller-orders', sellerId], queryFn: () => orderService.initializeSellerOrders(sellerId), enabled: Boolean(sellerId) });

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasExpired = orders.some(order => order.status === 'New' && order.acceptanceDeadline && new Date(order.acceptanceDeadline).getTime() <= now);
    if (!hasExpired || expiring.current) return;
    expiring.current = true;
    void orderService.expireSellerOrders(sellerId).then(async expiredIds => {
      if (expiredIds.length) {
        const message = `${expiredIds.length} order${expiredIds.length > 1 ? 's were' : ' was'} cancelled; the buyer was refunded (demo).`;
        if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.LONG);
        else Alert.alert('Acceptance window expired', message);
        await queryClient.invalidateQueries({ queryKey: ['seller-orders', sellerId] });
      }
    }).finally(() => { expiring.current = false; });
  }, [now, orders, queryClient, sellerId]);

  const filtered = useMemo(() => orders.filter(order => {
    if (activeTab === 'Completed') return order.status === 'Completed' || order.status === 'Delivered' || order.status === 'Cancelled';
    return order.status === activeTab;
  }), [activeTab, orders]);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    await orderService.updateSellerOrderStatus(sellerId, order.id, status);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['seller-orders', sellerId] }),
      queryClient.invalidateQueries({ queryKey: ['order', order.id] }),
    ]);
  };

  const renderActions = (order: Order) => {
    if (order.status === 'New') {
      return (
        <View style={styles.actionRow}>
          <Pressable style={[styles.actionButton, styles.rejectButton]} onPress={() => void changeStatus(order, 'Cancelled')}><Text style={styles.rejectText}>Reject</Text></Pressable>
          <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={() => void changeStatus(order, 'Accepted')}><Text style={styles.primaryText}>Accept</Text></Pressable>
        </View>
      );
    }
    const nextStatus = order.status === 'Accepted' ? 'Packed' : order.status === 'Packed' ? 'Shipped' : order.status === 'Shipped' ? 'Completed' : undefined;
    if (!nextStatus) return null;
    return <Pressable style={[styles.actionButton, styles.primaryButton, styles.fullButton]} onPress={() => void changeStatus(order, nextStatus)}><Text style={styles.primaryText}>{nextStatus === 'Packed' ? 'Mark as Packed' : nextStatus === 'Shipped' ? 'Mark as Shipped' : 'Mark Completed'}</Text></Pressable>;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabs}>
        {tabs.map(tab => <Pressable key={tab} style={[styles.tab, tab === activeTab ? styles.tabActive : null]} onPress={() => setActiveTab(tab)}><Text style={[styles.tabText, tab === activeTab ? styles.tabTextActive : null]}>{tab}</Text></Pressable>)}
      </View>
      {isLoading ? <Text style={styles.loading}>Loading incoming orders…</Text> : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={filtered.length ? styles.list : styles.emptyList}
          ListEmptyComponent={<EmptyState title={`No ${activeTab.toLowerCase()} orders`} description="Orders will move here as you process them." />}
          renderItem={({ item }) => (
            <View style={styles.orderWrap}>
              <OrderCard order={item} onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })} />
              <Text style={styles.customer}>Buyer: {item.customerName ?? 'AfriClay customer'}</Text>
              {item.status === 'New' ? <Text style={styles.countdown}>Accept within {countdown(item.acceptanceDeadline, now)}</Text> : null}
              {renderActions(item)}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  tabs: { flexDirection: 'row', paddingHorizontal: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary.DEFAULT },
  tabText: { color: theme.colors.muted, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary.DEFAULT, fontWeight: '800' },
  list: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  emptyList: { flexGrow: 1, padding: theme.spacing.lg },
  orderWrap: { padding: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  customer: { color: theme.colors.ink, fontWeight: '700', marginTop: -theme.spacing.sm },
  countdown: { color: theme.colors.secondary.dark, fontWeight: '800', marginTop: theme.spacing.sm },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  actionButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.md },
  rejectButton: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.error },
  primaryButton: { backgroundColor: theme.colors.primary.DEFAULT },
  fullButton: { flex: 0, marginTop: theme.spacing.md },
  rejectText: { color: theme.colors.error, fontWeight: '800' },
  primaryText: { color: theme.colors.white, fontWeight: '800' },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
});
