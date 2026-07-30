import React from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../../hooks/useCart';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useAuth } from '../../hooks/useAuth';

export const Cart: React.FC = () => {
  const navigation = useNavigation<any>();
  const cart = useCart();
  const auth = useAuth();
  const [authSheet, setAuthSheet] = React.useState(false);

  if (auth.isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <BottomSheet visible={authSheet} onClose={() => setAuthSheet(false)} title="Create a free account to continue" description="Register or log in to proceed to checkout and access your cart." actionLabel="Create Account" onAction={() => { setAuthSheet(false); navigation.navigate('Register'); }} />
        <View style={{ padding: theme.spacing.lg }}>
          <Text style={styles.title}>Cart</Text>
          <View style={styles.empty}><Text style={styles.emptyText}>Create a free account to access your cart and proceed to checkout.</Text></View>
          <Button onPress={() => setAuthSheet(true)} accessibilityLabel="Create account">Create Account</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cart</Text>
      {cart.itemCount === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Your cart is empty. Add items to continue.</Text></View>
      ) : (
        <FlatList data={cart.items} keyExtractor={item => item.id} renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={styles.quantityRow}>
              <Pressable onPress={() => cart.updateQuantity(item.id, Math.max(1, item.quantity - 1))} style={styles.quantityButton} accessibilityRole="button"><Text style={styles.quantityLabel}>-</Text></Pressable>
              <Text style={styles.quantityValue}>{item.quantity}</Text>
              <Pressable onPress={() => cart.updateQuantity(item.id, item.quantity + 1)} style={styles.quantityButton} accessibilityRole="button"><Text style={styles.quantityLabel}>+</Text></Pressable>
            </View>
          </View>
        )} contentContainerStyle={styles.list} />
      )}
      <View style={styles.footer}>
        <View>
          <Text style={styles.summaryLabel}>{`${cart.itemCount} items`}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(cart.subtotal)}</Text>
        </View>
        <Button onPress={() => navigation.navigate('Checkout')} disabled={cart.itemCount === 0} accessibilityLabel="Proceed to checkout">Proceed to Checkout</Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    color: theme.colors.ink,
    margin: theme.spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  itemName: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  itemPrice: {
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: theme.colors.primary.tint,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
  },
  quantityLabel: {
    color: theme.colors.primary.dark,
    fontWeight: '700',
    fontSize: theme.typography.body.fontSize,
  },
  quantityValue: {
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.ink,
    fontWeight: '700',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.cream,
  },
  summaryLabel: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    color: theme.colors.ink,
    fontWeight: '700',
    fontSize: theme.typography.h3.fontSize,
  },
});
