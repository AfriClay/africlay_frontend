import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { ProductCard } from '../../components/domain/ProductCard';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../constants/routes';
import { EmptyState } from '../../components/ui/EmptyState';

export const Search: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productService.fetchProducts() });

  const results = useMemo(() => products.filter(product => product.name.toLowerCase().includes(query.toLowerCase()) || product.description.toLowerCase().includes(query.toLowerCase())), [products, query]);

  return (
    <View style={styles.container}>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search products, sellers, services" placeholderTextColor={theme.colors.muted} style={styles.search} accessibilityLabel="Search" />
      {query.length === 0 ? (
        <View style={styles.heroBox}><Text style={styles.heroText}>Search for products like Maasai, avocados, or services.</Text></View>
      ) : (
        <FlatList data={results} keyExtractor={item => item.id} renderItem={({ item }) => (
          <Pressable style={styles.resultItem} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} accessibilityRole="button">
            <Text style={styles.resultText}>{item.name}</Text>
            <Text style={styles.resultMeta}>{item.category}</Text>
          </Pressable>
        )} ListEmptyComponent={<EmptyState title="No results" description="Try a different search term." />} contentContainerStyle={results.length === 0 ? styles.empty : styles.list} />
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
  search: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
  },
  heroBox: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
  },
  resultItem: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  resultText: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  resultMeta: {
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  empty: {
    flex: 1,
  },
});
