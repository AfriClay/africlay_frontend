import React, { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, Menu, Mic, Search, ShieldCheck, Truck } from 'lucide-react-native';
import { MotiView } from 'moti';
import { CategoryCard } from '../../components/domain/CategoryCard';
import { ProductCard } from '../../components/domain/ProductCard';
import { SellerCard } from '../../components/domain/SellerCard';
import { ServiceCard } from '../../components/domain/ServiceCard';
import { MiniCartBar } from '../../components/ui/MiniCartBar';
import { useCart } from '../../hooks/useCart';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { useSideMenu } from '../../contexts/SideMenuContext';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { productService } from '../../services/productService';
import { theme } from '../../theme';

type HomeNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const Home: React.FC = () => {
  const navigation = useNavigation<HomeNavigation>();
  const { open: openSideMenu } = useSideMenu();
  const reduceMotion = useReducedMotionSafe();
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({ queryKey: ['categories'], queryFn: productService.fetchCategories });
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['products'], queryFn: productService.fetchProducts });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: productService.fetchServices });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: productService.fetchSellers });
  const cart = useCart();
  const featured = useMemo(() => products.slice(0, 4), [products]);
  const recommendedServices = useMemo(() => services.filter(service => service.id === 'svc-web-design' || service.id === 'svc-house-cleaning'), [services]);

  const openCategory = (categoryId: string) => {
    if (categoryId === 'services') navigation.navigate('Services');
    else navigation.navigate('ProductListing', { categoryId });
  };

  const openSearch = () => navigation.getParent()?.navigate('Search');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topArea}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={openSideMenu} style={styles.iconButton}><Menu color={theme.colors.ink} size={23} /></Pressable>
          <Text style={styles.brand}>AfriClay</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
            <Bell color={theme.colors.ink} size={22} />
            <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
          </Pressable>
        </View>
        <Pressable style={styles.searchBar} onPress={openSearch} accessibilityRole="search">
          <Search color={theme.colors.muted} size={18} />
          <Text style={styles.searchPlaceholder}>Search for products, services…</Text>
          <Mic color={theme.colors.primary.DEFAULT} size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MotiView
          from={reduceMotion ? undefined : { opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : 350 }}
          style={styles.hero}
        >
          <View style={styles.heroOrbLarge} />
          <View style={styles.heroOrbSmall} />
          <Text style={styles.heroEyebrow}>EVERYTHING AFRICA, IN ONE PLACE</Text>
          <Text style={styles.heroTitle}>Support Local.{`\n`}Buy African.{`\n`}Grow Africa.</Text>
          <Pressable onPress={() => navigation.navigate('ProductListing')} style={styles.heroButton} accessibilityRole="button">
            <Text style={styles.heroButtonText}>Shop Now</Text>
            <ChevronRight color={theme.colors.ink} size={17} />
          </Pressable>
        </MotiView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <Text style={styles.seeAll} onPress={() => navigation.navigate('ProductListing')}>See all</Text>
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
              <CategoryCard key={category.id} label={category.label} icon={category.icon} onPress={() => openCategory(category.id)} />
            ))}
        </MotiView>

        <View style={styles.trustBar}>
          <View style={styles.trustItem}><ShieldCheck color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.trustText}>Verified sellers</Text></View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}><Truck color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.trustText}>Fast delivery</Text></View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}><ShieldCheck color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.trustText}>Secure pay</Text></View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <Text style={styles.seeAll} onPress={() => navigation.navigate('ProductListing')}>See all</Text>
        </View>
        {productsLoading ? <View style={styles.productSkeleton} /> : (
          <FlatList
            data={featured}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />}
            contentContainerStyle={styles.horizontalList}
          />
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services for you</Text>
          <Text style={styles.seeAll} onPress={() => navigation.navigate('Services')}>See all</Text>
        </View>
        <FlatList
          data={recommendedServices}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ServiceCard service={item} onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })} />}
          contentContainerStyle={styles.horizontalList}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Verified Sellers</Text>
        </View>
        {sellers.map(seller => <SellerCard key={seller.id} seller={seller} onPress={() => navigation.navigate('SellerStore', { sellerId: seller.id })} />)}

        <View style={styles.sellBanner}>
          <Text style={styles.sellTitle}>Sell on AfriClay</Text>
          <Text style={styles.sellText}>Grow your business. Reach more buyers. It&apos;s easy and free!</Text>
          <Pressable style={styles.sellCta} accessibilityRole="button" onPress={() => (navigation.getParent() as any)?.navigate('Sell')}>
            <Text style={styles.sellCtaText}>Start Selling</Text>
          </Pressable>
        </View>
      </ScrollView>
      {cart.itemCount > 0 ? <MiniCartBar count={cart.itemCount} subtotal={cart.subtotal} onPress={() => navigation.navigate('Cart')} /> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  topArea: { backgroundColor: theme.colors.white, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topRow: { paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  brand: { color: theme.colors.primary.dark, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  badge: { position: 'absolute', top: 3, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.error },
  badgeText: { color: theme.colors.white, fontSize: 10, fontWeight: '800' },
  searchBar: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm, minHeight: 46, borderRadius: theme.radii.lg, backgroundColor: theme.colors.cream, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center' },
  searchPlaceholder: { flex: 1, color: theme.colors.muted, marginHorizontal: theme.spacing.sm },
  content: { padding: theme.spacing.lg, paddingBottom: 120 },
  hero: { minHeight: 222, backgroundColor: theme.colors.primary.dark, borderRadius: theme.radii.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.xl, overflow: 'hidden' },
  heroOrbLarge: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: theme.colors.primary.DEFAULT, right: -75, bottom: -65, opacity: 0.75 },
  heroOrbSmall: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: theme.colors.secondary.DEFAULT, right: 24, top: 26, opacity: 0.92 },
  heroEyebrow: { color: theme.colors.secondary.DEFAULT, fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginBottom: theme.spacing.sm },
  heroTitle: { color: theme.colors.white, fontSize: 27, lineHeight: 33, fontWeight: '800', maxWidth: '70%' },
  heroButton: { marginTop: theme.spacing.lg, alignSelf: 'flex-start', minHeight: 42, borderRadius: theme.radii.sm, backgroundColor: theme.colors.secondary.DEFAULT, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center' },
  heroButtonText: { color: theme.colors.ink, fontWeight: '800', marginRight: theme.spacing.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  seeAll: { color: theme.colors.primary.DEFAULT, fontWeight: '700', paddingVertical: theme.spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.spacing.md, marginBottom: theme.spacing.xl },
  categorySkeleton: { width: '22%', height: 96, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border },
  trustBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary.tint, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginBottom: theme.spacing.xl },
  trustItem: { flex: 1, alignItems: 'center' },
  trustText: { color: theme.colors.primary.dark, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  trustDivider: { width: 1, height: 34, backgroundColor: theme.colors.border },
  horizontalList: { paddingBottom: theme.spacing.xl },
  productSkeleton: { width: 180, height: 230, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border, marginBottom: theme.spacing.xl },
  sellBanner: { marginTop: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radii.lg, backgroundColor: theme.colors.secondary.tint, borderWidth: 1, borderColor: theme.colors.secondary.DEFAULT },
  sellTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  sellText: { color: theme.colors.muted, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md },
  sellCta: { minHeight: 44, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  sellCtaText: { color: theme.colors.white, fontWeight: '800' },
});
