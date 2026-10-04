import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { CompositeNavigationProp, NavigationProp, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Bell, Plus, Search as SearchIcon, ShoppingCart } from 'lucide-react-native';
import { MotiView } from 'moti';
import { PromotionalCarousel } from '../../components/domain/PromotionalCarousel';
import { CategoryCard } from '../../components/domain/CategoryCard';
import { ProductCard } from '../../components/domain/ProductCard';
import { SellerCard } from '../../components/domain/SellerCard';
import { ServiceCard } from '../../components/domain/ServiceCard';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { ErrorState } from '../../components/ui/ErrorState';
import { catalogKeys } from '../../services/catalogQueries';
import { useAuth } from '../../hooks/useAuth';
import { canAccessSellerTools } from '../../utils/roles';
import { categoryBranchIds, rootCategories } from '../../utils/categoryTree';
import { useCart } from '../../hooks/useCart';
import { notificationKeys, notificationService } from '../../services/notificationService';
import { Button } from '../../components/ui/Button';
import { Search } from '../search/Search';

type HomeNavigation = CompositeNavigationProp<
  NavigationProp<HomeStackParamList, 'HomeFeed'>,
  NavigationProp<RootStackParamList>
>;

const CountBadge = ({ count }: { count: number }) => count > 0 ? (
  <View style={styles.countBadge}><Text style={styles.countBadgeText}>{count > 99 ? '99+' : count}</Text></View>
) : null;

export const Home: React.FC = () => {
  const { isCompact, isExpanded, isWeb, productColumns } = useResponsiveLayout();
  const navigation = useNavigation<HomeNavigation>();
  const { user } = useAuth();
  const cart = useCart();
  const canSell = canAccessSellerTools(user?.role);
  const reduceMotion = useReducedMotionSafe();
  const searchProgress = useRef(new Animated.Value(0)).current;
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [searchHostWidth, setSearchHostWidth] = useState(0);
  const categoriesQuery = useQuery({ queryKey: catalogKeys.categories, queryFn: productService.fetchCategories });
  const { data: categories = [], isLoading: categoriesLoading } = categoriesQuery;
  const productsQuery = useQuery({ queryKey: catalogKeys.products, queryFn: () => productService.fetchProducts() });
  const { data: products = [], isLoading: productsLoading } = productsQuery;
  const serviceQuery = useQuery({ queryKey: ['services'], queryFn: productService.fetchServices });
  const { data: services = [] } = serviceQuery;
  const sellersQuery = useQuery({ queryKey: catalogKeys.sellers, queryFn: productService.fetchSellers });
  const { data: sellers = [] } = sellersQuery;
  const featured = useMemo(() => products.slice(0, 4), [products]);
  const recommendedServices = useMemo(() => services.slice(0, 2), [services]);
  const mainCategories = useMemo(() => rootCategories(categories), [categories]);
  const unreadQuery = useQuery({
    queryKey: notificationKeys.unread(user?.id ?? ''),
    queryFn: () => notificationService.list(false),
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const openCategory = (slug: string) => navigation.navigate('ProductListing', { categoryId: slug });

  const openNotifications = () => navigation.getParent<any>()?.navigate('Profile', { screen: 'Notifications' });
  const animateSearch = useCallback((expanded: boolean) => {
    searchProgress.stopAnimation();
    if (expanded) setSearchExpanded(true);
    if (reduceMotion) {
      searchProgress.setValue(expanded ? 1 : 0);
      if (expanded) requestAnimationFrame(() => setFocusRequest(value => value + 1));
      else setSearchExpanded(false);
      return;
    }
    Animated.timing(searchProgress, {
      toValue: expanded ? 1 : 0,
      duration: expanded ? 190 : 150,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (expanded) setFocusRequest(value => value + 1);
      else setSearchExpanded(false);
    });
  }, [reduceMotion, searchProgress]);
  const openSearch = useCallback(() => animateSearch(true), [animateSearch]);
  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    animateSearch(false);
  }, [animateSearch]);
  const openSearchProduct = useCallback((productId: string) => {
    navigation.navigate('ProductDetails', { productId });
    closeSearch();
  }, [closeSearch, navigation]);
  const openSearchSeller = useCallback((sellerId: string) => {
    navigation.navigate('SellerStore', { sellerId });
    closeSearch();
  }, [closeSearch, navigation]);

  useEffect(() => {
    if (isCompact || !searchExpanded) return;
    searchProgress.setValue(0);
    setSearchExpanded(false);
  }, [isCompact, searchExpanded, searchProgress]);

  useEffect(() => {
    if (!searchExpanded) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSearch();
      return true;
    });
    return () => subscription.remove();
  }, [closeSearch, searchExpanded]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !searchExpanded || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeSearch();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [closeSearch, searchExpanded]);

  const collapsedSearchScale = searchHostWidth > 0 ? Math.min(1, 48 / searchHostWidth) : 0.25;
  const searchFieldScale = searchProgress.interpolate({ inputRange: [0, 1], outputRange: [collapsedSearchScale, 1] });
  const searchFieldOffset = searchProgress.interpolate({ inputRange: [0, 1], outputRange: [searchHostWidth * (1 - collapsedSearchScale) / 2, 0] });
  const brandWidth = searchProgress.interpolate({ inputRange: [0, 1], outputRange: [44, 40] });
  const brandOffset = searchProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  if (productsQuery.isError || categoriesQuery.isError || sellersQuery.isError) return <ErrorState message="Unable to load the catalog." onRetry={() => { void productsQuery.refetch(); void categoriesQuery.refetch(); void sellersQuery.refetch(); }} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isCompact && <Animated.View style={styles.topArea}>
        <View style={styles.topRow}>
          <Animated.View style={[styles.mobileBrand, { width: brandWidth, transform: [{ translateX: brandOffset }] }]}>
            <View style={styles.mobileLogoViewport}><Image source={require('../../../assets/africlay-brand-v1.svg')} style={styles.mobileLogo} contentFit="contain" accessibilityLabel="AfriClay" /></View>
          </Animated.View>
          <View style={styles.searchHost} onLayout={event => setSearchHostWidth(event.nativeEvent.layout.width)}>
            <Animated.View
              pointerEvents={searchExpanded ? 'none' : 'auto'}
              accessibilityElementsHidden={searchExpanded}
              importantForAccessibility={searchExpanded ? 'no-hide-descendants' : 'auto'}
              aria-hidden={searchExpanded}
              style={[styles.searchTriggerSlot, { opacity: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
            >
              <Button variant="icon" size="sm" accessibilityLabel="Open search" onPress={openSearch} icon={<SearchIcon color={theme.colors.primary.dark} size={22} />} />
            </Animated.View>
            <Animated.View
              pointerEvents={searchExpanded ? 'auto' : 'none'}
              accessibilityElementsHidden={!searchExpanded}
              importantForAccessibility={searchExpanded ? 'auto' : 'no-hide-descendants'}
              aria-hidden={!searchExpanded}
              style={[styles.inlineSearch, { opacity: searchProgress, transform: [{ translateX: searchFieldOffset }, { scaleX: searchFieldScale }] }]}
            >
              <Search presentation="inline" focusRequest={focusRequest} onDismiss={closeSearch} onOpenProduct={openSearchProduct} onOpenSeller={openSearchSeller} />
            </Animated.View>
          </View>
          <View style={styles.headerActions}>
            {user ? <Button variant="icon" size="sm" accessibilityLabel={`Notifications, ${unreadQuery.data?.length ?? 0} unread`} onPress={() => { closeSearch(); openNotifications(); }} icon={<View><Bell color={theme.colors.primary.dark} size={22} /><CountBadge count={unreadQuery.data?.length ?? 0} /></View>} /> : null}
            <Button variant="icon" size="sm" accessibilityLabel={`Cart, ${cart.itemCount} items`} onPress={() => { closeSearch(); navigation.navigate('Cart'); }} icon={<View><ShoppingCart color={theme.colors.primary.dark} size={23} /><CountBadge count={cart.itemCount} /></View>} />
          </View>
        </View>
      </Animated.View>}

      {isCompact && searchExpanded ? <Pressable accessible={false} onPress={closeSearch} style={styles.searchBackdrop} /> : null}

      <Animated.ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[styles.content, isExpanded && { maxWidth: 1440 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!searchExpanded}
      >
        <PromotionalCarousel products={featured} loading={productsLoading} onProductPress={productId => {
          const product = products.find(item => item.id === productId);
          if (product?.slug) navigation.navigate('ProductDetails', { productId: product.slug });
        }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore categories</Text>
          <Button variant="tertiary" size="sm" onPress={() => navigation.navigate('ProductListing')}>See all</Button>
        </View>
        <MotiView
          from={reduceMotion ? undefined : { opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : 350, delay: reduceMotion ? 0 : 90 }}
          style={isExpanded ? [styles.categoryGrid, styles.desktopCategoryGrid] : styles.categoryRailShell}
        >
          {categoriesLoading
            ? isExpanded
              ? Array.from({ length: 8 }).map((_, index) => <View key={index} style={[styles.categorySkeleton, styles.desktopCategorySkeleton]} />)
              : <View style={styles.categoryRail}>{Array.from({ length: 4 }).map((_, index) => <View key={index} style={styles.categorySkeleton} />)}</View>
            : isExpanded
              ? mainCategories.map(category => (
                <CategoryCard key={category.id} label={category.label} icon={category.icon} imageUri={products.find(product => product.categoryId && categoryBranchIds(categories, category.id).has(product.categoryId))?.images[0]} onPress={() => openCategory(category.slug)} />
              ))
              : <FlatList
                  data={mainCategories}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={category => category.id}
                  renderItem={({ item: category }) => <CategoryCard label={category.label} icon={category.icon} imageUri={products.find(product => product.categoryId && categoryBranchIds(categories, category.id).has(product.categoryId))?.images[0]} onPress={() => openCategory(category.slug)} />}
                  contentContainerStyle={styles.categoryRail}
                />}
        </MotiView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Picked for your everyday</Text>
          <Button variant="tertiary" size="sm" onPress={() => navigation.navigate('ProductListing')}>See all</Button>
        </View>
        {productsLoading ? <View style={styles.productSkeleton} /> : isExpanded ? (
          <View style={styles.desktopGrid}>{products.slice(0, 12).map(product => <View key={product.id} style={{ width: `${100 / productColumns}%`, padding: theme.spacing.sm }}>
            <ProductCard marketplace layout="grid" product={product} onPress={() => product.slug && navigation.navigate('ProductDetails', { productId: product.slug })} />
          </View>)}</View>
        ) : (
          <FlatList
            data={featured}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ProductCard marketplace product={item} onPress={() => item.slug && navigation.navigate('ProductDetails', { productId: item.slug })} />}
            contentContainerStyle={styles.horizontalList}
          />
        )}
        {!productsLoading && products.length === 0 && <Text style={styles.sellText}>No products available yet.</Text>}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services for you</Text>
          <Button variant="tertiary" size="sm" onPress={() => navigation.navigate('Services')}>See all</Button>
        </View>
        {serviceQuery.isError ? <View><Text style={styles.sellText}>Unable to load services.</Text><Button variant="tertiary" size="sm" onPress={() => void serviceQuery.refetch()}>Retry</Button></View> :
        serviceQuery.isLoading ? <Text style={styles.sellText}>Loading services...</Text> :
        recommendedServices.length === 0 ? <Text style={styles.sellText}>No services available yet.</Text> :
        isExpanded ? <View style={styles.desktopGrid}>{recommendedServices.map(service => <ServiceCard key={service.id} marketplace service={service} onPress={() => navigation.navigate('ServiceDetails', { serviceId: service.slug ?? service.id })} />)}</View> : <FlatList
          data={recommendedServices}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ServiceCard marketplace service={item} onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.slug ?? item.id })} />}
          contentContainerStyle={styles.horizontalList}
        />}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meet the sellers</Text>
        </View>
        <View style={isExpanded && styles.desktopGrid}>{sellers.map(seller => <View key={seller.id} style={[styles.sellerSpacing, isExpanded && { width: '50%', padding: theme.spacing.sm }]}><SellerCard marketplace seller={seller} onPress={() => navigation.navigate('SellerStore', { sellerId: seller.id })} /></View>)}</View>

        {!isWeb && canSell && <View style={styles.sellBanner}>
          <Text style={styles.sellTitle}>Sell on AfriClay</Text>
          <Text style={styles.sellText}>Bring your products and services to the AfriClay community.</Text>
          <Button icon={<Plus color={theme.colors.white} size={18} />} style={[styles.sellCta, isExpanded && styles.desktopSellCta]} onPress={() => navigation.getParent()?.navigate('Sell')}>Start Selling</Button>
        </View>}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  desktopSellBanner: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: theme.spacing.md, marginTop: theme.spacing.md },
  desktopSellCta: { alignSelf: 'flex-start', paddingHorizontal: theme.spacing.lg },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.lg },
  sellerSpacing: { marginBottom: theme.spacing.sm },
  container: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: theme.colors.cream },
  topArea: { position: 'relative', zIndex: 30, elevation: 6, flexShrink: 0, overflow: 'visible', backgroundColor: theme.colors.white, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topRow: { minHeight: 56, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  mobileBrand: { minWidth: 0, height: 48, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  mobileLogoViewport: { width: 44, height: 48, overflow: 'hidden', justifyContent: 'center' },
  mobileLogo: { width: 104, height: 69, marginLeft: -4, marginTop: -10, flexShrink: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  searchHost: { flex: 1, minWidth: 0, height: 52, position: 'relative', zIndex: 40 },
  searchTriggerSlot: { position: 'absolute', top: 2, right: 0, width: 48, height: 48 },
  inlineSearch: { position: 'absolute', top: 0, right: 0, left: 0, zIndex: 40 },
  searchBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, backgroundColor: 'transparent' },
  countBadge: { position: 'absolute', top: 2, right: 1, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary.DEFAULT, borderWidth: 2, borderColor: theme.colors.white },
  countBadgeText: { color: theme.colors.white, fontSize: 9, lineHeight: 11, fontWeight: '800' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  brandMark: { width: 36, height: 40, borderRadius: theme.radii.md, borderTopRightRadius: theme.radii.sm, backgroundColor: theme.colors.primary.dark, alignItems: 'center', justifyContent: 'center' },
  monogram: { ...theme.typography.marketplace.brand, color: theme.colors.white },
  brandSeed: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.secondary.DEFAULT, top: 5, right: 5 },
  brandAccent: { color: theme.colors.primary.DEFAULT },
  brandCaption: { ...theme.typography.marketplace.eyebrow, fontSize: 8, lineHeight: 12, letterSpacing: 1, color: theme.colors.muted },
  brand: { color: theme.colors.primary.dark, ...theme.typography.marketplace.brand },
  contentScroll: { flex: 1, minHeight: 0 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { flex: 1, color: theme.colors.ink, ...theme.typography.marketplace.heading },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.spacing.sm, marginBottom: theme.spacing.md },
  desktopCategoryGrid: { justifyContent: 'flex-start', columnGap: theme.spacing.lg, maxWidth: 760 },
  categoryRailShell: { marginHorizontal: -theme.spacing.md, marginBottom: theme.spacing.md },
  categoryRail: { gap: theme.spacing.smd, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm },
  categorySkeleton: { width: 72, height: 94, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border },
  desktopCategorySkeleton: { width: 116, height: 158 },
  horizontalList: { paddingBottom: theme.spacing.xl },
  productSkeleton: { width: 180, height: 230, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border, marginBottom: theme.spacing.xl },
  sellBanner: { marginTop: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radii.lg, backgroundColor: theme.colors.secondary.tint, borderWidth: 1, borderColor: theme.colors.secondary.DEFAULT },
  sellTitle: { color: theme.colors.ink, ...theme.typography.marketplace.heading },
  sellText: { color: theme.colors.muted, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md },
  sellCta: { alignSelf: 'flex-start' },
});
