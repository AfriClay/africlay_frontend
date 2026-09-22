import React, { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheckBig, X } from 'lucide-react-native';
import { AddressForm } from '../../components/domain/AddressForm';
import { Button } from '../../components/ui/Button';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { addressService, AddressInput } from '../../services/addressService';
import { ApiError, getApiErrorMessage } from '../../services/api';
import { orderService } from '../../services/orderService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { checkoutAddressSchema } from '../../validation/checkoutSchemas';

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

export const Checkout: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigation>();
  const cart = useCart();
  const auth = useAuth();
  const userId = auth.user?.id ?? '';
  const queryClient = useQueryClient();
  const addressKey = ['addresses', userId] as const;
  const addressesQuery = useQuery({ queryKey: addressKey, queryFn: addressService.list, enabled: Boolean(userId) });
  const [selectedId, setSelectedId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string>();
  const [authSheet, setAuthSheet] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string>();
  const addresses = addressesQuery.data ?? [];
  const selected = addresses.find(address => address.id === selectedId) ?? addresses.find(address => address.is_default) ?? addresses[0];

  const createAddress = async (input: AddressInput) => {
    const saved = await addressService.create(input);
    setSelectedId(saved.id);
    await queryClient.invalidateQueries({ queryKey: addressKey });
    setCreating(false);
  };

  const submit = async () => {
    if (inFlight.current || !cart.itemCount || !selected || !auth.user) return;
    const candidate = {
      shipping_address: [selected.street_address, selected.apartment_suite].filter(Boolean).join(', '),
      shipping_city: selected.city,
      shipping_postal_code: selected.postal_code ?? '',
      shipping_country: selected.country,
    };
    const parsed = checkoutAddressSchema.safeParse(candidate);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message); return; }
    inFlight.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const order = await orderService.checkout(parsed.data);
      setConfirmedOrderId(order.id);
      void cart.refresh().catch(() => {});
      void queryClient.invalidateQueries({ queryKey: ['buyer-orders', userId] });
    } catch (submitError) {
      setError(submitError instanceof ApiError && submitError.status < 500
        ? getApiErrorMessage(submitError, 'Unable to place your order.')
        : 'Checkout status is unknown. Check My Orders before trying again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (!auth.user) return <SafeAreaView style={styles.container}>
    <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Log in to complete checkout." />
    <View style={styles.content}><Text style={styles.title}>Checkout</Text><Text style={styles.note}>Log in to place an order.</Text><Button onPress={() => setAuthSheet(true)}>Log In</Button></View>
  </SafeAreaView>;

  if (confirmedOrderId) return <SafeAreaView style={styles.confirmation}>
    <CircleCheckBig color={theme.colors.success} size={72} />
    <Text style={styles.title}>Order placed</Text>
    <Text style={styles.confirmationText}>Order #{confirmedOrderId} was created. Payment has not been collected.</Text>
    <View style={styles.actions}>
      <Button onPress={() => navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'MyOrders' } })}>View My Orders</Button>
      <Button variant="outline" onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })}>Continue Shopping</Button>
    </View>
  </SafeAreaView>;

  const header = <>
    <View style={styles.header}><Text style={styles.title}>Checkout</Text><Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close checkout" style={styles.close}><X color={theme.colors.ink} size={22} /></Pressable></View>
    <Text style={styles.sectionTitle}>Delivery Address</Text>
    {addressesQuery.isLoading ? <Text style={styles.note}>Loading addresses...</Text> : addressesQuery.isError ?
      <View><Text style={styles.error}>Unable to load addresses.</Text><Button variant="outline" onPress={() => void addressesQuery.refetch()}>Retry</Button></View> :
      addresses.map(address => <Pressable key={address.id} onPress={() => setSelectedId(address.id)} accessibilityRole="radio" accessibilityState={{ selected: selected?.id === address.id }} style={[styles.address, selected?.id === address.id && styles.selectedAddress]}>
        <Text style={styles.addressName}>{address.recipient_name || address.street_address}{address.is_default ? ' (Default)' : ''}</Text>
        <Text style={styles.note}>{[address.street_address, address.city, address.postal_code, address.country].filter(Boolean).join(', ')}</Text>
      </Pressable>)}
    {creating ? <AddressForm onSave={createAddress} onCancel={() => setCreating(false)} /> :
      <Button variant="outline" onPress={() => setCreating(true)}>Add Address</Button>}
    <Text style={styles.sectionTitle}>Order Summary</Text>
  </>;
  const footer = <View style={styles.footer}>
    <View style={styles.totalRow}><Text style={styles.note}>Items total</Text><Text style={styles.total}>{formatCurrency(cart.subtotal)}</Text></View>
    <Text style={styles.note}>The backend confirms the final total. No payment is taken here.</Text>
    {cart.error && <Text style={styles.error} accessibilityRole="alert">{cart.error}</Text>}
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Button onPress={() => void submit()} loading={submitting} disabled={submitting || cart.loading || cart.mutating || !cart.itemCount || !selected || addressesQuery.isError || creating || Boolean(cart.error)}>Place Order</Button>
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
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink },
  sectionTitle: { fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  address: { padding: theme.spacing.md, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm },
  selectedAddress: { borderColor: theme.colors.primary.DEFAULT },
  addressName: { fontWeight: '700', color: theme.colors.ink },
  note: { color: theme.colors.muted, marginVertical: theme.spacing.xs },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm },
  itemName: { flex: 1, color: theme.colors.ink },
  itemPrice: { color: theme.colors.ink, fontWeight: '700' },
  footer: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink },
  error: { color: theme.colors.error },
  confirmation: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.cream },
  confirmationText: { textAlign: 'center', color: theme.colors.ink, marginTop: theme.spacing.md },
  actions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
