import React, { useEffect, useMemo, useState } from 'react';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { ProductCard } from '../../components/domain/ProductCard';
import { theme } from '../../theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { ErrorState } from '../../components/ui/ErrorState';
import { catalogKeys } from '../../services/catalogQueries';

export const ProductListing: React.FC = () => {
  const { productColumns } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'ProductListing'>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'ProductListing'>>();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | undefined>(route.params?.categoryId);
  const [activeTag, setActiveTag] = useState<string>();
  useEffect(() => setActiveCategory(route.params?.categoryId), [route.params?.categoryId]);
  const categoriesQuery = useQuery({ queryKey: catalogKeys.categories, queryFn: productService.fetchCategories });
  const tagsQuery = useQuery({ queryKey: catalogKeys.tags, queryFn: productService.fetchTags });
  const productsQuery = useQuery({
    queryKey: catalogKeys.productsFiltered(activeCategory, activeTag),
    queryFn: () => productService.fetchProducts({ category: activeCategory, tag: activeTag }),
  });
  const { data: products = [], isLoading } = productsQuery;

  const filtered = useMemo(() => products.filter(product => {
    const matchesQuery = query.length === 0 || product.name.toLowerCase().includes(query.toLowerCase());
    return matchesQuery;
  }), [products, query]);

  if (productsQuery.isError || categoriesQuery.isError || tagsQuery.isError) return <ErrorState message="Unable to load products." onRetry={() => { void productsQuery.refetch(); void categoriesQuery.refetch(); void tagsQuery.refetch(); }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search products" placeholderTextColor={theme.colors.muted} style={styles.search} accessibilityLabel="Search products" />
      <View style={styles.filters}>
        {[{ slug: '', label: 'All' }, ...(categoriesQuery.data ?? [])].map(category => (
          <Pressable key={category.slug} onPress={() => setActiveCategory(category.slug || undefined)} style={[styles.filterChip, activeCategory === (category.slug || undefined) ? styles.filterActive : null]} accessibilityRole="button" accessibilityLabel={category.label}>
            <Text style={[styles.filterText, activeCategory === (category.slug || undefined) ? styles.filterTextActive : null]}>{category.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filters}>
        {[{ slug: '', label: 'All tags' }, ...(tagsQuery.data ?? [])].map(tag => (
          <Pressable key={tag.slug} onPress={() => setActiveTag(tag.slug || undefined)} style={[styles.filterChip, activeTag === (tag.slug || undefined) ? styles.filterActive : null]} accessibilityRole="button" accessibilityLabel={tag.label}>
            <Text style={[styles.filterText, activeTag === (tag.slug || undefined) ? styles.filterTextActive : null]}>{tag.label}</Text>
          </Pressable>
        ))}
      </View>
      {isLoading || categoriesQuery.isLoading || tagsQuery.isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          key={productColumns}
          numColumns={productColumns}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.cardWrapper, { width: `${100 / productColumns}%` }]}>
              <ProductCard layout="grid" product={item} onPress={() => item.slug && navigation.navigate('ProductDetails', { productId: item.slug })} />
            </View>
          )}
          ListEmptyComponent={<EmptyState title="No products found" description="Try another search or choose a different category." />}
          contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
          columnWrapperStyle={styles.column}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  search: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    color: theme.colors.ink,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  filterText: {
    color: theme.colors.ink,
    fontSize: theme.typography.small.fontSize,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  list: {
    paddingBottom: theme.spacing.xl,
    marginHorizontal: -theme.spacing.xs,
  },
  emptyList: {
    flex: 1,
  },
  column: {
    justifyContent: 'flex-start',
  },
  cardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  skeletonCard: { width: '48%', height: 260, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md },
});
