import React, { useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { productService } from '../../services/productService';
import { Seller } from '../../types/seller';
import { Product } from '../../types/product';
import { theme } from '../../theme';
import { RatingBadge } from '../../components/ui/RatingBadge';
import { ProductCard } from '../../components/domain/ProductCard';
import { ReviewCard } from '../../components/domain/ReviewCard';
import { reviewService } from '../../services/reviewService';

const tabs = ['Shop', 'Services', 'About', 'Reviews'] as const;

export const SellerStore: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sellerId } = route.params;
  const [activeTab, setActiveTab] = useState<'Shop' | 'Services' | 'About' | 'Reviews'>('Shop');
  const { data: seller } = useQuery<Seller | undefined>({ queryKey: ['seller', sellerId], queryFn: () => productService.fetchSeller(sellerId) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['sellerProducts', sellerId], queryFn: () => productService.fetchProductsBySeller(sellerId), enabled: Boolean(sellerId) });
  const { data: reviews = [] } = useQuery({ queryKey: ['reviews'], queryFn: () => reviewService.fetchReviews() });

  if (!seller) {
    return <View style={styles.loading}><Text>Loading seller...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{seller.name}</Text>
        <Text style={styles.meta}>{seller.location}</Text>
        <View style={styles.badgeRow}>
          <RatingBadge rating={seller.rating} reviewCount={seller.reviewCount} />
          <Text style={styles.verified}>{seller.verified ? 'Verified Seller' : ''}</Text>
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
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />
            </View>
          )}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.column}
        />
      ) : activeTab === 'Services' ? (
        <View style={styles.content}><Text style={styles.description}>Service listings will be available soon.</Text></View>
      ) : activeTab === 'About' ? (
        <View style={styles.content}><Text style={styles.description}>{seller.bio}</Text></View>
      ) : (
        <FlatList data={reviews} keyExtractor={item => item.id} renderItem={({ item }) => <ReviewCard review={item} />} contentContainerStyle={styles.list} />
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
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  meta: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  verified: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.secondary.DEFAULT,
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
    marginBottom: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
});
