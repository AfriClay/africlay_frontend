import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { ProductCard } from '../../components/domain/ProductCard';
import { theme } from '../../theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ROUTES } from '../../constants/routes';

export const ProductListing: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productService.fetchProducts() });
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(route.params?.categoryId);

  const filtered = useMemo(() => products.filter(product => {
    const matchesCategory = activeCategory ? product.category.toLowerCase().includes(activeCategory.toLowerCase()) : true;
    const matchesQuery = query.length === 0 || product.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [products, activeCategory, query]);

  const categories = ['All', 'Agriculture', 'Fashion', 'Electronics', 'Handmade', 'Home & Living', 'Beauty'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search products" placeholderTextColor={theme.colors.muted} style={styles.search} accessibilityLabel="Search products" />
      <View style={styles.filters}>
        {categories.map(category => (
          <Pressable key={category} onPress={() => setActiveCategory(category === 'All' ? undefined : category)} style={[styles.filterChip, activeCategory === category && category !== 'All' ? styles.filterActive : null]} accessibilityRole="button" accessibilityLabel={category}>
            <Text style={[styles.filterText, activeCategory === category && category !== 'All' ? styles.filterTextActive : null]}>{category}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No products found" description="Try another search or choose a different category." />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        columnWrapperStyle={styles.column}
      />
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
    borderRadius: theme.radii.lg,
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
  },
  emptyList: {
    flex: 1,
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
