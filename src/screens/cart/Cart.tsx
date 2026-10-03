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
import { ChevronRight, Trash2, X } from 'lucide-react-native';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';

export const Cart: React.FC = () => {
  const { isExpanded } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Cart'>>();
  const cart = useCart();
  const auth = useAuth();
  const [authSheet, setAuthSheet] = React.useState(false);
  const openProduct = (slug?: string) => {
    if (!slug) return;
    navigation.navigate('AppTabs', { screen: 'Home', params: { screen: 'ProductDetails', params: { productId: slug } } });
  };

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
      <View style={styles.header}><Text style={styles.title}>Cart</Text><Button variant="icon" icon={<X color={theme.colors.ink} size={22} />} onPress={() => navigation.goBack()} accessibilityLabel="Close cart" /></View>
      {cart.error && <View style={styles.message}><Text style={styles.error} accessibilityRole="alert">{cart.error}</Text><Button size="sm" variant="tertiary" onPress={() => void cart.refresh().catch(() => {})}>Retry</Button></View>}
      {cart.loading ? <View style={styles.empty}><Text style={styles.emptyText}>Loading cart...</Text></View> : cart.error && cart.itemCount === 0 ? (
        <View style={[styles.empty, isExpanded && styles.desktopEmpty]}><Text style={styles.emptyText}>Cart unavailable. Retry to load your items.</Text></View>
      ) : cart.itemCount === 0 ? (
        <View style={[styles.empty, isExpanded && styles.desktopEmpty]}><Text style={styles.emptyText}>Your cart is empty. Add items to continue.</Text></View>
      ) : (
        <FlatList style={isExpanded && styles.desktopList} data={cart.items} keyExtractor={item => item.id} refreshing={cart.refreshing} onRefresh={() => void cart.refresh().catch(() => {})} renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Pressable onPress={() => openProduct(item.productSlug)} disabled={!item.productSlug} accessibilityRole="link"
              accessibilityLabel={`View ${item.name}`} accessibilityState={{ disabled: !item.productSlug }}
              style={({ pressed }) => [styles.itemInfo, styles.productLink, pressed && styles.productLinkPressed]}>
              <View style={styles.productCopy}><Text numberOfLines={2} style={styles.itemName}>{item.name}</Text><Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text></View>
              {item.productSlug && <ChevronRight color={theme.colors.primary.dark} size={20} />}
            </Pressable>
            <View style={styles.quantityRow}>
              <Button variant="icon" size="sm" onPress={() => void cart.updateQuantity(item.id, item.quantity - 1).catch(() => {})} disabled={cart.mutating || item.quantity <= 1} style={styles.quantityButton} accessibilityLabel={`Decrease ${item.name} quantity`} icon={<Text style={styles.quantityLabel}>-</Text>} />
              <Text style={styles.quantityValue}>{item.quantity}</Text>
              <Button variant="icon" size="sm" onPress={() => void cart.updateQuantity(item.id, item.quantity + 1).catch(() => {})} disabled={cart.mutating} style={styles.quantityButton} accessibilityLabel={`Increase ${item.name} quantity`} icon={<Text style={styles.quantityLabel}>+</Text>} />
              <Button variant="icon" size="sm" icon={<Trash2 color={theme.colors.error} size={18} />} onPress={() => void cart.removeItem(item.id).catch(() => {})} disabled={cart.mutating} accessibilityLabel={`Remove ${item.name}`} />
            </View>
          </View>
        )} contentContainerStyle={styles.list} />
      )}
      <View style={[styles.footer, isExpanded && styles.desktopFooter]}>
        <View>
          <Text style={styles.summaryLabel}>{`${cart.itemCount} items`}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(cart.subtotal)}</Text>
        </View>
        <Button onPress={() => navigation.navigate('Checkout')} disabled={cart.itemCount === 0 || cart.loading || cart.mutating || Boolean(cart.error)} accessibilityLabel="Proceed to checkout">Proceed to Checkout</Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  desktopList: { flexGrow: 0, flexShrink: 1 },
  desktopEmpty: { flex: 0, minHeight: 180 },
  desktopFooter: { gap: theme.spacing.md, marginTop: theme.spacing.md },
  message: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  error: { color: theme.colors.error },
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
  productLink: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderRadius: theme.radii.sm, padding: theme.spacing.xs },
  productLinkPressed: { backgroundColor: theme.colors.primary.tint },
  productCopy: { flex: 1, minWidth: 0 },
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
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.tint,
    borderRadius: theme.radii.pill,
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
