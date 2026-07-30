import React, { useMemo, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, View, Pressable } from 'react-native';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';
import { orderService } from '../../services/orderService';
import { useNavigation } from '@react-navigation/native';
import { formatDate } from '../../utils/formatDate';

export const Checkout: React.FC = () => {
  const navigation = useNavigation<any>();
  const cart = useCart();
  const auth = useAuth();
  const [method, setMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [loading, setLoading] = useState(false);
  const [authSheet, setAuthSheet] = useState(false);

  if (auth.isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <BottomSheet visible={authSheet} onClose={() => setAuthSheet(false)} title="Create a free account to continue" description="Register or log in to proceed with checkout." actionLabel="Log In" onAction={() => { setAuthSheet(false); /* navigation handled by parent */ }} />
        <View style={{ padding: theme.spacing.lg }}>
          <Text style={styles.title}>Checkout</Text>
          <View style={styles.card}><Text style={styles.cardText}>Please create an account or log in to complete your purchase.</Text></View>
          <Button onPress={() => setAuthSheet(true)}>Log In</Button>
        </View>
      </SafeAreaView>
    );
  }

  const deliveryFee = 150;
  const total = cart.subtotal + deliveryFee;

  const address = auth.user?.location ? `${auth.user.name}\n${auth.user.location}` : 'Nairobi, Kenya';

  const handlePayment = async () => {
    if (cart.itemCount === 0) {
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1800));
    const order = {
      id: `AFR${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString(),
      status: 'Processing' as const,
      sellerId: cart.items[0]?.sellerId ?? 'seller-zuri',
      deliveryAddress: address,
      deliveryFee,
      total,
      items: cart.items.map(item => ({ ...item })),
    };
    await orderService.createOrder(order);
    cart.clearCart();
    setLoading(false);
    navigation.reset({ index: 0, routes: [{ name: 'AppTabs', params: { screen: 'Profile', params: { screen: 'MyOrders' } } }] });
    Alert.alert('Order confirmed', 'Your order has been placed and is now processing.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Delivery Address</Text>
        <View style={styles.card}><Text style={styles.cardText}>{address}</Text></View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Order Summary</Text>
        <FlatList data={cart.items} keyExtractor={item => item.id} renderItem={({ item }) => (
          <View style={styles.summaryItem}>
            <Text style={styles.itemLabel}>{item.name} �{item.quantity}</Text>
            <Text style={styles.itemValue}>{formatCurrency(item.price * item.quantity)}</Text>
          </View>
        )} ListEmptyComponent={<Text style={styles.emptyText}>Your cart is empty.</Text>} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.paymentOptions}>
          <Pressable style={[styles.paymentOption, method === 'mpesa' ? styles.paymentSelected : null]} onPress={() => setMethod('mpesa')} accessibilityRole="radio" accessibilityState={{ selected: method === 'mpesa' }}>
            <Text style={styles.optionTitle}>M-Pesa</Text>
            <Text style={styles.optionText}>Pay with M-Pesa</Text>
          </Pressable>
          <Pressable style={[styles.paymentOption, method === 'card' ? styles.paymentSelected : null]} onPress={() => setMethod('card')} accessibilityRole="radio" accessibilityState={{ selected: method === 'card' }}>
            <Text style={styles.optionTitle}>Card Payment</Text>
            <Text style={styles.optionText}>Enter card details at checkout</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.summary}> 
        <View style={styles.priceRow}><Text style={styles.priceLabel}>Subtotal</Text><Text style={styles.priceValue}>{formatCurrency(cart.subtotal)}</Text></View>
        <View style={styles.priceRow}><Text style={styles.priceLabel}>Delivery fee</Text><Text style={styles.priceValue}>{formatCurrency(deliveryFee)}</Text></View>
        <View style={styles.priceRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatCurrency(total)}</Text></View>
      </View>
      <Button loading={loading} onPress={handlePayment} disabled={cart.itemCount === 0 || loading} accessibilityLabel={`Pay ${formatCurrency(total)} with ${method === 'mpesa' ? 'M-Pesa' : 'Card'}`}>{`Pay ${formatCurrency(total)} with ${method === 'mpesa' ? 'M-Pesa' : 'Card'}`}</Button>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardText: {
    color: theme.colors.ink,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  itemLabel: {
    color: theme.colors.ink,
  },
  itemValue: {
    color: theme.colors.muted,
  },
  emptyText: {
    color: theme.colors.muted,
  },
  paymentOptions: {
    gap: theme.spacing.sm,
  },
  paymentOption: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  paymentSelected: {
    backgroundColor: theme.colors.primary.tint,
    borderColor: theme.colors.primary.DEFAULT,
  },
  optionTitle: {
    color: theme.colors.ink,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  optionText: {
    color: theme.colors.muted,
  },
  summary: {
    marginBottom: theme.spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  priceLabel: {
    color: theme.colors.muted,
  },
  priceValue: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  totalLabel: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  totalValue: {
    color: theme.colors.ink,
    fontWeight: '800',
  },
});
