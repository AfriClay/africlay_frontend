import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../theme';
import { productService } from '../../services/productService';
import { CategoryCard } from '../../components/domain/CategoryCard';
import { ProductCard } from '../../components/domain/ProductCard';
import { MiniCartBar } from '../../components/ui/MiniCartBar';
import { useCart } from '../../hooks/useCart';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../constants/routes';
import { Bell, Menu, Mic, Search as SearchIcon } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';

export const Home: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({ queryKey: ['categories'], queryFn: () => productService.fetchCategories() });
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['products'], queryFn: () => productService.fetchProducts() });
  const cart = useCart();
  const [search, setSearch] = useState('');

  const featured = useMemo(() => products.slice(0, 4), [products]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={() => {}} style={styles.iconButton}><Menu color={theme.colors.white} size={22} /></Pressable>
        <Text style={styles.brand}>AfriClay</Text>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
          <Bell color={theme.colors.white} size={22} />
          <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
        </Pressable>
      </View>
      <View style={styles.searchBar}>
        <SearchIcon color={theme.colors.muted} size={18} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search AfriClay" placeholderTextColor={theme.colors.muted} style={styles.searchInput} accessibilityLabel="Search" />
        <Pressable accessibilityRole="button" onPress={() => {}}><Mic color={theme.colors.primary.DEFAULT} size={20} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Support Local. Buy African. Grow Africa.</Text>
          <Text style={styles.heroSubtitle}>Explore verified sellers, trusted payments, and authentic goods across the continent.</Text>
          <Pressable onPress={() => navigation.navigate('ProductListing')} style={styles.heroButton} accessibilityRole="button"><Text style={styles.heroButtonText}>Shop Now</Text></Pressable>
        </View>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <View style={styles.categoryGrid}>
          {categoriesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ width: '30%', marginBottom: theme.spacing.md, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, height: 80 }} />
            ))
          ) : (
            categories.map(category => (
              <CategoryCard key={category.id} label={category.label} icon={category.icon} onPress={() => navigation.navigate('ProductListing', { categoryId: category.id })} />
            ))
          )}
        </View>

        <View style={styles.featuredHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.ProductListing)}>See all</Text>
        </View>
        {productsLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ width: 180, height: 220, marginRight: theme.spacing.md, backgroundColor: theme.colors.border, borderRadius: theme.radii.md }} />
            ))}
          </ScrollView>
        ) : (
          <FlatList data={featured} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => item.id} renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />} contentContainerStyle={styles.featuredList} />
        )}
      </ScrollView>
      {cart.itemCount > 0 ? <MiniCartBar count={cart.itemCount} subtotal={cart.subtotal} onPress={() => navigation.navigate('Cart')} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  topRow: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingTop: 52,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: theme.spacing.sm,
  },
  brand: {
    color: theme.colors.white,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.secondary.DEFAULT,
    borderRadius: theme.radii.pill,
    minWidth: 20,
    paddingHorizontal: theme.spacing.xs,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: theme.colors.ink,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '700',
  },
  searchBar: {
    marginHorizontal: theme.spacing.lg,
    marginTop: -24,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
    minHeight: 36,
  },
  content: {
    padding: theme.spacing.lg,
  },
  hero: {
    backgroundColor: theme.colors.primary.tint,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  heroTitle: {
    color: theme.colors.primary.dark,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  heroSubtitle: {
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
  },
  heroButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  heroButtonText: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  link: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  featuredList: {
    paddingBottom: theme.spacing.xl,
  },
});
