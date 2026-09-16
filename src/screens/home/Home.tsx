import React, { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeNavigationProp, NavigationProp, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Bell, Menu, Search } from 'lucide-react-native';
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

type HomeNavigation = CompositeNavigationProp<
  NavigationProp<HomeStackParamList, 'HomeFeed'>,
  NavigationProp<RootStackParamList>
>;

export const Home: React.FC = () => {
  const { isCompact, isExpanded, isWeb, productColumns } = useResponsiveLayout();
  const navigation = useNavigation<HomeNavigation>();
  const { open: openSideMenu } = useSideMenu();
  const reduceMotion = useReducedMotionSafe();
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({ queryKey: ['categories'], queryFn: productService.fetchCategories });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: productService.fetchProducts });
  const { data: products = [], isLoading: productsLoading } = productsQuery;
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: productService.fetchServices });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: productService.fetchSellers });
  const featured = useMemo(() => products.slice(0, 4), [products]);
  const recommendedServices = useMemo(() => services.filter(service => service.id === 'svc-web-design' || service.id === 'svc-house-cleaning'), [services]);

  const openCategory = (categoryId: string) => {
    if (categoryId === 'services') navigation.navigate('Services');
    else navigation.navigate('ProductListing', categoryId === 'more' ? undefined : { categoryId });
  };

  const openSearch = () => navigation.getParent()?.navigate('Search');

  if (productsQuery.isError) return <ErrorState message="Unable to load the catalog." onRetry={() => void productsQuery.refetch()} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isCompact && <View style={styles.topArea}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={openSideMenu} style={styles.iconButton}><Menu color={theme.colors.ink} size={23} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
            <Bell color={theme.colors.ink} size={22} />

          </Pressable>
        </View>
        <Pressable style={styles.searchBar} onPress={openSearch} accessibilityRole="button" accessibilityLabel="Search products and services">
          <Text style={styles.searchPlaceholder}>Search for products, servicesâ€¦</Text>
          <View style={styles.searchAction}><Search color={theme.colors.white} size={20} strokeWidth={1.8} /></View>
        </Pressable>
      </View>}

      <ScrollView contentContainerStyle={[styles.content, isExpanded && { maxWidth: 1440 }]} showsVerticalScrollIndicator={false}>
        <PromotionalCarousel products={featured} loading={productsLoading} onProductPress={productId => navigation.navigate('ProductDetails', { productId })} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore categories</Text>
          <Text accessibilityRole="button" style={styles.seeAll} onPress={() => navigation.navigate('ProductListing')}>See all</Text>
        </View>
        <MotiView
          from={reduceMotion ? undefined : { opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : 350, delay: reduceMotion ? 0 : 90 }}
          style={styles.categoryGrid}
        >
          {categoriesLoading
            ? Array.from({ length: 8 }).map((_, index) => <View key={index} style={styles.categorySkeleton} />)
            : categories.map(category => (
              <CategoryCard key={category.id} label={category.label} icon={category.icon} imageUri={products.find(product => product.category === category.label)?.images[0] ?? (category.id === 'services' ? services[0]?.images[0] : undefined)} onPress={() => openCategory(category.id)} />
            ))}
        </MotiView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Picked for your everyday</Text>
          <Text accessibilityRole="button" style={styles.seeAll} onPress={() => navigation.navigate('ProductListing')}>See all</Text>
        </View>
        {productsLoading ? <View style={styles.productSkeleton} /> : isExpanded ? (
          <View style={styles.desktopGrid}>{products.slice(0, 12).map(product => <View key={product.id} style={{ width: `${100 / productColumns}%`, padding: theme.spacing.sm }}>
            <ProductCard marketplace layout="grid" product={product} onPress={() => navigation.navigate('ProductDetails', { productId: product.id })} />
          </View>)}</View>
        ) : (
          <FlatList
            data={featured}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ProductCard marketplace product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />}
            contentContainerStyle={styles.horizontalList}
          />
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services for you</Text>
          <Text accessibilityRole="button" style={styles.seeAll} onPress={() => navigation.navigate('Services')}>See all</Text>
        </View>
        {isExpanded ? <View style={styles.desktopGrid}>{recommendedServices.map(service => <ServiceCard key={service.id} marketplace service={service} onPress={() => navigation.navigate('ServiceDetails', { serviceId: service.id })} />)}</View> : <FlatList
          data={recommendedServices}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ServiceCard marketplace service={item} onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })} />}
          contentContainerStyle={styles.horizontalList}
        />}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meet the sellers</Text>
        </View>
        <View style={isExpanded && styles.desktopGrid}>{sellers.map(seller => <View key={seller.id} style={[styles.sellerSpacing, isExpanded && { width: '50%', padding: theme.spacing.sm }]}><SellerCard marketplace seller={seller} onPress={() => navigation.navigate('SellerStore', { sellerId: seller.id })} /></View>)}</View>

        {!isWeb && <View style={styles.sellBanner}>
          <Text style={styles.sellTitle}>Sell on AfriClay</Text>
          <Text style={styles.sellText}>Bring your products and services to the AfriClay community.</Text>
          <Pressable style={[styles.sellCta, isExpanded && styles.desktopSellCta]} accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Sell')}>
            <Text style={styles.sellCtaText}>Start Selling</Text>
          </Pressable>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  desktopSellBanner: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: theme.spacing.md, marginTop: theme.spacing.md },
  desktopSellCta: { alignSelf: 'flex-start', paddingHorizontal: theme.spacing.lg },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.lg },
  searchAction: { width: 44, height: 44, borderRadius: theme.radii.sm, backgroundColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  sellerSpacing: { marginBottom: theme.spacing.sm },
  container: { flex: 1, backgroundColor: theme.colors.cream },
  topArea: { backgroundColor: theme.colors.white, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topRow: { paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  brandMark: { width: 36, height: 40, borderRadius: theme.radii.md, borderTopRightRadius: theme.radii.sm, backgroundColor: theme.colors.primary.dark, alignItems: 'center', justifyContent: 'center' },
  monogram: { ...theme.typography.marketplace.brand, color: theme.colors.white },
  brandSeed: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.secondary.DEFAULT, top: 5, right: 5 },
  brandAccent: { color: theme.colors.primary.DEFAULT },
  brandCaption: { ...theme.typography.marketplace.eyebrow, fontSize: 8, lineHeight: 12, letterSpacing: 1, color: theme.colors.muted },
  brand: { color: theme.colors.primary.dark, ...theme.typography.marketplace.brand },
  searchBar: { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.sm, minHeight: 48, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.cream, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center' },
  searchPlaceholder: { ...theme.typography.marketplace.body, flex: 1, color: theme.colors.muted, marginHorizontal: theme.spacing.sm },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { flex: 1, color: theme.colors.ink, ...theme.typography.marketplace.heading },
  seeAll: { color: theme.colors.primary.DEFAULT, ...theme.typography.marketplace.label, paddingVertical: theme.spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.spacing.sm, marginBottom: theme.spacing.md },
  categorySkeleton: { width: '22%', height: 96, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border },
  horizontalList: { paddingBottom: theme.spacing.xl },
  productSkeleton: { width: 180, height: 230, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border, marginBottom: theme.spacing.xl },
  sellBanner: { marginTop: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radii.lg, backgroundColor: theme.colors.secondary.tint, borderWidth: 1, borderColor: theme.colors.secondary.DEFAULT },
  sellTitle: { color: theme.colors.ink, ...theme.typography.marketplace.heading },
  sellText: { color: theme.colors.muted, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md },
  sellCta: { minHeight: 44, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  sellCtaText: { color: theme.colors.white, fontFamily: 'Inter_600SemiBold' },
});
