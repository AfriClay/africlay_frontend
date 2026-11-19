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
import { ArrowRight, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react-native';
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
import { usePageSeo } from '../../hooks/usePageSeo';

type ProductDetailsRoute = RouteProp<HomeStackParamList, 'ProductDetails'>;
type ProductDetailsNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'ProductDetails'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DESCRIPTION_PREVIEW_LENGTH = 280;
const INTRO_LENGTH = 135;

const descriptionPreview = (description: string, limit: number): string => {
  const text = description.trim().replace(/\s+/g, ' ');
  if (text.length <= limit) return text;
  const lastSpace = text.lastIndexOf(' ', limit);
  return `${text.slice(0, lastSpace > 0 ? lastSpace : limit)}…`;
};

export const ProductDetails: React.FC = () => {
  const { isExpanded, isWide, width } = useResponsiveLayout();
  const sideBySide = isExpanded && width >= 1000;
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
  usePageSeo({ title: product?.name ?? 'Product', description: product?.description || `${product?.name ?? 'Product'} on AfriClay Market.`, path: `/product/${product?.slug ?? productId}`, image: product?.images[0],
    schema: product ? { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description || product.name,
      url: `https://www.africlaymarket.com/product/${product.slug}`, ...(product.images[0] ? { image: product.images[0] } : {}),
      ...(product.reviewCount > 0 && product.rating >= 1 && product.rating <= 5
        ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
      offers: { '@type': 'Offer', price: product.price, priceCurrency: product.currency, availability: product.priceOptions?.length
        ? product.priceOptions.some(option => option.stockQuantity > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
        : product.availableQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } } : undefined });
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
  const soldOut = Boolean(product?.priceOptions?.length
    ? product.priceOptions.every(option => option.stockQuantity === 0)
    : product?.availableQuantity === 0);

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
      navigation.navigate('Checkout', { buyNowProductId: product.id, buyNowProductSlug: product.slug, buyNowQuantity: 1, buyNowOptionId: chosenOption?.id });
    }
  };

  if (productQuery.isError) return <ErrorState message="Unable to load this product." onRetry={() => void productQuery.refetch()} />;
  if (isLoading) return <PageSkeleton variant="detail" />;
  if (!product) return <NotFoundScreen title="Product not found" message="This product may have been removed or its link has changed." />;

  const fullDescription = product.description.trim();
  const preview = descriptionPreview(fullDescription, DESCRIPTION_PREVIEW_LENGTH);
  const intro = descriptionPreview(fullDescription, INTRO_LENGTH);
  const hasMoreDescription = fullDescription.replace(/\s+/g, ' ').trim().length > DESCRIPTION_PREVIEW_LENGTH;
  const showDetails = () => detailScrollRef.current?.scrollTo({ y: Math.max(0, detailsTop.current - theme.spacing.lg), animated: !reducedMotion });
  const showReviews = () => detailScrollRef.current?.scrollTo({ y: detailsTop.current + reviewsTop.current - theme.spacing.lg, animated: !reducedMotion });
  const showDeliveryPolicy = () => navigation.getParent()?.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Policies', { policyId: 'shipping-and-delivery', audience: 'buyer' });

  const actions = <View onLayout={event => setActionHeight(event.nativeEvent.layout.height)} style={[styles.actions, sideBySide && styles.desktopActions]}>
    {canBuy ? <View style={styles.buttonRow}>
      <Button style={styles.actionButton} variant="secondary" icon={<ShoppingCart color={theme.colors.primary.DEFAULT} size={20} />} onPress={() => void handleAddToCart()} disabled={cart.mutating || needsChoice || soldOut} loading={pendingAction === 'cart'} loadingLabel="Adding">Add to cart</Button>
      <Button style={styles.actionButton} onPress={buyNow} disabled={needsChoice || soldOut}>Buy now</Button>
    </View> : <Text style={styles.buyerOnly}>Switch to a buyer-enabled account to purchase products.</Text>}
  </View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={detailScrollRef} contentContainerStyle={[styles.content, isWide && styles.wideContent, { paddingBottom: sideBySide ? theme.spacing.xl : actionHeight + theme.spacing.xl }]}>
        <View style={[styles.hero, sideBySide && styles.heroWide]}>
          <View style={[styles.galleryColumn, sideBySide && styles.galleryColumnWide]}>
            <ProductGallery key={product.id} images={product.images} name={product.name} />
          </View>
          <View style={[styles.summaryColumn, sideBySide && styles.summaryColumnWide]}>
            {product.category && product.category !== 'Uncategorized' && <Text style={styles.category}>{product.category}</Text>}
            <View style={styles.nameRow}>
              <Text style={[styles.name, isWide && styles.nameWide]}>{product.name}</Text>
              <WishlistToggle productId={product.id} onGuest={() => setAuthSheetVisible(true)} />
            </View>
            {product.reviewCount > 0 && <Pressable onPress={showReviews} accessibilityRole="button" accessibilityLabel={`Read ${product.reviewCount} product reviews`} style={styles.reviewJump}>
              <RatingBadge rating={product.rating} reviewCount={product.reviewCount} />
              <ArrowRight size={16} color={theme.colors.primary.dark} />
            </Pressable>}
            <Text style={styles.price}>{chosenOption ? formatCurrency(chosenOption.price, product.currency) : `${product.priceOptions?.length ? 'From ' : ''}${formatCurrency(product.price, product.currency)}`}{priceUnitSuffix(product.priceUnit)}</Text>
            {soldOut && <Text style={styles.soldOut}>Sold out</Text>}
            {fullDescription ? <View style={styles.introBlock}>
              <Text style={styles.intro} numberOfLines={3}>{intro}</Text>
              {fullDescription.length > INTRO_LENGTH && <Pressable onPress={showDetails} accessibilityRole="button" accessibilityLabel="Read product details" style={styles.detailJump}>
                <Text style={styles.detailJumpText}>Product details</Text><ArrowRight size={16} color={theme.colors.primary.dark} />
              </Pressable>}
            </View> : null}
            {Boolean(product.priceOptions?.length) && <View style={styles.choices}>
              <Text style={styles.choiceHeading}>Choose an option</Text>
              <View style={styles.choiceGrid}>{product.priceOptions?.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected: selectedOptionId === option.id, disabled: option.stockQuantity === 0 }} disabled={option.stockQuantity === 0} onPress={() => { setSelectedOptionId(option.id); setCartError(undefined); }} style={[styles.choice, selectedOptionId === option.id && styles.choiceSelected, option.stockQuantity === 0 && styles.choiceUnavailable]}>
                <Text style={styles.choiceText}>{option.label}</Text>
                <Text style={styles.choiceStock}>{option.stockQuantity ? formatCurrency(option.price, product.currency) : 'Sold out'}</Text>
              </Pressable>)}</View>
            </View>}
            {sellerQuery.isError ? <ErrorState message="Unable to load seller details." onRetry={() => void sellerQuery.refetch()} /> : <Pressable disabled={!seller} accessibilityState={{ disabled: !seller }} style={styles.infoRow} onPress={() => seller && navigation.navigate('SellerStore', { sellerId: seller.id })} accessibilityRole="button" accessibilityLabel={seller ? `View ${seller.name} store` : undefined}>
              <View style={styles.infoText}><Text style={styles.infoLabel}>Sold by</Text><Text style={styles.infoValue}>{seller?.name ?? (sellerQuery.isLoading ? 'Loading seller…' : 'Seller unavailable')}</Text></View>
              {seller && <ArrowRight size={20} color={theme.colors.primary.dark} />}
            </Pressable>}
            <View style={styles.infoRow}>
              <View style={styles.infoText}>
                <Text style={styles.infoValue}>Delivery & collection</Text>
                <Text style={styles.infoSubtext}>Pickup or doorstep. Fee shown at checkout.</Text>
                <Pressable onPress={showDeliveryPolicy} accessibilityRole="link" style={styles.policyLink}>
                  <Text style={styles.policyLinkText}>Delivery policy</Text><ArrowRight size={15} color={theme.colors.primary.dark} />
                </Pressable>
              </View>
            </View>
            {cartError && <Text style={styles.cartError} accessibilityRole="alert">{cartError}</Text>}
            {sideBySide && actions}
          </View>
        </View>
        <View style={styles.details} onLayout={event => { detailsTop.current = event.nativeEvent.layout.y; }}>
          {fullDescription ? <View style={[styles.descriptionSection, sideBySide && styles.descriptionWide]}>
            <View style={styles.descriptionHeading}><Text style={styles.detailsTitle}>Product details</Text></View>
            <View style={styles.descriptionBody}>
              <Text style={styles.description}>{descriptionExpanded || !hasMoreDescription ? fullDescription : preview}</Text>
              {hasMoreDescription && <Pressable style={styles.descriptionToggle} onPress={() => setDescriptionExpanded(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: descriptionExpanded }} accessibilityLabel={descriptionExpanded ? 'Show less product description' : 'Read full product description'}>
                <Text style={styles.descriptionToggleText}>{descriptionExpanded ? 'Show less' : 'Read full details'}</Text>
                {descriptionExpanded ? <ChevronUp size={18} color={theme.colors.primary.dark} /> : <ChevronDown size={18} color={theme.colors.primary.dark} />}
              </Pressable>}
            </View>
          </View> : null}
          {product.deliveryEstimate.trim() ? <Text style={styles.meta}>Delivery estimate: {product.deliveryEstimate}</Text> : null}
          <View onLayout={event => { reviewsTop.current = event.nativeEvent.layout.y; }}><ReviewSection target={{ type: 'product', id: product.id }} /></View>
        </View>
      </ScrollView>
      {!sideBySide && actions}
      {isFocused && <CartToast key={product.id} event={cartEvent} bottom={!sideBySide ? actionHeight + theme.spacing.sm : theme.spacing.md} />}
      <GuestAuthSheet visible={authSheetVisible} onClose={() => setAuthSheetVisible(false)} description="Log in or create an account to save this product to your wishlist." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg },
  wideContent: { paddingHorizontal: theme.spacing.xl },
  hero: { width: '100%' },
  heroWide: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xl },
  galleryColumn: { minWidth: 0, width: '100%', maxWidth: 560, alignSelf: 'center' },
  galleryColumnWide: { flex: 1 },
  summaryColumn: { minWidth: 0 },
  summaryColumnWide: { flex: 1, paddingTop: theme.spacing.xs },
  category: { color: theme.colors.primary.dark, fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: theme.spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  name: { flex: 1, color: theme.colors.ink, fontSize: 28, lineHeight: 35, fontWeight: '800' },
  nameWide: { fontSize: 36, lineHeight: 43 },
  reviewJump: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 36, marginBottom: theme.spacing.xs },
  price: { color: theme.colors.secondary.dark, fontSize: 32, lineHeight: 40, fontWeight: '800', marginBottom: theme.spacing.md },
  soldOut: { color: theme.colors.error, fontSize: 14, fontWeight: '700', marginBottom: theme.spacing.md },
  introBlock: { marginBottom: theme.spacing.md },
  intro: { color: '#414141', fontSize: 15, lineHeight: 23, maxWidth: 500 },
  detailJump: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 44 },
  detailJumpText: { color: theme.colors.primary.dark, fontSize: 14, fontWeight: '700' },
  choices: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  choiceHeading: { color: theme.colors.ink, fontSize: 14, fontWeight: '700' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  choice: { minWidth: 128, minHeight: 64, padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.white, justifyContent: 'center' },
  choiceSelected: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  choiceUnavailable: { opacity: 0.5 },
  choiceText: { color: theme.colors.ink, fontSize: 14, fontWeight: '700' },
  choiceStock: { color: theme.colors.muted, fontSize: 13, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 68, paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  infoText: { flex: 1, minWidth: 0 },
  infoLabel: { color: theme.colors.muted, fontSize: 12, marginBottom: 2 },
  infoValue: { color: theme.colors.ink, fontSize: 15, fontWeight: '700' },
  infoSubtext: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  policyLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 36 },
  policyLinkText: { color: theme.colors.primary.dark, fontSize: 13, fontWeight: '700' },
  cartError: { color: theme.colors.error, marginTop: theme.spacing.sm },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: theme.spacing.lg, backgroundColor: theme.colors.white, borderTopWidth: 1, borderTopColor: theme.colors.border },
  desktopActions: { position: 'relative', padding: 0, borderTopWidth: 0, backgroundColor: 'transparent', marginTop: theme.spacing.lg },
  buttonRow: { flexDirection: 'row', gap: theme.spacing.sm },
  actionButton: { flex: 1 },
  buyerOnly: { color: theme.colors.muted, textAlign: 'center' },
  details: { width: '100%', maxWidth: 1200, alignSelf: 'center', marginTop: theme.spacing.xl, borderTopWidth: 1, borderTopColor: theme.colors.border },
  descriptionSection: { paddingVertical: theme.spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  descriptionWide: { flexDirection: 'row', gap: theme.spacing.xl },
  descriptionHeading: { minWidth: 0, width: 220, marginBottom: theme.spacing.md },
  detailsTitle: { color: theme.colors.ink, fontSize: 24, lineHeight: 31, fontWeight: '800' },
  descriptionBody: { flex: 1, minWidth: 0, maxWidth: 760 },
  description: { color: '#333333', fontSize: 16, lineHeight: 27 },
  descriptionToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 44, marginTop: theme.spacing.sm },
  descriptionToggleText: { color: theme.colors.primary.dark, fontSize: 14, fontWeight: '700' },
  meta: { color: theme.colors.muted, marginTop: theme.spacing.md },
});
