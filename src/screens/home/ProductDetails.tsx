import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CompositeNavigationProp, RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { RatingBadge } from '../../components/ui/RatingBadge';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { ShoppingCart } from 'lucide-react-native';
import { ProductGallery } from '../../components/domain/ProductGallery';
import { CartToast } from '../../components/ui/CartToast';
import { useIsFocused } from '@react-navigation/native';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { recordId } from '../../services/catalogContract';
import { catalogKeys } from '../../services/catalogQueries';
import { getApiErrorMessage } from '../../services/api';

type ProductDetailsRoute = RouteProp<HomeStackParamList, 'ProductDetails'>;
type ProductDetailsNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'ProductDetails'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const ProductDetails: React.FC = () => {
  const { isExpanded, isCompact } = useResponsiveLayout();
  const [cartEvent, setCartEvent] = useState(0);
  const [actionHeight, setActionHeight] = useState(0);
  const isFocused = useIsFocused();
  const route = useRoute<ProductDetailsRoute>();
  const navigation = useNavigation<ProductDetailsNavigation>();
  const productId = recordId(route.params?.productId);
  useEffect(() => { setCartEvent(0); }, [productId, isFocused]);
  const productQuery = useQuery({ queryKey: catalogKeys.product(productId), queryFn: () => productService.fetchProductById(productId), enabled: Boolean(productId) });
  const { data: product, isLoading } = productQuery;
  const sellerId = product?.sellerId ?? '';
  const sellerQuery = useQuery({ queryKey: catalogKeys.seller(sellerId), queryFn: () => productService.fetchSeller(sellerId), enabled: Boolean(sellerId) });
  const { data: seller } = sellerQuery;
  const cart = useCart();
  const auth = useAuth();
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [cartError, setCartError] = useState<string>();

  const handleAddToCart = async () => {
    if (!auth.user) { setAuthSheetVisible(true); return; }
    if (product && !cart.mutating) {
      setCartError(undefined);
      try {
        await cart.addItem(product.id);
      } catch (error) {
        setCartError(getApiErrorMessage(error, 'Unable to add this item.'));
        return;
      }
      setCartEvent(event => event + 1);
    }
  };

  const buyNow = async () => {
    if (!auth.user) {
      setAuthSheetVisible(true);
      return;
    }
    if (product && !cart.mutating) {
      setCartError(undefined);
      try {
        await cart.addItem(product.id);
      } catch (error) {
        setCartError(getApiErrorMessage(error, 'Unable to add this item.'));
        return;
      }
      (navigation as any).navigate('Checkout');
    }
  };

  if (productQuery.isError) return <ErrorState message="Unable to load this product." onRetry={() => void productQuery.refetch()} />;
  if (isLoading) return <View style={styles.container}><Text style={styles.loading}>Loading product...</Text></View>;
  if (!product) return <EmptyState title="Product not found" description="This product is unavailable. Go back to browse other items." />;

  const actions = <View onLayout={event => setActionHeight(event.nativeEvent.layout.height)} style={[styles.actions, isExpanded && styles.desktopActions]}>
    <View style={styles.buttonRow}>
      <Pressable style={styles.outlineButton} onPress={() => void handleAddToCart()} disabled={cart.mutating} accessibilityRole="button">
        <ShoppingCart color={theme.colors.primary.DEFAULT} size={20} />
        <Text style={styles.outlineText}>Add to Cart</Text>
      </Pressable>
      <Pressable style={styles.primaryButton} onPress={() => void buyNow()} disabled={cart.mutating} accessibilityRole="button"><Text style={styles.primaryText}>Buy Now</Text></Pressable>
    </View>
  </View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: isExpanded ? theme.spacing.lg : actionHeight + theme.spacing.lg }]}>
        <View style={isExpanded && styles.desktopColumns}>
        <View style={isExpanded && styles.desktopColumn}>
        <ProductGallery key={product.id} images={product.images} name={product.name} />
        </View>
        <View style={isExpanded && styles.desktopColumn}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatCurrency(product.price, product.currency)}</Text>
        {product.reviewCount > 0 && <RatingBadge rating={product.rating} reviewCount={product.reviewCount} />}
        {sellerQuery.isError ? <ErrorState message="Unable to load seller details." onRetry={() => void sellerQuery.refetch()} /> : <Pressable disabled={!seller} accessibilityState={{ disabled: !seller }} style={styles.sellerCard} onPress={() => seller && (navigation as any).navigate('SellerStore', { sellerId: seller.id })} accessibilityRole="button">
          <View>
            <Text style={styles.sellerName}>{seller?.name ?? (sellerQuery.isLoading ? 'Loading seller...' : 'Seller unavailable')}</Text>
            <Text style={styles.sellerMeta}>{seller?.location}</Text>
          </View>
          {seller && <Text style={styles.sellerLink}>View Store</Text>}
        </Pressable>}
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>
        <Text style={styles.meta}>Delivery estimate: {product.deliveryEstimate}</Text>
        {cartError && <Text style={styles.description} accessibilityRole="alert">{cartError}</Text>}
        {isExpanded && actions}
        </View>
        </View>
      </ScrollView>
      {isCompact && actions}
      {isFocused && <CartToast key={product.id} event={cartEvent} bottom={isCompact ? actionHeight + theme.spacing.sm : theme.spacing.md} />}
      <GuestAuthSheet visible={authSheetVisible} onClose={() => setAuthSheetVisible(false)} description="Register or log in to save items, message sellers, and complete your purchase." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  desktopColumns: { flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'flex-start' },
  desktopColumn: { flex: 1, minWidth: 0 },
  desktopActions: { position: 'relative', paddingHorizontal: 0 },
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  iconRow: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
  },
  iconButton: {
    backgroundColor: theme.colors.overlay,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  price: {
    color: theme.colors.secondary.dark,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  sellerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sellerName: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  sellerMeta: {
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  sellerLink: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  description: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
  },
  meta: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.xl,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cream,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  chatLabel: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outlineButton: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    flexDirection: 'row',
  },
  outlineText: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  loading: {
    color: theme.colors.muted,
    padding: theme.spacing.lg,
  },
});
