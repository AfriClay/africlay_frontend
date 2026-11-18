import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CompositeNavigationProp, RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { priceUnitSuffix } from '../../utils/priceUnit';
import { RatingBadge } from '../../components/ui/RatingBadge';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { ArrowRight, ChevronDown, ChevronUp, ShoppingCart, Truck } from 'lucide-react-native';
import { ProductGallery } from '../../components/domain/ProductGallery';
import { CartToast } from '../../components/ui/CartToast';
import { useIsFocused } from '@react-navigation/native';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { ErrorState } from '../../components/ui/ErrorState';
import { NotFoundScreen } from '../common/NotFoundScreen';
import { recordId } from '../../services/catalogContract';
import { catalogCategories, catalogKeys } from '../../services/catalogQueries';
import { getApiErrorMessage } from '../../services/api';
import { WishlistToggle } from '../../components/domain/WishlistToggle';
import { ReviewSection } from '../../components/domain/ReviewSection';
import { Button } from '../../components/ui/Button';
import { canAccessBuyerTools } from '../../utils/roles';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';

type ProductDetailsRoute = RouteProp<HomeStackParamList, 'ProductDetails'>;
type ProductDetailsNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'ProductDetails'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DESCRIPTION_PREVIEW_LENGTH = 100;

const descriptionPreview = (description: string): string => {
  const text = description.trim().replace(/\s+/g, ' ');
  if (text.length <= DESCRIPTION_PREVIEW_LENGTH) return text;
  const lastSpace = text.lastIndexOf(' ', DESCRIPTION_PREVIEW_LENGTH);
  return `${text.slice(0, lastSpace > 0 ? lastSpace : DESCRIPTION_PREVIEW_LENGTH)}…`;
};

export const ProductDetails: React.FC = () => {
  const { isWide } = useResponsiveLayout();
  const reducedMotion = useReducedMotionSafe();
  const detailScrollRef = useRef<ScrollView>(null);
  const detailsTop = useRef(0);
  const reviewsTop = useRef(0);
  const [cartEvent, setCartEvent] = useState(0);
  const [actionHeight, setActionHeight] = useState(0);
  const isFocused = useIsFocused();
  const route = useRoute<ProductDetailsRoute>();
  const queryClient = useQueryClient();
  const navigation = useNavigation<ProductDetailsNavigation>();
  const productId = recordId(route.params?.productId);
  useEffect(() => { setCartEvent(0); }, [productId, isFocused]);
  const productQuery = useQuery({ queryKey: catalogKeys.product(productId), queryFn: () => productService.fetchProductById(productId, catalogCategories(queryClient)), enabled: Boolean(productId) });
  const { data: product, isLoading } = productQuery;
  const sellerId = product?.sellerId ?? '';
  const sellerQuery = useQuery({ queryKey: catalogKeys.seller(sellerId), queryFn: () => productService.fetchSeller(sellerId), enabled: Boolean(sellerId) });
  const { data: seller } = sellerQuery;
  const cart = useCart();
  const auth = useAuth();
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [cartError, setCartError] = useState<string>();
  const [selectedOptionId, setSelectedOptionId] = useState<string>();
  useEffect(() => { setSelectedOptionId(undefined); }, [productId]);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  useEffect(() => { setDescriptionExpanded(false); }, [productId]);
  const [pendingAction, setPendingAction] = useState<'cart'>();
  const canBuy = !auth.user || canAccessBuyerTools(auth.user.role);
  const chosenOption = product?.priceOptions?.find(option => option.id === selectedOptionId);
  const needsChoice = Boolean(product?.priceOptions?.length && !chosenOption);

  const handleAddToCart = async () => {
    if (needsChoice) { setCartError('Choose a price option first.'); return; }
    if (auth.user && !canAccessBuyerTools(auth.user.role)) { setCartError('Shopping is not available for this account.'); return; }
    if (product && !cart.mutating) {
      setPendingAction('cart');
      setCartError(undefined);
      try {
        await cart.addItem(product.id, 1, { productId: product.id, productSlug: product.slug, name: product.name, price: chosenOption?.price ?? product.price, priceUnit: product.priceUnit, optionId: chosenOption?.id, optionLabel: chosenOption?.label });
      } catch (error) {
        setCartError(getApiErrorMessage(error, 'Unable to add this item.'));
        setPendingAction(undefined);
        return;
      }
      setCartEvent(event => event + 1);
      setPendingAction(undefined);
    }
  };

  const buyNow = () => {
    if (needsChoice) { setCartError('Choose a price option first.'); return; }
    if (auth.user && !canAccessBuyerTools(auth.user.role)) { setCartError('Shopping is not available for this account.'); return; }
    if (product) {
      (navigation as any).navigate('Checkout', { buyNowProductId: product.id, buyNowProductSlug: product.slug, buyNowQuantity: 1, buyNowOptionId: chosenOption?.id });
    }
  };

  if (productQuery.isError) return <ErrorState message="Unable to load this product." onRetry={() => void productQuery.refetch()} />;
  if (isLoading) return <PageSkeleton variant="detail" />;
  if (!product) return <NotFoundScreen title="Product not found" message="This product may have been removed or its link has changed." />;

  const fullDescription = product.description.trim();
  const preview = descriptionPreview(fullDescription);
  const hasMoreDescription = preview !== fullDescription;
  const showReviews = () => detailScrollRef.current?.scrollTo({ y: detailsTop.current + reviewsTop.current - theme.spacing.lg, animated: !reducedMotion });
  const showDeliveryPolicy = () => navigation.getParent()?.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Policies', { policyId: 'shipping-and-delivery', audience: 'buyer' });

  const actions = <View onLayout={event => setActionHeight(event.nativeEvent.layout.height)} style={[styles.actions, isWide && styles.desktopActions]}>
    {canBuy ? <View style={styles.buttonRow}>
      <Button style={styles.actionButton} variant="secondary" icon={<ShoppingCart color={theme.colors.primary.DEFAULT} size={20} />} onPress={() => void handleAddToCart()} disabled={cart.mutating || needsChoice || Boolean(chosenOption && !chosenOption.stockQuantity)} loading={pendingAction === 'cart'} loadingLabel="Adding">Add to cart</Button>
      <Button style={styles.actionButton} onPress={buyNow} disabled={needsChoice || Boolean(chosenOption && !chosenOption.stockQuantity)}>Buy now</Button>
    </View> : <Text style={styles.buyerOnly}>Switch to a buyer-enabled account to purchase products.</Text>}
  </View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={detailScrollRef} contentContainerStyle={[styles.content, { paddingBottom: isWide ? theme.spacing.lg : actionHeight + theme.spacing.lg }]}>
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={[styles.galleryColumn, isWide && styles.galleryColumnWide]}>
            <ProductGallery key={product.id} images={product.images} name={product.name} />
          </View>
          <View style={[styles.summaryColumn, isWide && styles.summaryColumnWide]}>
        <View style={styles.nameRow}><Text style={[styles.name, isWide && styles.nameWide]}>{product.name}</Text><WishlistToggle productId={product.id} onGuest={() => setAuthSheetVisible(true)} /></View>
        {product.reviewCount > 0 && <Pressable onPress={showReviews} accessibilityRole="button" accessibilityLabel={`Read ${product.reviewCount} product reviews`} style={styles.reviewJump}>
          <RatingBadge rating={product.rating} reviewCount={product.reviewCount} /><ArrowRight size={15} color={theme.colors.primary.DEFAULT} />
        </Pressable>}
        <Text style={styles.price}>{chosenOption ? formatCurrency(chosenOption.price, product.currency) : `${product.priceOptions?.length ? 'From ' : ''}${formatCurrency(product.price, product.currency)}`}{priceUnitSuffix(product.priceUnit)}</Text>
        {Boolean(product.priceOptions?.length) && <View style={styles.choices}><Text style={styles.sectionTitle}>Choose a price option</Text>{product.priceOptions?.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected: selectedOptionId === option.id, disabled: option.stockQuantity === 0 }} disabled={option.stockQuantity === 0} onPress={() => { setSelectedOptionId(option.id); setCartError(undefined); }} style={[styles.choice, selectedOptionId === option.id && styles.choiceSelected]}><Text style={styles.choiceText}>{option.label} · {formatCurrency(option.price, product.currency)}</Text><Text style={styles.choiceStock}>{option.stockQuantity ? `${option.stockQuantity} available` : 'Sold out'}</Text></Pressable>)}</View>}
        {sellerQuery.isError ? <ErrorState message="Unable to load seller details." onRetry={() => void sellerQuery.refetch()} /> : <Pressable disabled={!seller} accessibilityState={{ disabled: !seller }} style={styles.sellerCard} onPress={() => seller && (navigation as any).navigate('SellerStore', { sellerId: seller.id })} accessibilityRole="button">
          <View>
            <Text style={styles.sellerLabel}>Sold by</Text>
            <Text style={styles.sellerName}>{seller?.name ?? (sellerQuery.isLoading ? 'Loading seller...' : 'Seller unavailable')}</Text>
          </View>
          {seller && <Text style={styles.sellerLink}>View Store</Text>}
        </Pressable>}
        <View style={styles.deliveryPanel}>
          <View style={styles.deliveryHeading}><Truck size={20} color={theme.colors.primary.dark} /><Text style={styles.deliveryTitle}>Delivery & collection</Text></View>
          <Text style={styles.deliveryCopy}>Choose a pickup point or available doorstep delivery at checkout. See the delivery fee before payment.</Text>
          <Pressable onPress={showDeliveryPolicy} accessibilityRole="link" style={styles.deliveryPolicyLink}>
            <Text style={styles.deliveryPolicyText}>Shipping & delivery policy</Text><ArrowRight size={16} color={theme.colors.primary.dark} />
          </Pressable>
        </View>
        {cartError && <Text style={styles.cartError} accessibilityRole="alert">{cartError}</Text>}
        {isWide && actions}
          </View>
        </View>
        <View style={styles.details} onLayout={event => { detailsTop.current = event.nativeEvent.layout.y; }}>
        {fullDescription ? <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>About this item</Text>
          <Text style={styles.description} numberOfLines={!descriptionExpanded && hasMoreDescription ? 3 : undefined}>
            {descriptionExpanded || !hasMoreDescription ? fullDescription : preview}
          </Text>
          {hasMoreDescription && <Pressable style={styles.descriptionToggle} onPress={() => setDescriptionExpanded(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: descriptionExpanded }} accessibilityLabel={descriptionExpanded ? 'Show less product description' : 'Read full product description'}>
            <Text style={styles.descriptionToggleText}>{descriptionExpanded ? 'Show less' : 'Read more'}</Text>
            {descriptionExpanded ? <ChevronUp size={16} color={theme.colors.primary.DEFAULT} /> : <ChevronDown size={16} color={theme.colors.primary.DEFAULT} />}
          </Pressable>}
        </View> : null}
        {product.deliveryEstimate.trim() ? <Text style={styles.meta}>Delivery estimate: {product.deliveryEstimate}</Text> : null}
        <View onLayout={event => { reviewsTop.current = event.nativeEvent.layout.y; }}><ReviewSection target={{ type: 'product', id: product.id }} /></View>
        </View>
      </ScrollView>
      {!isWide && actions}
      {isFocused && <CartToast key={product.id} event={cartEvent} bottom={!isWide ? actionHeight + theme.spacing.sm : theme.spacing.md} />}
      <GuestAuthSheet visible={authSheetVisible} onClose={() => setAuthSheetVisible(false)} description="Log in or create an account to save this product to your wishlist." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  hero: { width: '100%' },
  heroWide: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xl },
  galleryColumn: { minWidth: 0 },
  galleryColumnWide: { flex: 1, maxWidth: 560 },
  summaryColumn: { minWidth: 0 },
  summaryColumnWide: { flex: 1 },
  details: { width: '100%', maxWidth: 960, alignSelf: 'center', marginTop: theme.spacing.xl, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.lg },
  desktopActions: { position: 'relative', padding: 0, borderTopWidth: 0, backgroundColor: 'transparent', marginTop: theme.spacing.sm },
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
    flex: 1,
    color: theme.colors.ink,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  nameWide: { fontSize: 30, lineHeight: 36 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  reviewJump: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 36, marginBottom: theme.spacing.xs },
  price: {
    color: theme.colors.secondary.dark,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  sellerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sellerLabel: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginBottom: 2 },
  deliveryPanel: { backgroundColor: theme.colors.primary.tint, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  deliveryHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  deliveryTitle: { color: theme.colors.ink, fontSize: theme.typography.body.fontSize, fontWeight: '700' },
  deliveryCopy: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: 20 },
  deliveryPolicyLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 44, marginTop: theme.spacing.xs },
  deliveryPolicyText: { color: theme.colors.primary.dark, fontSize: theme.typography.small.fontSize, fontWeight: '700' },
  cartError: { color: theme.colors.error, marginBottom: theme.spacing.sm },
  choices: { marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  choice: { minHeight: 56, padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  choiceSelected: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  choiceText: { color: theme.colors.ink, fontWeight: '700' },
  choiceStock: { color: theme.colors.muted },
  sellerName: {
    color: theme.colors.ink,
    fontWeight: '700',
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
  descriptionSection: {
    marginBottom: theme.spacing.sm,
  },
  description: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  descriptionToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 44 },
  descriptionToggleText: { color: theme.colors.primary.DEFAULT, fontWeight: '700', fontSize: theme.typography.small.fontSize },
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
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  loading: {
    color: theme.colors.muted,
    padding: theme.spacing.lg,
  },
  buyerOnly: { color: theme.colors.muted, textAlign: 'center' },
});
