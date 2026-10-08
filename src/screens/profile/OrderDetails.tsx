import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, MapPin, Truck } from 'lucide-react-native';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { OrderProgress } from '../../components/domain/OrderProgress';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { getApiErrorMessage } from '../../services/api';
import { orderKeys, orderService } from '../../services/orderService';
import { notificationKeys } from '../../services/notificationService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

type OrderDetailsRoute = RouteProp<ProfileStackParamList, 'OrderDetails'>;

export const OrderDetails: React.FC = () => {
  const { params } = useRoute<OrderDetailsRoute>();
  const userId = useAuth().user?.id ?? '';
  const client = useQueryClient();
  const detailKey = orderKeys.detail(userId, params.orderId);
  const orderQuery = useQuery({ queryKey: detailKey,
    queryFn: () => orderService.fetchOrderById(params.orderId), enabled: Boolean(userId && params.orderId) });
  const confirmDelivery = useMutation({
    mutationFn: () => orderService.confirmDelivery(params.orderId),
    onSuccess: delivered => {
      client.setQueryData(detailKey, delivered);
      void client.invalidateQueries({ queryKey: orderKeys.buyer(userId) });
      void client.invalidateQueries({ queryKey: notificationKeys.all(userId) });
    },
  });
  const { data: order } = orderQuery;

  if (!userId) return <EmptyState title="Sign in to view this order" description="Order details belong to your account." />;
  if (orderQuery.isLoading) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading order...</Text></SafeAreaView>;
  if (orderQuery.isError) return <ErrorState message={getApiErrorMessage(orderQuery.error, 'Unable to load this order.')} onRetry={() => void orderQuery.refetch()} />;
  if (!order) return <EmptyState title="Order not found" description="This order is unavailable for your account." />;

  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.id}>Order #{order.id}</Text><Text style={styles.date}>{formatDate(order.date)}</Text></View><StatusPill status={order.status} /></View>
    <OrderProgress status={order.status} />
    <Text style={styles.statusNote}>{order.status === 'shipped' ? 'Your order is on its way. Confirm receipt only after it arrives.' : order.status === 'processing' ? 'Payment is confirmed and the seller is preparing your order.' : order.status === 'pending' ? 'Your order is waiting for payment confirmation.' : order.status === 'delivered' ? 'Delivery is complete. You can now rate the product or store.' : ''}</Text>
    <View style={styles.infoCard}><CreditCard color={theme.colors.primary.DEFAULT} size={20} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Payment</Text><Text style={styles.infoText}>{order.paymentStatus === 'paid' ? 'Confirmed' : order.paymentStatus === 'refunded' ? 'Refunded' : order.paymentStatus === 'failed' ? 'Failed' : 'Pending confirmation'}{order.paymentMethod ? ` · ${order.paymentMethod === 'mpesa' ? 'M-Pesa' : order.paymentMethod}` : ''}</Text></View></View>
    {order.status === 'shipped' && order.courierName ? <View style={styles.infoCard}><Truck color={theme.colors.primary.DEFAULT} size={20} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>{order.courierName}</Text><Text style={styles.infoText}>Tracking {order.trackingNumber}</Text><Text style={styles.infoText}>Shipping {formatCurrency(order.shippingCost, order.currency)}</Text></View></View> : null}
    {order.status === 'shipped' ? <View style={styles.confirmBlock}><Button loading={confirmDelivery.isPending} disabled={confirmDelivery.isPending} onPress={() => confirmDelivery.mutate()}>Confirm item received</Button>{confirmDelivery.isError ? <Text style={styles.error} accessibilityRole="alert">{getApiErrorMessage(confirmDelivery.error, 'Unable to confirm delivery.')}</Text> : null}</View> : null}
    <Text style={styles.sectionTitle}>Items</Text>
    {order.items.map(item => <View key={item.id} style={styles.itemRow}><View style={styles.itemCopy}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.date}>Qty {item.quantity}</Text></View><Text style={styles.amount}>{formatCurrency(item.price * item.quantity, order.currency)}</Text></View>)}
    <Text style={styles.sectionTitle}>Delivery Address</Text>
    <View style={styles.addressCard}><MapPin color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.address}>{order.deliveryAddress}</Text></View>
    <View style={styles.totalRow}><Text style={styles.totalLabel}>Order total</Text><Text style={styles.total}>{formatCurrency(order.total, order.currency)}</Text></View>
  </ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  loading: { padding: theme.spacing.lg, color: theme.colors.muted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  headerCopy: { flex: 1, minWidth: 0 },
  id: { fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink },
  date: { color: theme.colors.muted, marginTop: theme.spacing.xs },
  sectionTitle: { marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm, fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink },
  itemRow: { minHeight: 70, padding: theme.spacing.md, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.white, borderRadius: theme.radii.md, flexDirection: 'row', alignItems: 'center' },
  itemCopy: { flex: 1, marginRight: theme.spacing.sm },
  itemName: { color: theme.colors.ink, fontWeight: '700' },
  amount: { color: theme.colors.ink, fontWeight: '700' },
  addressCard: { padding: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.radii.md, flexDirection: 'row', alignItems: 'center' },
  address: { flex: 1, color: theme.colors.ink, marginLeft: theme.spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  totalLabel: { color: theme.colors.ink, fontWeight: '700' },
  total: { color: theme.colors.ink, fontWeight: '800', fontSize: theme.typography.h3.fontSize },
  statusNote: { color: theme.colors.muted, lineHeight: 21, marginTop: theme.spacing.xs },
  confirmBlock: { marginTop: theme.spacing.md, gap: theme.spacing.sm },
  error: { color: theme.colors.error },
  infoCard: { marginTop: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.radii.md, flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  infoCopy: { flex: 1, minWidth: 0 },
  infoTitle: { color: theme.colors.ink, fontWeight: '800' },
  infoText: { color: theme.colors.muted, marginTop: 2 },
});
