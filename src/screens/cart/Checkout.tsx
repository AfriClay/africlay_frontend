import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, CircleCheckBig, CreditCard, Smartphone, WalletCards, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { orderService } from '../../services/orderService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { CheckoutAddressForm, checkoutAddressSchema } from '../../validation/checkoutSchemas';

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;
type PaymentMethod = 'mpesa' | 'wallet' | 'card';

const paymentMethods = [
  { id: 'mpesa' as const, title: 'M-Pesa', description: 'Secure STK push to your phone', icon: Smartphone },
  { id: 'wallet' as const, title: 'AfriClay Wallet', description: 'Available balance: KSh 12,500', icon: WalletCards },
  { id: 'card' as const, title: 'Card Payment', description: 'Visa or Mastercard', icon: CreditCard },
];

export const Checkout: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigation>();
  const cart = useCart();
  const auth = useAuth();
  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [loading, setLoading] = useState(false);
  const [authSheet, setAuthSheet] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string>();
  const deliveryFee = 150;
  const total = cart.subtotal + deliveryFee;

  const { control, handleSubmit, getValues } = useForm<CheckoutAddressForm>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: {
      name: auth.user?.name ?? '',
      phone: '+254 712 345 678',
      addressLine: 'Westlands',
      city: 'Nairobi',
    },
  });

  if (auth.isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Register or log in to proceed with checkout." />
        <View style={styles.guestContent}>
          <Text style={styles.title}>Checkout</Text>
          <View style={styles.card}><Text style={styles.cardText}>Please create an account or log in to complete your purchase.</Text></View>
          <Button onPress={() => setAuthSheet(true)}>Continue</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (confirmedOrderId) {
    return (
      <SafeAreaView style={styles.confirmation}>
        <CircleCheckBig color={theme.colors.success} size={72} />
        <Text style={styles.confirmationTitle}>Order confirmed</Text>
        <Text style={styles.confirmationText}>Your payment was successful. We&apos;ll notify you when the seller starts preparing order #{confirmedOrderId}.</Text>
        <View style={styles.confirmationActions}>
          <Button onPress={() => navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'MyOrders' } })}>View My Orders</Button>
          <Button variant="outline" onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })}>Continue Shopping</Button>
        </View>
      </SafeAreaView>
    );
  }

  const handlePayment = async (addressValues: CheckoutAddressForm) => {
    if (!cart.itemCount) return;
    setLoading(true);
    try {
      const orderId = `AFR${Math.floor(10000 + Math.random() * 90000)}`;
      await orderService.createOrder({
        id: orderId,
        date: new Date().toISOString(),
        status: 'Processing',
        sellerId: cart.items[0]?.sellerId ?? 'seller-zuri',
        deliveryAddress: `${addressValues.name}\n${addressValues.addressLine}, ${addressValues.city}`,
        deliveryFee,
        total,
        items: cart.items.map(item => ({ ...item })),
      });
      cart.clearCart();
      setConfirmedOrderId(orderId);
    } catch {
      Alert.alert('Payment not completed', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const address = getValues();

  const Header = (
    <>
      <View style={styles.header}><Text style={styles.title}>Checkout</Text><Pressable style={styles.closeButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close checkout"><X color={theme.colors.ink} size={22} /></Pressable></View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Delivery Address</Text><Text style={styles.changeLink} onPress={() => setEditingAddress(current => !current)}>{editingAddress ? 'Done' : 'Change'}</Text></View>
      {editingAddress ? (
        <View style={styles.card}>
          <Controller control={control} name="name" render={({ field: { value, onChange }, fieldState }) => <Input label="Recipient" value={value} onChangeText={onChange} error={fieldState.error?.message} />} />
          <Controller control={control} name="phone" render={({ field: { value, onChange }, fieldState }) => <Input label="Phone" value={value} onChangeText={onChange} keyboardType="phone-pad" error={fieldState.error?.message} />} />
          <Controller control={control} name="addressLine" render={({ field: { value, onChange }, fieldState }) => <Input label="Address" value={value} onChangeText={onChange} error={fieldState.error?.message} />} />
          <Controller control={control} name="city" render={({ field: { value, onChange }, fieldState }) => <Input label="City" value={value} onChangeText={onChange} error={fieldState.error?.message} />} />
        </View>
      ) : (
        <View style={styles.card}><Text style={styles.addressName}>{address.name}</Text><Text style={styles.cardText}>{address.addressLine}, {address.city}</Text><Text style={styles.cardText}>{address.phone}</Text></View>
      )}
      <Text style={styles.sectionTitleStandalone}>Order Summary</Text>
    </>
  );

  const Footer = (
    <>
      <Text style={styles.sectionTitleStandalone}>Payment Method</Text>
      <View style={styles.paymentOptions}>
        {paymentMethods.map(payment => {
          const Icon = payment.icon;
          const selected = method === payment.id;
          return (
            <Pressable key={payment.id} style={[styles.paymentOption, selected ? styles.paymentSelected : null]} onPress={() => setMethod(payment.id)} accessibilityRole="radio" accessibilityState={{ selected }}>
              <View style={styles.paymentIcon}><Icon color={theme.colors.primary.DEFAULT} size={21} /></View>
              <View style={styles.paymentCopy}><Text style={styles.optionTitle}>{payment.title}</Text><Text style={styles.optionText}>{payment.description}</Text></View>
              <View style={[styles.radio, selected ? styles.radioSelected : null]}>{selected ? <Check color={theme.colors.white} size={12} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.summary}>
        <View style={styles.priceRow}><Text style={styles.priceLabel}>Subtotal</Text><Text style={styles.priceValue}>{formatCurrency(cart.subtotal)}</Text></View>
        <View style={styles.priceRow}><Text style={styles.priceLabel}>Delivery fee</Text><Text style={styles.priceValue}>{formatCurrency(deliveryFee)}</Text></View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatCurrency(total)}</Text></View>
      </View>
      <Button loading={loading} onPress={handleSubmit(handlePayment)} disabled={!cart.itemCount || loading} accessibilityLabel={`Pay ${formatCurrency(total)}`}>Pay {formatCurrency(total)} with {paymentMethods.find(item => item.id === method)?.title}</Button>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cart.items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <View style={styles.itemRow}><Text style={styles.itemLabel}>{item.name} × {item.quantity}</Text><Text style={styles.itemValue}>{formatCurrency(item.price * item.quantity)}</Text></View>}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ListEmptyComponent={<Text style={styles.emptyText}>Your cart is empty.</Text>}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  guestContent: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { color: theme.colors.ink, fontWeight: '800', fontSize: theme.typography.h3.fontSize },
  sectionTitleStandalone: { color: theme.colors.ink, fontWeight: '800', fontSize: theme.typography.h3.fontSize, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  changeLink: { color: theme.colors.primary.DEFAULT, fontWeight: '700', paddingVertical: theme.spacing.sm },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  addressName: { color: theme.colors.ink, fontWeight: '800', marginBottom: theme.spacing.xs },
  cardText: { color: theme.colors.muted, lineHeight: 21 },
  itemRow: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { flex: 1, color: theme.colors.ink, marginRight: theme.spacing.sm },
  itemValue: { color: theme.colors.ink, fontWeight: '700' },
  paymentOptions: { gap: theme.spacing.sm },
  paymentOption: { minHeight: 68, backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' },
  paymentSelected: { backgroundColor: theme.colors.primary.tint, borderColor: theme.colors.primary.DEFAULT },
  paymentIcon: { width: 38 },
  paymentCopy: { flex: 1 },
  optionTitle: { color: theme.colors.ink, fontWeight: '800' },
  optionText: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  summary: { marginVertical: theme.spacing.lg },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  priceLabel: { color: theme.colors.muted },
  priceValue: { color: theme.colors.ink, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  totalLabel: { color: theme.colors.ink, fontWeight: '800', fontSize: theme.typography.h3.fontSize },
  totalValue: { color: theme.colors.ink, fontWeight: '800', fontSize: theme.typography.h3.fontSize },
  emptyText: { color: theme.colors.muted, paddingVertical: theme.spacing.lg },
  confirmation: { flex: 1, backgroundColor: theme.colors.cream, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  confirmationTitle: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', marginTop: theme.spacing.lg },
  confirmationText: { color: theme.colors.muted, textAlign: 'center', lineHeight: 23, marginTop: theme.spacing.sm },
  confirmationActions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
