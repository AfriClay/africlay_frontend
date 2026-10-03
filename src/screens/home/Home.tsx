import React, { useMemo, useRef } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { CompositeNavigationProp, NavigationProp, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Bell, Menu, Plus, Search, ShoppingCart } from 'lucide-react-native';
import { MotiView } from 'moti';
import { PromotionalCarousel } from '../../components/domain/PromotionalCarousel';
import { CategoryCard } from '../../components/domain/CategoryCard';
import { ProductCard } from '../../components/domain/ProductCard';
import { SellerCard } from '../../components/domain/SellerCard';
import { ServiceCard } from '../../components/domain/ServiceCard';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { useSideMenu } from '../../contexts/SideMenuContext';
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
  const { open: openSideMenu } = useSideMenu();
  const reduceMotion = useReducedMotionSafe();
  const scrollY = useRef(new Animated.Value(0)).current;
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

  const openSearch = () => navigation.getParent()?.navigate('Search');
  const openNotifications = () => navigation.getParent<any>()?.navigate('Profile', { screen: 'Notifications' });
  const compactHeaderPadding = reduceMotion ? theme.spacing.md : scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [theme.spacing.md, theme.spacing.sm],
    extrapolate: 'clamp',
  });

  if (productsQuery.isError || categoriesQuery.isError || sellersQuery.isError) return <ErrorState message="Unable to load the catalog." onRetry={() => { void productsQuery.refetch(); void categoriesQuery.refetch(); void sellersQuery.refetch(); }} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isCompact && <Animated.View style={[styles.topArea, { paddingBottom: compactHeaderPadding }]}>
        <View style={styles.topRow}>
          <View style={styles.mobileBrand}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={openSideMenu} style={styles.iconButton}><Menu color={theme.colors.ink} size={23} /></Pressable>
            <Image source={require('../../../assets/africlay-brand-v1.svg')} style={styles.mobileLogo} contentFit="contain" accessibilityLabel="AfriClay" />
          </View>
          <View style={styles.headerActions}>
            {user ? <Pressable accessibilityRole="button" accessibilityLabel={`Notifications, ${unreadQuery.data?.length ?? 0} unread`} onPress={openNotifications} style={styles.iconButton}>
              <Bell color={theme.colors.primary.dark} size={22} /><CountBadge count={unreadQuery.data?.length ?? 0} />
            </Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${cart.itemCount} items`} onPress={() => navigation.navigate('Cart')} style={styles.iconButton}>
              <ShoppingCart color={theme.colors.primary.dark} size={23} /><CountBadge count={cart.itemCount} />
            </Pressable>
          </View>
        </View>
        <Pressable style={styles.searchBar} onPress={openSearch} accessibilityRole="button" accessibilityLabel="Search products and services">
          <Text style={styles.searchPlaceholder}>Search for products, services...</Text>
          <View style={styles.searchAction}><Search color={theme.colors.primary.dark} size={22} strokeWidth={1.8} /></View>
        </Pressable>
      </Animated.View>}

      <Animated.ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[styles.content, isExpanded && { maxWidth: 1440 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={reduceMotion ? undefined : Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        <PromotionalCarousel products={featured} loading={productsLoading} onProductPress={productId => {
          const product = products.find(item => item.id === productId);
          if (product?.slug) navigation.navigate('ProductDetails', { productId: product.slug });
        }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore categories</Text>
          <Text accessibilityRole="button" style={styles.seeAll} onPress={() => navigation.navigate('ProductListing')}>See all</Text>
        </View>
        <MotiView
          from={reduceMotion ? undefined : { opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : 350, delay: reduceMotion ? 0 : 90 }}
          style={[styles.categoryGrid, isExpanded && styles.desktopCategoryGrid]}
        >
          {categoriesLoading
            ? Array.from({ length: 8 }).map((_, index) => <View key={index} style={[styles.categorySkeleton, isExpanded && styles.desktopCategorySkeleton]} />)
            : mainCategories.map(category => (
              <CategoryCard key={category.id} label={category.label} icon={category.icon} imageUri={products.find(product => product.categoryId && categoryBranchIds(categories, category.id).has(product.categoryId))?.images[0]} onPress={() => openCategory(category.slug)} />
            ))}
        </MotiView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Picked for your everyday</Text>
          <Text accessibilityRole="button" style={styles.seeAll} onPress={() => navigation.navigate('ProductListing')}>See all</Text>
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
          <Text accessibilityRole="button" style={styles.seeAll} onPress={() => navigation.navigate('Services')}>See all</Text>
        </View>
        {serviceQuery.isError ? <Pressable onPress={() => void serviceQuery.refetch()} accessibilityRole="button"><Text style={styles.sellText}>Unable to load services. Retry</Text></Pressable> :
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
          <Pressable style={[styles.sellCta, isExpanded && styles.desktopSellCta]} accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Sell')}>
            <Plus color={theme.colors.white} size={18} /><Text style={styles.sellCtaText}>Start Selling</Text>
          </Pressable>
        </View>}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  desktopSellBanner: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: theme.spacing.md, marginTop: theme.spacing.md },
  desktopSellCta: { alignSelf: 'flex-start', paddingHorizontal: theme.spacing.lg },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.lg },
  searchAction: { width: 40, height: 40, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center' },
  sellerSpacing: { marginBottom: theme.spacing.sm },
  container: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: theme.colors.cream },
  topArea: { position: 'relative', zIndex: 20, elevation: 4, flexShrink: 0, backgroundColor: theme.colors.white, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topRow: { minHeight: 56, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mobileBrand: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  mobileLogo: { width: 60, height: 40, flexShrink: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  iconButton: { minWidth: 44, minHeight: 44, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center' },
  countBadge: { position: 'absolute', top: 2, right: 1, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary.DEFAULT, borderWidth: 2, borderColor: theme.colors.white },
  countBadgeText: { color: theme.colors.white, fontSize: 9, lineHeight: 11, fontWeight: '800' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  brandMark: { width: 36, height: 40, borderRadius: theme.radii.md, borderTopRightRadius: theme.radii.sm, backgroundColor: theme.colors.primary.dark, alignItems: 'center', justifyContent: 'center' },
  monogram: { ...theme.typography.marketplace.brand, color: theme.colors.white },
  brandSeed: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.secondary.DEFAULT, top: 5, right: 5 },
  brandAccent: { color: theme.colors.primary.DEFAULT },
  brandCaption: { ...theme.typography.marketplace.eyebrow, fontSize: 8, lineHeight: 12, letterSpacing: 1, color: theme.colors.muted },
  brand: { color: theme.colors.primary.dark, ...theme.typography.marketplace.brand },
  searchBar: { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.xs, minHeight: 50, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.cream, paddingLeft: theme.spacing.md, paddingRight: theme.spacing.xs, flexDirection: 'row', alignItems: 'center' },
  searchPlaceholder: { ...theme.typography.marketplace.body, flex: 1, color: theme.colors.muted, marginHorizontal: theme.spacing.sm },
  contentScroll: { flex: 1, minHeight: 0 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { flex: 1, color: theme.colors.ink, ...theme.typography.marketplace.heading },
  seeAll: { color: theme.colors.primary.DEFAULT, ...theme.typography.marketplace.label, paddingVertical: theme.spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.spacing.sm, marginBottom: theme.spacing.md },
  desktopCategoryGrid: { justifyContent: 'flex-start', columnGap: theme.spacing.lg, maxWidth: 760 },
  categorySkeleton: { width: '22%', height: 96, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border },
  desktopCategorySkeleton: { width: 116, height: 158 },
  horizontalList: { paddingBottom: theme.spacing.xl },
  productSkeleton: { width: 180, height: 230, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border, marginBottom: theme.spacing.xl },
  sellBanner: { marginTop: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radii.lg, backgroundColor: theme.colors.secondary.tint, borderWidth: 1, borderColor: theme.colors.secondary.DEFAULT },
  sellTitle: { color: theme.colors.ink, ...theme.typography.marketplace.heading },
  sellText: { color: theme.colors.muted, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md },
  sellCta: { minHeight: 44, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary.DEFAULT, alignSelf: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.lg },
  sellCtaText: { color: theme.colors.white, fontFamily: 'Inter_600SemiBold' },
});
