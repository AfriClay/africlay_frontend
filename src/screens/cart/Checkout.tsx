import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheckBig, Clock3, X } from 'lucide-react-native';
import { AddressForm } from '../../components/domain/AddressForm';
import { Button } from '../../components/ui/Button';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { addressService, AddressInput } from '../../services/addressService';
import { ApiError, getApiErrorMessage } from '../../services/api';
import { orderKeys, orderService } from '../../services/orderService';
import { isOrderPaymentPhone, paymentKeys, paymentService } from '../../services/paymentService';
import { theme } from '../../theme';
import { Payment } from '../../types/payment';
import { formatCurrency } from '../../utils/formatCurrency';
import { checkoutAddressSchema } from '../../validation/checkoutSchemas';

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;
type CheckoutStage = 'idle' | 'creating-order' | 'requesting-payment' | 'payment-pending' | 'payment-succeeded' | 'payment-failed' | 'payment-unknown';

const PAYMENT_POLL_LIMIT = 12;
const PAYMENT_POLL_INTERVAL = 5_000;

export const Checkout: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigation>();
  const cart = useCart();
  const auth = useAuth();
  const userId = auth.user?.id ?? '';
  const queryClient = useQueryClient();
  const addressKey = ['addresses', userId] as const;
  const addressesQuery = useQuery({ queryKey: addressKey, queryFn: addressService.list, enabled: Boolean(userId && cart.available) });
  const [selectedId, setSelectedId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [stage, setStage] = useState<CheckoutStage>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [statusError, setStatusError] = useState<string>();
  const [orderCreationUncertain, setOrderCreationUncertain] = useState(false);
  const [authSheet, setAuthSheet] = useState(false);
  const [orderId, setOrderId] = useState<string>();
  const [orderTotal, setOrderTotal] = useState(0);
  const [payment, setPayment] = useState<Payment>();
  const inFlight = useRef(false);
  const statusRequest = useRef<AbortController | undefined>(undefined);
  const addresses = addressesQuery.data ?? [];
  const selected = addresses.find(address => address.id === selectedId) ?? addresses.find(address => address.is_default) ?? addresses[0];

  useEffect(() => {
    if (phoneTouched || phoneNumber) return;
    const suggested = selected?.phone_number || auth.user?.phoneNumber;
    if (suggested) setPhoneNumber(suggested);
  }, [auth.user?.phoneNumber, phoneNumber, phoneTouched, selected?.phone_number]);

  const syncOrderState = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orderKeys.buyer(userId) });
    void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  }, [queryClient, userId]);

  const applyPayment = useCallback((next: Payment) => {
    setPayment(next);
    queryClient.setQueryData(paymentKeys.detail(next.id), next);
    if (next.status === 'succeeded') {
      setStage('payment-succeeded');
      setStatusError(undefined);
      syncOrderState();
    } else if (next.status === 'failed' || next.status === 'cancelled') {
      setStage('payment-failed');
    } else {
      setStage('payment-pending');
    }
  }, [queryClient, syncOrderState]);

  const checkPaymentStatus = useCallback(async () => {
    if (!payment?.id || statusRequest.current) return;
    const controller = new AbortController();
    statusRequest.current = controller;
    setStatusError(undefined);
    try {
      applyPayment(await paymentService.getPayment(payment.id, controller.signal));
    } catch (statusCheckError) {
      if (!(statusCheckError instanceof Error && statusCheckError.name === 'AbortError')) {
        setStatusError(getApiErrorMessage(statusCheckError, 'Unable to refresh payment status.'));
      }
    } finally {
      if (statusRequest.current === controller) statusRequest.current = undefined;
    }
  }, [applyPayment, payment?.id]);

  useEffect(() => {
    if (stage !== 'payment-pending' || !payment?.id) return;
    let stopped = false;
    let checks = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (stopped || checks >= PAYMENT_POLL_LIMIT) return;
      checks += 1;
      await checkPaymentStatus();
      if (!stopped && checks < PAYMENT_POLL_LIMIT) timer = setTimeout(poll, PAYMENT_POLL_INTERVAL);
      else if (!stopped) setStatusError(current => current ?? 'Automatic checks paused. Use Check Payment Status to refresh again.');
    };
    timer = setTimeout(poll, PAYMENT_POLL_INTERVAL);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      statusRequest.current?.abort();
      statusRequest.current = undefined;
    };
  }, [checkPaymentStatus, payment?.id, stage]);

  useEffect(() => {
    if (stage !== 'payment-pending' || !payment?.id) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void checkPaymentStatus();
    });
    return () => subscription.remove();
  }, [checkPaymentStatus, payment?.id, stage]);

  const createAddress = async (input: AddressInput) => {
    const saved = await addressService.create(input);
    setSelectedId(saved.id);
    await queryClient.invalidateQueries({ queryKey: addressKey });
    setCreating(false);
  };

  const requestPayment = useCallback(async (targetOrderId: string) => {
    if (inFlight.current) return;
    if (!isOrderPaymentPhone(phoneNumber)) {
      setError('Enter a Kenyan M-Pesa number in 2547XXXXXXXX format.');
      return;
    }
    if (!Number.isInteger(cart.subtotal)) {
      setError('M-Pesa order payments require a whole-KES total. Adjust the cart before placing this order.');
      return;
    }
    inFlight.current = true;
    setStage('requesting-payment');
    setError(undefined);
    setStatusError(undefined);
    try {
      applyPayment(await paymentService.initiateOrderPayment(targetOrderId, phoneNumber));
    } catch (paymentError) {
      setStage('payment-unknown');
      setError(paymentError instanceof ApiError && paymentError.status < 500
        ? getApiErrorMessage(paymentError, 'Payment could not be started.')
        : 'Your order exists, but payment status could not be confirmed. Do not create another order. You can safely recover this order payment below.');
    } finally {
      inFlight.current = false;
    }
  }, [applyPayment, phoneNumber]);

  const submit = async () => {
    if (inFlight.current || !cart.itemCount || !selected || !auth.user || !cart.available) return;
    if (!isOrderPaymentPhone(phoneNumber)) {
      setPhoneTouched(true);
      setError('Enter a Kenyan M-Pesa number in 2547XXXXXXXX format.');
      return;
    }
    const candidate = {
      shipping_address: [selected.street_address, selected.apartment_suite].filter(Boolean).join(', '),
      shipping_city: selected.city,
      shipping_postal_code: selected.postal_code ?? '',
      shipping_country: selected.country,
    };
    const parsed = checkoutAddressSchema.safeParse(candidate);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message); return; }
    inFlight.current = true;
    setStage('creating-order');
    setError(undefined);
    setOrderCreationUncertain(false);
    try {
      const order = await orderService.checkout(parsed.data);
      setOrderId(order.id);
      setOrderTotal(order.total);
      inFlight.current = false;
      await Promise.allSettled([
        cart.refresh(),
        queryClient.invalidateQueries({ queryKey: orderKeys.buyer(userId) }),
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
      ]);
      await requestPayment(order.id);
    } catch (submitError) {
      setStage('idle');
      const uncertain = !(submitError instanceof ApiError) || submitError.status >= 500;
      setOrderCreationUncertain(uncertain);
      setError(submitError instanceof ApiError && submitError.status < 500
        ? getApiErrorMessage(submitError, 'Unable to place your order.')
        : 'Order status could not be confirmed. Check My Orders before trying checkout again.');
    } finally {
      inFlight.current = false;
    }
  };

  if (!auth.user) return <SafeAreaView style={styles.container}>
    <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Log in to complete checkout." />
    <View style={styles.content}><Text style={styles.title}>Checkout</Text><Text style={styles.note}>Log in to place an order.</Text><Button onPress={() => setAuthSheet(true)}>Log In</Button></View>
  </SafeAreaView>;

  if (!cart.available) return <SafeAreaView style={styles.confirmation}>
    <AlertTriangle color={theme.colors.error} size={64} />
    <Text style={styles.title}>Buyer account required</Text>
    <Text style={styles.confirmationText}>Checkout is available to buyer-enabled accounts.</Text>
    <Button variant="secondary" onPress={() => navigation.goBack()}>Go Back</Button>
  </SafeAreaView>;

  if (orderId && stage !== 'idle') {
    const succeeded = stage === 'payment-succeeded';
    const pending = stage === 'payment-pending' || stage === 'requesting-payment';
    const Icon = succeeded ? CircleCheckBig : pending ? Clock3 : AlertTriangle;
    const title = succeeded ? 'Payment confirmed' : pending ? 'Payment pending' : stage === 'payment-failed' ? 'Payment failed' : 'Payment status unknown';
    const description = succeeded
      ? `Order #${orderId.slice(0, 8)} is paid and ready for the seller to process.`
      : pending
        ? 'Complete the M-Pesa prompt on your phone. This screen checks for confirmation for a limited time.'
        : stage === 'payment-failed'
          ? 'The payment was not completed. Your order remains unpaid.'
          : 'The order was created, but the payment result could not be confirmed.';
    return <SafeAreaView style={styles.confirmation}>
      {stage === 'requesting-payment' ? <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} /> : <Icon color={succeeded ? theme.colors.success : pending ? theme.colors.secondary.dark : theme.colors.error} size={68} />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.confirmationText}>{description}</Text>
      <Text style={styles.orderMeta}>{formatCurrency(payment?.amount ?? orderTotal, payment?.currency ?? 'KES')}</Text>
      {payment?.receiptNumber ? <Text style={styles.note}>Receipt {payment.receiptNumber}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {statusError ? <Text style={styles.error} accessibilityRole="alert">{statusError}</Text> : null}
      <View style={styles.actions}>
        {payment?.id && pending ? <Button variant="secondary" onPress={() => void checkPaymentStatus()}>Check Payment Status</Button> : null}
        {!payment?.id && stage === 'payment-unknown' ? <Button onPress={() => void requestPayment(orderId)}>Recover Payment</Button> : null}
        {stage === 'payment-failed' ? <Button onPress={() => void requestPayment(orderId)}>Try Payment Again</Button> : null}
        <Button variant={succeeded ? 'primary' : 'secondary'} onPress={() => navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'MyOrders' } })}>View My Orders</Button>
        {succeeded ? <Button variant="tertiary" onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })}>Continue Shopping</Button> : null}
      </View>
    </SafeAreaView>;
  }

  const header = <>
    <View style={styles.header}><Text style={styles.title}>Checkout</Text><Button variant="icon" icon={<X color={theme.colors.ink} size={22} />} onPress={() => navigation.goBack()} accessibilityLabel="Close checkout" /></View>
    <Text style={styles.sectionTitle}>Delivery Address</Text>
    {addressesQuery.isLoading ? <Text style={styles.note}>Loading addresses...</Text> : addressesQuery.isError ?
      <View><Text style={styles.error}>Unable to load addresses.</Text><Button variant="secondary" onPress={() => void addressesQuery.refetch()}>Retry</Button></View> :
      addresses.map(address => <Pressable key={address.id} onPress={() => setSelectedId(address.id)} accessibilityRole="radio" accessibilityState={{ selected: selected?.id === address.id }} style={[styles.address, selected?.id === address.id && styles.selectedAddress]}>
        <Text style={styles.addressName}>{address.recipient_name || address.street_address}{address.is_default ? ' (Default)' : ''}</Text>
        <Text style={styles.note}>{[address.street_address, address.city, address.postal_code, address.country].filter(Boolean).join(', ')}</Text>
      </Pressable>)}
    {creating ? <AddressForm onSave={createAddress} onCancel={() => setCreating(false)} /> :
      <Button variant="secondary" onPress={() => setCreating(true)}>Add Address</Button>}
    <Text style={styles.sectionTitle}>M-Pesa Payment</Text>
    <Input
      label="Phone number"
      value={phoneNumber}
      onChangeText={value => { setPhoneTouched(true); setPhoneNumber(value); setError(undefined); }}
      placeholder="254712345678"
      keyboardType="phone-pad"
      autoComplete="tel"
      error={phoneTouched && phoneNumber && !isOrderPaymentPhone(phoneNumber) ? 'Use 2547XXXXXXXX format.' : undefined}
    />
    <Text style={styles.note}>An M-Pesa prompt will be sent after your order is created.</Text>
    <Text style={styles.sectionTitle}>Order Summary</Text>
  </>;
  const busy = stage === 'creating-order' || stage === 'requesting-payment';
  const footer = <View style={styles.footer}>
    <View style={styles.totalRow}><Text style={styles.note}>Total due</Text><Text style={styles.total}>{formatCurrency(cart.subtotal)}</Text></View>
    {cart.error && <Text style={styles.error} accessibilityRole="alert">{cart.error}</Text>}
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    {orderCreationUncertain ? <Button variant="secondary" onPress={() => navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'MyOrders' } })}>View My Orders</Button> : null}
    <Button onPress={() => void submit()} loading={busy} loadingLabel={stage === 'creating-order' ? 'Creating order' : 'Requesting payment'} disabled={busy || orderCreationUncertain || cart.loading || cart.mutating || !cart.itemCount || !selected || !isOrderPaymentPhone(phoneNumber) || !Number.isInteger(cart.subtotal) || addressesQuery.isError || creating || Boolean(cart.error)}>Place Order & Pay</Button>
  </View>;
  return <SafeAreaView style={styles.container}><FlatList data={cart.items} keyExtractor={item => item.id}
    renderItem={({ item }) => <View style={styles.itemRow}><Text style={styles.itemName}>{item.name} x {item.quantity}</Text><Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text></View>}
    ListHeaderComponent={header} ListFooterComponent={footer}
    ListEmptyComponent={<Text style={styles.note}>{cart.error ? 'Cart unavailable. Return to the cart and retry.' : 'Your cart is empty.'}</Text>} contentContainerStyle={styles.content} /></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  address: { padding: theme.spacing.md, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm },
  selectedAddress: { borderColor: theme.colors.primary.DEFAULT, borderWidth: 2 },
  addressName: { fontWeight: '700', color: theme.colors.ink },
  note: { color: theme.colors.muted, marginVertical: theme.spacing.xs },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm },
  itemName: { flex: 1, color: theme.colors.ink },
  itemPrice: { color: theme.colors.ink, fontWeight: '700' },
  footer: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink },
  error: { color: theme.colors.error, textAlign: 'center' },
  confirmation: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.cream },
  confirmationText: { maxWidth: 520, textAlign: 'center', color: theme.colors.muted, marginTop: theme.spacing.md, lineHeight: 22 },
  orderMeta: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginTop: theme.spacing.md },
  actions: { alignSelf: 'stretch', maxWidth: 520, width: '100%', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
