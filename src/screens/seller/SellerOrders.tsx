import React from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { orderKeys, orderService } from '../../services/orderService';
import { getApiErrorMessage } from '../../services/api';
import { theme } from '../../theme';
import { OrderStatus } from '../../types/order';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { MapPin } from 'lucide-react-native';

const nextStatuses = (status: OrderStatus): OrderStatus[] => {
  if (status === 'pending') return ['processing', 'cancelled'];
  if (status === 'processing') return ['shipped', 'cancelled'];
  return [];
};

const actionLabels: Record<OrderStatus, string> = {
  pending: 'Order placed', processing: 'Accept order', shipped: 'Mark as shipped',
  delivered: 'Delivered', cancelled: 'Cancel order',
};
const actionLabel = (status: OrderStatus) => actionLabels[status];

export const SellerOrders: React.FC = () => {
  const userId = useAuth().user?.id ?? '';
  const client = useQueryClient();
  const key = orderKeys.seller(userId);
  const query = useQuery({ queryKey: key, queryFn: orderService.fetchSellerOrders, enabled: Boolean(userId), refetchOnMount: 'always' });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => orderService.updateSellerOrderStatus(id, status),
    onSuccess: updated => {
      client.setQueryData(key, (orders: typeof query.data) => orders?.map(order => order.id === updated.id ? updated : order));
      void client.invalidateQueries({ queryKey: key });
    },
  });
  const submitStatus = (id: string, status: OrderStatus) => {
    const run = () => { update.reset(); update.mutate({ id, status }); };
    if (status === 'processing') { run(); return; }
    const message = status === 'shipped'
      ? 'Confirm that the order has been handed to the delivery provider.'
      : 'This will cancel the order and return its quantity to stock.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) run();
      return;
    }
    Alert.alert(actionLabel(status), message, [{ text: 'Not yet', style: 'cancel' }, { text: 'Confirm', style: status === 'cancelled' ? 'destructive' : 'default', onPress: run }]);
  };
  if (query.isError) return <ErrorState message={getApiErrorMessage(query.error, 'Unable to load seller orders.')} onRetry={() => void query.refetch()} />;
  return <SafeAreaView style={styles.container} edges={['bottom']}><FlatList
    data={query.data ?? []}
    refreshing={query.isFetching}
    onRefresh={() => void query.refetch()}
    keyExtractor={item => item.id}
    contentContainerStyle={(query.data?.length ?? 0) ? styles.content : styles.empty}
    ListEmptyComponent={query.isLoading ? <Text style={styles.loading}>Loading orders...</Text> : <EmptyState title="No seller orders" description="Orders containing only your products will appear here." />}
    renderItem={({ item }) => <View style={styles.card}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text><Text style={styles.date}>{formatDate(item.date)}</Text></View><StatusPill status={item.status} /></View>
      {item.items.map(orderItem => <View key={orderItem.id} style={styles.item}><Text style={styles.itemName}>{orderItem.name} x {orderItem.quantity}</Text><Text style={styles.amount}>{formatCurrency(orderItem.price * orderItem.quantity, item.currency)}</Text></View>)}
      <View style={styles.delivery}><MapPin size={18} color={theme.colors.primary.dark} /><View style={styles.deliveryCopy}><Text style={styles.deliveryLabel}>Delivery address</Text><Text style={styles.address}>{item.deliveryAddress}</Text></View></View>
      <View style={styles.footer}><Text style={styles.total}>{formatCurrency(item.total, item.currency)}</Text><View style={styles.actions}>{nextStatuses(item.status).map(status => <Button key={status} size="sm" variant={status === 'cancelled' ? 'outline' : 'primary'} loading={update.isPending && update.variables?.id === item.id && update.variables.status === status} disabled={update.isPending} onPress={() => submitStatus(item.id, status)}>{actionLabel(status)}</Button>)}</View></View>
      {update.isError && update.variables?.id === item.id ? <View style={styles.updateError}><Text style={styles.errorText} accessibilityRole="alert">{getApiErrorMessage(update.error, 'Unable to update this order.')}</Text><Button size="sm" variant="ghost" onPress={() => update.reset()}>Dismiss</Button></View> : null}
    </View>}
  /></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg },
  empty: { flexGrow: 1 },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  headerCopy: { flex: 1, minWidth: 0 },
  orderId: { color: theme.colors.ink, fontWeight: '800' },
  date: { color: theme.colors.muted, marginTop: 2, fontSize: theme.typography.small.fontSize },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  itemName: { flex: 1, color: theme.colors.ink },
  amount: { color: theme.colors.ink, fontWeight: '700' },
  delivery: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radii.sm, backgroundColor: theme.colors.primary.tint },
  deliveryCopy: { flex: 1, minWidth: 0 },
  deliveryLabel: { color: theme.colors.primary.dark, fontSize: theme.typography.small.fontSize, fontWeight: '700', marginBottom: 2 },
  address: { color: theme.colors.ink },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, marginTop: theme.spacing.md },
  total: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: theme.spacing.sm },
  updateError: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radii.sm, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.error, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  errorText: { flex: 1, color: theme.colors.error },
});
