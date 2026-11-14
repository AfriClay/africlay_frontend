import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { ProductCard } from '../../components/domain/ProductCard';
import { theme } from '../../theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { ErrorState } from '../../components/ui/ErrorState';
import { catalogCategories, catalogKeys } from '../../services/catalogQueries';
import { rootCategories } from '../../utils/categoryTree';
import { SearchField } from '../../components/ui/SearchField';
import { Button } from '../../components/ui/Button';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import type { Product } from '../../types/product';

const FILTER_HEIGHT = 104;

export const ProductListing: React.FC = () => {
  const { isExpanded, productColumns } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'ProductListing'>>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<HomeStackParamList, 'ProductListing'>>();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), 250);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(route.params?.categoryId);
  const [activeTag, setActiveTag] = useState<string>();
  const reduceMotion = useReducedMotionSafe();
  const listRef = useRef<FlatList<Product>>(null);
  const lastScrollY = useRef(0);
  const scrollTravel = useRef(0);
  const lastDirection = useRef<'up' | 'down' | undefined>(undefined);
  const filterProgress = useRef(new Animated.Value(1)).current;
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [filtersMounted, setFiltersMounted] = useState(true);
  useEffect(() => {
    setActiveCategory(route.params?.categoryId);
    setActiveTag(undefined);
    setFiltersVisible(true);
    lastScrollY.current = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [route.params?.categoryId]);
  useEffect(() => {
    if (filtersVisible) setFiltersMounted(true);
    const animation = Animated.timing(filterProgress, {
      toValue: filtersVisible ? 1 : 0,
      duration: reduceMotion ? 0 : filtersVisible ? 190 : 160,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && !filtersVisible) setFiltersMounted(false);
    });
    return () => animation.stop();
  }, [filterProgress, filtersVisible, reduceMotion]);
  const resetList = () => {
    lastScrollY.current = 0;
    scrollTravel.current = 0;
    setFiltersVisible(true);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const chooseCategory = (slug?: string) => {
    setActiveCategory(slug);
    setActiveTag(undefined);
    resetList();
  };
  const chooseTag = (slug?: string) => {
    setActiveTag(slug);
    resetList();
  };
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = y - lastScrollY.current;
    lastScrollY.current = y;
    if (y <= 12) {
      scrollTravel.current = 0;
      setFiltersVisible(true);
      return;
    }
    if (Math.abs(delta) < 2) return;
    const direction = delta > 0 ? 'down' : 'up';
    if (direction !== lastDirection.current) scrollTravel.current = 0;
    lastDirection.current = direction;
    scrollTravel.current += Math.abs(delta);
    if (direction === 'down' && y > 64 && scrollTravel.current > 24) {
      scrollTravel.current = 0;
      setFiltersVisible(false);
    } else if (direction === 'up' && scrollTravel.current > 18) {
      scrollTravel.current = 0;
      setFiltersVisible(true);
    }
  };
  const categoriesQuery = useQuery({ queryKey: catalogKeys.categories, queryFn: productService.fetchCategories });
  const tagsQuery = useQuery({ queryKey: catalogKeys.tags, queryFn: productService.fetchTags });
  const productsQuery = useInfiniteQuery({
    queryKey: catalogKeys.productsFiltered(activeCategory, activeTag, search),
    queryFn: ({ pageParam }) => productService.fetchProductPage({
      category: activeCategory,
      tag: activeTag,
      search,
      limit: 24,
      offset: pageParam,
    }, catalogCategories(queryClient)),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextOffset,
  });
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap(page => page.results) ?? [],
    [productsQuery.data],
  );
  const { isLoading } = productsQuery;
  const categoryOptions = useMemo(() => {
    const categories = categoriesQuery.data ?? [];
    const roots = rootCategories(categories);
    const selected = categories.find(category => category.slug === activeCategory);
    return selected ? [selected, ...roots.filter(category => category.id !== selected.id)] : roots;
  }, [activeCategory, categoriesQuery.data]);
  const tagOptions = useMemo(() => {
    const tags = tagsQuery.data ?? [];
    const selected = tags.find(tag => tag.slug === activeTag);
    return selected ? [selected, ...tags.filter(tag => tag.slug !== selected.slug)] : tags;
  }, [activeTag, tagsQuery.data]);

  const tagButtons = [{ slug: '', label: 'All tags' }, ...tagOptions].map(tag => (
    <Pressable key={tag.slug} onPress={() => chooseTag(tag.slug || undefined)} style={[styles.filterChip, activeTag === (tag.slug || undefined) ? styles.filterActive : null]} accessibilityRole="radio" accessibilityLabel={tag.label} accessibilityState={{ selected: activeTag === (tag.slug || undefined) }}>
      <Text style={[styles.filterText, activeTag === (tag.slug || undefined) ? styles.filterTextActive : null]}>{tag.label}</Text>
    </Pressable>
  ));

  if (productsQuery.isError || categoriesQuery.isError || tagsQuery.isError) return <ErrorState message="Unable to load products." onRetry={() => { void productsQuery.refetch(); void categoriesQuery.refetch(); void tagsQuery.refetch(); }} />;

  return (
    <View style={styles.container}>
      {isExpanded ? <Text style={styles.title}>Products</Text> : null}
      <SearchField value={query} onChangeText={value => { setQuery(value); resetList(); }} placeholder="Search products" accessibilityLabel="Search products" containerStyle={styles.search} />
      <Animated.View
        accessibilityElementsHidden={!filtersVisible}
        importantForAccessibility={filtersVisible ? 'auto' : 'no-hide-descendants'}
        aria-hidden={!filtersVisible}
        style={[styles.filterPanel, { height: Animated.multiply(filterProgress, FILTER_HEIGHT), opacity: filterProgress, pointerEvents: filtersVisible ? 'auto' : 'none' }]}
      >
        {filtersMounted ? <>
          <ScrollView horizontal showsHorizontalScrollIndicator={isExpanded} style={styles.filterScroller} contentContainerStyle={styles.railContent} accessibilityRole="radiogroup" accessibilityLabel="Product categories">
            <Pressable onPress={() => chooseCategory()} style={[styles.filterChip, !activeCategory ? styles.filterActive : null]} accessibilityRole="radio" accessibilityState={{ selected: !activeCategory }} accessibilityLabel="All categories">
              <Text style={[styles.filterText, !activeCategory ? styles.filterTextActive : null]}>All products</Text>
            </Pressable>
            {categoryOptions.map(category => (
              <Pressable key={category.id} onPress={() => chooseCategory(category.slug)} style={[styles.filterChip, activeCategory === category.slug && styles.filterActive]}
                accessibilityRole="radio" accessibilityState={{ selected: activeCategory === category.slug }} accessibilityLabel={`Browse ${category.label}`}>
                <Text numberOfLines={1} style={[styles.filterText, activeCategory === category.slug && styles.filterTextActive]}>{category.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={isExpanded} style={styles.filterScroller} contentContainerStyle={styles.railContent} accessibilityRole="radiogroup" accessibilityLabel="Product tags">{tagButtons}</ScrollView>
        </> : null}
      </Animated.View>
      {isLoading || categoriesQuery.isLoading || tagsQuery.isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          key={productColumns}
          numColumns={productColumns}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.cardWrapper, { width: `${100 / productColumns}%` }]}>
              <ProductCard layout="grid" product={item} onPress={() => item.slug && navigation.navigate('ProductDetails', { productId: item.slug })} />
            </View>
          )}
          ListEmptyComponent={<EmptyState title="No products found" description="Try another search or choose a different category." />}
          ListFooterComponent={productsQuery.hasNextPage ? (
            <Button
              variant="outline"
              onPress={() => void productsQuery.fetchNextPage()}
              loading={productsQuery.isFetchingNextPage}
              loadingLabel="Loading more"
            >Load more</Button>
          ) : null}
          onEndReached={() => {
            if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
              void productsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={products.length === 0 ? styles.emptyList : styles.list}
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
  search: { marginBottom: theme.spacing.md },
  filterPanel: { overflow: 'hidden', flexShrink: 0 },
  filterScroller: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: theme.spacing.sm },
  railContent: { paddingRight: theme.spacing.md, alignItems: 'center' },
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
