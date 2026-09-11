import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../../hooks/useCart';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { useAuth } from '../../hooks/useAuth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Image } from 'expo-image';
import { Trash2, X } from 'lucide-react-native';

export const Cart: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Cart'>>();
  const cart = useCart();
  const auth = useAuth();
  const [authSheet, setAuthSheet] = React.useState(false);

  if (auth.isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Register or log in to access your cart and proceed to checkout." />
        <View style={styles.guestContent}>
          <Text style={styles.title}>Cart</Text>
          <View style={styles.empty}><Text style={styles.emptyText}>Create a free account to access your cart and proceed to checkout.</Text></View>
          <Button onPress={() => setAuthSheet(true)} accessibilityLabel="Create account">Create Account</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Cart</Text><Pressable style={styles.closeButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close cart"><X color={theme.colors.ink} size={22} /></Pressable></View>
      {cart.itemCount === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Your cart is empty. Add items to continue.</Text></View>
      ) : (
        <FlatList data={cart.items} keyExtractor={item => item.id} renderItem={({ item }) => (
          <View style={styles.itemRow}>
            {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" /> : null}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={styles.quantityRow}>
              <Pressable onPress={() => cart.updateQuantity(item.id, Math.max(1, item.quantity - 1))} style={styles.quantityButton} accessibilityRole="button"><Text style={styles.quantityLabel}>-</Text></Pressable>
              <Text style={styles.quantityValue}>{item.quantity}</Text>
              <Pressable onPress={() => cart.updateQuantity(item.id, item.quantity + 1)} style={styles.quantityButton} accessibilityRole="button"><Text style={styles.quantityLabel}>+</Text></Pressable>
              <Pressable onPress={() => cart.removeItem(item.id)} style={styles.removeButton} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}><Trash2 color={theme.colors.error} size={18} /></Pressable>
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
  guestContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: theme.radii.md,
    marginRight: theme.spacing.sm,
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
  removeButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.xs,
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
