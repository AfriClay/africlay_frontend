import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, MapPin, Truck } from 'lucide-react-native';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OrderProgress } from '../../components/domain/OrderProgress';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { getApiErrorMessage } from '../../services/api';
import { orderKeys, orderService } from '../../services/orderService';
import { notificationKeys } from '../../services/notificationService';
import { isOrderPaymentPhone, paymentService } from '../../services/paymentService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Payment } from '../../types/payment';

type OrderDetailsRoute = RouteProp<ProfileStackParamList, 'OrderDetails'>;
const eventLabels: Record<string, string> = {
  order_created: 'Order placed', payment_confirmed: 'Upfront payment confirmed',
  awaiting_collection: 'Ready for logistics collection', collected_from_seller: 'Collected from seller',
  in_transit: 'In transit to pickup point', arrived_at_pickup: 'Arrived at pickup point',
  collected_by_buyer: 'Collected by buyer', shipped: 'Shipped', delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const homeEventLabels: Record<string, string> = {
  waiting_for_parcels: 'Waiting for parcels at pickup point',
  rider_assigned: 'Rider assigned', rider_accepted: 'Rider accepted delivery',
  collected_from_pickup: 'Rider collected from pickup point',
  rider_delivered: 'Rider reported doorstep delivery',
  buyer_confirmed: 'Buyer confirmed receipt', cancelled: 'Home delivery cancelled',
};

export const OrderDetails: React.FC = () => {
  const { params } = useRoute<OrderDetailsRoute>();
  const auth = useAuth();
  const userId = auth.user?.id ?? '';
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestedPayment, setRequestedPayment] = useState<Payment>();
  useEffect(() => {
    if (!phoneNumber && auth.user?.phoneNumber) setPhoneNumber(auth.user.phoneNumber);
  }, [auth.user?.phoneNumber, phoneNumber]);
  const requestOrderPayment = useMutation({
    mutationFn: (purpose: 'initial' | 'delivery_balance') => paymentService.initiateOrderPayment(params.orderId, phoneNumber, purpose),
    onSuccess: setRequestedPayment,
  });
  const refreshPayment = useMutation({
    mutationFn: () => paymentService.getPayment(requestedPayment!.id),
    onSuccess: payment => {
      setRequestedPayment(payment);
      if (payment.status === 'succeeded') void orderQuery.refetch();
    },
  });

  if (!userId) return <EmptyState title="Sign in to view this order" description="Order details belong to your account." />;
  if (orderQuery.isLoading) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading order...</Text></SafeAreaView>;
  if (orderQuery.isError) return <ErrorState message={getApiErrorMessage(orderQuery.error, 'Unable to load this order.')} onRetry={() => void orderQuery.refetch()} />;
  if (!order) return <EmptyState title="Order not found" description="This order is unavailable for your account." />;
  const parcelsAtPickup = order.fulfillments.length > 0 && order.fulfillments.every(
    fulfillment => fulfillment.status === 'cancelled' || fulfillment.events.some(event => event.stage === 'arrived_at_pickup'),
  );
  const pickupReady = order.deliveryMethod === 'pickup_point' ? parcelsAtPickup
    : order.deliveryMethod === 'doorstep' ? parcelsAtPickup && order.homeDelivery?.status === 'rider_delivered' : true;
  const journeyNote = order.deliveryMethod === 'doorstep' && order.status === 'shipped'
    ? order.homeDelivery?.status === 'rider_delivered'
      ? 'The rider reported delivery. Confirm receipt only after checking your parcel.'
      : order.homeDelivery?.status === 'collected_from_pickup'
        ? 'The rider has collected your parcel from the pickup point.'
        : 'Your parcels are travelling to the pickup point. The rider will collect them after they arrive.'
    : order.deliveryMethod === 'pickup_point' && order.status === 'shipped'
      ? pickupReady ? 'Your parcel has been recorded at the pickup point. Confirm collection only after receiving it.' : 'Check the recorded shipment events below for each seller.'
      : order.status === 'shipped' ? 'Your order is on its way. Confirm receipt only after it arrives.'
      : order.status === 'processing' ? 'The required upfront payment is confirmed and the seller is preparing your order.'
      : order.status === 'pending' ? 'Your order is waiting for payment confirmation.'
      : order.status === 'delivered' ? 'Delivery is complete. You can now rate the product or store.' : '';

  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.id}>Order #{order.id}</Text><Text style={styles.date}>{formatDate(order.date)}</Text></View><StatusPill status={order.status} /></View>
    {order.deliveryMethod === 'standard' ? <OrderProgress status={order.status} /> : null}
    <Text style={styles.statusNote}>{journeyNote}</Text>
    <Text style={styles.sectionTitle}>Track Order</Text>
    {order.fulfillments.map((fulfillment, index) => <View key={fulfillment.id} style={styles.trackingCard}>
      <Text style={styles.infoTitle}>Parcel {index + 1} of {order.fulfillments.length}</Text>
      {fulfillment.events.length ? fulfillment.events.map(event => <View key={event.id} style={styles.eventRow}>
        <View style={styles.eventDot} />
        <View style={styles.infoCopy}><Text style={styles.eventTitle}>{eventLabels[event.stage] ?? event.stage.replace(/_/g, ' ')}</Text><Text style={styles.date}>{new Date(event.createdAt).toLocaleString()}</Text>{event.note ? <Text style={styles.infoText}>{event.note}</Text> : null}</View>
      </View>) : <Text style={styles.infoText}>No verified movement updates have been recorded for this parcel.</Text>}
    </View>)}
    {order.deliveryMethod === 'doorstep' ? <View style={styles.trackingCard}>
      <Text style={styles.infoTitle}>Pickup point to your home</Text>
      {order.homeDelivery?.deliveryInstructions ? <Text style={styles.infoText}>Rider instructions: {order.homeDelivery.deliveryInstructions}</Text> : null}
      {order.homeDelivery?.events.length ? order.homeDelivery.events.map(event => <View key={event.id} style={styles.eventRow}>
        <View style={styles.eventDot} /><View style={styles.infoCopy}>
          <Text style={styles.eventTitle}>{homeEventLabels[event.stage] ?? event.stage.replace(/_/g, ' ')}</Text>
          <Text style={styles.date}>{new Date(event.createdAt).toLocaleString()}</Text>
          {event.note ? <Text style={styles.infoText}>{event.note}</Text> : null}
        </View>
      </View>) : <Text style={styles.infoText}>No home-delivery events have been recorded.</Text>}
    </View> : null}
    <Button variant="secondary" onPress={() => void orderQuery.refetch()} loading={orderQuery.isFetching}>Refresh tracking</Button>
    <View style={styles.infoCard}><CreditCard color={theme.colors.primary.DEFAULT} size={20} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Payment</Text><Text style={styles.infoText}>{order.paymentStatus === 'paid' ? 'Confirmed' : order.paymentStatus === 'refunded' ? 'Refunded' : order.paymentStatus === 'failed' ? 'Failed' : 'Pending confirmation'}{order.paymentMethod ? ` · ${order.paymentMethod === 'mpesa' ? 'M-Pesa' : order.paymentMethod}` : ''}</Text></View></View>
    {order.status === 'pending' && order.paymentStatus !== 'paid' ? <View style={styles.balanceBlock}>
      <Text style={styles.infoTitle}>Complete payment</Text>
      <Text style={styles.infoText}>{formatCurrency(order.paymentOption === 'pay_on_delivery' ? order.shippingCost : order.amountDue, order.currency)} will be requested through M-Pesa.</Text>
      <Input label="M-Pesa phone number" required value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="254712345678" error={phoneNumber && !isOrderPaymentPhone(phoneNumber) ? 'Use 2547XXXXXXXX or 2541XXXXXXXX format.' : undefined} />
      {!requestedPayment ? <Button loading={requestOrderPayment.isPending} disabled={!isOrderPaymentPhone(phoneNumber)} onPress={() => requestOrderPayment.mutate('initial')}>Send M-Pesa Prompt</Button> :
        <Button variant="secondary" loading={refreshPayment.isPending} onPress={() => refreshPayment.mutate()}>{requestedPayment.status === 'succeeded' ? 'Payment Confirmed' : 'Check Payment Status'}</Button>}
      {requestOrderPayment.isError ? <Text style={styles.error}>{getApiErrorMessage(requestOrderPayment.error, 'Unable to request payment for this order.')}</Text> : null}
      {refreshPayment.isError ? <Text style={styles.error}>{getApiErrorMessage(refreshPayment.error, 'Unable to refresh payment status.')}</Text> : null}
    </View> : null}
    {order.status === 'shipped' && order.courierName ? <View style={styles.infoCard}><Truck color={theme.colors.primary.DEFAULT} size={20} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>{order.courierName}</Text><Text style={styles.infoText}>Tracking {order.trackingNumber}</Text><Text style={styles.infoText}>Shipping {formatCurrency(order.shippingCost, order.currency)}</Text></View></View> : null}
    {order.status === 'shipped' && order.paymentOption === 'pay_on_delivery' && order.paymentStatus !== 'paid' ? <View style={styles.balanceBlock}>
      <Text style={styles.infoTitle}>Pay delivery balance</Text>
      <Text style={styles.infoText}>{formatCurrency(order.amountDue, order.currency)} is due before delivery can be confirmed.</Text>
      <Input label="M-Pesa phone number" required value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="254712345678" error={phoneNumber && !isOrderPaymentPhone(phoneNumber) ? 'Use 2547XXXXXXXX or 2541XXXXXXXX format.' : undefined} />
      {!requestedPayment ? <Button loading={requestOrderPayment.isPending} disabled={!isOrderPaymentPhone(phoneNumber)} onPress={() => requestOrderPayment.mutate('delivery_balance')}>Send M-Pesa Prompt</Button> :
        <Button variant="secondary" loading={refreshPayment.isPending} onPress={() => refreshPayment.mutate()}>{requestedPayment.status === 'succeeded' ? 'Payment Confirmed' : 'Check Payment Status'}</Button>}
      {requestOrderPayment.isError ? <Text style={styles.error}>{getApiErrorMessage(requestOrderPayment.error, 'Unable to request the balance payment.')}</Text> : null}
      {refreshPayment.isError ? <Text style={styles.error}>{getApiErrorMessage(refreshPayment.error, 'Unable to refresh payment status.')}</Text> : null}
    </View> : null}
    {order.status === 'shipped' ? <View style={styles.confirmBlock}><Button loading={confirmDelivery.isPending} disabled={confirmDelivery.isPending || order.paymentStatus !== 'paid' || !pickupReady} onPress={() => confirmDelivery.mutate()}>{order.deliveryMethod === 'pickup_point' ? 'Confirm collection' : 'Confirm item received'}</Button>{!pickupReady ? <Text style={styles.infoText}>{order.deliveryMethod === 'doorstep' ? 'Wait until all parcels reach the pickup point and the rider reports delivery to your home.' : 'All parcels must arrive at the pickup point before collection can be confirmed.'}</Text> : null}{confirmDelivery.isError ? <Text style={styles.error} accessibilityRole="alert">{getApiErrorMessage(confirmDelivery.error, 'Unable to confirm delivery.')}</Text> : null}</View> : null}
    <Text style={styles.sectionTitle}>Items</Text>
    {order.items.map(item => <View key={item.id} style={styles.itemRow}><View style={styles.itemCopy}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.date}>Qty {item.quantity}{item.priceUnit ? ` ${item.priceUnit}` : ''}</Text></View><Text style={styles.amount}>{formatCurrency(item.price * item.quantity, order.currency)}</Text></View>)}
    <Text style={styles.sectionTitle}>{order.deliveryMethod === 'pickup_point' ? 'Selected pickup point' : 'Delivery Address'}</Text>
    <View style={styles.addressCard}><MapPin color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.address}>{order.deliveryAddress}</Text></View>
    <View style={styles.totalRow}><Text style={styles.totalLabel}>Items</Text><Text style={styles.totalLine}>{formatCurrency(order.itemSubtotal, order.currency)}</Text></View>
    {order.homeDelivery ? <><View style={styles.totalRow}><Text style={styles.totalLabel}>Seller to pickup point</Text><Text style={styles.totalLine}>{formatCurrency(order.shippingCost - order.homeDelivery.fee, order.currency)}</Text></View><View style={styles.totalRow}><Text style={styles.totalLabel}>Pickup point to home</Text><Text style={styles.totalLine}>{formatCurrency(order.homeDelivery.fee, order.currency)}</Text></View></> : null}
    <View style={styles.totalRow}><Text style={styles.totalLabel}>Total delivery</Text><Text style={styles.totalLine}>{formatCurrency(order.shippingCost, order.currency)}</Text></View>
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
  totalLine: { color: theme.colors.ink, fontWeight: '700' },
  statusNote: { color: theme.colors.muted, lineHeight: 21, marginTop: theme.spacing.xs },
  confirmBlock: { marginTop: theme.spacing.md, gap: theme.spacing.sm },
  balanceBlock: { marginTop: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.radii.md, gap: theme.spacing.sm },
  error: { color: theme.colors.error },
  infoCard: { marginTop: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.radii.md, flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  infoCopy: { flex: 1, minWidth: 0 },
  infoTitle: { color: theme.colors.ink, fontWeight: '800' },
  infoText: { color: theme.colors.muted, marginTop: 2 },
  trackingCard: { padding: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm, gap: theme.spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  eventDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary.DEFAULT, marginTop: 5 },
  eventTitle: { color: theme.colors.ink, fontWeight: '700' },
});
