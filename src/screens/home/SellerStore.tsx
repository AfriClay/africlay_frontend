import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { productService } from '../../services/productService';
import { Seller } from '../../types/seller';
import { Product } from '../../types/product';
import { theme } from '../../theme';
import { RatingBadge } from '../../components/ui/RatingBadge';
import { ProductCard } from '../../components/domain/ProductCard';
import { ReviewCard } from '../../components/domain/ReviewCard';
import { reviewService } from '../../services/reviewService';
import { ServiceCard } from '../../components/domain/ServiceCard';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { Image } from 'expo-image';
import { BadgeCheck, MapPin } from 'lucide-react-native';

const tabs = ['Shop', 'Services', 'About', 'Reviews'] as const;

export const SellerStore: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'SellerStore'>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'SellerStore'>>();
  const { sellerId } = route.params;
  const [activeTab, setActiveTab] = useState<'Shop' | 'Services' | 'About' | 'Reviews'>('Shop');
  const { data: seller, isLoading: sellerLoading } = useQuery<Seller | undefined>({ queryKey: ['seller', sellerId], queryFn: () => productService.fetchSeller(sellerId) });
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({ queryKey: ['sellerProducts', sellerId], queryFn: () => productService.fetchProductsBySeller(sellerId), enabled: Boolean(sellerId) });
  const { data: services = [], isLoading: servicesLoading } = useQuery({ queryKey: ['sellerServices', sellerId], queryFn: () => productService.fetchServicesBySeller(sellerId), enabled: Boolean(sellerId) });
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({ queryKey: ['reviews'], queryFn: () => reviewService.fetchReviews() });

  if (sellerLoading) {
    return <View style={styles.loading}><Text>Loading seller...</Text></View>;
  }

  if (!seller) {
    return <View style={styles.loading}><Text>Seller not found</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {seller.bannerUrl ? <Image source={{ uri: seller.bannerUrl }} style={styles.banner} contentFit="cover" /> : null}
      <View style={styles.header}>
        <View style={styles.storeIdentity}><View style={styles.logo}><Text style={styles.logoText}>ZURI</Text></View><View style={styles.storeCopy}><Text style={styles.name}>{seller.name}</Text><View style={styles.metaRow}><MapPin color={theme.colors.muted} size={14} /><Text style={styles.meta}>{seller.location}</Text></View></View><Pressable style={styles.followButton} accessibilityRole="button"><Text style={styles.followText}>Follow</Text></Pressable></View>
        <View style={styles.badgeRow}>
          <RatingBadge rating={seller.rating} reviewCount={seller.reviewCount} />
          {seller.verified ? <View style={styles.verifiedRow}><BadgeCheck color={theme.colors.success} size={16} /><Text style={styles.verified}>Verified Seller</Text></View> : null}
        </View>
      </View>
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabItem, activeTab === tab ? styles.tabActive : null]} accessibilityRole="button" accessibilityLabel={tab}>
            <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
      {activeTab === 'Shop' ? (
        productsLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.productSkeleton} />
            ))}
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={item => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <ProductCard layout="grid" product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />
              </View>
            )}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.column}
          />
        )
      ) : activeTab === 'Services' ? (
        servicesLoading ? <View style={styles.list}><View style={styles.serviceSkeleton} /></View> : (
          <FlatList
            data={services}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ServiceCard service={item} onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })} />}
            contentContainerStyle={styles.list}
          />
        )
      ) : activeTab === 'About' ? (
        <View style={styles.content}><Text style={styles.description}>{seller.bio}</Text></View>
      ) : (
        reviewsLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.reviewSkeleton} />
            ))}
          </View>
        ) : (
          <FlatList data={reviews} keyExtractor={item => item.id} renderItem={({ item }) => <ReviewCard review={item} />} contentContainerStyle={styles.list} />
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: theme.spacing.lg,
  },
  banner: { width: '100%', height: 150 },
  storeIdentity: { flexDirection: 'row', alignItems: 'center' },
  storeCopy: { flex: 1, marginLeft: theme.spacing.sm },
  logo: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.ink, borderWidth: 3, borderColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', marginTop: -34 },
  logoText: { color: theme.colors.white, fontSize: 11, fontWeight: '800' },
  followButton: { minHeight: 40, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  followText: { color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  meta: {
    color: theme.colors.muted,
    marginLeft: theme.spacing.xs,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  verifiedRow: { flexDirection: 'row', alignItems: 'center' },
  verified: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.success,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  tabTextActive: {
    color: theme.colors.ink,
  },
  content: {
    padding: theme.spacing.lg,
  },
  description: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
  },
  list: {
    padding: theme.spacing.lg,
  },
  column: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
    marginBottom: theme.spacing.md,
  },
  serviceSkeleton: {
    height: 210,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.border,
  },
  productSkeleton: { width: '48%', height: 260, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md },
  reviewSkeleton: { height: 88, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md },
});
