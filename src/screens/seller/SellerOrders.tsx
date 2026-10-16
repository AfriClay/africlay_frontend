import React, { useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Truck } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { orderKeys, orderService, SellerOrderUpdate } from '../../services/orderService';
import { getApiErrorMessage } from '../../services/api';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

type UpdateVariables = { id: string; update: SellerOrderUpdate };

export const SellerOrders: React.FC = () => {
  const { width } = useWindowDimensions();
  const compactActions = width < 520;
  const userId = useAuth().user?.id ?? '';
  const client = useQueryClient();
  const key = orderKeys.seller(userId);
  const query = useQuery({ queryKey: key, queryFn: orderService.fetchSellerOrders, enabled: Boolean(userId), refetchOnMount: 'always' });
  const [shippingOrderId, setShippingOrderId] = useState<string>();
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [formError, setFormError] = useState<string>();
  const update = useMutation({
    mutationFn: ({ id, update: payload }: UpdateVariables) => orderService.updateSellerOrderStatus(id, payload),
    onSuccess: updated => {
      client.setQueryData(key, (orders: typeof query.data) => orders?.map(order => order.id === updated.id ? updated : order));
      setShippingOrderId(undefined);
      setCourierName('');
      setTrackingNumber('');
      setFormError(undefined);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  const cancelOrder = (id: string) => {
    const run = () => { update.reset(); update.mutate({ id, update: { status: 'cancelled' } }); };
    const message = 'Cancel this paid order and return its quantity to stock?';
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) run();
      return;
    }
    Alert.alert('Cancel order', message, [{ text: 'Keep order', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: run }]);
  };

  const shipOrder = (id: string) => {
    if (!courierName.trim() || !trackingNumber.trim()) {
      setFormError('Enter the courier and tracking number.');
      return;
    }
    setFormError(undefined);
    const payload: SellerOrderUpdate = {
      status: 'shipped',
      courier_name: courierName.trim(),
      tracking_number: trackingNumber.trim(),
    };
    const run = () => { update.reset(); update.mutate({ id, update: payload }); };
    const message = 'Confirm that this order has been handed to the delivery provider.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) run();
      return;
    }
    Alert.alert('Mark as shipped', message, [{ text: 'Not yet', style: 'cancel' }, { text: 'Confirm shipment', onPress: run }]);
  };

  if (query.isError) return <ErrorState message={getApiErrorMessage(query.error, 'Unable to load seller orders.')} onRetry={() => void query.refetch()} />;
  return <SafeAreaView style={styles.container} edges={['bottom']}><FlatList
    data={query.data ?? []}
    keyExtractor={item => item.id}
    contentContainerStyle={(query.data?.length ?? 0) ? styles.content : styles.empty}
    ListEmptyComponent={query.isLoading ? <Text style={styles.loading}>Loading orders...</Text> : <EmptyState title="No seller orders" description="Orders containing your products will appear here." />}
    renderItem={({ item }) => {
      const isUpdating = update.isPending && update.variables?.id === item.id;
      const showShippingForm = shippingOrderId === item.id;
      return <View style={styles.card}>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text><Text style={styles.date}>{formatDate(item.date)}</Text></View><StatusPill status={item.status} /></View>
        {item.items.map(orderItem => <View key={orderItem.id} style={styles.item}><Text style={styles.itemName}>{orderItem.name} x {orderItem.quantity}</Text><Text style={styles.amount}>{formatCurrency(orderItem.price * orderItem.quantity, item.currency)}</Text></View>)}
        {item.sellerProceeds != null ? <View style={styles.settlement}>
          <View style={styles.settlementRow}><Text style={styles.noticeText}>Commission</Text><Text style={styles.amount}>{formatCurrency(item.commissionAmount ?? 0, item.currency)}</Text></View>
          <View style={styles.settlementRow}><Text style={styles.noticeTitle}>Your proceeds</Text><Text style={styles.amount}>{formatCurrency(item.sellerProceeds, item.currency)}</Text></View>
          <Text style={styles.noticeText}>{item.settlementStatus === 'released' ? 'Available in wallet' : item.settlementStatus === 'held' ? 'Held until delivery is confirmed' : item.settlementStatus === 'reversed' ? 'Reversed' : 'Waiting for item payment'}</Text>
        </View> : null}
        <View style={styles.delivery}><MapPin size={18} color={theme.colors.primary.dark} /><View style={styles.deliveryCopy}><Text style={styles.deliveryLabel}>Delivery address</Text><Text style={styles.address}>{item.deliveryAddress}</Text></View></View>
        {item.status === 'pending' ? <View style={styles.orderNotice}><Text style={styles.noticeTitle}>Awaiting buyer payment</Text><Text style={styles.noticeText}>Fulfilment actions become available after payment is confirmed.</Text></View> : null}
        {item.status === 'shipped' && item.courierName ? <View style={styles.orderNotice}><Truck size={18} color={theme.colors.primary.dark} /><View style={styles.deliveryCopy}><Text style={styles.noticeTitle}>{item.courierName}</Text><Text style={styles.noticeText}>Tracking {item.trackingNumber} · {formatCurrency(item.shippingCost, item.currency)} shipping</Text></View></View> : null}
        {showShippingForm ? <View style={styles.shippingForm}>
          <Text style={styles.formTitle}>Shipping details</Text>
          <Input label="Courier name" value={courierName} onChangeText={setCourierName} placeholder="Delivery provider" />
          <Input label="Tracking number" value={trackingNumber} onChangeText={setTrackingNumber} placeholder="Tracking or consignment number" autoCapitalize="characters" />
          {formError ? <Text style={styles.errorText} accessibilityRole="alert">{formError}</Text> : null}
          <View style={[styles.formActions, compactActions && styles.formActionsCompact]}><Button style={compactActions && styles.actionButton} fullWidth={compactActions} variant="secondary" disabled={isUpdating} onPress={() => { setShippingOrderId(undefined); setFormError(undefined); }}>Back</Button><Button style={compactActions && styles.actionButton} fullWidth={compactActions} loading={isUpdating} loadingLabel="Saving shipment" onPress={() => shipOrder(item.id)}>Confirm Shipment</Button></View>
        </View> : null}
        <View style={[styles.footer, compactActions && styles.footerCompact]}>
          <View><Text style={styles.total}>{formatCurrency(item.total, item.currency)}</Text><Text style={styles.paymentState}>{item.paymentStatus === 'paid' ? 'Paid' : item.paymentStatus === 'partial' ? 'Delivery fee paid' : 'Payment pending'}</Text></View>
          {item.status === 'processing' && !showShippingForm ? <View style={[styles.actions, compactActions && styles.actionsCompact]}>
            <Button style={compactActions && styles.actionButton} fullWidth={compactActions} size="sm" loading={false} disabled={isUpdating} onPress={() => { update.reset(); setShippingOrderId(item.id); }}>Mark as Shipped</Button>
            <Button style={compactActions && styles.actionButton} fullWidth={compactActions} size="sm" variant="secondary" loading={isUpdating && update.variables?.update.status === 'cancelled'} disabled={isUpdating} onPress={() => cancelOrder(item.id)}>Cancel Order</Button>
          </View> : null}
        </View>
        {update.isError && update.variables?.id === item.id ? <View style={[styles.updateError, compactActions && styles.updateErrorCompact]}><Text style={styles.errorText} accessibilityRole="alert">{getApiErrorMessage(update.error, 'Unable to update this order.')}</Text><Button fullWidth={compactActions} size="sm" variant="tertiary" onPress={() => update.reset()}>Dismiss</Button></View> : null}
      </View>;
    }}
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
  orderNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radii.sm, backgroundColor: theme.colors.secondary.tint },
  noticeTitle: { color: theme.colors.ink, fontWeight: '800' },
  noticeText: { color: theme.colors.muted, marginTop: 2, fontSize: theme.typography.small.fontSize },
  settlement: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 4 },
  settlementRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, marginTop: theme.spacing.md },
  footerCompact: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.sm },
  total: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  paymentState: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: theme.spacing.sm },
  actionsCompact: { width: '100%', flexWrap: 'nowrap', justifyContent: 'space-between' },
  actionButton: { flex: 1 },
  shippingForm: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  formTitle: { color: theme.colors.ink, fontWeight: '800', marginBottom: theme.spacing.md },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: theme.spacing.sm },
  formActionsCompact: { width: '100%', flexWrap: 'nowrap' },
  updateError: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radii.sm, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.error, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  updateErrorCompact: { flexDirection: 'column', alignItems: 'stretch' },
  errorText: { flex: 1, color: theme.colors.error },
});
